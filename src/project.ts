import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { LeanApi, Language, Project } from './api';
import { CredentialManager } from './credentials';
import { Projects } from './extension';

/**
 * Represents a QuantConnect project. We manage our local projects through this class.
 * 
 * Note: all our class variables are public so that we can access those values from vscode's globalState
 * In general, we should treat the class variables as if they're private.
 */
export class QCAlgorithmProject {
    /**Credential Manager. This is our entry point to the API */
    public api: LeanApi;
    /**Directory name */
    public projectPath: string;
    /**Project/directory name */
    public projectName: string;
    /**Project programming language*/
    public projectLanguage: Language;
    /**Project ID */
    public projectId!: number;
    /**Map filenames from the QuantConnect cloud project to local file paths */
    public files: QCProjectFile[];
    /**Determines if this is a QuantConnect Framework project */
    public frameworkProject?: boolean;

    /**
     * Objectives:
     * 
     * On object creation, we would ideally like to create a new directory if one doesn't already exist for the project.
     * If it's a new project, download all files
     * If it's not a new project, find the project on QC and download the project without
     * @param context VSCode extension context
     * @param credManager API credentials
     * @param projectName Name of the project
     * @param language Programming language the project is in
     * @param newProject Determines whether this is a new project. Creates a new project on QuantConnect if true
     * @param fromGlobalState Determines if we initializing a new object from the global state
     * @param globalStateInstance instance to initialize new class from
     */
    constructor(context: vscode.ExtensionContext, 
        credManager: CredentialManager,
        projectName: string, 
        language: Language, 
        newProject: boolean,
        fromGlobalState: boolean,
        projectId?: number) {

        if (!vscode.workspace.workspaceFolders) {
            throw new Error('This plugin only works with workspaces. Please start a new workspace and try again');
        }

        if (credManager === undefined) {
            throw new Error('Credential manager is not initialized');
        }

        let workspaceAsRootPath = vscode.workspace.getConfiguration('quantconnect').get<boolean>('workspaceAsRootPath', false);
        let normalizedProjectName = QCAlgorithmProject.normalizeProjectName(projectName);
        let projectPath = workspaceAsRootPath ? vscode.workspace.workspaceFolders[0].uri.fsPath : `${vscode.workspace.workspaceFolders[0].uri.fsPath}${path.sep}${normalizedProjectName}`;

        if (!normalizedProjectName) {
            throw new Error('The project name you provided only contains special characters and can not be initialized');
        }

        this.api = credManager.api;
        this.files = [];
        this.projectPath = projectPath;
        this.projectName = projectName;
        this.projectLanguage = language;

        // In the case we're initializing this instance from a global state
        if (projectId !== undefined) {
            this.projectId = projectId;
        }

        // Create project directory if it doesn't already exist
        if (!fs.existsSync(this.projectPath)) {
            fs.mkdirSync(this.projectPath);
        }

        if (fromGlobalState) {
            for (let file of fs.readdirSync(this.projectPath)) {
                let filePath = `${this.projectPath}${path.sep}${file}`;

                // Skip directories because we cannot have directories or files inside directories in the QuantConnect cloud
                if (fs.lstatSync(filePath).isDirectory()) {
                    continue;
                }
                
                let contents = fs.readFileSync(filePath).toString();
                this.files.push(new QCProjectFile(filePath, contents, false));
            }
        }
        else {
            if (newProject) {
                // 1. Create a new QuantConnect project
                // 2. Download project files (no overwrite)
                this.api.createProject(this.projectName, this.projectLanguage).then(response => {
                    this.projectId = response.projects[0].projectId;
                })
                .then(() => {
                    this.downloadProjectFiles();
                })
                .catch((err: string) => {
                    console.log(err);
                    vscode.window.showErrorMessage(err);
                });
            }
            else {
                // 1. List projects
                // 2. Find the project in the list of projects
                // 3. Download project files
                // 3a. Prompt user if they want to overwrite files if files are found inside directory

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
                    if (fs.readdirSync(this.projectPath).length > 0) {
                        vscode.window.showInformationMessage('Files detected in project folder. Would you like to overwrite the project files with QuantConnect cloud files?', 'Skip', 'Overwrite').then(selection => {
                            if (selection === 'Skip' || selection === undefined) {
                                this.downloadProjectFiles();
                            }
                            else {
                                this.downloadProjectFiles(true);
                            }
                        });
                    }
                    else {
                        this.downloadProjectFiles();
                    }
                })
                .catch((err: string) => {
                    console.log(err);
                    vscode.window.showErrorMessage(err);
                });
            }
        }
    }

    /**
     * Removes any special characters so that the project can be written as a file/directory
     */
    public static normalizeProjectName(projectName: string): string {
        return projectName.replace(/[^a-zA-Z0-9\_\ \.\-]/g, '');
    }

    /**
     * Create a new QCAlgorithmProject from an object stored in the global state
     * @param project Project state with no access to methods or private variables
     */
    public static fromGlobalState(context: vscode.ExtensionContext, credManager: CredentialManager, project: QCAlgorithmProject): QCAlgorithmProject {
        return new QCAlgorithmProject(context, credManager, project.projectName, project.projectLanguage, false, true, project.projectId);
    }

    /**
     * Entry point for the creation of a new QCAlgorithmProject object
     * Can create a new project or download an existing one.
     * 
     * @param context VSCode Extension context
     * @param credManager Credentials to the API
     */
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
                    Projects.push(new QCAlgorithmProject(context, credManager, projectName, selectedLanguage, true, false));
                    context.globalState.update('quantconnectProjects', Projects);
                    vscode.window.showInformationMessage('Project successfully created');
                })
                .then(undefined, (err: string) => {
                    console.log(err);
                    vscode.window.showErrorMessage(err);
                });
            }
            else if (selectOrCreate === 'Download') {
                credManager.api.listProjects().then(response => {
                    if (!response.success) {
                        vscode.window.showErrorMessage(`Listing projects was unsuccessful. Reason(s): ${JSON.stringify(response.errors)}`);
                        return;
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

                            Projects.push(new QCAlgorithmProject(context, credManager, projectName, language, false, false));
                            context.globalState.update('quantconnectProjects', Projects);
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
        .then(undefined, (err: string) => {
            console.log(err);
            vscode.window.showErrorMessage(err);
        });
    }

    /**
     * Sometimes, the project id is not initialized along with the rest of the object.
     * We want to make sure we can recover the project ID from a project name
     */
    public setProjectIdFromProjectName(): boolean {
        let projectId: number | undefined;

        this.api.listProjects().then(response => {
            if (response.projects.length === 0) {
                throw new Error('Tried to list projects, but no projects were found');
            }
            if (response.projects.length === 1) {
                projectId = response.projects[0].projectId;
            }
            else {
                projectId = response.projects.reduce((prev, curr) => {
                    if (curr.modified > prev.modified) {
                        return curr;
                    }
                    return prev;
                }).projectId;
            }
        })
        .catch(err => {
            console.log(err);
            vscode.window.showErrorMessage(err);
        });

        if (projectId === undefined) {
            return false;
        }

        this.projectId = projectId;
        return true;
    }

    /**
     * Save a single file in the current project to the cloud.
     * Will prompt the user for confirmation to avoid accidental saving
     */
    public static saveFileChangesToCloud() {
        let project = QCAlgorithmProject.getOpenProject();
        let file = QCAlgorithmProject.getOpenFile(project);

        if (!project) {
            vscode.window.showErrorMessage('You must have a project open in order to save changes to the cloud');
            return;
        }
        if (!file) {
            vscode.window.showErrorMessage('You must have an open file in order to save changes to the cloud');
            return;
        }

        project.saveFileToCloud(file);
    }

    /**
     * Save all files in the current project to the cloud.
     * Will prompt the user for confirmation to avoid accidental saving
     */
    public saveProjectChangesToCloud() {
        let project = QCAlgorithmProject.getOpenProject();
        
        if (!project) {
            vscode.window.showErrorMessage('You must have a project open in order to save project changes to the cloud');
            return;
        }

        for (let file of project.files) {
            project.saveFileToCloud(file);
            // Let's treat the API gently...
            setTimeout(() => {}, 1000);
        }
    }

    /**
     * Detects currently open file's designated project and returns it
     * 
     * @returns QCAlgorithmProject or undefined in the case no such project exists 
     */
    public static getOpenProject(): QCAlgorithmProject | undefined {
        if (!vscode.window.activeTextEditor) {
            return;
        }

        let editor = vscode.window.activeTextEditor;
        let doc = editor.document;

        if (doc.isUntitled) {
            return;
        }

        let filePath = doc.fileName;
        let splitDir = doc.fileName.split(path.sep);
        let projectPathSplit = [];

        for (let i = 0; i < splitDir.length - 1; i++) {
            projectPathSplit.push(splitDir[i]);
        }

        let projectPath = projectPathSplit.join(path.sep);

        for (let project of Projects) {
            if (project.projectPath === projectPath) {
                return project;
            }
        }
    }

    public static getOpenFile(project: QCAlgorithmProject | undefined): QCProjectFile | undefined {
        let doc = vscode.window.activeTextEditor;

        if (!project) {
            return;
        }
        if (!doc) {
            return;
        }
        for (let file of project.files) {
            if (file.filePath === doc.document.fileName) {
                return file;
            }
        }
    }

    /**
     * Download a single project file to the project's root
     * 
     * @param fileName Name of file to download
     */
    private downloadProjectFile(fileName: string) {
        this.api.readProjectFile(this.projectId, fileName).then(project => {
            if (project.files.length === 0) {
                vscode.window.showErrorMessage('File not found in project');
                return;
            }
            let projectFile = new QCProjectFile(project.files[0].name, project.files[0].content, true);
        })
        .catch((err: string) => {
            console.log(err);
        });
    }

    private saveFileToCloud(projectFile: QCProjectFile) {
        projectFile.reloadFileFromDisk();
        let fileName = path.basename(projectFile.filePath);

        if (vscode.workspace.getConfiguration('quantconnect').get<boolean>('uploadSkipDialog')) {
            this.api.updateProjectFileContent(this.projectId, fileName, projectFile.content).then(response => {
                if (response.success) {
                    vscode.window.showInformationMessage('File saved to cloud successfully');
                    projectFile.synced = true;
                    return;
                }
                vscode.window.showErrorMessage(`File cloud save failed. Reason(s): ${JSON.stringify(response.errors)}`);
            });
            return;
        }

        vscode.window.showInformationMessage(`Are you sure you want to save ${fileName} to the cloud?`, 'No', 'Yes').then(selection => {
            if (selection === 'Yes') {
                this.api.updateProjectFileContent(this.projectId, fileName, projectFile.content).then(response => {
                    if (response.success) {
                        vscode.window.showInformationMessage('File saved to cloud successfully');
                        projectFile.synced = true;
                        return;
                    }
                    vscode.window.showErrorMessage(`File cloud save failed. Reason(s): ${JSON.stringify(response.errors)}`);
                });
            }
        });
    }

    /**
     * Downloads project files. Will optionally overwrite files.
     * If no overwrite, the call to `createFile()` will not do anything
     */
    private downloadProjectFiles(overwrite: boolean = false) {
        this.api.readProjectFiles(this.projectId).then(project => {
            for (let file of project.files) {
                let projectFile = new QCProjectFile(`${this.projectPath}${path.sep}${file.name}`, file.content, true);
                if (overwrite) {
                    projectFile.createFileOverwrite();
                }
                else {
                    projectFile.createFile();
                }

                this.files.push(projectFile);
            }
        })
        .catch((err: string) => {
            vscode.window.showErrorMessage(err);
        });
    }
}

export class QCProjectFile {
    constructor(
        public filePath: string,
        public content: string,
        public synced: boolean,
    ) {}

    public createFile(): boolean {
        if (fs.existsSync(this.filePath)) {
            return false;
        }
        fs.writeFileSync(this.filePath, this.content);
        return true;
    }

    public createFileOverwrite() {
        fs.writeFileSync(this.filePath, this.content);
    }

    public reloadFileFromDisk() {
        this.content = fs.readFileSync(this.filePath).toString();
    }

    public get isSyncedToCloud(): boolean {
        return this.synced;
    }
}