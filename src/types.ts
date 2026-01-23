// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface OllamaMessage {
    role: string;
    content: string;
}

export interface OllamaRequest {
    model: string;
    messages: OllamaMessage[];
    stream: boolean;
    max_tokens?: number;  // OpenAI-compatible
    options?: {           // Ollama-specific
        num_predict?: number;
    };
}

export interface OllamaResponse {
    message?: { role: string; content: string };
    choices?: Array<{ message: { role: string; content: string } }>;
    done?: boolean;
}

export interface ReviewConfig {
    checkForBugs: boolean;
    checkForPerformance: boolean;
    checkForBestPractices: boolean;
    additionalPrompts: string[];
    customBestPractices: string;
    projectContext: string;
    tokenLimit: number;
    debug: boolean;
    // Multi-pass workflow
    enableMultipass: boolean;
    // Custom pass prompts
    pass1Prompt?: string;
    pass2Prompt?: string;
    pass3Prompt?: string;
    pass4Prompt?: string;
    // Custom pass models
    pass1Model?: string;
    pass2Model?: string;
    pass3Model?: string;
    pass4Model?: string;
}

// Callback type for fetching additional files
export type FileContentFetcher = (filePath: string) => Promise<string>;
