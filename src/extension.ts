// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { QCAlgorithmProject } from './project';
import { CredentialManager } from './credentials';
import { Language, LeanApi } from './api';

export let Projects: QCAlgorithmProject[] = [];
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let credManager = context.workspaceState.get<CredentialManager>('quantconnectCredentialManager');

    if (!credManager) {
        // Prompt the user for their API key if they haven't entered it yet
        credManager = new CredentialManager();
        context.workspaceState.update('quantconnectCredentialManager', credManager);
    } 
    else if (!credManager.getApiKey || !credManager.getUserId) {
        credManager = new CredentialManager();
        context.workspaceState.update('quantconnectCredentialManager', credManager);
    }

    let selectOrCreateProject = vscode.commands.registerCommand('extension.createOrDownloadProject', () => QCAlgorithmProject.createOrDownloadProject(context, credManager!));

    context.subscriptions.push(selectOrCreateProject);
}

// this method is called when your extension is deactivated
export function deactivate() {
    console.log('Deactivated');
}
