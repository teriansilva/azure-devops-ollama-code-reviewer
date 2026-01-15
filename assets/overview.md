# Ollama Code Review Extension

## Supercharge Your Code Reviews with Self-Hosted AI

Welcome to the Ollama Code Review Extension – your new ally in building top-notch software! This extension seamlessly integrates Ollama's powerful self-hosted language models into your Azure DevOps pipeline, transforming code reviews into an intelligent and efficient process while keeping your code secure on your own infrastructure.

### Get Started Now!

Enhance your development workflow with Ollama Code Review. Start receiving intelligent and actionable insights on your code changes using your own self-hosted AI models. Install the extension today and experience the future of code reviews with complete control over your data!

## Why Choose Ollama Code Review?

- **Self-Hosted & Secure:** Keep your code and reviews completely private on your own infrastructure. No data sent to external cloud services.
- **3-Pass Verification (v2.7):** Context check → Review → Verify workflow ensures accurate, hallucination-free feedback.
- **Agentic Context (v2.7):** AI can request additional files (imports, interfaces, base classes) for smarter reviews.
- **Simplified Diff Format (v2.7):** Clear REMOVED/ADDED sections prevent AI confusion about what code exists.
- **Automated Code Reviews:** Say goodbye to manual code inspections! Let Ollama analyze your code changes, catching bugs, performance issues, and suggesting best practices.
- **AI-Powered Insights:** Leverage powerful open-source language models like CodeLlama, Llama 3, DeepSeek Coder, and more to receive insightful comments on your pull requests.
- **Custom System Prompt:** Complete control over AI behavior - override the default prompt with your own instructions.
- **Configurable Token Limit:** Adjust for models with larger context windows (8k to 128k+).
- **Debug Logging:** Extensive logging for troubleshooting issues.
- **OpenAI-Compatible:** Works with Ollama and any OpenAI-compatible API endpoint.
- **Enhanced Context:** The AI receives the full file content, project metadata (README, dependencies), and language-specific project files for more informed reviews.
- **Custom Best Practices:** Define your organization's specific coding standards and have the AI enforce them during reviews.
- **Multi-Language Support:** Automatic detection and context gathering for JavaScript, TypeScript, Python, C#, Java, and more.
- **Faster Reviews:** Reduce the time spent on code reviews. Let Ollama handle the routine, allowing your team to focus on impactful work.
- **Configurable and Customizable:** Tailor the extension to your needs with customizable settings. Choose from various Ollama models, define file exclusions, and more.
- **Cost-Effective:** No API costs or per-token charges. Run unlimited code reviews on your own hardware.

## What's New in v2.7

🔄 **3-Pass Review Workflow** - More accurate reviews:
- **Pass 1 (Context Check)**: AI determines if it needs additional files to review properly
- **Pass 2 (Review)**: AI generates the code review with full context
- **Pass 3 (Verify)**: AI validates its own review against the actual code, eliminating hallucinations

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
- Clean separation: types, prompts, api-client, ollama modules
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

🎉 **Enhanced AI Context** - The AI now receives:
- Complete file content (not just diffs) for better understanding
- Project metadata: README, package.json, requirements.txt, .csproj, .sln, etc.
- Language-specific dependency information

🎯 **Custom Best Practices** - Define your own project-specific coding standards:
- Add team conventions
- Enforce organizational guidelines
- Ensure consistency across your codebase

🌍 **Improved Language Support**:
- JavaScript/TypeScript: package.json analysis
- Python: requirements.txt parsing
- C#: .csproj, .sln, and packages.config support
- Java: pom.xml detection

## Prerequisites

- A running [Ollama](https://ollama.ai/) instance accessible from your build agents
- Ollama models installed (e.g., `ollama pull gpt-oss` or `ollama pull qwen2.5-coder`)

## Getting started

1. **Set up Ollama:**
   - Install Ollama on your server or local machine following the [Ollama installation guide](https://ollama.ai/)
   - Pull your preferred model: `ollama pull gpt-oss` (recommended) or `qwen2.5-coder`, `deepseek-coder-v2`, `codellama`, etc.
   - Ensure Ollama is running and accessible from your Azure DevOps build agents

2. **Install the Ollama Code Review DevOps Extension.**

3. **Add Ollama Code Review Task to Your Pipeline:**

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
         additional_prompts: 'Fix variable naming, Ensure consistent indentation, Review error handling approach'
         custom_best_practices: |
           Always use async/await instead of .then() for promises
           All public methods must have JSDoc comments
           Database queries must use parameterized statements`
   
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

Then use the Bearer Token field in the extension configuration to authenticate:

```yaml
- task: OllamaCodeReview@2
  inputs:
    ollama_endpoint: 'https://ollama.example.com/api/chat'
    ai_model: 'gpt-oss'
    bearer_token: '$(OllamaApiToken)'  # Store as pipeline variable
```

## Supported Ollama Models

This extension works with any Ollama model, but these are particularly well-suited for code reviews:

- **gpt-oss** - Excellent for code review with strong reasoning (Recommended)
- **qwen2.5-coder** - Advanced code analysis and understanding
- **deepseek-coder-v2** - Latest version optimized for code understanding
- **codellama** - Meta's specialized code model (stable)
- **llama3.3** / **llama3.2** - Latest Llama models with improved reasoning
- **mistral-large** / **mixtral** - Efficient general-purpose models
- **codegemma** - Google's code-focused model

Run `ollama list` on your Ollama server to see all available models.