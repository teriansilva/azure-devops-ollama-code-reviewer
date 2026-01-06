# Ollama Code Review - Azure DevOps Extension

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=teriansilva.olcr"><img src="https://img.shields.io/badge/Marketplace-Install%20Now-blue?logo=visualstudio&style=for-the-badge" alt="Install from Marketplace"></a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=teriansilva.olcr"><img src="https://img.shields.io/badge/version-2.4.7-blue" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
  <a href="https://buymeacoffee.com/teriansilva"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support-yellow?logo=buy-me-a-coffee" alt="Buy Me a Coffee"></a>
</p>

<p align="center">
  <strong>AI-powered code reviews for Azure DevOps using self-hosted Ollama models</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=teriansilva.olcr">📦 Marketplace</a> •
  <a href="#quick-start">🚀 Quick Start</a> •
  <a href="#features">✨ Features</a> •
  <a href="#configuration">⚙️ Configuration</a> •
  <a href="https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues">🐛 Issues</a>
</p>

---

## Overview

An Azure DevOps extension that brings AI-powered code reviews to your pull requests using self-hosted Ollama language models. Keep your code secure and private while leveraging powerful AI for automated code analysis.

**Works with both Ollama native API and OpenAI-compatible endpoints** (vLLM, text-generation-inference, LiteLLM, etc.)

---

## Features

| Feature | Description |
|---------|-------------|
| 🔒 **Self-Hosted & Secure** | Run entirely on your own infrastructure - no data sent externally |
| 🤖 **AI-Powered Reviews** | Leverages Ollama's powerful language models |
| 🔄 **OpenAI Compatible** | Works with OpenAI-compatible APIs (vLLM, TGI, LiteLLM) |
| 📍 **Line-Specific Comments** | Comments appear directly on the relevant code lines |
| 🏗️ **Build Log Context** | Include pipeline build logs for comprehensive analysis |
| 💬 **PR Comments Awareness** | AI sees existing comments to avoid duplicates |
| 🎯 **Custom Best Practices** | Define your own project-specific coding standards |
| 📝 **Custom System Prompt** | Override AI instructions for specialized reviews |
| 🔐 **Bearer Token Support** | Secure your API with authentication |
| 💰 **Cost-Effective** | No API costs or per-token charges |

---

## Quick Start

### Prerequisites

- [Ollama](https://ollama.ai/) instance accessible from your build agents
- Model installed (e.g., `ollama pull gpt-oss`)
- Azure DevOps pipeline with OAuth token access

### 1. Install the Extension

👉 **[Install from Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=teriansilva.olcr)**

### 2. Configure Permissions

**Enable OAuth Token Access** in your pipeline:

```yaml
jobs:
- job: CodeReview
  pool:
    vmImage: 'ubuntu-latest'
  steps:
  - checkout: self
    persistCredentials: true
  - task: OllamaCodeReview@2
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

**Grant Build Service Permissions:**
1. **Project Settings** → **Repositories** → Select repo → **Security**
2. Find Build Service account → Set **"Contribute to pull requests"** to **Allow**

### 3. Add to Your Pipeline

```yaml
trigger: none

pr:
  branches:
    include:
      - main

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
```

### 4. Set Up Build Validation

Add [Build Validation](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser#build-validation) to your branch policy to trigger reviews on PRs.

---

## Configuration

### Basic Options

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `ollama_endpoint` | ✅ | - | Full URL to your Ollama/OpenAI-compatible API |
| `ai_model` | ✅ | - | Model name (e.g., `gpt-oss`, `codellama`) |
| `bugs` | ❌ | `true` | Check for bugs |
| `performance` | ❌ | `true` | Check for performance issues |
| `best_practices` | ❌ | `true` | Check for best practices |

### File Filtering

| Parameter | Description |
|-----------|-------------|
| `file_extensions` | Comma-separated extensions to review (e.g., `.js,.ts,.py`) |
| `file_excludes` | Comma-separated files to exclude (e.g., `*.min.js,*.lock`) |

### Context Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `include_build_logs` | `false` | Include pipeline build log context |
| `build_log_tasks` | all | Filter which tasks to include (e.g., `Build,Test`) |
| `include_pr_comments` | `false` | Include existing PR comments to avoid duplicates |

### Token Management

| Parameter | Default | Description |
|-----------|---------|-------------|
| `token_limit` | `8192` | Maximum tokens per request |
| `max_file_content_tokens` | `4000` | Max tokens for file content |
| `max_project_context_tokens` | `2000` | Max tokens for project metadata |

### Advanced

| Parameter | Description |
|-----------|-------------|
| `additional_prompts` | Custom review instructions (comma-separated) |
| `custom_best_practices` | Project-specific standards (one per line) |
| `custom_system_prompt` | Override default AI instructions |
| `bearer_token` | Bearer token for authenticated endpoints |

---

## Advanced Usage

### Build Log Context

Give AI visibility into pipeline execution:

```yaml
inputs:
  include_build_logs: true
  build_log_tasks: 'Build,Test,DotNetCoreCLI'
```

### PR Comments Awareness

Avoid duplicate feedback across multiple runs:

```yaml
inputs:
  include_pr_comments: true
```

### Token Limits by Model

| Model | Recommended Limit |
|-------|-------------------|
| `codellama` | 8,192 |
| `qwen2.5-coder` | 32,768 |
| `gpt-oss` | 32,768 |
| `llama3.2` / `llama3.3` | 131,072 |
| `deepseek-coder-v2` | 131,072 |

### Custom System Prompt

```yaml
inputs:
  custom_system_prompt: |
    You are a security engineer. Focus ONLY on security issues.
    Respond with JSON: {"comments": [{"lineNumber": <n>, "comment": "<text>"}]}
```

### Securing with nginx + Bearer Token

```nginx
server {
    listen 443 ssl http2;
    server_name ollama.example.com;
    
    location / {
        set $expected "Bearer YOUR_TOKEN";
        if ($http_authorization != $expected) { return 401; }
        proxy_pass http://127.0.0.1:11434;
    }
}
```

```yaml
inputs:
  bearer_token: '$(OllamaApiToken)'
```

---

## Recommended Models

| Model | Best For |
|-------|----------|
| **gpt-oss** | General code review (recommended) |
| **qwen2.5-coder** | Advanced code analysis |
| **deepseek-coder-v2** | Code understanding |
| **codellama** | Stable, reliable reviews |
| **llama3.3** | Strong reasoning |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Must be triggered by Pull Request" | Ensure pipeline is triggered by PR, not manually |
| OAuth token error | Enable "Allow scripts to access OAuth token" |
| 403 Forbidden | Grant "Contribute to pull requests" to Build Service |
| Connection issues | Verify Ollama endpoint is accessible from agents |

---

## Version History

| Version | Highlights |
|---------|------------|
| **2.4.7** | Documentation updates, Buy Me a Coffee support |
| **2.4.5** | OpenAI-compatible API support |
| **2.4.0** | Build log task filtering |
| **2.3.0** | Token logging, context limits, custom system prompt |
| **2.2.0** | Configurable token limits |
| **2.1.0** | Line-specific comments, build logs, PR awareness |
| **2.0.0** | Enhanced context, custom best practices |

---

## Support

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=teriansilva.olcr">📦 Marketplace</a> •
  <a href="https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues/new?labels=bug">🐛 Report Bug</a> •
  <a href="https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues/new?labels=enhancement">💡 Request Feature</a> •
  <a href="https://buymeacoffee.com/teriansilva">☕ Buy Me a Coffee</a>
</p>

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">Made with ❤️ for the Azure DevOps community</p>
