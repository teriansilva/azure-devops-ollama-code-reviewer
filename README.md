# Ollama Code Review - Azure DevOps Extension

[![Version](https://img.shields.io/badge/version-2.4.6-blue)](https://github.com/teriansilva/azure-devops-ollama-code-reviewer)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

An Azure DevOps extension that brings AI-powered code reviews to your pull requests using self-hosted Ollama language models. Keep your code secure and private while leveraging powerful AI for automated code analysis.

## Features

- 🔒 **Self-Hosted & Secure** - Run entirely on your own infrastructure
- 🤖 **AI-Powered Reviews** - Leverages Ollama's powerful language models
- � **OpenAI Compatible** - Works with both Ollama native and OpenAI-compatible APIs
- �📍 **Line-Specific Comments** - Comments appear directly on the relevant code lines
- 🐛 **Bug Detection** - Automatically identifies potential bugs
- ⚡ **Performance Analysis** - Highlights performance issues
- 📋 **Best Practices** - Suggests improvements and coding standards
- 🎯 **Custom Best Practices** - Define your own project-specific coding standards
- 📚 **Rich Context** - Provides AI with original file content and project metadata
- 🏗️ **Build Log Context** - Include pipeline build logs for comprehensive analysis
- 🎯 **Build Log Filtering** - Filter which tasks to include in build logs
- 💬 **PR Comments Awareness** - AI sees existing comments to avoid duplicates
- 🔧 **Highly Configurable** - Customize review criteria and file filters
- 🔐 **Bearer Token Support** - Secure your API with authentication
- 💰 **Cost-Effective** - No API costs or per-token charges
- 🌐 **Multi-Language Support** - JavaScript, TypeScript, Python, C#, Java and more

## Prerequisites

- A running [Ollama](https://ollama.ai/) instance accessible from your Azure DevOps build agents
- Ollama models installed (e.g., `codellama`, `llama3.1`, `deepseek-coder`)
- Azure DevOps pipeline with OAuth token access enabled

## ⚠️ Required Permissions Setup

Before using this extension, you **must** configure the following permissions:

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

The Build Service account needs permission to comment on pull requests:

1. Go to **Project Settings** → **Repositories**
2. Select your repository
3. Click the **Security** tab
4. Find your Build Service account:
   - For project-scoped: `[Project Name] Build Service ([Organization])`
   - For collection-scoped: `Project Collection Build Service ([Organization])`
5. Set **"Contribute to pull requests"** to **Allow**

> **Note:** If you see a `403 Forbidden` error, this permission is missing.

For detailed instructions, see [this Stack Overflow guide](https://stackoverflow.com/a/57985733).

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
| `include_build_logs` | boolean | No | Include build log context from previous pipeline steps (default: `false`) |
| `build_log_tasks` | string | No | Comma-separated task names to filter build logs (default: all tasks) |
| `include_pr_comments` | boolean | No | Include existing PR comments to avoid duplicates (default: `false`) |
| `token_limit` | string | No | Maximum tokens per request (default: `8192`) |
| `max_file_content_tokens` | string | No | Max tokens for file content (default: `4000`) |
| `max_project_context_tokens` | string | No | Max tokens for project context (default: `2000`) |
| `custom_system_prompt` | multiLine | No | Override the default AI system prompt (advanced) |

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

**Version 2.0+** provides comprehensive context to the AI model:

- **Full File Content** - The AI sees the complete current file (after changes)
- **Code Diff** - Shows exactly what was added and removed
- **Project Metadata** - Automatically includes README, package.json, requirements.txt, .csproj files, and more
- **Language-Specific Context** - Detects and includes relevant project files:
  - **JavaScript/TypeScript**: package.json with dependencies
  - **Python**: requirements.txt
  - **C#**: .csproj files, .sln solution files, packages.config
  - **Java**: pom.xml detection

This comprehensive context allows the AI to make more informed suggestions based on your project's actual structure, dependencies, and conventions.

## Build Log Context

**New in v2.1**: Enable build log context to give the AI visibility into your pipeline execution:

```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'http://your-ollama-server:11434/api/chat'
    ai_model: 'gpt-oss'
    include_build_logs: true
```

When enabled, the AI receives:
- **Build status** - Whether previous steps passed or failed
- **Compilation output** - Errors and warnings from build steps
- **Test results** - Output from test execution steps
- **Build metadata** - Build number, source branch, and definition name

### Filtering Build Log Tasks (v2.4)

Filter which tasks to include in build logs to reduce token usage and focus on relevant output:

```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'http://your-ollama-server:11434/api/chat'
    ai_model: 'gpt-oss'
    include_build_logs: true
    build_log_tasks: 'Build,Test,DotNetCoreCLI'  # Only include matching tasks
```

Examples:
- `Build,Test` - Include only Build and Test tasks
- `DotNetCoreCLI,VSTest` - Include .NET build and test output
- `npm,webpack` - Include npm and webpack task output
- Leave empty to include all tasks

This helps the AI understand if the project builds successfully and identify if code changes might relate to any build issues.

## PR Comments Awareness

**New in v2.1**: The AI can see existing PR comments to provide more relevant feedback:

```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'http://your-ollama-server:11434/api/chat'
    ai_model: 'gpt-oss'
    include_pr_comments: true
```

When enabled:
- **Human reviewer comments** are shown to the AI to avoid duplicating their feedback
- **Previous AI comments** are marked as `[AI - Previous Review]` so the model recognizes its own prior comments
- **No duplicate comments** - The AI is instructed not to repeat points already made
- **Thread status** - Shows whether comments are Active, Fixed, Closed, etc.

This is especially useful when running the code review multiple times on the same PR, ensuring the AI provides fresh insights each time.

## Line-Specific Comments

**New in v2.1**: Comments now appear directly on the specific lines of code they reference:

- Each comment is posted as a separate thread at the exact line in the PR diff
- Makes it easier for reviewers to understand the context
- Comments are positioned on the new/modified lines from the changes
- Multiple comments per file are supported

## Token Limit Configuration

**New in v2.2**: Configure the maximum token limit based on your model's context window:

```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'http://your-ollama-server:11434/api/chat'
    ai_model: 'qwen2.5-coder:32k'
    token_limit: '32768'
```

### How It Works

1. The task calculates the total tokens needed (system prompt + file content + diff + project context)
2. If the total exceeds `token_limit`, it falls back to reviewing with just the diff
3. If even the diff exceeds the limit, the file is skipped with a warning

### Recommended Token Limits by Model

| Model | Recommended Token Limit | Context Window |
|-------|------------------------|----------------|
| `codellama` | `8192` | 8K |
| `codellama:13b` | `16384` | 16K |
| `codellama:34b` | `16384` | 16K |
| `llama3.2` | `131072` | 128K |
| `llama3.3` | `131072` | 128K |
| `qwen2.5-coder` | `32768` | 32K |
| `qwen2.5-coder:32k` | `32768` | 32K |
| `qwen2.5-coder:7b` | `131072` | 128K |
| `deepseek-coder-v2` | `131072` | 128K |
| `deepseek-coder-v2:16b` | `131072` | 128K |
| `mistral` | `32768` | 32K |
| `mistral-large` | `131072` | 128K |
| `mixtral` | `32768` | 32K |
| `codegemma` | `8192` | 8K |
| `gpt-oss` | `32768` | 32K |
| `gpt-oss:7b` | `32768` | 32K |
| `gpt-oss:13b` | `32768` | 32K |
| `gpt-oss:20b` | `32768` | 32K |
| `gpt-oss:70b` | `131072` | 128K |

### Tips

- **Start conservative**: If unsure, use the default `8192` and increase if you see "exceeds token limit" warnings
- **Match your model**: Check your model's actual context window with `ollama show <model>`
- **Large files**: For projects with large files, use models with bigger context windows
- **Leave headroom**: Set the limit slightly below the model's maximum to account for response tokens

## Context Token Management

**New in v2.3**: Fine-tune how much context is sent to the AI:

```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'http://your-ollama-server:11434/api/chat'
    ai_model: 'qwen2.5-coder'
    token_limit: '32768'
    max_file_content_tokens: '8000'      # More file context
    max_project_context_tokens: '2000'   # Less project metadata
```

### Token Breakdown Logging

The task now logs detailed token counts for each file:

```
Token breakdown for src/components/MyComponent.vue:
  - System Message: 450 tokens
  - Context Message: 5200 tokens
    (includes project context, file content, diff)
  - Diff only: 320 tokens
  - Total: 5650 tokens (limit: 32768)
Proceeding with full context review for src/components/MyComponent.vue
```

This helps you:
- Understand where tokens are being used
- Optimize your configuration for your specific codebase
- Debug "exceeds token limit" warnings

### Recommended Context Limits

| Scenario | `max_file_content_tokens` | `max_project_context_tokens` |
|----------|---------------------------|------------------------------|
| Small context window (8K) | `2000` | `1000` |
| Medium context window (32K) | `8000` | `2000` |
| Large context window (128K) | `20000` | `4000` |
| Diff-only mode | `0` | `0` |

## Custom System Prompt

**New in v2.3**: Override the default AI instructions with your own system prompt:

```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'http://your-ollama-server:11434/api/chat'
    ai_model: 'qwen2.5-coder'
    custom_system_prompt: |
      You are a senior security engineer reviewing code for vulnerabilities.
      Focus ONLY on security issues: SQL injection, XSS, CSRF, auth bypasses.
      
      Respond with valid JSON:
      {
        "comments": [
          {"lineNumber": <number>, "comment": "<security issue description>"}
        ]
      }
      
      If no security issues found, respond: {"comments": []}
```

### Important Notes

- **JSON format required**: Your custom prompt MUST instruct the AI to respond with the JSON format shown above, or comments won't be posted
- **Complete override**: The custom prompt replaces the entire default system message
- **Use cases**: Security-focused reviews, domain-specific checks, different languages, custom output styles

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

## Version History

### v2.4.6
- 🐛 **Bug Fixes** - Improved response handling and logging

### v2.4.5
- 🔄 **OpenAI-Compatible API Support** - Now works with OpenAI-compatible endpoints (e.g., vLLM, text-generation-inference, LiteLLM)
- 📡 **Dual Response Format** - Automatically detects and handles both Ollama native (`message.content`) and OpenAI (`choices[0].message.content`) response formats

### v2.4.0
- 🎯 **Build Log Task Filter** - New `build_log_tasks` parameter to filter which pipeline tasks to include in build logs
- 📊 **Improved Log Names** - Build logs now show actual task names instead of log IDs

### v2.3.0
- 📊 **Detailed Token Logging** - See exact token counts for each component (system message, context, diff) in pipeline logs
- ⚙️ **Configurable Context Limits** - Control token allocation with `max_file_content_tokens` and `max_project_context_tokens`
- 📝 **Custom System Prompt** - Override the default AI instructions with your own system prompt
- 🔧 **Smart Truncation** - Large files and context are automatically truncated to fit within limits
- 📉 **Better Diagnostics** - Clear breakdown of token usage to help optimize configuration

### v2.2.0
- ⚙️ **Configurable Token Limit** - Set the maximum token limit based on your model's context window
- 📏 **Model-Specific Recommendations** - Documentation for recommended token limits per model
- 🔧 **Better Error Messages** - Token limit warnings now show the configured limit value

### v2.1.0
- 📍 **Line-Specific Comments** - Comments now appear directly on the relevant code lines instead of at the top of the file
- 🏗️ **Build Log Context** - Optionally include pipeline build logs to give AI visibility into build status, compilation errors, and test results
- 💬 **PR Comments Awareness** - AI can see existing human and AI comments to avoid duplicating feedback
- 🔄 **Duplicate Prevention** - Previous AI comments are marked and recognized to prevent repeating the same points
- 📊 **Structured Output** - AI now returns structured JSON for more reliable comment placement

### v2.0.0
- 🎉 **Enhanced AI Context** - AI now receives complete file content instead of just diffs
- 📚 **Project Metadata** - Automatically includes README, package.json, requirements.txt, .csproj, and more
- 🎯 **Custom Best Practices** - Define your own project-specific coding standards
- 🌐 **Improved Language Support** - Better detection for JavaScript, TypeScript, Python, C#, and Java projects
- 🔐 **Bearer Token Support** - Secure your Ollama API with authentication

### v1.0.0
- Initial release
- Basic AI-powered code review functionality
- Support for bug detection, performance analysis, and best practices
- File extension filtering and exclusions
- Multi-language support

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
