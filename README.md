# Ollama Code Review - Azure DevOps Extension

[![Version](https://img.shields.io/badge/version-1.0.1-blue)](https://github.com/teriansilva/azure-devops-ollama-code-reviewer)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

An Azure DevOps extension that brings AI-powered code reviews to your pull requests using self-hosted Ollama language models. Keep your code secure and private while leveraging powerful AI for automated code analysis.

## Features

- 🔒 **Self-Hosted & Secure** - Run entirely on your own infrastructure
- 🤖 **AI-Powered Reviews** - Leverages Ollama's powerful language models
- 🐛 **Bug Detection** - Automatically identifies potential bugs
- ⚡ **Performance Analysis** - Highlights performance issues
- 📋 **Best Practices** - Suggests improvements and coding standards
- 🔧 **Highly Configurable** - Customize review criteria and file filters
- 🔐 **Bearer Token Support** - Secure your API with authentication
- 💰 **Cost-Effective** - No API costs or per-token charges

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

# Pull a model
ollama pull codellama
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
      ai_model: 'codellama'
      bugs: true
      performance: true
      best_practices: true
      file_extensions: '.js,.ts,.py,.cs'
      file_excludes: 'package-lock.json,*.min.js'
      additional_prompts: 'Check for security vulnerabilities, Verify error handling'
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
    ai_model: 'codellama'
    bearer_token: '$(OllamaApiToken)'  # Store as pipeline variable
```

## Supported Models

The extension works with any Ollama model, but these are particularly well-suited for code reviews:

- **codellama** - Meta's specialized code model
- **llama3.1** / **llama3.2** - General-purpose with strong reasoning
- **deepseek-coder** - Optimized for code understanding
- **qwen2.5-coder** - Advanced code analysis
- **mistral** / **mixtral** - Efficient general-purpose models

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
