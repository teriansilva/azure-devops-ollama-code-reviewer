import tl = require('azure-pipelines-task-lib/task');
import { encode } from 'gpt-tokenizer';
import https = require('https');
import http = require('http');

export interface CodeReviewComment {
    lineNumber: number;
    comment: string;
}

interface OllamaMessage {
    role: string;
    content: string;
}

interface OllamaRequest {
    model: string;
    messages: OllamaMessage[];
    stream: boolean;
}

interface OllamaResponse {
    // Ollama native format
    message?: {
        role: string;
        content: string;
    };
    done?: boolean;
    // OpenAI-compatible format
    choices?: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finishReason?: string;
    }>;
}

export class Ollama {
    private readonly systemMessage: string = '';
    private readonly ollamaEndpoint: string;
    private readonly useHttps: boolean;
    private readonly bearerToken?: string;
    private readonly projectContext: string = '';

    constructor(
        ollamaEndpoint: string,
        checkForBugs: boolean = false,
        checkForPerformance: boolean = false,
        checkForBestPractices: boolean = false,
        additionalPrompts: string[] = [],
        customBestPractices: string = '',
        projectContext: string = '',
        bearerToken?: string,
        customSystemPrompt?: string
    ) {
        this.ollamaEndpoint = ollamaEndpoint;
        this.useHttps = ollamaEndpoint.startsWith('https://');
        this.bearerToken = bearerToken;
        this.projectContext = projectContext;
        
        // Parse custom best practices into array
        const customPracticesArray = customBestPractices 
            ? customBestPractices.split('\n').filter(line => line.trim().length > 0).map(line => line.trim())
            : [];
        
        // Use custom system prompt if provided, otherwise build the default one
        if (customSystemPrompt && customSystemPrompt.trim().length > 0) {
            this.systemMessage = customSystemPrompt.trim();
            console.log('Using custom system prompt');
        } else {
            this.systemMessage = `Your task is to act as a code reviewer of a Pull Request.
        ${checkForBugs ? '- If there are any bugs, highlight them.' : ''}
        ${checkForPerformance ? '- If there are major performance problems, highlight them.' : ''}
        ${checkForBestPractices ? '- Provide details on missed use of best-practices.' : ''}
        ${additionalPrompts.length > 0 ? additionalPrompts.map(str => `- ${str}`).join('\n        ') : ''}
        ${customPracticesArray.length > 0 ? `\n        Additionally, check for the following project-specific best practices:\n        ${customPracticesArray.map(str => `- ${str}`).join('\n        ')}` : ''}
        - Do not highlight minor issues and nitpicks.
        - Only provide instructions for improvements.
        - If you have no comments, respond with exactly: {"comments": []}
    
        You will be provided with:
        1. The CURRENT file content (after changes, for full context)
        2. The code changes (diffs) in unidiff format - this shows what was added/removed
        3. Project metadata (README, dependencies, etc.)
        4. Build log context from previous pipeline steps (if enabled)
        5. Existing PR comments from human reviewers (if enabled)
        
        The diff shows: lines starting with '+' are ADDED, lines starting with '-' are REMOVED.
        Focus your review on the changes shown in the diff. Use the full file content to understand the complete context.
        If build logs show that the project builds successfully, consider this when reviewing changes.
        If build logs show errors or warnings, consider whether the changes address or relate to those issues.
        If existing PR comments are provided:
        - Comments marked with [AI - Previous Review] are YOUR OWN comments from a previous run. DO NOT repeat, rephrase, or duplicate these comments under any circumstances.
        - For comments from human reviewers, avoid duplicating their points.
        - Only provide NEW insights that have not already been covered by any existing comments.
        
        **IMPORTANT: Your response MUST be valid JSON in the following format:**
        {
          "comments": [
            {
              "lineNumber": <number - the line number in the NEW/modified file where this comment applies>,
              "comment": "<string - your review comment in markdown format>"
            }
          ]
        }
        
        Rules for lineNumber:
        - Use the line number from the NEW version of the file (after changes)
        - The line number should point to the specific line of code your comment is about
        - For multi-line issues, use the starting line number
        - Only comment on lines that are part of the changes (added or modified lines from the diff)
        
        Example response:
        {
          "comments": [
            {
              "lineNumber": 42,
              "comment": "**Potential Bug**: This variable is used before being initialized. Consider adding a null check."
            },
            {
              "lineNumber": 87,
              "comment": "**Performance**: This loop could be optimized by using a Set instead of an Array for lookups."
            }
          ]
        }`;
        }
    }

    private countTokens(text: string): number {
        try {
            return encode(text).length;
        } catch (error) {
            // Fallback: estimate ~4 characters per token
            return Math.ceil(text.length / 4);
        }
    }

    private truncateToTokenLimit(text: string, maxTokens: number, label: string): string {
        if (maxTokens <= 0) {
            return '';
        }
        
        const currentTokens = this.countTokens(text);
        if (currentTokens <= maxTokens) {
            return text;
        }
        
        // Estimate character ratio and truncate
        const ratio = maxTokens / currentTokens;
        const targetLength = Math.floor(text.length * ratio * 0.95); // 5% buffer
        const truncated = text.substring(0, targetLength) + '\n\n[... truncated due to token limit ...]';
        
        console.log(`${label}: Truncated from ${currentTokens} to ~${maxTokens} tokens`);
        return truncated;
    }

    public async PerformCodeReview(diff: string, fileName: string, fileContent: string = ''): Promise<CodeReviewComment[]> {
        const model = tl.getInput('ai_model', true)!;
        
        // Get configurable limits
        const tokenLimitStr = tl.getInput('token_limit', false) || '8192';
        const tokenLimit = parseInt(tokenLimitStr, 10) || 8192;
        
        const maxFileContentTokensStr = tl.getInput('max_file_content_tokens', false) || '4000';
        const maxFileContentTokens = parseInt(maxFileContentTokensStr, 10) || 4000;
        
        const maxProjectContextTokensStr = tl.getInput('max_project_context_tokens', false) || '2000';
        const maxProjectContextTokens = parseInt(maxProjectContextTokensStr, 10) || 2000;

        // Truncate project context if needed
        const truncatedProjectContext = this.truncateToTokenLimit(
            this.projectContext, 
            maxProjectContextTokens, 
            'Project Context'
        );
        
        // Truncate file content if needed
        const truncatedFileContent = this.truncateToTokenLimit(
            fileContent, 
            maxFileContentTokens, 
            `File Content (${fileName})`
        );

        // Construct the full context message
        let contextMessage = '';
        
        if (truncatedProjectContext) {
            contextMessage += `${truncatedProjectContext}\n\n`;
        }
        
        if (truncatedFileContent) {
            contextMessage += `## Current File Content (${fileName}):\n\`\`\`\n${truncatedFileContent}\n\`\`\`\n\n`;
        }
        
        contextMessage += `## Changes (Diff):\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;
        contextMessage += `Please review the changes in the diff above. Lines with '+' are additions, lines with '-' are removals. Use the full file content for context. Remember to respond with valid JSON only.`;

        // Calculate and log token counts for transparency
        const systemMessageTokens = this.countTokens(this.systemMessage);
        const contextMessageTokens = this.countTokens(contextMessage);
        const diffTokens = this.countTokens(diff);
        const totalTokens = systemMessageTokens + contextMessageTokens;
        
        console.log(`Token breakdown for ${fileName}:`);
        console.log(`  - System Message: ${systemMessageTokens} tokens`);
        console.log(`  - Context Message: ${contextMessageTokens} tokens`);
        console.log(`    (includes project context, file content, diff)`);
        console.log(`  - Diff only: ${diffTokens} tokens`);
        console.log(`  - Total: ${totalTokens} tokens (limit: ${tokenLimit})`);

        // Check token limit with full context
        if (totalTokens <= tokenLimit) {
            try {
                console.log(`Proceeding with full context review for ${fileName}`);
                const response = await this.callOllamaApi(model, contextMessage);
                
                if (response && response.message && response.message.content) {
                    console.log(`Ollama API response received for ${fileName}: ${response.message.content.substring(0, 200)}...`);
                    return this.parseCodeReviewResponse(response.message.content);
                } else if (response && response.choices && response.choices.length > 0 && response.choices[0].message && response.choices[0].message.content) {
                    // OpenAI-compatible format
                    const content = response.choices[0].message.content;
                    console.log(`OpenAI-compatible API response received for ${fileName}: ${content.substring(0, 200)}...`);
                    return this.parseCodeReviewResponse(content);
                } else {
                    console.log(`Raw Ollama API response for ${fileName}: ${JSON.stringify(response)}`);
                    tl.warning(`Empty or invalid response from Ollama API for ${fileName}`);
                    return [];
                }
            } catch (error) {
                tl.error(`Error calling Ollama API for file ${fileName}: ${error}`);
                return [];
            }
        } else {
            // If full context exceeds limits, try with just diff
            const diffOnlyTokens = systemMessageTokens + diffTokens;
            tl.warning(`Full context for ${fileName} exceeds token limit (${totalTokens} > ${tokenLimit}). Attempting review with diff only (${diffOnlyTokens} tokens).`);
            
            if (diffOnlyTokens <= tokenLimit) {
                try {
                    console.log(`Proceeding with diff-only review for ${fileName}`);
                    const diffOnlyMessage = `## Changes (Diff):\n\`\`\`diff\n${diff}\n\`\`\`\n\nPlease review the changes in the diff above. Remember to respond with valid JSON only.`;
                    const response = await this.callOllamaApi(model, diffOnlyMessage);
                    
                    if (response && response.message && response.message.content) {
                        console.log(`Ollama API response received for ${fileName}: ${response.message.content.substring(0, 200)}...`);
                        return this.parseCodeReviewResponse(response.message.content);
                    } else if (response && response.choices && response.choices.length > 0 && response.choices[0].message && response.choices[0].message.content) {
                        // OpenAI-compatible format
                        const content = response.choices[0].message.content;
                        console.log(`OpenAI-compatible API response received for ${fileName}: ${content.substring(0, 200)}...`);
                        return this.parseCodeReviewResponse(content);
                    } else {
                        console.log(`Raw Ollama API response for ${fileName}: ${JSON.stringify(response)}`);
                        tl.warning(`Empty or invalid response from Ollama API for ${fileName} (diff-only mode)`);
                        return [];
                    }
                } catch (error) {
                    tl.error(`Error calling Ollama API for file ${fileName}: ${error}`);
                    return [];
                }
            } else {
                tl.warning(`Unable to process file ${fileName} as it exceeds token limit (${tokenLimit}) even with diff only (${diffOnlyTokens} tokens).`);
                return [];
            }
        }
    }

    private parseCodeReviewResponse(content: string): CodeReviewComment[] {
        try {
            // Try to extract JSON from the response
            let jsonContent = content.trim();
            
            // Handle cases where the model wraps JSON in markdown code blocks
            const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonContent = jsonMatch[1].trim();
            }
            
            const parsed = JSON.parse(jsonContent);
            
            if (parsed.comments && Array.isArray(parsed.comments)) {
                return parsed.comments.filter((c: any) => 
                    typeof c.lineNumber === 'number' && 
                    typeof c.comment === 'string' &&
                    c.comment.trim().length > 0
                ).map((c: any) => ({
                    lineNumber: c.lineNumber,
                    comment: c.comment
                }));
            }
            
            return [];
        } catch (error) {
            tl.warning(`Failed to parse AI response as JSON: ${error}. Response: ${content.substring(0, 200)}...`);
            
            // Fallback: if the response is not valid JSON but contains content,
            // return it as a single comment at line 1
            if (content && content.trim().length > 0 && !content.includes('{"comments": []}')) {
                return [{
                    lineNumber: 1,
                    comment: content
                }];
            }
            
            return [];
        }
    }

    private async callOllamaApi(model: string, diff: string): Promise<OllamaResponse> {
        return new Promise((resolve, reject) => {
            const url = new URL(this.ollamaEndpoint);
            const protocol = this.useHttps ? https : http;
            
            const requestData: OllamaRequest = {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: this.systemMessage
                    },
                    {
                        role: 'user',
                        content: diff
                    }
                ],
                stream: false
            };

            const postData = JSON.stringify(requestData);

            const headers: any = {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            };

            // Add Bearer token if provided
            if (this.bearerToken) {
                headers['Authorization'] = `Bearer ${this.bearerToken}`;
            }

            const options = {
                hostname: url.hostname,
                port: url.port || (this.useHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: headers
            };

            const req = protocol.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.statusCode === 200) {
                            const response: OllamaResponse = JSON.parse(data);
                            resolve(response);
                        } else {
                            // Log the full error response for debugging
                            console.error(`Ollama API error response (${res.statusCode}): ${data.substring(0, 500)}`);
                            reject(new Error(`Ollama API returned status code ${res.statusCode}: ${data.substring(0, 200)}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse Ollama response: ${error}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(postData);
            req.end();
        });
    }

    private doesMessageExceedTokenLimit(message: string, tokenLimit: number): boolean {
        try {
            const tokens = encode(message);
            return tokens.length > tokenLimit;
        } catch (error) {
            tl.warning(`Token encoding failed: ${error}. Proceeding with review.`);
            return false;
        }
    }
}
