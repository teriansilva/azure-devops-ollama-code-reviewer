# Ollama Code Review - Azure DevOps Extension

[![Version](https://img.shields.io/badge/version-2.8.8-blue)](https://github.com/teriansilva/azure-devops-ollama-code-reviewer)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

An Azure DevOps extension that brings AI-powered code reviews to your pull requests using self-hosted Ollama language models. Keep your code secure and private while leveraging powerful AI for automated code analysis.

**Works with both Ollama native API and OpenAI-compatible endpoints** (vLLM, text-generation-inference, LiteLLM, etc.)

---

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

```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'https://ollama.example.com/api/chat'
    ai_model: 'gpt-oss'
    bearer_token: '$(OllamaApiToken)'  # Store as pipeline variable
```

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
