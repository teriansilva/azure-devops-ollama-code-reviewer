# Ollama Code Review - Azure DevOps Extension

[![Version](https://img.shields.io/badge/version-2.8.6-blue)](https://github.com/teriansilva/azure-devops-ollama-code-reviewer)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

An Azure DevOps extension that brings AI-powered code reviews to your pull requests using self-hosted Ollama language models. Keep your code secure and private while leveraging powerful AI for automated code analysis.

## Features

- 🔒 **Self-Hosted & Secure** - Run entirely on your own infrastructure
- 🤖 **AI-Powered Reviews** - Leverages Ollama's powerful language models
- 🔄 **4-Pass Verification** - Context check → Review → Format → Verify for accurate feedback
- 🧠 **Agentic Context** - AI can request additional files it needs to review properly
- 📊 **Simplified Diff Format** - Clear REMOVED/ADDED sections prevent AI confusion
- 🐛 **Bug Detection** - Automatically identifies potential bugs
- ⚡ **Performance Analysis** - Highlights performance issues
- 📋 **Best Practices** - Suggests improvements and coding standards
- 🎯 **Custom Best Practices** - Define your own project-specific coding standards
- 📝 **Custom System Prompt** - Complete control over AI behavior
- 🎛️ **Per-Pass Model Selection** - Use different models for each workflow pass
- 🔢 **Configurable Token Limit** - Adjust for models with larger context windows
- 🐞 **Debug Logging** - Extensive logging for troubleshooting
- 📚 **Rich Context** - Provides AI with full file content and project metadata
- 🔧 **Highly Configurable** - Customize review criteria and file filters
- 🔐 **Bearer Token Support** - Secure your API with authentication
- 🌐 **OpenAI-Compatible API** - Works with Ollama and OpenAI-compatible endpoints
- 💰 **Cost-Effective** - No API costs or per-token charges
- 🌍 **Multi-Language Support** - JavaScript, TypeScript, Python, C#, Java and more

## What's New in v2.8

🔄 **4-Pass Review Workflow** - Enhanced accuracy with format enforcement:
- **Pass 1 (Context Check)**: AI determines if it needs additional files
- **Pass 2 (Review)**: AI generates the code review
- **Pass 3 (Format)**: Enforces consistent Summary + Issues Found structure
- **Pass 4 (Verify)**: AI validates its own review against the actual code, removing hallucinations

🎛️ **Per-Pass Model Selection** - Optimize cost and performance:
- Configure different models for each pass (e.g., fast model for context, best model for review)
- Use smaller/faster models for formatting and context checks
- Reserve your most capable model for the actual review pass

📝 **Custom Pass Prompts** - Full control over each workflow stage:
- Override the default prompt for any pass
- Customize context request behavior, review criteria, format rules, and verification logic

🧠 **Agentic Context Requests** - Smarter AI:
- AI can request imported files, interfaces, and base classes
- Smart file fetcher with search fallback for incorrect paths
- Maximum 3 additional files per review to stay focused

📊 **Simplified Diff Format** - Clearer input for AI:
- Transforms git diff into clear REMOVED/ADDED sections
- Prevents AI confusion about what code exists
- Explicit labels: "old code - no longer exists" vs "new code - review this"

🏗️ **Modular Codebase** - Better maintainability:
- Split into focused modules: types, prompts, api-client, ollama, pullrequest, repository
- Easier to extend and customize

## Prerequisites

- A running [Ollama](https://ollama.ai/) instance accessible from your Azure DevOps build agents
- Ollama models installed (e.g., `codellama`, `llama3.1`, `deepseek-coder`)
- Azure DevOps pipeline with OAuth token access enabled

## Installation

1. Install the extension from the [Azure DevOps Marketplace](https://marketplace.visualstudio.com/azuredevops)
2. Configure your pipeline to use the extension

## Quick Start

### 1. Set Up Ollama

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull a recommended model
ollama pull gpt-oss
# Or use another model like qwen2.5-coder, deepseek-coder-v2, or codellama
```

### 2. Add to Your Pipeline

Create or update your pipeline YAML:

```yaml
trigger: none

pr:
  branches:
    include:
      - main
      - develop

jobs:
- job: CodeReview
  pool:
    vmImage: 'ubuntu-latest'
  steps:
  - task: OllamaCodeReview@2
    displayName: 'AI Code Review'
    inputs:
      ollama_endpoint: 'http://your-ollama-server:11434/api/chat'
      ai_model: 'gpt-oss'
      bugs: true
      performance: true
      best_practices: true
      file_extensions: '.js,.ts,.py,.cs'
      file_excludes: 'package-lock.json,*.min.js'
      additional_prompts: 'Check for security vulnerabilities, Verify error handling'
      custom_best_practices: |
        Always use async/await instead of .then() for promises
        All public methods must have JSDoc comments
        Database queries must use parameterized statements
```

### 3. Configure Build Validation

Add [Build validation](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser#build-validation) to your branch policy to trigger automatic code reviews on pull requests.

## Configuration Options

### Connection

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ollama_endpoint` | string | Yes | Full URL to your Ollama API endpoint |
| `ai_model` | string | Yes | Default Ollama model for all passes |
| `bearer_token` | string | No | Bearer token for authenticated endpoints |

### Review Options

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bugs` | boolean | No | Check for bugs (default: `true`) |
| `performance` | boolean | No | Check for performance issues (default: `true`) |
| `best_practices` | boolean | No | Check for best practices (default: `true`) |
| `additional_prompts` | string | No | Custom review instructions (comma-separated) |
| `custom_best_practices` | multiLine | No | Project-specific best practices (one per line) |

### File Filters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file_extensions` | string | No | Comma-separated list of file extensions to review |
| `file_excludes` | string | No | Comma-separated list of files to exclude |

### Multi-Pass Workflow

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `enableMultipass` | boolean | No | Enable 4-pass workflow (default: `true`) |
| `pass1_model` | string | No | Model for context check pass (uses default if empty) |
| `pass1_prompt` | multiLine | No | Custom prompt for context check |
| `pass2_model` | string | No | Model for review pass (uses default if empty) |
| `pass2_prompt` | multiLine | No | Custom prompt for code review |
| `pass3_model` | string | No | Model for format pass (uses default if empty) |
| `pass3_prompt` | multiLine | No | Custom prompt for formatting |
| `pass4_model` | string | No | Model for verify pass (uses default if empty) |
| `pass4_prompt` | multiLine | No | Custom prompt for verification |

### Advanced

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `debug_logging` | boolean | No | Enable extensive debug output (default: `false`) |
| `token_limit` | string | No | Max tokens for AI context (default: `8192`) |

## Securing Your Ollama API

If you need to expose Ollama over the internet, use nginx as a reverse proxy with Bearer token authentication:

```nginx
server {
    listen 443 ssl http2;
    server_name ollama.example.com;

    ssl_certificate /etc/letsencrypt/live/ollama.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ollama.example.com/privkey.pem;

    location / {
        proxy_set_header Authorization $http_authorization;
        
        set $expected "Bearer YOUR_SECRET_TOKEN_HERE";
        if ($http_authorization != $expected) {
            return 401;
        }
        
        proxy_pass http://127.0.0.1:11434;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
    }
}
```

Then use the Bearer token in your pipeline:

```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'https://ollama.example.com/api/chat'
    ai_model: 'gpt-oss'
    bearer_token: '$(OllamaApiToken)'  # Store as pipeline variable
```

## Enhanced Context for Better Reviews

**Version 2.0** provides significantly more context to the AI model:

- **Full File Content** - The AI sees the complete file being changed, not just the diff
- **Project Metadata** - Automatically includes README, package.json, requirements.txt, .csproj files, and more
- **Language-Specific Context** - Detects and includes relevant project files:
  - **JavaScript/TypeScript**: package.json with dependencies
  - **Python**: requirements.txt
  - **C#**: .csproj files, .sln solution files, packages.config
  - **Java**: pom.xml detection

This comprehensive context allows the AI to make more informed suggestions based on your project's actual structure, dependencies, and conventions.

## Custom Best Practices

Define your organization's or team's specific coding standards:

```yaml
- task: OllamaCodeReview@2
  inputs:
    custom_best_practices: |
      Always use async/await instead of .then() for promises
      All public methods must have JSDoc comments
      Database queries must use parameterized statements
      Error messages must be logged with context
      CSS class names must follow BEM methodology
```

The AI will check for these practices in addition to standard bug detection and performance analysis.

## Multi-Pass Workflow Configuration

The 4-pass workflow provides the most accurate reviews by separating concerns:

### Using Different Models Per Pass

Optimize cost and performance by using smaller models for simpler tasks:

```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'http://your-ollama-server:11434/api/chat'
    ai_model: 'gpt-oss'                    # Default model
    enableMultipass: true
    pass1_model: 'qwen2.5-coder:7b'        # Fast model for context check
    pass2_model: 'gpt-oss:20b'             # Best model for review
    pass3_model: 'qwen2.5-coder:7b'        # Fast model for formatting
    pass4_model: 'qwen2.5-coder:14b'       # Medium model for verification
```

### Custom Pass Prompts

Override the default prompts for specific passes:

```yaml
- task: OllamaCodeReview@2
  inputs:
    enableMultipass: true
    pass2_prompt: |
      You are a security-focused code reviewer.
      Focus on: SQL injection, XSS, authentication issues.
      Respond with NO_COMMENT if no security issues found.
    pass4_prompt: |
      Verify each security issue exists in the ADDED code.
      Remove any false positives.
      Respond with NO_COMMENT if no valid issues remain.
```

### Disabling Multi-Pass

For faster (but less accurate) reviews, disable multi-pass:

```yaml
- task: OllamaCodeReview@2
  inputs:
    enableMultipass: false  # Only runs the Review pass
```

## Custom System Prompt (Advanced)

For complete control over the AI's behavior in the review pass, use `pass2_prompt`:

```yaml
- task: OllamaCodeReview@2
  inputs:
    pass2_prompt: |
      You are a security-focused code reviewer. Review the code for:
      - SQL injection vulnerabilities
      - XSS vulnerabilities  
      - Authentication/authorization issues
      
      Respond in markdown. If no issues found, respond with NO_COMMENT.
```

**Note:** When using a custom pass2 prompt, the `bugs`, `performance`, `best_practices`, and `additional_prompts` options are ignored for that pass.

## Token Limit Configuration

Adjust the token limit based on your model's context window:

```yaml
- task: OllamaCodeReview@2
  inputs:
    token_limit: '32768'  # For models with larger context windows
```

Recommended values:
- `8192` - Default, works for most models
- `16384` - Llama 3.2, etc.
- `32768` - qwen2.5-coder:32k
- `65536` - deepseek-coder-v2
- `131072` - Models with 128k context

## Debug Logging

Enable extensive logging for troubleshooting:

```yaml
- task: OllamaCodeReview@2
  inputs:
    debug_logging: true
```

This logs: system prompts, file content, diffs, token counts, API requests/responses, and more.

## Supported Models

The extension works with any Ollama model, but these are particularly well-suited for code reviews:

- **gpt-oss** - Excellent for code review with strong reasoning (Recommended)
- **qwen2.5-coder** - Advanced code analysis and understanding
- **deepseek-coder-v2** - Latest version optimized for code understanding
- **codellama** - Meta's specialized code model (stable)
- **llama3.3** / **llama3.2** - Latest Llama models with improved reasoning
- **mistral-large** / **mixtral** - Efficient general-purpose models
- **codegemma** - Google's code-focused model

Run `ollama list` to see all available models on your server.

## Permissions Required

### Agent Job Settings
Enable "Allow scripts to access OAuth token" in your pipeline settings. [Learn more](https://learn.microsoft.com/en-us/azure/devops/pipelines/build/options?view=azure-devops#allow-scripts-to-access-the-oauth-token).

### Build Service Permissions
Grant "Contribute to pull requests" permission to your build service account. [See Stack Overflow guide](https://stackoverflow.com/a/57985733).

## Troubleshooting

### Task Skips with "Must be triggered by Pull Request"
- Ensure the pipeline is triggered by a Pull Request, not manually
- Check that your PR trigger is configured correctly in the YAML

### OAuth Token Error
- Enable "Allow scripts to access OAuth token" in pipeline settings
- Verify build service has proper permissions

### Connection Issues
- Verify Ollama endpoint is accessible from build agents
- Check firewall rules and network configuration
- Test endpoint connectivity with curl/wget

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
cd src
npx tsc

# Build extension
cd ..
npx tfx-cli extension create
```

### Project Structure

```
.
├── src/
│   ├── main.ts           # Entry point
│   ├── types.ts          # TypeScript interfaces and types
│   ├── prompts.ts        # Prompt builder for all passes
│   ├── api-client.ts     # HTTP client for Ollama API
│   ├── ollama.ts         # Ollama integration and multi-pass orchestration
│   ├── pullrequest.ts    # Azure DevOps PR API
│   ├── repository.ts     # Git repository operations
│   └── task.json         # Task definition
├── assets/
│   └── overview.md       # Extension documentation
├── vss-extension.json    # Extension manifest
└── package.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- 🐛 [Report a Bug](https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues/new?labels=bug)
- 💡 [Request a Feature](https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues/new?labels=enhancement)
- 📖 [Documentation](https://github.com/teriansilva/azure-devops-ollama-code-reviewer)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Ollama](https://ollama.ai/)
- Powered by open-source language models
- Inspired by the Azure DevOps community

## Links

- [Azure DevOps Marketplace](https://marketplace.visualstudio.com/azuredevops)
- [GitHub Repository](https://github.com/teriansilva/azure-devops-ollama-code-reviewer)
- [Ollama Documentation](https://ollama.ai/)

---

Made with ❤️ for the Azure DevOps community
