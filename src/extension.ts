import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { QCAlgorithmProject } from './project';
import { CredentialManager } from './credentials';
import { Language, LeanApi } from './api';

/**
 * Store all currently active projects here. 
 */
export let Projects: QCAlgorithmProject[] = [];
export let CredManager = new CredentialManager();

export function activate(context: vscode.ExtensionContext) {
    // Take any projects stored in the global state and recreate the objects to get back context
    initProjects(context, CredManager);

    let selectOrCreateProject = vscode.commands.registerCommand('extension.createOrDownloadProject', () => QCAlgorithmProject.createOrDownloadProject(context, CredManager));
    let saveFileToCloud = vscode.commands.registerCommand('extension.saveFileChangesToCloud', () => QCAlgorithmProject.saveFileChangesToCloud());

    // Update the credential manager in the event of a config update
    let onConfigChange = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('quantconnect.apiKey') || e.affectsConfiguration('quantconnect.userId')) {
            CredManager = new CredentialManager();

            for (let project of Projects) {
                project.api.apiKey = CredManager.apiKey;
                project.api.userId = CredManager.userId;
            }
        }
    });

    let onFileSave = vscode.workspace.onDidSaveTextDocument((e) => {
        if (!vscode.workspace.getConfiguration('quantconnect').get<boolean>('uploadOnSave', false)) {
            return;
        }
        console.log('File saved, uploading to cloud');
        QCAlgorithmProject.saveFileChangesToCloud();
    });

    context.subscriptions.push(selectOrCreateProject);
    context.subscriptions.push(saveFileToCloud);
    context.subscriptions.push(onConfigChange);
    context.subscriptions.push(onFileSave);
}

// this method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
    context.globalState.update('quantconnectProjects', Projects);
}

function initProjects(context: vscode.ExtensionContext, credManager: CredentialManager) {
    let projects = context.globalState.get<QCAlgorithmProject[]>('quantconnectProjects');

    if (projects === undefined) {
        return;
    }
    for (let i = 0; i < projects.length; i++) {
        // Don't bother creating new projects if we've deleted the directories
        if (!fs.existsSync(QCAlgorithmProject.normalizeProjectName(projects[i].projectName))) {
            continue;
        }
        Projects.push(new QCAlgorithmProject(
            context, 
            credManager, 
            projects[i].projectName, 
            projects[i].projectLanguage, 
            false, 
            true, 
            projects[i].projectId
        ));
    }
}
