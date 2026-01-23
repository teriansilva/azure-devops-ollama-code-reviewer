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

- **Self-Hosted & Secure:** Keep your code and reviews completely private on your own infrastructure. No data sent to external cloud services.
- **4-Pass Verification (v2.8):** Context check → Review → Format → Verify workflow ensures accurate, hallucination-free feedback.
- **Per-Pass Model Selection (v2.8):** Use different models for each pass - fast models for context/format, best models for review.
- **Custom Pass Prompts (v2.8):** Override the default prompt for any workflow pass.
- **Agentic Context:** AI can request additional files (imports, interfaces, base classes) for smarter reviews.
- **Simplified Diff Format:** Clear REMOVED/ADDED sections prevent AI confusion about what code exists.
- **Automated Code Reviews:** Say goodbye to manual code inspections! Let Ollama analyze your code changes, catching bugs, performance issues, and suggesting best practices.
- **AI-Powered Insights:** Leverage powerful open-source language models like CodeLlama, Llama 3, DeepSeek Coder, and more to receive insightful comments on your pull requests.
- **Configurable Token Limit:** Adjust for models with larger context windows (8k to 128k+).
- **Debug Logging:** Extensive logging for troubleshooting issues.
- **OpenAI-Compatible:** Works with Ollama and any OpenAI-compatible API endpoint.
- **Enhanced Context:** The AI receives the full file content, project metadata (README, dependencies), and language-specific project files for more informed reviews.
- **Custom Best Practices:** Define your organization's specific coding standards and have the AI enforce them during reviews.
- **Multi-Language Support:** Automatic detection and context gathering for JavaScript, TypeScript, Python, C#, Java, and more.
- **Faster Reviews:** Reduce the time spent on code reviews. Let Ollama handle the routine, allowing your team to focus on impactful work.
- **Configurable and Customizable:** Tailor the extension to your needs with customizable settings. Choose from various Ollama models, define file exclusions, and more.
- **Cost-Effective:** No API costs or per-token charges. Run unlimited code reviews on your own hardware.

## What's New in v2.8

🔄 **4-Pass Review Workflow** - Enhanced accuracy with format enforcement:
- **Pass 1 (Context Check)**: AI determines if it needs additional files to review properly
- **Pass 2 (Review)**: AI generates the code review with full context
- **Pass 3 (Format)**: Enforces consistent Summary + Issues Found structure
- **Pass 4 (Verify)**: AI validates its own review against the actual code, removing hallucinations

🎛️ **Per-Pass Model Selection** - Optimize cost and performance:
- Configure different models for each pass (e.g., fast model for context, best model for review)
- Use smaller/faster models for formatting and context checks
- Reserve your most capable model for the actual review pass

📝 **Custom Pass Prompts** - Full control over each workflow stage:
- Override the default prompt for any pass with `pass1_prompt`, `pass2_prompt`, `pass3_prompt`, `pass4_prompt`
- Customize context request behavior, review criteria, format rules, and verification logic

🧠 **Agentic Context Requests** - Smarter AI:
- AI can request imported files, interfaces, and base classes it needs
- Smart file fetcher with search fallback if AI gives incorrect path
- Maximum 3 additional files per review to stay focused

📊 **Simplified Diff Format** - Clearer input for AI:
- Transforms confusing git diff (`+`/`-` prefixes) into clear sections
- `=== REMOVED (old code - no longer exists) ===`
- `=== ADDED (new code - review this) ===`
- Prevents AI from thinking deleted code still exists

🏗️ **Modular Codebase** - Better maintainability:
- Clean separation: types, prompts, api-client, ollama, pullrequest, repository modules
- Easier to extend and customize for your needs

## What's New in v2.5

📝 **Custom System Prompt** - Complete control over AI behavior:
- Override the entire system prompt with your own instructions
- Perfect for security-focused reviews or custom workflows
- Use when you need specific review formats

🔢 **Configurable Token Limit** - Adjust for your model:
- Set `token_limit` based on your model's context window
- Supports values from 8192 to 131072+
- Enables use of larger context models

🐞 **Debug Logging** - Troubleshoot with ease:
- Enable with `debug_logging: true`
- Logs system prompts, diffs, API requests/responses
- Token counts and file processing details

🌐 **OpenAI-Compatible API** - Works with more endpoints:
- Supports both Ollama native and OpenAI-compatible formats
- Use with any OpenAI-compatible API endpoint

## Key Features

### 🏗️ Build Log Context
AI sees your pipeline execution - build status, errors, test results.

🌍 **Improved Language Support**:
- JavaScript/TypeScript: package.json analysis
- Python: requirements.txt parsing
- C#: .csproj, .sln, and packages.config support
- Java: pom.xml detection

### 🎯 Custom Best Practices
Define your team's coding standards.

### 📝 Custom System Prompt
Override AI instructions for specialized reviews.

### 🔐 Bearer Token Support
Secure your API endpoints.

---

## Quick Start

   ```yaml
   trigger:
     branches:
       exclude:
         - '*'

   pr:
     branches:
       include:
         - '*'

   jobs:
   - job: CodeReview
     pool:
       vmImage: 'ubuntu-latest'
     steps:
     - task: OllamaCodeReview@2
       inputs:
         ollama_endpoint: 'http://your-ollama-server:11434/api/chat'
         ai_model: 'gpt-oss'
         bugs: true
         performance: true
         best_practices: true
         file_extensions: 'js,ts,css,html'
         file_excludes: 'file1.js,file2.py,secret.txt'
         token_limit: '16384'
         debug_logging: false
         enableMultipass: true
         # Optional: Use different models per pass for cost optimization
         # pass1_model: 'qwen2.5-coder:7b'   # Fast model for context check
         # pass2_model: 'gpt-oss:20b'        # Best model for review
         # pass3_model: 'qwen2.5-coder:7b'   # Fast model for formatting
         # pass4_model: 'qwen2.5-coder:14b'  # Medium model for verification
         additional_prompts: 'Fix variable naming, Ensure consistent indentation, Review error handling approach'
         custom_best_practices: |
           Always use async/await instead of .then() for promises
           All public methods must have JSDoc comments
           Database queries must use parameterized statements
   ```

3. If you do not already have Build Validation configured for your branch already add [Build validation](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser#build-validation) to your branch policy to trigger the code review when a Pull Request is created

## FAQ

### Q: What agent job settings are required?

A: Ensure that "Allow scripts to access OAuth token" is enabled as part of the agent job. Follow the [documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/build/options?view=azure-devops#allow-scripts-to-access-the-oauth-token) for more details.

![Pipeline Permissions](assets/pipeline_permissions.png)

### Q: What permissions are required for Build Administrators?

A: Build Administrators must be given "Contribute to pull requests" access. Check [this Stack Overflow answer](https://stackoverflow.com/a/57985733) for guidance on setting up permissions.

![Repository Permissions](assets/pr_permissions.png)

### Bug Reports

If you find a bug or unexpected behavior, please [open a bug report](https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues/new?assignees=&labels=bug&template=bug_report.md&title=).

### Feature Requests

If you have ideas for new features or enhancements, please [submit a feature request](https://github.com/teriansilva/azure-devops-ollama-code-reviewer/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=).

## Learn More

Visit our [GitHub repository](https://github.com/teriansilva/azure-devops-ollama-code-reviewer) for additional documentation, updates, and support.

## Securing Your Ollama API with nginx

If you want to expose your Ollama API over the internet or add authentication, you can use nginx as a reverse proxy with Bearer token authentication:

```nginx
server {
    listen 443 ssl http2;
    server_name ollama.example.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/ollama.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ollama.example.com/privkey.pem;

    # -------------------------------
    # PROXY TO OLLAMA
    # -------------------------------
    location / {
        proxy_set_header Authorization $http_authorization;
        
        # Validate Authorization header
        set $expected "Bearer YOUR_SECRET_TOKEN_HERE";
        
        if ($http_authorization != $expected) {
            return 401;
        }
        
        proxy_pass http://127.0.0.1:11434;
        
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # Optional: return proper WWW-Authenticate header
    error_page 401 = @unauth;

    location @unauth {
        add_header WWW-Authenticate "Bearer realm=\"Ollama API\"" always;
        return 401 "Unauthorized";
    }
}
```

**Important:** Replace `ollama.example.com`, SSL certificate paths, and `YOUR_SECRET_TOKEN_HERE` with your actual values.

### 2. Set Up Ollama
```bash
curl https://ollama.ai/install.sh | sh
ollama pull gpt-oss
```

### 3. Add to Your Pipeline
```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'https://ollama.example.com/api/chat'
    ai_model: 'gpt-oss'
    bearer_token: '$(OllamaApiToken)'  # Store as pipeline variable
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
