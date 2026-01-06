# Ollama Code Review Extension

<p align="center">
  <strong>🤖 AI-Powered Code Reviews for Azure DevOps</strong><br>
  Self-hosted • Secure • OpenAI Compatible
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=teriansilva.olcr">📦 Install from Marketplace</a> •
  <a href="https://github.com/teriansilva/azure-devops-ollama-code-reviewer">📖 Documentation</a> •
  <a href="https://buymeacoffee.com/teriansilva">☕ Support</a>
</p>

---

## Why Ollama Code Review?

Transform your pull request workflow with AI-powered code reviews that run entirely on your infrastructure.

| | |
|---|---|
| 🔒 **Self-Hosted** | Your code never leaves your network |
| 🤖 **AI-Powered** | Leverages powerful open-source LLMs |
| 🔄 **OpenAI Compatible** | Works with vLLM, TGI, LiteLLM |
| 📍 **Line-Specific** | Comments appear on exact code lines |
| 💰 **Cost-Effective** | No per-token charges |

---

## Key Features

### 🏗️ Build Log Context
AI sees your pipeline execution - build status, errors, test results.

### 💬 PR Comments Awareness  
AI recognizes existing comments to avoid duplicates.

### 🎯 Custom Best Practices
Define your team's coding standards.

### 📝 Custom System Prompt
Override AI instructions for specialized reviews.

### 🔐 Bearer Token Support
Secure your API endpoints.

---

## Quick Start

### 1. Install the Extension
👉 **[Get it from Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=teriansilva.olcr)**

### 2. Set Up Ollama
```bash
curl https://ollama.ai/install.sh | sh
ollama pull gpt-oss
```

### 3. Add to Your Pipeline
```yaml
pr:
  branches:
    include: ['main']

jobs:
- job: CodeReview
  pool:
    vmImage: 'ubuntu-latest'
  steps:
  - checkout: self
    persistCredentials: true
  - task: OllamaCodeReview@2
    inputs:
      ollama_endpoint: 'http://your-server:11434/api/chat'
      ai_model: 'gpt-oss'
      bugs: true
      performance: true
      best_practices: true
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

---

## Configuration

### Essential Parameters

| Parameter | Description |
|-----------|-------------|
| `ollama_endpoint` | Your Ollama API URL |
| `ai_model` | Model name (e.g., `gpt-oss`) |
| `bugs` / `performance` / `best_practices` | Review categories |

### Context Options

| Parameter | Description |
|-----------|-------------|
| `include_build_logs` | Include pipeline build logs |
| `build_log_tasks` | Filter specific tasks |
| `include_pr_comments` | See existing comments |

### Token Management

| Parameter | Default | Description |
|-----------|---------|-------------|
| `token_limit` | 8192 | Max tokens per request |
| `max_file_content_tokens` | 4000 | File content limit |
| `max_project_context_tokens` | 2000 | Project metadata limit |

### Advanced

| Parameter | Description |
|-----------|-------------|
| `file_extensions` | Extensions to review |
| `file_excludes` | Files to skip |
| `custom_best_practices` | Your coding standards |
| `custom_system_prompt` | Override AI instructions |
| `bearer_token` | API authentication |

---

## Recommended Models

| Model | Use Case |
|-------|----------|
| **gpt-oss** | General code review ⭐ |
| **qwen2.5-coder** | Advanced analysis |
| **deepseek-coder-v2** | Code understanding |
| **codellama** | Stable reviews |
| **llama3.3** | Strong reasoning |

---

## Permissions Required

### Pipeline Settings
Enable **"Allow scripts to access OAuth token"**

### Repository Permissions
Grant **"Contribute to pull requests"** to Build Service

---

## What's New

**v2.4** - OpenAI-compatible API support, build log filtering  
**v2.3** - Token logging, custom system prompt  
**v2.2** - Configurable token limits  
**v2.1** - Line-specific comments, build logs, PR awareness

---

## Support

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=teriansilva.olcr">📦 Marketplace</a> •
  <a href="https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues/new?labels=bug">🐛 Report Bug</a> •
  <a href="https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues/new?labels=enhancement">💡 Feature Request</a> •
  <a href="https://buymeacoffee.com/teriansilva">☕ Buy Me a Coffee</a>
</p>

---

<p align="center">Made with ❤️ for the Azure DevOps community</p>
