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
 * Class variables are public, but should be treated as private.
 * We do this so that we can access the variables from the globalState
 * 
 * Contains an API instance. Use this class to query the QuantConnect API
 */
export class CredentialManager {
    /**User API key. Obtainable from https://www.quantconnect.com/accounts */
    public apiKey?: string;
    /**User ID. Obtainable from https://www.quantconnect.com/accounts */
    public userId?: string;
    /**Lean API instance*/
    public api!: LeanApi;

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
                vscode.window.showErrorMessage('In order to use the QuantConnect extension, you must provide a user ID. You can provide the user ID in the workspace `settings.json` file');
            }
            return userId;
        });
    }
}