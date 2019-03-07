import * as vscode from 'vscode';

/**
 * Manages credential related tasks. 
 * 
 * If no API key or userID is found in the configuration,
 * the `CredentialManager` will prompt the user for their
 * missing information.
 * 
 * Can update configuration once a user supplies
 * a valid API key and userID. 
 */
export class CredentialManager {
    private apiKey?: string;
    private userId?: string;

    constructor() {
        let workspaceConfig = vscode.workspace.getConfiguration('quantconnect');

        this.apiKey = workspaceConfig.get('apiKey');
        this.userId = workspaceConfig.get('userId');

        console.log(this.apiKey);
        console.log(this.userId);

        if (!this.apiKey || !this.userId) {
            CredentialManager.promptForApiKey().then(apiKey => {
                this.apiKey = apiKey;
                // Updates the config file to include the user's API key
                workspaceConfig.update('apiKey', apiKey);
            })
            .then(() => {
                return CredentialManager.promptForUserId();
            })
            .then(userId => {
                this.userId = userId;
                // Updates the config file to include the user's ID
                workspaceConfig.update('userId', userId);
            });
        }
    }

    /**Gets the QuantConnect user's API key
     * 
     * @public
    */
    public getApiKey(): string | undefined {
        return this.apiKey;
    }

    /**Gets the QuantConnect user's userId 
     * 
     * @public
    */
    public getUserId(): string | undefined {
        return this.userId;
    }

    /**
     * Sets the user's API key.
     * 
     * @param apiKey User's QuantConnect API key. You can obtain this value from https://www.quantconnect.com/account
     * @protected
     */
    protected setApiKey(apiKey: string): void {
        this.apiKey = apiKey;
    }

    /**
     * Sets the user's userId
     * 
     * @param userId User's QuantConnect user ID. You can obtain this value from https://www.quantconnect.com/account
     * @protected
     */
    protected setUserId(userId: string): void {
        this.userId = userId;
    }

    private static async promptEditSettings(): Promise<void> {}

    /**
     * Prompt the user for their API key using a form
     */
    private static async promptForApiKey(): Promise<string | undefined> {
        // Only run this part if the user hasn't provided the API keys in the configuration
        return vscode.window.showInputBox({
            prompt: 'Enter your QuantConnect API key',
            ignoreFocusOut: true,
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