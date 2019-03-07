// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { QCAlgorithmProject } from './backtest';
import { CredentialManager } from './credentials';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Prompt the user for their API key if they haven't entered it yet
	context.workspaceState.update('quantconnectCredentialManager', new CredentialManager());
	
	// Project name as key
	context.globalState.update('quantconnectProjects', new Map<string, QCAlgorithmProject>());
}

// this method is called when your extension is deactivated
export function deactivate() {}
