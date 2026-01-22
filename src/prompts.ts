import { ReviewConfig } from './types';

// ============================================================================
// PROMPT BUILDER - All prompt construction in one place
// ============================================================================

export class PromptBuilder {
    
    /**
     * Build the review criteria list based on configuration
     */
    static buildCriteria(config: ReviewConfig): string {
        const lines: string[] = [];
        
        if (config.checkForBugs) {
            lines.push('- Bugs, logic errors, null pointer issues, runtime exceptions');
        }
        if (config.checkForPerformance) {
            lines.push('- Performance issues (inefficient algorithms, memory leaks)');
        }
        if (config.checkForBestPractices) {
            lines.push('- Best practice violations, missing error handling');
        }
        if (config.additionalPrompts.length > 0) {
            lines.push(...config.additionalPrompts.map(p => `- ${p}`));
        }
        
        // Parse custom best practices
        if (config.customBestPractices) {
            const customs = config.customBestPractices
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(line => `- ${line}`);
            lines.push(...customs);
        }
        
        return lines.length > 0 ? lines.join('\n') : '- Any significant issues';
    }

    // ========================================================================
    // SYSTEM PROMPTS
    // ========================================================================

    /**
     * PASS 1: Context check - does the AI need additional files?
     */
    static buildContextCheckSystemPrompt(customPrompt?: string): string {
        if (customPrompt && customPrompt.trim()) {
            return customPrompt;
        }
        
        return `You are a code review assistant. Your task is to quickly scan a file and determine if you need additional context to review it properly.

Look at the imports/references in the file. Do you need to see any of these files to properly review the changes?

RESPOND WITH ONLY ONE OF:
- READY (if you can review with just this file)
- REQUEST_CONTEXT: path/to/file1.ts, path/to/file2.ts (if you need to see imported files)

Only request files that are:
- Directly imported in the code
- Necessary to understand the changes (interfaces, base classes, types)
- Maximum 3 files

Do not provide any review yet. Just indicate if you need more context.`;
    }

    /**
     * PASS 2: System prompt for actual code review
     */
    static buildReviewSystemPrompt(config: ReviewConfig, customPrompt?: string): string {
        if (customPrompt && customPrompt.trim()) {
            return customPrompt;
        }
        
        const criteria = this.buildCriteria(config);
        const projectInfo = config.projectContext 
            ? `\nProject context: ${config.projectContext}\n` 
            : '';

        return `You are a code reviewer. You will review exactly ONE file at a time.
${projectInfo}
CRITICAL: You are reviewing ONLY the file provided below. Do NOT reference, assume, or comment on any other files. If you cannot see code in the provided content, do not comment on it.

The changes are provided in two sections:
- "REMOVED" = old code that NO LONGER EXISTS (was deleted)
- "ADDED" = new code that NOW EXISTS (was added) - FOCUS YOUR REVIEW HERE

Only the ADDED code exists in the current file. The REMOVED code is gone.

Look for:
${criteria}

Rules:
- Focus on the ADDED code section - this is what's being introduced
- Do not report issues in REMOVED code (it no longer exists)
- Skip config files (JSON/YAML/XML) unless there's a security issue (exposed secrets)
- If you find no real issues in the ADDED code, respond with NO_COMMENT

Response format (if issues found):
### Summary
[1-2 sentences about the changes]

### Issues Found
**[Category]**: [Title]
- Problem: [what's wrong in the new code]
- Fix: [how to fix]

If no issues: respond with only NO_COMMENT`;
    }

    /**
     * PASS 3: System prompt for format enforcement
     */
    static buildFormatSystemPrompt(customPrompt?: string): string {
        if (customPrompt && customPrompt.trim()) {
            return customPrompt;
        }
        
        return `You are a code review formatter. You will receive a code review and must reformat it to match the required structure.

## Required Format
The review MUST follow this exact structure:

### Summary
[1-2 sentences about what the changes do]

### Issues Found
**[Category]**: [Title]
- Problem: [what's wrong]
- Fix: [how to fix]

## Rules
1. Keep all the issues from the original review
2. Reformat each issue to match the structure above
3. Categories should be one of: Bug, Performance, Best Practice, Security, Style
4. Each issue needs Problem and Fix fields
5. Write a concise Summary if missing
6. If the review says NO_COMMENT or has no issues, respond with: NO_COMMENT

Respond with the properly formatted review.`;
    }

    /**
     * PASS 4: System prompt for accuracy verification
     */
    static buildVerifySystemPrompt(customPrompt?: string): string {
        if (customPrompt && customPrompt.trim()) {
            return customPrompt;
        }
        
        return `You are a code review validator. You will receive:
1. A file's content and changes
2. A formatted review for this file

Your job: Verify each issue in the review actually exists in the code.

## Validation Checks
For each issue:
- Does the issue actually exist in THIS file's ADDED code?
- Is the problem real (not hallucinated)?
- Is it about code that EXISTS (not removed/deleted code)?

## CRITICAL Rules
1. DO NOT change the wording, structure, or formatting of valid issues
2. DO NOT add new issues or modify existing descriptions
3. DO NOT rephrase the Summary, Problem, or Fix fields
4. ONLY remove issues that are clearly hallucinated or invalid
5. If an issue is valid, copy it EXACTLY as written - character for character
6. Keep the exact same markdown structure and formatting
7. If ALL issues are valid, return the review UNCHANGED
8. If NO valid issues remain, respond with: NO_COMMENT

Your ONLY job is to REMOVE invalid issues. Never edit valid ones.

Respond with the validated review (unchanged except for removed invalid issues).`;
    }

    // ========================================================================
    // DIFF SIMPLIFICATION
    // ========================================================================

    /**
     * Transform git diff into a clearer BEFORE/AFTER format
     * This helps the AI understand what was removed vs added
     */
    static simplifyDiff(diff: string): string {
        const lines = diff.split('\n');
        const removedLines: string[] = [];
        const addedLines: string[] = [];
        const contextLines: string[] = [];
        
        let currentHunk = '';
        
        for (const line of lines) {
            // Skip diff headers
            if (line.startsWith('diff --git') || 
                line.startsWith('index ') ||
                line.startsWith('---') ||
                line.startsWith('+++')) {
                continue;
            }
            
            // Track hunk headers for context
            if (line.startsWith('@@')) {
                currentHunk = line;
                continue;
            }
            
            // Categorize lines
            if (line.startsWith('-')) {
                removedLines.push(line.substring(1)); // Remove the - prefix
            } else if (line.startsWith('+')) {
                addedLines.push(line.substring(1)); // Remove the + prefix
            } else if (line.startsWith(' ')) {
                contextLines.push(line.substring(1));
            }
        }
        
        // Build simplified output
        let simplified = '';
        
        if (removedLines.length > 0) {
            simplified += '=== REMOVED (old code - no longer exists) ===\n';
            simplified += removedLines.join('\n');
            simplified += '\n\n';
        }
        
        if (addedLines.length > 0) {
            simplified += '=== ADDED (new code - review this) ===\n';
            simplified += addedLines.join('\n');
            simplified += '\n';
        }
        
        // If no changes detected, return original
        if (removedLines.length === 0 && addedLines.length === 0) {
            return diff;
        }
        
        return simplified;
    }

    // ========================================================================
    // USER MESSAGES
    // ========================================================================

    /**
     * Build user message for review (file content + diff)
     */
    static buildReviewUserMessage(fileName: string, fileContent: string, diff: string): string {
        const simplifiedDiff = this.simplifyDiff(diff);
        let message = `File: ${fileName}\n\n`;
        
        if (fileContent) {
            message += `Current File Content:\n\`\`\`\n${fileContent}\n\`\`\`\n\n`;
        }
        
        message += `Changes Made:\n${simplifiedDiff}`;
        
        return message;
    }

    /**
     * Build user message for review (diff only, when token limit exceeded)
     */
    static buildDiffOnlyUserMessage(fileName: string, diff: string): string {
        const simplifiedDiff = this.simplifyDiff(diff);
        return `File: ${fileName}\n\nChanges Made:\n${simplifiedDiff}`;
    }

    /**
     * Build user message for format pass (just the review)
     */
    static buildFormatUserMessage(review: string): string {
        return `Review to format:\n\n${review}`;
    }

    /**
     * Build user message for verification pass
     */
    static buildVerifyUserMessage(fileName: string, fileContent: string, diff: string, review: string): string {
        const simplifiedDiff = this.simplifyDiff(diff);
        let message = `File: ${fileName}\n\n`;
        
        if (fileContent) {
            message += `Current File Content:\n\`\`\`\n${fileContent}\n\`\`\`\n\n`;
        }
        
        message += `Changes Made:\n${simplifiedDiff}\n\n`;
        message += `---\n\nReview to verify:\n${review}`;
        
        return message;
    }

    /**
     * Build user message with additional context files
     */
    static buildEnrichedUserMessage(
        fileName: string, 
        fileContent: string, 
        diff: string, 
        additionalContext: Map<string, string>
    ): string {
        const simplifiedDiff = this.simplifyDiff(diff);
        let message = `File: ${fileName}\n\n`;
        
        if (fileContent) {
            message += `Current File Content:\n\`\`\`\n${fileContent}\n\`\`\`\n\n`;
        }
        
        message += `Changes Made:\n${simplifiedDiff}\n\n`;
        
        if (additionalContext.size > 0) {
            message += `---\n\n## Additional Context (requested files):\n\n`;
            for (const [filePath, content] of additionalContext) {
                message += `### ${filePath}\n\`\`\`\n${content}\n\`\`\`\n\n`;
            }
        }
        
        return message;
    }

    // ========================================================================
    // RESPONSE PARSING
    // ========================================================================

    /**
     * Parse REQUEST_CONTEXT response to extract file paths
     */
    static parseContextRequest(response: string): string[] | null {
        const match = response.match(/REQUEST_CONTEXT:\s*(.+)/i);
        if (!match) return null;
        
        return match[1]
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 0)
            .slice(0, 3); // Max 3 files
    }
}
