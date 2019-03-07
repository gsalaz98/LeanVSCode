import * as crypto from 'crypto';
import * as request from 'request-promise-native';
import * as vscode from 'vscode';

/**Programming language used for project */
export enum Language {
    Python = 'Py',
    CSharp = 'C#',
    FSharp = 'F#',
}

/**HTTP request method */
enum Method {
    GET = 'GET',
    POST = 'POST',
}

/**
 * API as defined in LEAN's `QuantConnect.Api` namespace
 */
export class LeanApi {
    /**User API key. Obtainable from https://www.quantconnect.com/account */
    apiKey: string;
    /**User ID. Obtainable from https://www.quantconnect.com/account */
    userId: string;

    /**Base API url; Configurable to point at another API via workspace `settings.json` file */
    baseUrl: string;

    constructor(apiKey: string, userId: string) {
        this.apiKey = apiKey;
        this.userId = userId;

        let baseUrl = vscode.workspace.getConfiguration('quantconnect').get<string>('cloudApiUrl');

        // Set a default API in case we don't find any value in the workspace config
        if (baseUrl === undefined) {
            this.baseUrl = 'https://www.quantconnect.com/api/v2/';
            return;
        }
        this.baseUrl = baseUrl;
    }

    /**
     * API Endpoint `GET /api/v2/authenticated`
     * @returns Promise containing boolean indicating whether authentication was successful
     */
    public async authenticated(): Promise<boolean> {
        return await this.request('authenticated', Method.GET);
    }
    
    /**
     * API Endpoint `POST /api/v2/projects/create`
     * @param name Name of the project to create
     * @param language Programming language to use for the project
     */
    public async createProject(name: string, language: Language): Promise<boolean> {
        return await this.request('projects/create', Method.POST, {
            body: {
                name: name,
                language: language
            }
        });
    }
    /**
     * Send out HTTP request to specified endpoint with the given method and options
     * @param endpoint API endpoint/resource
     * @param method GET or POST request method
     * @param options User defined options. POST data will be sent through here
     * 
     * @returns Boolean indicating whether 
     */
    private async request(endpoint: string, method: Method, options?: request.RequestPromiseOptions): Promise<boolean> {
        if (!options) {
            options = {};
        }

        if (!options.headers) {
            options.headers = {};
        }

        let authHash = this.createHash();

        // Automatically parses json
        options.json = true;
        // Authenticate with user ID and hashed timestamp + API key
        options.auth = {
            username: this.userId,
            password: authHash,
        };
        // Set Timestamp in header. Required for a successful request
        options.headers['Timestamp'] = authHash;

        switch (method) {
            case Method.GET:
            return await request.get(this.baseUrl + endpoint, options).then(response => {
                if (response.success) {
                    return true;
                }
                return false;
            });

            case Method.POST:
            return await request.post(this.baseUrl + endpoint, options).then(response => {
                if (response.success) {
                    return true;
                }
                return false;
            });
        }
    }

    /**
     * Creates `Timestamp` header hash.
     * 
     * Header hash is defined as:
     * `sha256('apiKey:epoch seconds')`
     * 
     * @returns Hashed API key
     */
    private createHash(): string {
        return crypto.createHash('sha256')
            .update(this.apiKey)
            .update(':')
            .update(Math.floor(new Date().getTime() / 1000).toString())
            .digest()
            .toString('hex');
    }
}