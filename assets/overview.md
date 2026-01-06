# Ollama Code Review Extension

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support-yellow?logo=buy-me-a-coffee)](https://buymeacoffee.com/teriansilva)

## Supercharge Your Code Reviews with Self-Hosted AI

Welcome to the Ollama Code Review Extension – your ally in building top-notch software! This extension seamlessly integrates Ollama's powerful self-hosted language models into your Azure DevOps pipeline, transforming code reviews into an intelligent and efficient process while keeping your code secure on your own infrastructure.

### Get Started Now!

Enhance your development workflow with Ollama Code Review. Start receiving intelligent and actionable insights on your code changes using your own self-hosted AI models. Install the extension today and experience the future of code reviews with complete control over your data!

## Why Choose Ollama Code Review?

- **🔒 Self-Hosted & Secure** - Keep your code and reviews completely private on your own infrastructure
- **🤖 AI-Powered Insights** - Leverage powerful open-source language models for insightful code reviews
- **🔄 OpenAI Compatible** - Works with both Ollama native and OpenAI-compatible APIs (vLLM, text-generation-inference, LiteLLM)
- **📍 Line-Specific Comments** - Comments appear directly on the relevant code lines in PR diffs
- **🏗️ Build Log Context** - Include pipeline build logs for comprehensive analysis
- **💬 PR Comments Awareness** - AI sees existing comments to avoid duplicates
- **🎯 Custom Best Practices** - Define your organization's specific coding standards
- **📚 Rich Context** - AI receives full file content, project metadata, and dependencies
- **💰 Cost-Effective** - No API costs or per-token charges
- **🌐 Multi-Language Support** - JavaScript, TypeScript, Python, C#, Java, and more

## What's New in v2.4

🔄 **OpenAI-Compatible API Support** - Now works with OpenAI-compatible endpoints (vLLM, text-generation-inference, LiteLLM)

🎯 **Build Log Task Filter** - New `build_log_tasks` parameter to filter which pipeline tasks to include in build logs

📊 **Improved Build Logs** - Build logs now show actual task display names instead of log IDs

📡 **Dual Response Format** - Automatically detects and handles both Ollama native and OpenAI response formats

## What's New in v2.3

📊 **Detailed Token Logging** - See exact token counts for each component in pipeline logs

⚙️ **Configurable Context Limits** - Control token allocation with `max_file_content_tokens` and `max_project_context_tokens`

📝 **Custom System Prompt** - Override the default AI instructions with your own system prompt

🔧 **Smart Truncation** - Large files and context are automatically truncated to fit within limits

## What's New in v2.2

⚙️ **Configurable Token Limit** - Set the maximum token limit based on your model's context window

📏 **Model-Specific Recommendations** - Documentation for recommended token limits per model

## What's New in v2.1

📍 **Line-Specific Comments** - Comments now appear directly on the relevant code lines

🏗️ **Build Log Context** - Include pipeline build logs for AI visibility into build status

💬 **PR Comments Awareness** - AI can see existing comments to avoid duplicating feedback

🔄 **Duplicate Prevention** - Previous AI comments are recognized and not repeated

## What's New in v2.0

🎉 **Enhanced AI Context** - AI receives complete file content, not just diffs

📚 **Project Metadata** - Automatically includes README, package.json, requirements.txt, .csproj, etc.

🎯 **Custom Best Practices** - Define your own project-specific coding standards

🔐 **Bearer Token Support** - Secure your Ollama API with authentication

## Prerequisites

- A running [Ollama](https://ollama.ai/) instance accessible from your build agents
- Ollama models installed (e.g., `ollama pull gpt-oss` or `ollama pull qwen2.5-coder`)
- Azure DevOps pipeline with OAuth token access enabled

## ⚠️ Required Permissions Setup

### 1. Enable OAuth Token Access

In your pipeline YAML, enable script access to the OAuth token:

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

Or enable it in the classic editor: **Agent job** → **Additional options** → ✅ **Allow scripts to access the OAuth token**

### 2. Grant Build Service Permissions

1. Go to **Project Settings** → **Repositories**
2. Select your repository → **Security** tab
3. Find your Build Service account
4. Set **"Contribute to pull requests"** to **Allow**

## Getting Started

### 1. Set up Ollama

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull a recommended model
ollama pull gpt-oss
```

### 2. Add to Your Pipeline

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
      include_build_logs: true
      include_pr_comments: true
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
| `file_extensions` | string | No | Comma-separated file extensions to review |
| `file_excludes` | string | No | Comma-separated files to exclude |
| `additional_prompts` | string | No | Custom review instructions |
| `custom_best_practices` | multiLine | No | Project-specific best practices |
| `bearer_token` | string | No | Bearer token for authenticated endpoints |
| `include_build_logs` | boolean | No | Include build log context (default: `false`) |
| `build_log_tasks` | string | No | Filter build logs by task names |
| `include_pr_comments` | boolean | No | Include existing PR comments (default: `false`) |
| `token_limit` | string | No | Maximum tokens per request (default: `8192`) |
| `max_file_content_tokens` | string | No | Max tokens for file content (default: `4000`) |
| `max_project_context_tokens` | string | No | Max tokens for project context (default: `2000`) |
| `custom_system_prompt` | multiLine | No | Override the default AI system prompt |

## Build Log Context

Enable build log context to give the AI visibility into your pipeline execution:

```yaml
- task: OllamaCodeReview@2
  inputs:
    include_build_logs: true
    build_log_tasks: 'Build,Test,DotNetCoreCLI'  # Optional: filter tasks
```

The AI receives build status, compilation output, test results, and build metadata.

## PR Comments Awareness

Enable to let the AI see existing comments and avoid duplicates:

```yaml
- task: OllamaCodeReview@2
  inputs:
    include_pr_comments: true
```

Previous AI comments are marked as `[AI - Previous Review]` so the model recognizes and won't repeat them.

## Token Limit Configuration

Configure based on your model's context window:

```yaml
- task: OllamaCodeReview@2
  inputs:
    token_limit: '32768'
    max_file_content_tokens: '8000'
    max_project_context_tokens: '2000'
```

### Recommended Token Limits

| Model | Token Limit | Context Window |
|-------|-------------|----------------|
| `codellama` | `8192` | 8K |
| `llama3.2` / `llama3.3` | `131072` | 128K |
| `qwen2.5-coder` | `32768` | 32K |
| `deepseek-coder-v2` | `131072` | 128K |
| `gpt-oss` | `32768` | 32K |
| `mistral-large` | `131072` | 128K |

## Custom System Prompt

Override the default AI instructions:

```yaml
- task: OllamaCodeReview@2
  inputs:
    custom_system_prompt: |
      You are a security engineer. Focus ONLY on security issues.
      Respond with valid JSON: {"comments": [{"lineNumber": <n>, "comment": "<text>"}]}
```

## Securing Your Ollama API

Use nginx as a reverse proxy with Bearer token authentication:

```nginx
server {
    listen 443 ssl http2;
    server_name ollama.example.com;

    ssl_certificate /etc/letsencrypt/live/ollama.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ollama.example.com/privkey.pem;

    location / {
        set $expected "Bearer YOUR_SECRET_TOKEN_HERE";
        if ($http_authorization != $expected) {
            return 401;
        }
        
        proxy_pass http://127.0.0.1:11434;
        proxy_http_version 1.1;
        proxy_buffering off;
    }
}
```

Then use the bearer_token parameter:

```yaml
- task: OllamaCodeReview@2
  inputs:
    bearer_token: '$(OllamaApiToken)'
```

## Supported Models

- **gpt-oss** - Excellent for code review (Recommended)
- **qwen2.5-coder** - Advanced code analysis
- **deepseek-coder-v2** - Optimized for code understanding
- **codellama** - Meta's specialized code model
- **llama3.3** / **llama3.2** - Strong reasoning
- **mistral-large** / **mixtral** - Efficient general-purpose
- **codegemma** - Google's code-focused model

## FAQ

### Q: What agent job settings are required?

A: Ensure "Allow scripts to access OAuth token" is enabled. See [documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/build/options?view=azure-devops#allow-scripts-to-access-the-oauth-token).

### Q: What permissions are required?

A: Build Administrators must have "Contribute to pull requests" access. See [this guide](https://stackoverflow.com/a/57985733).

## Support

- 🐛 [Report a Bug](https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues/new?labels=bug)
- 💡 [Request a Feature](https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues/new?labels=enhancement)
- 📖 [GitHub Repository](https://github.com/teriansilva/azure-devops-ollama-code-reviewer)
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/teriansilva)

---

Made with ❤️ for the Azure DevOps community
