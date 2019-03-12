import * as fs from 'fs';
import * as vscode from 'vscode';
import * as urlv2 from 'url';
import { LeanApi, Language, Project } from './api';
import { CredentialManager } from './credentials';
import { Projects } from './extension';

export class QCAlgorithmProject {
    /**Credential Manager. This is our entry point to the API */
    private api: LeanApi;
    /**Directory name */
    private projectPath?: string;
    /**Project/directory name */
    private projectName: string;
    /**Project programming language*/
    private projectLanguage: Language;
    /**Project ID */
    private projectId!: number;
    /**Map filenames from the QuantConnect cloud project to local file paths */
    private files: QCProjectFile[];
    /**Determines if this is a QuantConnect Framework project */
    private frameworkProject?: boolean;

    constructor(context: vscode.ExtensionContext, 
        credManager: CredentialManager,
        projectName: string, 
        language: Language, 
        newProject: boolean) {

        if (!vscode.workspace.workspaceFolders) {
            throw new Error('This plugin only works with workspaces. Please start a new workspace and try again');
        }

        let workspaceAsRootPath = vscode.workspace.getConfiguration().get<boolean>('quantconnect.workspaceAsRootPath');

        if (credManager === undefined) {
            throw new Error('Credential manager is not initialized');
        }

        if (!workspaceAsRootPath) {
            workspaceAsRootPath = false;
        }

        let normalizedProjectName = QCAlgorithmProject.normalizeProjectName(projectName);
        let projectPath = workspaceAsRootPath ? vscode.workspace.workspaceFolders[0].uri.fsPath : `${vscode.workspace.workspaceFolders[0].uri.fsPath}/${normalizedProjectName}`;

        if (!normalizedProjectName) {
            throw new Error('The project name you provided only contains special characters and can not be initialized');
        }

        this.api = credManager.getApi;
        this.files = [];
        this.projectPath = projectPath;
        this.projectName = projectName;
        this.projectLanguage = language;

        if (!this.api) {
            throw new Error('Lean API is not initialized in QCAlgorithmProject');
        }

        if (!workspaceAsRootPath) {
            if (fs.existsSync(this.projectPath)) {
                let i = 1;
                while (fs.existsSync(`${this.projectPath}_${i}`)) {
                    if (i > 20) {
                        throw new Error('Project directory names are occupied (max tries exceeded). Please rename a folder and run this again');
                    }
                    i++;
                }
                this.projectPath = `${this.projectPath}_${i}`;
            }
            fs.mkdirSync(this.projectPath);
        }

        if (newProject) {
            this.api.createProject(this.projectName, this.projectLanguage).then(response => {
                this.projectId = response.projects[0].projectId;
            })
            .then(() => {
                this.downloadProjectFiles();
            })
            .catch(err => {
                console.log(err);
            });
        }
        else {
            // This will always succeed because we will prompt the user for the project they want
            // to choose and not allow them to reach this point if the project doesn't exist
            this.api.listProjects().then(response => {
                let projects = response.projects.filter(project => project.name === projectName);
                let project: Project;

                if (projects.length > 1) {
                    // Prioritize newly modified algorithms over older ones with the same names
                    project = projects.reduce((prevProject, currProject) => {
                        if (currProject.modified > prevProject.modified) {
                            return currProject;
                        }
                        return prevProject;
                    });
                }
                else {
                    project = projects[0];
                }
                if (!project) {
                    throw new Error('Project is null even though we provided a valid project name');
                }
                this.projectId = project.projectId;
            })
            .then(() => {
                this.downloadProjectFiles();
            })
            .catch(err => {
                console.log(err);
            });
        }
    }

    public static normalizeProjectName(projectName: string): string {
        return projectName.replace(/[^a-zA-Z0-9\_\ \.]/g, '');
    }

    public static createOrDownloadProject(context: vscode.ExtensionContext, credManager: CredentialManager) {
        vscode.window.showQuickPick(['Create', 'Download']).then(selectOrCreate => {
            if (!selectOrCreate) {
                return;
            }
            let projectName: string;
            let selectedLanguage: Language;

            if (credManager === undefined) {
                vscode.window.showErrorMessage('You are not connected to the QuantConnect API');
                return;
            }

            if (selectOrCreate === 'Create') {
                vscode.window.showInputBox({
                    placeHolder: 'Enter your project name',
                    ignoreFocusOut: true
                })
                .then(name => {
                    if (!name) {
                        return;
                    }
                    projectName = name;

                    return vscode.window.showQuickPick(['Python', 'C#', 'F#'], {
                        placeHolder: 'Select a programming language for your project'
                    });
                })
                .then(language => {
                    switch (language) {
                        case 'Python':
                        selectedLanguage = Language.Python;
                        break;

                        case 'C#':
                        selectedLanguage = Language.CSharp;
                        break;

                        case 'F#':
                        selectedLanguage = Language.FSharp;
                        break;

                        default:
                        return;
                    }
                })
                .then(() => {
                    if (!projectName || !selectedLanguage) {
                        return;
                    }
                    Projects.push(new QCAlgorithmProject(context, credManager, projectName, selectedLanguage, true));
                    vscode.window.showInformationMessage('Project successfully created');
                })
                .then(undefined, err => {
                    console.log(err);
                    vscode.window.showErrorMessage(err);
                });
            }
            else if (selectOrCreate === 'Download') {
                credManager.getApi.listProjects().then(response => {
                    if (!response.success) {
                        throw new Error(`Response was unsuccessful. Reason(s): ${JSON.stringify(response.errors)}`);
                    }
                    vscode.window.showQuickPick(response.projects.map(project => `${project.language.toString()} - ${project.name}`), {
                        'canPickMany': true,
                        'ignoreFocusOut': true,
                        'placeHolder': 'Select projects to import'
                    })
                    .then(selection => {
                        if (!selection) {
                            return;
                        }
                        for (let selected of selection) {
                            let projectName = selected.substring(5);
                            let language = <Language> selected.substring(0, 2);

                            Projects.push(new QCAlgorithmProject(context, credManager, projectName, language, false));
                            return;
                        }
                    });
                })
                .catch((err: string) => {
                    console.log(err);
                    vscode.window.showErrorMessage(err);
                });
            }
        })
        .then(undefined, err => {
            console.log(err);
            vscode.window.showErrorMessage(err);
        });
    }

    private downloadProjectFiles() {
        this.api.readProjectFiles(this.projectId).then(project => {
            for (let file of project.files) {
                let projectFile = new QCProjectFile(`${this.projectPath}/${file.name}`, file.content, true);
                projectFile.createFile();

                this.files.push(projectFile);
            }
        })
        .catch(err => {
            vscode.window.showErrorMessage(err);
        });
    }
}

export class QCProjectFile {
    constructor(
        private filePath: string,
        private content: string,
        private synced: boolean,
    ) {}

    public createFile(): boolean {
        if (fs.existsSync(this.filePath)) {
            return false;
        }
        fs.writeFileSync(this.filePath, this.content);
        return true;
    }

    public newFileName(newFileName: string): boolean {

        return false;
    }

    public isSyncedToCloud(): boolean {
        return this.synced;
    }
}