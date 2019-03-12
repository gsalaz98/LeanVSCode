import * as vscode from 'vscode';
import { LeanApi } from './api';

/**
 * Manages credential related tasks. 
 * 
 * If no API key or userID is found in the configuration,
 * the `CredentialManager` will prompt the user for their
 * missing information.
 * 
 * Can update configuration once a user supplies
 * a valid API key and userID.
 * 
 * Contains an API instance. Use this class to query the QuantConnect API
 */
export class CredentialManager {
    /**User API key. Obtainable from https://www.quantconnect.com/accounts */
    private apiKey?: string;
    /**User ID. Obtainable from https://www.quantconnect.com/accounts */
    private userId?: string;
    /**Lean API instance*/
    private api!: LeanApi;

    constructor() {
        const workspaceConfig = vscode.workspace.getConfiguration('quantconnect'); 

        this.apiKey = workspaceConfig.get('apiKey');
        this.userId = workspaceConfig.get('userId');

        if (!this.apiKey || !this.userId) {
            CredentialManager.promptForApiKey().then(apiKey => {
                this.apiKey = apiKey;
                // Updates the config file to include the user's API key
                workspaceConfig.update('apiKey', apiKey, vscode.ConfigurationTarget.Workspace);
                workspaceConfig.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
            })
            .then(() => {
                return CredentialManager.promptForUserId();
            })
            .then(userId => {
                this.userId = userId;
                // Updates the config file to include the user's ID
                workspaceConfig.update('userId', userId, vscode.ConfigurationTarget.Workspace);
                workspaceConfig.update('userId', userId, vscode.ConfigurationTarget.Global);
            })
            .then(() => {
                this.initializeApi();
            });
            
            // Prevents the API from being initialized twice
            return;
        }
        this.initializeApi();
    }

    /**
     * Gets the API instance
     * 
     * @public
     */
    public get getApi(): LeanApi {
        return this.api;
    }

    /**Gets the QuantConnect user's API key
     * 
     * @public
    */
    public get getApiKey(): string | undefined {
        return this.apiKey;
    }

    /**Gets the QuantConnect user's userId 
     * 
     * @public
    */
    public get getUserId(): string | undefined {
        return this.userId;
    }

    /**
     * Sets the user's API key.
     * 
     * @param apiKey User's QuantConnect API key. You can obtain this value from https://www.quantconnect.com/account
     * @protected
     */
    protected set setApiKey(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Sets the user's userId
     * 
     * @param userId User's QuantConnect user ID. You can obtain this value from https://www.quantconnect.com/account
     * @protected
     */
    protected set setUserId(userId: string) {
        this.userId = userId;
    }

    /**
     * Initialize the Lean API instance and check for valid credentials
     * 
     * @private
     */
    private initializeApi() {
        this.api = new LeanApi(this.apiKey, this.userId);

        this.api.authenticated().then(authenticated => {
            if (!authenticated) {
                vscode.window.showErrorMessage('The API credentials you supplied are not valid');
            } 
            else {
                vscode.window.showInformationMessage('Connected to QuantConnect API');
            }
        });
    }

    /**
     * Prompt the user for their API key using a form
     */
    private static async promptForApiKey(): Promise<string | undefined> {
        // Only run this part if the user hasn't provided the API keys in the configuration
        return vscode.window.showInputBox({
            prompt: 'Enter your QuantConnect API key',
            ignoreFocusOut: true,
            password: true
		})
		.then((apiKey: string | undefined) => {
		    if (apiKey === undefined) {
                vscode.window.showErrorMessage('In order to use the QuantConnect extension, you must provide an API key. You can provide the API key in the workspace `settings.json` file');
            }
            return apiKey;           
        });
    }

    /**
     * Prompt the user for their ID using a form
     */
    private static async promptForUserId(): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: 'Enter your QuantConnect User ID',
            ignoreFocusOut: true,
        })
        .then((userId: string | undefined) => {
            if (userId === undefined) {
                vscode.window.showErrorMessage('In order to use the QuantConnect extension, you must provide a user ID. You can provide the API key in the workspace `settings.json` file');
            }
            return userId;
        });
    }
}