import tl = require('azure-pipelines-task-lib/task');
import { Ollama } from './ollama';
import { Repository } from './repository';
import { PullRequest } from './pullrequest';
import { ReviewConfig } from './types';

// Debug logging helper
let debugEnabled = false;
function debug(message: string) {
    if (debugEnabled) {
        console.log(`[DEBUG] ${message}`);
    }
}

export class Main {
    private static _ollama: Ollama;
    private static _repository: Repository;
    private static _pullRequest: PullRequest;

    public static async Main(): Promise<void> {
        // Check debug flag early
        debugEnabled = tl.getBoolInput('debug_logging', false) || false;
        
        if (debugEnabled) {
            console.log('========================================');
            console.log('[DEBUG] Debug logging is ENABLED');
            console.log('========================================');
        }

        const buildReason = tl.getVariable('Build.Reason');
        const pullRequestId = tl.getVariable('System.PullRequest.PullRequestId');
        
        console.log(`Build.Reason: ${buildReason}`);
        console.log(`PullRequest.PullRequestId: ${pullRequestId}`);
        
        debug(`All pipeline variables:`);
        debug(`  System.TeamFoundationCollectionUri: ${tl.getVariable('System.TeamFoundationCollectionUri')}`);
        debug(`  System.TeamProjectId: ${tl.getVariable('System.TeamProjectId')}`);
        debug(`  Build.Repository.Name: ${tl.getVariable('Build.Repository.Name')}`);
        debug(`  System.PullRequest.SourceBranch: ${tl.getVariable('System.PullRequest.SourceBranch')}`);
        debug(`  System.PullRequest.TargetBranch: ${tl.getVariable('System.PullRequest.TargetBranch')}`);
        
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
        const aiModel = tl.getInput('ai_model', true)!;
        const fileExtensions = tl.getInput('file_extensions', false);
        const filesToExclude = tl.getInput('file_excludes', false);
        const additionalPrompts = tl.getInput('additional_prompts', false)?.split(',');
        const customBestPractices = tl.getInput('custom_best_practices', false);
        const bearerToken = tl.getInput('bearer_token', false);
        const tokenLimit = parseInt(tl.getInput('token_limit', false) || '8192', 10);
        
        // Multi-pass configuration
        const enableMultipass = tl.getBoolInput('enableMultipass', false) ?? true;
        
        // Custom pass prompts
        const pass1Prompt = tl.getInput('pass1_prompt', false);
        const pass2Prompt = tl.getInput('pass2_prompt', false);
        const pass3Prompt = tl.getInput('pass3_prompt', false);
        const pass4Prompt = tl.getInput('pass4_prompt', false);
        
        // Custom pass models (optional - falls back to default ai_model)
        const pass1Model = tl.getInput('pass1_model', false);
        const pass2Model = tl.getInput('pass2_model', false);
        const pass3Model = tl.getInput('pass3_model', false);
        const pass4Model = tl.getInput('pass4_model', false);
        
        debug(`Configuration:`);
        debug(`  Ollama Endpoint: ${ollamaEndpoint}`);
        debug(`  AI Model: ${aiModel}`);
        debug(`  Check Bugs: ${tl.getBoolInput('bugs', true)}`);
        debug(`  Check Performance: ${tl.getBoolInput('performance', true)}`);
        debug(`  Check Best Practices: ${tl.getBoolInput('best_practices', true)}`);
        debug(`  File Extensions Filter: ${fileExtensions || '(none)'}`);
        debug(`  Files to Exclude: ${filesToExclude || '(none)'}`);
        debug(`  Additional Prompts: ${additionalPrompts?.join(', ') || '(none)'}`);
        debug(`  Custom Best Practices: ${customBestPractices ? 'provided' : '(none)'}`);
        debug(`  Bearer Token: ${bearerToken ? '(provided)' : '(none)'}`);
        debug(`  Token Limit: ${tokenLimit}`);
        debug(`  Enable Multi-pass: ${enableMultipass}`);
        debug(`  Pass Models: 1=${pass1Model || 'default'}, 2=${pass2Model || 'default'}, 3=${pass3Model || 'default'}, 4=${pass4Model || 'default'}`);
        
        if (!enableMultipass) {
            console.log("Multi-pass workflow disabled, using single-pass review");
        }
        
        if (bearerToken && bearerToken.trim() !== '') {
            console.log("Using Bearer token authentication for Ollama API");
        }
        
        this._repository = new Repository();
        
        // Gather project context once at the beginning
        console.log("Gathering project context...");
        const projectContext = await this._repository.GetProjectContext();
        
        debug(`Project context length: ${projectContext.length} characters`);
        if (debugEnabled && projectContext) {
            console.log('[DEBUG] Project context preview (first 500 chars):');
            console.log(projectContext.substring(0, 500));
            console.log('...');
        }
        
        // Build the review configuration
        const reviewConfig: ReviewConfig = {
            checkForBugs: tl.getBoolInput('bugs', true),
            checkForPerformance: tl.getBoolInput('performance', true),
            checkForBestPractices: tl.getBoolInput('best_practices', true),
            additionalPrompts: additionalPrompts || [],
            customBestPractices: customBestPractices || '',
            projectContext: projectContext,
            tokenLimit: tokenLimit,
            debug: debugEnabled,
            enableMultipass: enableMultipass,
            // Custom prompts (optional)
            pass1Prompt: pass1Prompt && pass1Prompt.trim() !== '' ? pass1Prompt : undefined,
            pass2Prompt: pass2Prompt && pass2Prompt.trim() !== '' ? pass2Prompt : undefined,
            pass3Prompt: pass3Prompt && pass3Prompt.trim() !== '' ? pass3Prompt : undefined,
            pass4Prompt: pass4Prompt && pass4Prompt.trim() !== '' ? pass4Prompt : undefined,
            // Custom models per pass (optional - falls back to default ai_model)
            pass1Model: pass1Model && pass1Model.trim() !== '' ? pass1Model : undefined,
            pass2Model: pass2Model && pass2Model.trim() !== '' ? pass2Model : undefined,
            pass3Model: pass3Model && pass3Model.trim() !== '' ? pass3Model : undefined,
            pass4Model: pass4Model && pass4Model.trim() !== '' ? pass4Model : undefined
        };
        
        this._ollama = new Ollama(
            ollamaEndpoint,
            aiModel,
            reviewConfig,
            bearerToken && bearerToken.trim() !== '' ? bearerToken : undefined
        );
        
        // Register file fetcher for agentic context requests (with smart search fallback)
        this._ollama.setFileFetcher(async (filePath: string) => {
            debug(`Fetching requested file: ${filePath}`);
            const result = await this._repository.GetFileContentSmart(filePath);
            if (result.content) {
                if (result.actualPath !== filePath) {
                    debug(`  → Found at: ${result.actualPath}`);
                }
                return result.content;
            }
            debug(`  → File not found: ${filePath}`);
            return '';
        });
        
        this._pullRequest = new PullRequest();

        debug('Deleting previous comments...');
        await this._pullRequest.DeleteComments();

        let filesToReview = await this._repository.GetChangedFiles(fileExtensions, filesToExclude);

        debug(`Files to review (${filesToReview.length}):`);
        filesToReview.forEach((f, i) => debug(`  ${i + 1}. ${f}`));

        tl.setProgress(0, 'Performing Code Review');

        for (let index = 0; index < filesToReview.length; index++) {
            const fileToReview = filesToReview[index];
            
            console.log(`\n--- Reviewing file ${index + 1}/${filesToReview.length}: ${fileToReview} ---`);
            
            debug(`Getting diff for ${fileToReview}...`);
            let diff = await this._repository.GetDiff(fileToReview);
            debug(`Diff length: ${diff.length} characters`);
            
            debug(`Getting current file content for ${fileToReview}...`);
            let fileContent = await this._repository.GetFileContent(fileToReview);
            debug(`Current file content length: ${fileContent.length} characters`);
            
            debug(`Getting old file content (from target branch) for ${fileToReview}...`);
            let oldFileContent = await this._repository.GetOldFileContent(fileToReview);
            debug(`Old file content length: ${oldFileContent.length} characters`);
            
            if (debugEnabled) {
                console.log(`[DEBUG] Diff preview (first 300 chars):`);
                console.log(diff.substring(0, 300));
                console.log('...');
            }
            
            debug('Calling Ollama API...');
            let review = await this._ollama.PerformCodeReview(diff, fileToReview, fileContent, oldFileContent);
            
            debug(`Review response length: ${review.length} characters`);
            debug(`Review contains NO_COMMENT: ${review.indexOf('NO_COMMENT') >= 0}`);
            
            if (debugEnabled && review) {
                console.log('[DEBUG] Full review response:');
                console.log('----------------------------------------');
                console.log(review);
                console.log('----------------------------------------');
            }

            // Skip empty reviews or reviews containing NO_COMMENT
            if (review && review.trim() !== '' && review.indexOf('NO_COMMENT') < 0) {
                debug(`Adding comment to PR for ${fileToReview}...`);
                await this._pullRequest.AddComment(fileToReview, review);
                console.log(`Comment added to ${fileToReview}`);
            } else {
                debug(`Skipping comment for ${fileToReview} (empty or NO_COMMENT)`);
                console.log(`No comments for ${fileToReview}`);
            }

            console.info(`Completed review of file ${fileToReview}`)

            tl.setProgress((fileToReview.length / 100) * index, 'Performing Code Review');
        }

        console.log('\n========================================');
        console.log('Code review completed successfully!');
        console.log('========================================');
        tl.setResult(tl.TaskResult.Succeeded, "Pull Request reviewed.");
    }
}

Main.Main();