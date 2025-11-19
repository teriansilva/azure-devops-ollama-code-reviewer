# Ollama Code Review - Azure DevOps Extension

[![Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/teriansilva/azure-devops-ollama-code-reviewer)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

An Azure DevOps extension that brings AI-powered code reviews to your pull requests using self-hosted Ollama language models. Keep your code secure and private while leveraging powerful AI for automated code analysis.

## Features

- 🔒 **Self-Hosted & Secure** - Run entirely on your own infrastructure
- 🤖 **AI-Powered Reviews** - Leverages Ollama's powerful language models
- 🐛 **Bug Detection** - Automatically identifies potential bugs
- ⚡ **Performance Analysis** - Highlights performance issues
- 📋 **Best Practices** - Suggests improvements and coding standards
- 🎯 **Custom Best Practices** - Define your own project-specific coding standards
- 📚 **Rich Context** - Provides AI with full file content and project metadata
- 🔧 **Highly Configurable** - Customize review criteria and file filters
- 🔐 **Bearer Token Support** - Secure your API with authentication
- 💰 **Cost-Effective** - No API costs or per-token charges
- 🌐 **Multi-Language Support** - JavaScript, TypeScript, Python, C#, Java and more

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
  - task: OllamaCodeReview@1
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

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ollama_endpoint` | string | Yes | Full URL to your Ollama API endpoint |
| `ai_model` | string | Yes | Ollama model name (e.g., `codellama`, `llama3.1`) |
| `bugs` | boolean | No | Check for bugs (default: `true`) |
| `performance` | boolean | No | Check for performance issues (default: `true`) |
| `best_practices` | boolean | No | Check for best practices (default: `true`) |
| `file_extensions` | string | No | Comma-separated list of file extensions to review |
| `file_excludes` | string | No | Comma-separated list of files to exclude |
| `additional_prompts` | string | No | Custom review instructions |
| `custom_best_practices` | multiLine | No | Project-specific best practices (one per line) |
| `bearer_token` | string | No | Bearer token for authenticated endpoints |

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
- task: OllamaCodeReview@1
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
- task: OllamaCodeReview@1
  inputs:
    custom_best_practices: |
      Always use async/await instead of .then() for promises
      All public methods must have JSDoc comments
      Database queries must use parameterized statements
      Error messages must be logged with context
      CSS class names must follow BEM methodology
```

The AI will check for these practices in addition to standard bug detection and performance analysis.

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
│   ├── ollama.ts         # Ollama API integration
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
