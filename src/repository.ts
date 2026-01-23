import * as tl from "azure-pipelines-task-lib/task";
import { SimpleGit, SimpleGitOptions, simpleGit } from "simple-git";
import binaryExtensions from "./binaryExtensions.json";

export class Repository {

    private gitOptions: Partial<SimpleGitOptions> = {
        baseDir: `${tl.getVariable('System.DefaultWorkingDirectory')}`,
        binary: 'git'
    };

    private readonly _repository: SimpleGit;

    constructor() {
        this._repository = simpleGit(this.gitOptions);
        this._repository.addConfig('core.pager', 'cat');
        this._repository.addConfig('core.quotepath', 'false');
    }

    public async GetChangedFiles(fileExtensions: string | undefined, filesToExclude: string | undefined): Promise<string[]> {
        await this._repository.fetch();

        let targetBranch = this.GetTargetBranch();

        let diffs = await this._repository.diff([targetBranch, '--name-only', '--diff-filter=AM']);
        let files = diffs.split('\n').filter(line => line.trim().length > 0);
        let filesToReview = files.filter(file => !binaryExtensions.includes(file.slice((file.lastIndexOf(".") - 1 >>> 0) + 2)));

        if(fileExtensions) {
            let fileExtensionsToInclude = fileExtensions.trim().split(',');
            filesToReview = filesToReview.filter(file => fileExtensionsToInclude.includes(file.substring(file.lastIndexOf('.'))));
        }

        if(filesToExclude) {
            let fileNamesToExclude = filesToExclude.trim().split(',')
            filesToReview = filesToReview.filter(file => !fileNamesToExclude.includes(file.split('/').pop()!.trim()))
        }

        return filesToReview;
    }

    public async GetDiff(fileName: string): Promise<string> {
        let targetBranch = this.GetTargetBranch();
        
        let diff = await this._repository.diff([targetBranch, '--', fileName]);

        return diff;
    }

    public async GetFileContent(fileName: string): Promise<string> {
        const fs = require('fs');
        const path = require('path');
        const workingDirectory = tl.getVariable('System.DefaultWorkingDirectory');
        const filePath = path.join(workingDirectory!, fileName);
        
        try {
            return await fs.promises.readFile(filePath, 'utf-8');
        } catch (error) {
            // File not found at exact path
            return '';
        }
    }

    /**
     * Smart file fetcher: tries exact path first, then searches by filename
     */
    public async GetFileContentSmart(requestedPath: string): Promise<{ content: string; actualPath: string }> {
        const fs = require('fs');
        const path = require('path');
        const workingDirectory = tl.getVariable('System.DefaultWorkingDirectory')!;
        
        // 1. Try exact path first
        const exactPath = path.join(workingDirectory, requestedPath);
        try {
            const content = await fs.promises.readFile(exactPath, 'utf-8');
            return { content, actualPath: requestedPath };
        } catch {
            // Not found at exact path, continue to search
        }

        // 2. Extract just the filename
        const fileName = path.basename(requestedPath);
        if (!fileName) {
            return { content: '', actualPath: '' };
        }

        // 3. Search for the file in the repository
        const foundPath = await this.SearchForFile(fileName, workingDirectory);
        if (foundPath) {
            try {
                const content = await fs.promises.readFile(foundPath, 'utf-8');
                const relativePath = path.relative(workingDirectory, foundPath);
                console.log(`[DEBUG] File "${requestedPath}" not found, but found at "${relativePath}"`);
                return { content, actualPath: relativePath };
            } catch {
                return { content: '', actualPath: '' };
            }
        }

        return { content: '', actualPath: '' };
    }

    /**
     * Recursively search for a file by name in the repository
     */
    private async SearchForFile(fileName: string, directory: string, maxDepth: number = 10): Promise<string | null> {
        const fs = require('fs');
        const path = require('path');
        
        if (maxDepth <= 0) return null;

        // Directories to skip
        const skipDirs = ['node_modules', '.git', 'bin', 'obj', 'dist', 'build', '.vs', 'packages', 'vendor'];
        
        try {
            const entries = await fs.promises.readdir(directory, { withFileTypes: true });
            
            // First check files in current directory
            for (const entry of entries) {
                if (entry.isFile() && entry.name === fileName) {
                    return path.join(directory, entry.name);
                }
            }
            
            // Then recurse into subdirectories
            for (const entry of entries) {
                if (entry.isDirectory() && !skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                    const result = await this.SearchForFile(fileName, path.join(directory, entry.name), maxDepth - 1);
                    if (result) return result;
                }
            }
        } catch {
            // Ignore permission errors, etc.
        }
        
        return null;
    }

    public async GetProjectContext(): Promise<string> {
        const fs = require('fs');
        const path = require('path');
        const workingDirectory = tl.getVariable('System.DefaultWorkingDirectory');
        
        let context = '';
        
        // Include README if exists
        const readmeFiles = ['README.md', 'readme.md', 'README.txt'];
        for (const readmeFile of readmeFiles) {
            const readmePath = path.join(workingDirectory!, readmeFile);
            if (fs.existsSync(readmePath)) {
                try {
                    const readmeContent = await fs.promises.readFile(readmePath, 'utf-8');
                    context += `\n## Project README:\n${readmeContent}\n`;
                    break;
                } catch (error) {
                    tl.warning(`Could not read ${readmeFile}: ${error}`);
                }
            }
        }
        
        // Include package.json for dependency context (JavaScript/TypeScript projects)
        const packagePath = path.join(workingDirectory!, 'package.json');
        if (fs.existsSync(packagePath)) {
            try {
                const packageContent = await fs.promises.readFile(packagePath, 'utf-8');
                const packageJson = JSON.parse(packageContent);
                context += `\n## Project Dependencies:\n`;
                context += `Name: ${packageJson.name || 'N/A'}\n`;
                context += `Description: ${packageJson.description || 'N/A'}\n`;
                context += `Version: ${packageJson.version || 'N/A'}\n`;
                if (packageJson.dependencies) {
                    context += `Dependencies: ${Object.keys(packageJson.dependencies).join(', ')}\n`;
                }
            } catch (error) {
                tl.warning(`Could not read package.json: ${error}`);
            }
        }

        // Include requirements.txt for Python projects
        const requirementsPath = path.join(workingDirectory!, 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
            try {
                const requirementsContent = await fs.promises.readFile(requirementsPath, 'utf-8');
                context += `\n## Python Dependencies (requirements.txt):\n${requirementsContent}\n`;
            } catch (error) {
                tl.warning(`Could not read requirements.txt: ${error}`);
            }
        }

        // Include pom.xml snippet for Java projects
        const pomPath = path.join(workingDirectory!, 'pom.xml');
        if (fs.existsSync(pomPath)) {
            try {
                const pomContent = await fs.promises.readFile(pomPath, 'utf-8');
                // Extract just the project info and dependencies section (simplified)
                context += `\n## Java Project (pom.xml detected)\n`;
            } catch (error) {
                tl.warning(`Could not read pom.xml: ${error}`);
            }
        }

        // Include .csproj files for C# projects
        try {
            const files = await fs.promises.readdir(workingDirectory!);
            const csprojFiles = files.filter((file: string) => file.endsWith('.csproj'));
            
            if (csprojFiles.length > 0) {
                context += `\n## C# Project Files:\n`;
                for (const csprojFile of csprojFiles.slice(0, 3)) { // Limit to first 3 .csproj files
                    const csprojPath = path.join(workingDirectory!, csprojFile);
                    try {
                        const csprojContent = await fs.promises.readFile(csprojPath, 'utf-8');
                        context += `\n### ${csprojFile}:\n\`\`\`xml\n${csprojContent}\n\`\`\`\n`;
                    } catch (error) {
                        tl.warning(`Could not read ${csprojFile}: ${error}`);
                    }
                }
            }
        } catch (error) {
            tl.warning(`Could not search for .csproj files: ${error}`);
        }

        // Include .sln files for C# solutions
        try {
            const files = await fs.promises.readdir(workingDirectory!);
            const slnFiles = files.filter((file: string) => file.endsWith('.sln'));
            
            if (slnFiles.length > 0) {
                const slnFile = slnFiles[0]; // Just take the first solution file
                const slnPath = path.join(workingDirectory!, slnFile);
                try {
                    const slnContent = await fs.promises.readFile(slnPath, 'utf-8');
                    context += `\n## C# Solution File (${slnFile}):\n\`\`\`\n${slnContent}\n\`\`\`\n`;
                } catch (error) {
                    tl.warning(`Could not read ${slnFile}: ${error}`);
                }
            }
        } catch (error) {
            tl.warning(`Could not search for .sln files: ${error}`);
        }

        // Include packages.config for legacy C# projects
        const packagesConfigPath = path.join(workingDirectory!, 'packages.config');
        if (fs.existsSync(packagesConfigPath)) {
            try {
                const packagesContent = await fs.promises.readFile(packagesConfigPath, 'utf-8');
                context += `\n## C# Packages (packages.config):\n\`\`\`xml\n${packagesContent}\n\`\`\`\n`;
            } catch (error) {
                tl.warning(`Could not read packages.config: ${error}`);
            }
        }
        
        return context;
    }

    public async GetBuildLogContext(maxLogLines: number = 500, taskFilter: string = ''): Promise<string> {
        const https = require('https');
        const http = require('http');
        
        const collectionUri = tl.getVariable('System.TeamFoundationCollectionUri');
        const teamProject = tl.getVariable('System.TeamProject');
        const buildId = tl.getVariable('Build.BuildId');
        const accessToken = tl.getVariable('System.AccessToken');
        
        if (!collectionUri || !teamProject || !buildId || !accessToken) {
            tl.warning('Could not retrieve build log context: Missing required pipeline variables');
            return '';
        }

        // Parse task filter into array of patterns
        const taskPatterns = taskFilter
            ? taskFilter.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0)
            : [];
        
        if (taskPatterns.length > 0) {
            console.log(`Build log task filter: ${taskPatterns.join(', ')}`);
        }
        
        try {
            // Get the timeline to get task names associated with each log
            const timelineUrl = `${collectionUri}${teamProject}/_apis/build/builds/${buildId}/timeline?api-version=7.0`;
            const timelineResponse = await this.makeAzureDevOpsApiCall(timelineUrl, accessToken);
            
            // Create a map of log IDs to task names
            const logIdToTaskName: Map<number, string> = new Map();
            if (timelineResponse && timelineResponse.records) {
                for (const record of timelineResponse.records) {
                    if (record.log && record.log.id) {
                        logIdToTaskName.set(record.log.id, record.name || 'Unknown');
                    }
                }
            }
            
            // Get list of all logs for the current build
            const logsUrl = `${collectionUri}${teamProject}/_apis/build/builds/${buildId}/logs?api-version=7.0`;
            const logsResponse = await this.makeAzureDevOpsApiCall(logsUrl, accessToken);
            
            if (!logsResponse || !logsResponse.value || logsResponse.value.length === 0) {
                tl.warning('No build logs found');
                return '';
            }
            
            let buildLogContext = '\n## Build Log Context (Previous Steps):\n';
            let totalLines = 0;
            let includedTasks = 0;
            let skippedTasks = 0;
            
            // Sort logs by ID (chronological order) and exclude the current running task's log
            const sortedLogs = logsResponse.value
                .sort((a: any, b: any) => a.id - b.id)
                .slice(0, -1); // Exclude the last log (current task)
            
            for (const log of sortedLogs) {
                if (totalLines >= maxLogLines) {
                    buildLogContext += '\n... (log truncated due to size limits) ...\n';
                    break;
                }

                const taskName = logIdToTaskName.get(log.id) || `Log ${log.id}`;
                
                // Apply task filter if specified
                if (taskPatterns.length > 0) {
                    const taskNameLower = taskName.toLowerCase();
                    const matchesFilter = taskPatterns.some(pattern => taskNameLower.includes(pattern));
                    if (!matchesFilter) {
                        skippedTasks++;
                        tl.debug(`Skipping task '${taskName}' - does not match filter`);
                        continue;
                    }
                }
                
                try {
                    const logUrl = `${collectionUri}${teamProject}/_apis/build/builds/${buildId}/logs/${log.id}?api-version=7.0`;
                    const logContent = await this.makeAzureDevOpsApiCallText(logUrl, accessToken);
                    
                    if (logContent) {
                        const logLines = logContent.split('\n');
                        const linesToTake = Math.min(logLines.length, maxLogLines - totalLines);
                        const truncatedLog = logLines.slice(0, linesToTake).join('\n');
                        
                        buildLogContext += `\n### ${taskName}:\n\`\`\`\n${truncatedLog}\n\`\`\`\n`;
                        totalLines += linesToTake;
                        includedTasks++;
                    }
                } catch (logError) {
                    tl.debug(`Could not fetch log ${log.id}: ${logError}`);
                }
            }

            if (taskPatterns.length > 0) {
                console.log(`Build logs: Included ${includedTasks} tasks, skipped ${skippedTasks} tasks (filter applied)`);
            }
            
            // Add build summary information
            const buildUrl = `${collectionUri}${teamProject}/_apis/build/builds/${buildId}?api-version=7.0`;
            const buildInfo = await this.makeAzureDevOpsApiCall(buildUrl, accessToken);
            
            if (buildInfo) {
                buildLogContext = `\n## Build Information:\n` +
                    `- Build Number: ${buildInfo.buildNumber || 'N/A'}\n` +
                    `- Build Status: ${buildInfo.status || 'N/A'}\n` +
                    `- Build Result: ${buildInfo.result || 'In Progress'}\n` +
                    `- Source Branch: ${buildInfo.sourceBranch || 'N/A'}\n` +
                    `- Build Definition: ${buildInfo.definition?.name || 'N/A'}\n` +
                    buildLogContext;
            }
            
            return buildLogContext;
        } catch (error) {
            tl.warning(`Could not retrieve build log context: ${error}`);
            return '';
        }
    }

    private async makeAzureDevOpsApiCall(url: string, accessToken: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const https = require('https');
            const http = require('http');
            
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            };
            
            const req = protocol.request(options, (res: any) => {
                let data = '';
                
                res.on('data', (chunk: any) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error(`Failed to parse response: ${e}`));
                        }
                    } else {
                        reject(new Error(`API call failed with status ${res.statusCode}: ${data}`));
                    }
                });
            });
            
            req.on('error', (error: any) => {
                reject(error);
            });
            
            req.end();
        });
    }

    private async makeAzureDevOpsApiCallText(url: string, accessToken: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const https = require('https');
            const http = require('http');
            
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'text/plain'
                }
            };
            
            const req = protocol.request(options, (res: any) => {
                let data = '';
                
                res.on('data', (chunk: any) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`API call failed with status ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', (error: any) => {
                reject(error);
            });
            
            req.end();
        });
    }

    private GetTargetBranch(): string {
        let targetBranchName = tl.getVariable('System.PullRequest.TargetBranchName');

        if (!targetBranchName) {
            targetBranchName = tl.getVariable('System.PullRequest.TargetBranch')?.replace('refs/heads/', '');
        }

        if (!targetBranchName) {
            throw new Error(`Could not find target branch`)
        }

        return `origin/${targetBranchName}`;
    }
}