import tl = require('azure-pipelines-task-lib/task');
import { Ollama } from './ollama';
import { Repository } from './repository';
import { PullRequest } from './pullrequest';

export class Main {
    private static _ollama: Ollama;
    private static _repository: Repository;
    private static _pullRequest: PullRequest;

    public static async Main(): Promise<void> {
        const buildReason = tl.getVariable('Build.Reason');
        const pullRequestId = tl.getVariable('System.PullRequest.PullRequestId');
        
        console.log(`Build.Reason: ${buildReason}`);
        console.log(`PullRequest.PullRequestId: ${pullRequestId}`);
        
        if (buildReason !== 'PullRequest' && !pullRequestId) {
            console.log("This task must only be used when triggered by a Pull Request.");
            console.log("To use this task:");
            console.log("1. Create a Pull Request in Azure DevOps");
            console.log("2. Ensure the pipeline has PR triggers configured");
            console.log("3. The pipeline should run automatically when the PR is created/updated");
            tl.setResult(tl.TaskResult.Skipped, "This task must only be used when triggered by a Pull Request.");
            return;
        }

        if(!tl.getVariable('System.AccessToken')) {
            console.error("'Allow Scripts to Access OAuth Token' must be enabled.");
            tl.setResult(tl.TaskResult.Failed, "'Allow Scripts to Access OAuth Token' must be enabled. See https://learn.microsoft.com/en-us/azure/devops/pipelines/build/options?view=azure-devops#allow-scripts-to-access-the-oauth-token for more information");
            return;
        }
        
        console.log("Starting Ollama Code Review...");

        const ollamaEndpoint = tl.getInput('ollama_endpoint', true)!;
        const fileExtensions = tl.getInput('file_extensions', false);
        const filesToExclude = tl.getInput('file_excludes', false);
        const additionalPrompts = tl.getInput('additional_prompts', false)?.split(',');
        const customBestPractices = tl.getInput('custom_best_practices', false);
        const bearerToken = tl.getInput('bearer_token', false);
        
        if (bearerToken && bearerToken.trim() !== '') {
            console.log("Using Bearer token authentication for Ollama API");
        }
        
        this._repository = new Repository();
        
        // Gather project context once at the beginning
        console.log("Gathering project context...");
        const projectContext = await this._repository.GetProjectContext();
        
        // Gather build log context if enabled
        let buildLogContext = '';
        const includeBuildLogs = tl.getBoolInput('include_build_logs', false);
        if (includeBuildLogs) {
            console.log("Gathering build log context...");
            const buildLogTaskFilter = tl.getInput('build_log_tasks', false) || '';
            buildLogContext = await this._repository.GetBuildLogContext(500, buildLogTaskFilter);
            if (buildLogContext) {
                console.log("Build log context gathered successfully.");
            }
        }
        
        // Combine project context with build log context
        let fullContext = projectContext + buildLogContext;
        
        // Initialize PullRequest early to gather PR comments if enabled
        this._pullRequest = new PullRequest();
        
        // Gather existing PR comments if enabled
        const includePRComments = tl.getBoolInput('include_pr_comments', false);
        if (includePRComments) {
            console.log("Gathering existing PR comments...");
            const prCommentsContext = await this._pullRequest.GetPRCommentsContext();
            if (prCommentsContext) {
                fullContext += prCommentsContext;
                console.log("PR comments context gathered successfully.");
            } else {
                console.log("No existing PR comments found.");
            }
        }
        
        // Get custom system prompt if provided
        const customSystemPrompt = tl.getInput('custom_system_prompt', false);
        
        this._ollama = new Ollama(
            ollamaEndpoint, 
            tl.getBoolInput('bugs', true), 
            tl.getBoolInput('performance', true), 
            tl.getBoolInput('best_practices', true), 
            additionalPrompts,
            customBestPractices || '',
            fullContext,
            bearerToken && bearerToken.trim() !== '' ? bearerToken : undefined,
            customSystemPrompt
        );

        await this._pullRequest.DeleteComments();

        let filesToReview = await this._repository.GetChangedFiles(fileExtensions, filesToExclude);

        tl.setProgress(0, 'Performing Code Review');

        for (let index = 0; index < filesToReview.length; index++) {
            const fileToReview = filesToReview[index];
            let diff = await this._repository.GetDiff(fileToReview);
            let fileContent = await this._repository.GetFileContent(fileToReview);
            let reviewComments = await this._ollama.PerformCodeReview(diff, fileToReview, fileContent);

            // Add each comment at its specific line
            for (const reviewComment of reviewComments) {
                await this._pullRequest.AddComment(fileToReview, reviewComment.comment, reviewComment.lineNumber);
            }
            
            if (reviewComments.length > 0) {
                console.info(`Added ${reviewComments.length} comment(s) to ${fileToReview}`);
            } else {
                console.info(`No comments for ${fileToReview}`);
            }

            console.info(`Completed review of file ${fileToReview}`)

            tl.setProgress((fileToReview.length / 100) * index, 'Performing Code Review');
        }

        tl.setResult(tl.TaskResult.Succeeded, "Pull Request reviewed.");
    }
}

Main.Main();