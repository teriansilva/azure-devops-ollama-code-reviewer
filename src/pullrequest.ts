import * as tl from "azure-pipelines-task-lib/task";
import * as https from "https";
import * as http from "http";

export class PullRequest {
    private _collectionUri: string = tl.getVariable('System.TeamFoundationCollectionUri')!;
    private _teamProjectId: string = tl.getVariable('System.TeamProjectId')!;
    private _repositoryName: string = tl.getVariable('Build.Repository.Name')!;
    private _pullRequestId: string = tl.getVariable('System.PullRequest.PullRequestId')!;

    constructor() {
    }

    private async httpRequest(url: string, options: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const protocol = isHttps ? https : http;

            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {}
            };

            const req = protocol.request(requestOptions, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    resolve({
                        ok: res.statusCode! >= 200 && res.statusCode! < 300,
                        status: res.statusCode,
                        statusText: res.statusMessage || '',
                        json: async () => JSON.parse(data),
                        text: async () => data
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (options.body) {
                req.write(options.body);
            }

            req.end();
        });
    }

    public async AddComment(fileName: string, comment: string, lineNumber?: number): Promise<boolean> {

        if (!fileName.startsWith('/')) {
            fileName = `/${fileName}`;
        }
        
        let body: any = {
            comments: [
                {
                    content: comment,
                    commentType: 2
                }
            ],
            status: 1,
            threadContext: {
                filePath: fileName,
            },
            pullRequestThreadContext: {
                changeTrackingId: 1,
                iterationContext: {
                    firstComparingIteration: 1,
                    secondComparingIteration: 2
                }
            }
        };

        // Add line position if lineNumber is provided
        if (lineNumber && lineNumber > 0) {
            body.threadContext.rightFileStart = {
                line: lineNumber,
                offset: 1
            };
            body.threadContext.rightFileEnd = {
                line: lineNumber,
                offset: 1
            };
        }

        let endpoint = `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}/pullRequests/${this._pullRequestId}/threads?api-version=7.0`

        var response = await this.httpRequest(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tl.getVariable('SYSTEM.ACCESSTOKEN')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok == false) {
            if(response.status == 401) {
                tl.setResult(tl.TaskResult.Failed, "The Build Service must have 'Contribute to pull requests' access to the repository. See https://stackoverflow.com/a/57985733 for more information");
            }
            if(response.status == 403) {
                tl.setResult(tl.TaskResult.Failed, "Access Forbidden. The Build Service must have 'Contribute to pull requests' permission. Go to Project Settings → Repositories → Security and grant this permission to your Build Service account.");
            }

            tl.warning(`Failed to add comment: ${response.status} ${response.statusText}`)
        } else {
            console.info(`Comment added to ${fileName}`);
        }

        return response.ok;
    }

    public async DeleteComment(thread: any, comment: any): Promise<boolean> {
        let removeCommentUrl = `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}/pullRequests/${this._pullRequestId}/threads/${thread.id}/comments/${comment.id}?api-version=5.1`;

        let response = await this.httpRequest(removeCommentUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tl.getVariable('System.AccessToken')}`, 'Content-Type': 'application/json' }
        });

        if (response.ok == false) {
            tl.warning(`Failed to delete comment from url ${removeCommentUrl} the response was ${response.statusText}`);
        }

        return response.ok;
    }

    public async DeleteComments() {
        let collectionName = this._collectionUri.replace('https://', '').replace('http://', '').split('/')[1];
        let buildServiceName = `${tl.getVariable('SYSTEM.TEAMPROJECT')} Build Service (${collectionName})`;

        let threads = await this.GetThreads();

        for (let thread of threads as any[]) {
            let comments = await this.GetComments(thread);

            for (let comment of comments.value.filter((comment: any) => comment.author.displayName === buildServiceName) as any[]) {
                await this.DeleteComment(thread, comment);
            }
        }
    }

    public async GetThreads(): Promise<never[]> {
        let threadsEndpoint = `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}/pullRequests/${this._pullRequestId}/threads?api-version=5.1`;
        let threadsResponse = await this.httpRequest(threadsEndpoint, {
            headers: { 'Authorization': `Bearer ${tl.getVariable('System.AccessToken')}`, 'Content-Type': 'application/json' }
        });

        if (threadsResponse.ok == false) {
            tl.warning(`Failed to retrieve threads from url ${threadsEndpoint} the response was ${threadsResponse.statusText}`);
        }

        let threads: any = await threadsResponse.json();
        return threads.value.filter((thread: any) => thread.threadContext !== null);
    }

    public async GetComments(thread: any): Promise<any> {
        let commentsEndpoint = `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}/pullRequests/${this._pullRequestId}/threads/${thread.id}/comments?api-version=5.1`;
        let commentsResponse = await this.httpRequest(commentsEndpoint, {
            headers: { 'Authorization': `Bearer ${tl.getVariable('System.AccessToken')}`, 'Content-Type': 'application/json' }
        });

        if (commentsResponse.ok == false) {
            tl.warning(`Failed to retrieve comments from url ${commentsEndpoint} the response was ${commentsResponse.statusText}`);
        }

        return await commentsResponse.json();
    }

    public async GetPRCommentsContext(): Promise<string> {
        try {
            let context = '\n## Existing Pull Request Comments:\n';
            let hasComments = false;
            
            // Get all threads (including those without file context for general PR comments)
            let threadsEndpoint = `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}/pullRequests/${this._pullRequestId}/threads?api-version=5.1`;
            let threadsResponse = await this.httpRequest(threadsEndpoint, {
                headers: { 'Authorization': `Bearer ${tl.getVariable('System.AccessToken')}`, 'Content-Type': 'application/json' }
            });

            if (threadsResponse.ok == false) {
                tl.warning(`Failed to retrieve PR threads: ${threadsResponse.statusText}`);
                return '';
            }

            let threads: any = await threadsResponse.json();
            
            // Get the build service name to identify AI-generated comments
            let collectionName = this._collectionUri.replace('https://', '').replace('http://', '').split('/')[1];
            let buildServiceName = `${tl.getVariable('SYSTEM.TEAMPROJECT')} Build Service (${collectionName})`;
            
            for (const thread of threads.value as any[]) {
                // Skip deleted or resolved threads
                if (thread.isDeleted) continue;
                
                const comments = await this.GetComments(thread);
                
                if (!comments.value || comments.value.length === 0) continue;
                
                // Include all non-deleted comments with content
                const validComments = comments.value.filter((comment: any) => 
                    !comment.isDeleted &&
                    comment.content && 
                    comment.content.trim().length > 0 &&
                    comment.commentType !== 1 // Skip system comments
                );
                
                if (validComments.length === 0) continue;
                
                hasComments = true;
                
                // Get file context if available
                const filePath = thread.threadContext?.filePath || 'General PR Comment';
                const threadStatus = this.getThreadStatusName(thread.status);
                
                context += `\n### ${filePath} (Status: ${threadStatus}):\n`;
                
                for (const comment of validComments) {
                    const author = comment.author.displayName || 'Unknown';
                    const content = comment.content;
                    const isAIComment = author === buildServiceName;
                    
                    if (isAIComment) {
                        context += `- **[AI - Previous Review]**: ${content}\n`;
                    } else {
                        context += `- **${author}**: ${content}\n`;
                    }
                }
            }
            
            if (!hasComments) {
                return '';
            }
            
            context += '\n---\n**IMPORTANT**: Comments marked with [AI - Previous Review] are your own comments from a previous run. DO NOT repeat or rephrase these comments. Only add NEW insights not already covered.\n';
            
            return context;
        } catch (error) {
            tl.warning(`Could not retrieve PR comments context: ${error}`);
            return '';
        }
    }

    private getThreadStatusName(status: number): string {
        switch (status) {
            case 0: return 'Unknown';
            case 1: return 'Active';
            case 2: return 'Fixed';
            case 3: return 'Won\'t Fix';
            case 4: return 'Closed';
            case 5: return 'By Design';
            case 6: return 'Pending';
            default: return 'Unknown';
        }
    }
}