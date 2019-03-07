import * as vscode from 'vscode';

export class QCAlgorithmProject {
    /**Map filenames from the QuantConnect cloud project to local file paths */
    private files?: Map<string, string>;

    /**Determines if this is a QuantConnect Framework project */
    private frameworkProject?: boolean;

    constructor() {

    }

    public addFile(filePath: string) {
    }

    public launchBacktest(context: vscode.ExtensionContext) {

    }
}