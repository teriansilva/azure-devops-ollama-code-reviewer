import { OllamaMessage, OllamaRequest, OllamaResponse } from './types';

// ============================================================================
// API CLIENT - HTTP communication with Ollama/OpenAI
// ============================================================================

export class OllamaApiClient {
    private _endpoint: string;
    private _model: string;
    private _tokenLimit: number;
    private _debug: boolean;
    private _bearerToken?: string;

    constructor(
        endpoint: string, 
        model: string, 
        tokenLimit: number = 4096, 
        debug: boolean = false,
        bearerToken?: string
    ) {
        this._endpoint = endpoint;
        this._model = model;
        this._tokenLimit = tokenLimit;
        this._debug = debug;
        this._bearerToken = bearerToken;
    }

    /**
     * Debug logging helper
     */
    log(message: string): void {
        if (this._debug) {
            console.log(`[Ollama] ${message}`);
        }
    }

    /**
     * Rough estimate if content exceeds token limit
     * (1 token ≈ 4 characters as rough estimate)
     */
    exceedsTokenLimit(content: string): boolean {
        const estimatedTokens = content.length / 4;
        return estimatedTokens > this._tokenLimit;
    }

    /**
     * Call the Ollama/OpenAI API
     * @param systemPrompt System prompt
     * @param userMessage User message
     * @param modelOverride Optional model to use instead of default
     */
    async callApi(systemPrompt: string, userMessage: string, modelOverride?: string): Promise<string> {
        const model = modelOverride || this._model;
        
        const messages: OllamaMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        const request: OllamaRequest = {
            model: model,
            messages: messages,
            stream: false,
            max_tokens: this._tokenLimit,  // OpenAI-compatible
            options: {                      // Ollama-specific
                num_predict: this._tokenLimit
            }
        };

        this.log(`Calling API with model: ${model}`);
        this.log(`System prompt length: ${systemPrompt.length}`);
        this.log(`User message length: ${userMessage.length}`);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            
            if (this._bearerToken) {
                headers['Authorization'] = `Bearer ${this._bearerToken}`;
            }
            
            const response = await fetch(this._endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const data: OllamaResponse = await response.json();
            
            this.log(`Response data keys: ${Object.keys(data).join(', ')}`);
            if (this._debug) {
                this.log(`Response preview: ${JSON.stringify(data).substring(0, 500)}`);
            }
            
            const content = this.extractContent(data);
            
            this.log(`Response length: ${content.length}`);
            
            return content;
        } catch (error: any) {
            this.log(`API call failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract content from API response (handles both Ollama and OpenAI formats)
     */
    private extractContent(response: OllamaResponse): string {
        // OpenAI format (check first as it's more common with compatible APIs)
        if (response.choices?.[0]?.message?.content !== undefined) {
            const content = response.choices[0].message.content;
            if (content === '' || content.trim() === '') {
                this.log('Warning: API returned empty content');
                return 'NO_COMMENT';
            }
            return content;
        }
        
        // Ollama format
        if (response.message?.content !== undefined) {
            const content = response.message.content;
            if (content === '' || content.trim() === '') {
                this.log('Warning: API returned empty content');
                return 'NO_COMMENT';
            }
            return content;
        }
        
        // Some APIs return content directly
        if ((response as any).content !== undefined) {
            return (response as any).content || 'NO_COMMENT';
        }
        
        // Some APIs return response field
        if ((response as any).response !== undefined) {
            return (response as any).response || 'NO_COMMENT';
        }
        
        // Some APIs return text field
        if ((response as any).text !== undefined) {
            return (response as any).text || 'NO_COMMENT';
        }
        
        // Error response handling
        if ((response as any).error) {
            throw new Error(`API returned error: ${JSON.stringify((response as any).error)}`);
        }
        
        throw new Error(`Unable to extract content from API response. Keys: ${Object.keys(response).join(', ')}`);
    }

    // Getters for properties needed by Ollama class
    get tokenLimit(): number {
        return this._tokenLimit;
    }

    get debugEnabled(): boolean {
        return this._debug;
    }
}
