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
        const bearerToken = tl.getInput('bearer_token', false);
        
        if (bearerToken && bearerToken.trim() !== '') {
            console.log("Using Bearer token authentication for Ollama API");
        }
        
        this._ollama = new Ollama(
            ollamaEndpoint, 
            tl.getBoolInput('bugs', true), 
            tl.getBoolInput('performance', true), 
            tl.getBoolInput('best_practices', true), 
            additionalPrompts,
            bearerToken && bearerToken.trim() !== '' ? bearerToken : undefined
        );
        this._repository = new Repository();
        this._pullRequest = new PullRequest();

        await this._pullRequest.DeleteComments();

        let filesToReview = await this._repository.GetChangedFiles(fileExtensions, filesToExclude);

        tl.setProgress(0, 'Performing Code Review');

        for (let index = 0; index < filesToReview.length; index++) {
            const fileToReview = filesToReview[index];
            let diff = await this._repository.GetDiff(fileToReview);
            let review = await this._ollama.PerformCodeReview(diff, fileToReview);

            if(review.indexOf('NO_COMMENT') < 0) {
                await this._pullRequest.AddComment(fileToReview, review);
            }

            console.info(`Completed review of file ${fileToReview}`)

            tl.setProgress((fileToReview.length / 100) * index, 'Performing Code Review');
        }

        tl.setResult(tl.TaskResult.Succeeded, "Pull Request reviewed.");
    }
}

Main.Main();