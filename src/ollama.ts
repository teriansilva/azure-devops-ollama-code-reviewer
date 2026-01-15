import { ReviewConfig, FileContentFetcher } from './types';
import { PromptBuilder } from './prompts';
import { OllamaApiClient } from './api-client';

// Re-export types for backward compatibility
export { ReviewConfig, FileContentFetcher } from './types';

// ============================================================================
// OLLAMA ORCHESTRATOR - Main review workflow
// ============================================================================

export class Ollama {
    private _apiClient: OllamaApiClient;
    private _config: ReviewConfig;
    private _fileFetcher: FileContentFetcher | null = null;

    constructor(
        endpoint: string,
        model: string,
        config: ReviewConfig,
        bearerToken?: string
    ) {
        this._config = config;
        
        this._apiClient = new OllamaApiClient(
            endpoint, 
            model, 
            config.tokenLimit, 
            config.debug,
            bearerToken
        );
    }

    /**
     * Set the file fetcher for agentic context requests
     */
    setFileFetcher(fetcher: FileContentFetcher): void {
        this._fileFetcher = fetcher;
    }

    /**
     * Main entry point: Review a file
     * Uses multi-pass workflow if enabled, otherwise single review pass
     */
    async PerformCodeReview(diff: string, fileName: string, fileContent: string): Promise<string> {
        // Check if multi-pass is enabled (default: true)
        const multipassEnabled = this._config.enableMultipass !== false;
        
        if (multipassEnabled) {
            this._apiClient.log(`Starting 4-pass review for: ${fileName}`);
            
            // Pass 1: Context check
            const additionalContext = await this.executeContextCheckPass(fileName, fileContent, diff);
            
            // Pass 2: Generate review
            const review = await this.executeReviewPass(fileName, fileContent, diff, additionalContext);
            
            if (review === 'NO_COMMENT' || review.trim().toUpperCase() === 'NO_COMMENT') {
                this._apiClient.log('No issues found in review pass');
                return 'NO_COMMENT';
            }
            
            // Pass 3: Format review
            const formattedReview = await this.executeFormatPass(review);
            
            if (formattedReview === 'NO_COMMENT' || formattedReview.trim().toUpperCase() === 'NO_COMMENT') {
                this._apiClient.log('No issues after format pass');
                return 'NO_COMMENT';
            }
            
            // Pass 4: Verify review accuracy
            const verifiedReview = await this.executeVerifyPass(fileName, fileContent, diff, formattedReview);
            
            return verifiedReview;
        } else {
            // Single-pass mode: just run review pass
            this._apiClient.log(`Starting single-pass review for: ${fileName}`);
            
            const review = await this.executeReviewPass(fileName, fileContent, diff, new Map());
            
            if (review === 'NO_COMMENT' || review.trim().toUpperCase() === 'NO_COMMENT') {
                return 'NO_COMMENT';
            }
            
            return review;
        }
    }

    // ========================================================================
    // PASS 1: Context Check
    // ========================================================================

    private async executeContextCheckPass(
        fileName: string, 
        fileContent: string, 
        diff: string
    ): Promise<Map<string, string>> {
        const additionalContext = new Map<string, string>();
        
        // Skip if no file fetcher available
        if (!this._fileFetcher) {
            this._apiClient.log('No file fetcher available, skipping context check');
            return additionalContext;
        }

        // Skip for config files
        if (this.isConfigFile(fileName)) {
            this._apiClient.log('Skipping context check for config file');
            return additionalContext;
        }

        this._apiClient.log('PASS 1: Checking if additional context needed');

        try {
            const systemPrompt = PromptBuilder.buildContextCheckSystemPrompt(this._config.pass1Prompt);
            const userMessage = PromptBuilder.buildReviewUserMessage(fileName, fileContent, diff);
            
            const response = await this._apiClient.callApi(systemPrompt, userMessage, this._config.pass1Model);
            this._apiClient.log(`Context check response: ${response.substring(0, 200)}`);
            
            // Check if READY
            if (response.trim().toUpperCase().startsWith('READY')) {
                this._apiClient.log('AI says READY - no additional context needed');
                return additionalContext;
            }
            
            // Parse file requests
            const requestedFiles = PromptBuilder.parseContextRequest(response);
            if (!requestedFiles || requestedFiles.length === 0) {
                this._apiClient.log('No context request parsed');
                return additionalContext;
            }
            
            this._apiClient.log(`AI requested files: ${requestedFiles.join(', ')}`);
            
            // Fetch requested files
            for (const filePath of requestedFiles) {
                try {
                    const content = await this._fileFetcher(filePath);
                    if (content && !content.startsWith('Error:') && !content.startsWith('File not found')) {
                        additionalContext.set(filePath, content);
                        this._apiClient.log(`Fetched: ${filePath} (${content.length} chars)`);
                    } else {
                        this._apiClient.log(`Could not fetch: ${filePath} - ${content?.substring(0, 100)}`);
                    }
                } catch (err: any) {
                    this._apiClient.log(`Error fetching ${filePath}: ${err.message}`);
                }
            }
            
            this._apiClient.log(`Total additional context files: ${additionalContext.size}`);
        } catch (err: any) {
            this._apiClient.log(`Context check pass failed: ${err.message}`);
        }

        return additionalContext;
    }

    // ========================================================================
    // PASS 2: Review
    // ========================================================================

    private async executeReviewPass(
        fileName: string, 
        fileContent: string, 
        diff: string,
        additionalContext: Map<string, string>
    ): Promise<string> {
        this._apiClient.log('PASS 2: Generating review');
        
        const systemPrompt = PromptBuilder.buildReviewSystemPrompt(this._config, this._config.pass2Prompt);
        
        // Build user message with or without additional context
        let userMessage: string;
        if (additionalContext.size > 0) {
            userMessage = PromptBuilder.buildEnrichedUserMessage(fileName, fileContent, diff, additionalContext);
        } else {
            userMessage = PromptBuilder.buildReviewUserMessage(fileName, fileContent, diff);
        }
        
        // Check token limit
        const fullContent = systemPrompt + userMessage;
        if (this._apiClient.exceedsTokenLimit(fullContent)) {
            this._apiClient.log('Content exceeds token limit, using diff only');
            userMessage = PromptBuilder.buildDiffOnlyUserMessage(fileName, diff);
        }
        
        const review = await this._apiClient.callApi(systemPrompt, userMessage, this._config.pass2Model);
        this._apiClient.log(`Review generated: ${review.length} chars`);
        
        return review;
    }

    // ========================================================================
    // PASS 3: Format
    // ========================================================================

    private async executeFormatPass(review: string): Promise<string> {
        this._apiClient.log('PASS 3: Formatting review');
        
        const systemPrompt = PromptBuilder.buildFormatSystemPrompt(this._config.pass3Prompt);
        const userMessage = PromptBuilder.buildFormatUserMessage(review);
        
        const formattedReview = await this._apiClient.callApi(systemPrompt, userMessage, this._config.pass3Model);
        this._apiClient.log(`Formatted review: ${formattedReview.length} chars`);
        
        return formattedReview;
    }

    // ========================================================================
    // PASS 4: Verify
    // ========================================================================

    private async executeVerifyPass(
        fileName: string, 
        fileContent: string, 
        diff: string, 
        review: string
    ): Promise<string> {
        this._apiClient.log('PASS 4: Verifying review');
        
        const systemPrompt = PromptBuilder.buildVerifySystemPrompt(this._config.pass4Prompt);
        const userMessage = PromptBuilder.buildVerifyUserMessage(fileName, fileContent, diff, review);
        
        const verifiedReview = await this._apiClient.callApi(systemPrompt, userMessage, this._config.pass4Model);
        this._apiClient.log(`Verified review: ${verifiedReview.length} chars`);
        
        return verifiedReview;
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private isConfigFile(fileName: string): boolean {
        const configExtensions = ['.json', '.yaml', '.yml', '.xml', '.config', '.csproj', '.sln'];
        return configExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    }
}
