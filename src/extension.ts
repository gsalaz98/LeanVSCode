import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { QCAlgorithmProject } from './project';
import { CredentialManager } from './credentials';
import { Language, LeanApi } from './api';

/**
 * Store all currently active projects here. 
 */
export let VERSION = '0.0.1';
export let Projects: QCAlgorithmProject[] = [];
export let CredManager = new CredentialManager();
export let StatusBar: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    // Take any projects stored in the global state and recreate the objects to get back context
    initProjects(context, CredManager);

    StatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

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

    let onFileSave = vscode.workspace.onDidSaveTextDocument((_) => {
        if (!vscode.workspace.getConfiguration('quantconnect').get<boolean>('uploadOnSave', false)) {
            return;
        }
        console.log('File saved, uploading to cloud');
        QCAlgorithmProject.saveFileChangesToCloud();
    });

    let onWindowChange = vscode.window.onDidChangeActiveTextEditor(updateStatusBar);

    context.subscriptions.push(selectOrCreateProject);
    context.subscriptions.push(saveFileToCloud);
    context.subscriptions.push(onConfigChange);
    context.subscriptions.push(onFileSave);
    context.subscriptions.push(onWindowChange);

    updateStatusBar();
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
        // Don't bother creating new project directories if we've already deleted them
        if (!fs.existsSync(projects[i].projectPath)) {
            continue;
        }
        let project = new QCAlgorithmProject(
            context, 
            credManager, 
            projects[i].projectName, 
            projects[i].projectLanguage, 
            false, 
            true, 
            projects[i].projectId
        );

        if (project.projectId === undefined) {
            let result = project.setProjectIdFromProjectName();

            if (!result) {
                vscode.window.showErrorMessage('Unable to get project id for project after refresh');
            }
        }
        Projects.push(project);
    }
}

function updateStatusBar() {
    let project = QCAlgorithmProject.getOpenProject();
    let file = QCAlgorithmProject.getOpenFile(project);

    if (!project) {
        StatusBar.text = 'QuantConnect: No project selected';
        StatusBar.show();
        return;
    }

    if (!file) {
        StatusBar.text = 'QuantConnect: No file selected';
        StatusBar.show();
        return;
    }

    StatusBar.text = `QuantConnect: ${project.projectLanguage} - ${project.projectName}/${path.basename(file.filePath)}`;
    StatusBar.show();
}