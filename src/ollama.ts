import tl = require('azure-pipelines-task-lib/task');
import { encode } from 'gpt-tokenizer';
import https = require('https');
import http = require('http');

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
    message: {
        role: string;
        content: string;
    };
    done: boolean;
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
        bearerToken?: string
    ) {
        this.ollamaEndpoint = ollamaEndpoint;
        this.useHttps = ollamaEndpoint.startsWith('https://');
        this.bearerToken = bearerToken;
        this.projectContext = projectContext;
        
        // Parse custom best practices into array
        const customPracticesArray = customBestPractices 
            ? customBestPractices.split('\n').filter(line => line.trim().length > 0).map(line => line.trim())
            : [];
        
        this.systemMessage = `Your task is to act as a code reviewer of a Pull Request:
        - Use bullet points if you have multiple comments.
        ${checkForBugs ? '- If there are any bugs, highlight them.' : ''}
        ${checkForPerformance ? '- If there are major performance problems, highlight them.' : ''}
        ${checkForBestPractices ? '- Provide details on missed use of best-practices.' : ''}
        ${additionalPrompts.length > 0 ? additionalPrompts.map(str => `- ${str}`).join('\n        ') : ''}
        ${customPracticesArray.length > 0 ? `\n        Additionally, check for the following project-specific best practices:\n        ${customPracticesArray.map(str => `- ${str}`).join('\n        ')}` : ''}
        - Do not highlight minor issues and nitpicks.
        - Only provide instructions for improvements 
        - If you have no instructions respond with NO_COMMENT only, otherwise provide your instructions.
    
        You will be provided with:
        1. The complete file content (for full context)
        2. The code changes (diffs) in unidiff format
        3. Project metadata (README, dependencies, etc.)
        
        Focus your review on the changes shown in the diff, but use the full file content and project context to understand the bigger picture.
        
        The response should be in markdown format.`;
    }

    public async PerformCodeReview(diff: string, fileName: string, fileContent: string = ''): Promise<string> {
        const model = tl.getInput('ai_model', true)!;

        // Construct the full context message
        let contextMessage = '';
        
        if (this.projectContext) {
            contextMessage += `${this.projectContext}\n\n`;
        }
        
        if (fileContent) {
            contextMessage += `## Full File Content (${fileName}):\n\`\`\`\n${fileContent}\n\`\`\`\n\n`;
        }
        
        contextMessage += `## Changes (Diff):\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;
        contextMessage += `Please review the changes in the diff above, using the full file content and project context for reference.`;

        // Check token limit with full context
        if (!this.doesMessageExceedTokenLimit(contextMessage + this.systemMessage, 8192)) {
            try {
                const response = await this.callOllamaApi(model, contextMessage);
                
                if (response && response.message && response.message.content) {
                    return response.message.content;
                }
            } catch (error) {
                tl.error(`Error calling Ollama API for file ${fileName}: ${error}`);
                return '';
            }
        } else {
            // If full context exceeds limits, try with just diff
            tl.warning(`Full context for ${fileName} exceeds token limits. Attempting review with diff only.`);
            
            if (!this.doesMessageExceedTokenLimit(diff + this.systemMessage, 8192)) {
                try {
                    const response = await this.callOllamaApi(model, diff);
                    
                    if (response && response.message && response.message.content) {
                        return response.message.content;
                    }
                } catch (error) {
                    tl.error(`Error calling Ollama API for file ${fileName}: ${error}`);
                    return '';
                }
            }
        }

        tl.warning(`Unable to process file ${fileName} as it exceeds token limits even with diff only.`);
        return '';
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
                            reject(new Error(`Ollama API returned status code ${res.statusCode}: ${data}`));
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
