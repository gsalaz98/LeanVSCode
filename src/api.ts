import * as crypto from 'crypto';
import * as request from 'request-promise-native';
import * as vscode from 'vscode';
import { VERSION } from './extension';

/**Programming language used for project */
export enum Language {
    Python = 'Py',
    CSharp = 'C#',
    FSharp = 'F#',
}

/**HTTP request method */
enum Method {
    GET = 'GET',
    POST = 'POST',
}

enum AlgorithmStatus {
    DeployError = 1,
    InQueue = 2,
    Running = 3,
    Stopped = 4,
    Liquidated = 5,
    Deleted = 6,
    Completed = 7,
    RuntimeError = 8,
    Invalid = 9,
    LoggingIn = 10,
    Initializing = 11,
    History = 12
}

enum BrokerageEnvironment {
    Live = 'live',
    Paper = 'paper'
}

enum CompileState {
    InQueue = 0,
    BuildSuccess = 1,
    BuildError = 2
}

enum Resolution {
    Tick = 1,
    Second = 2,
    Minute = 3,
    Hour = 4,
    Daily = 5
}

enum SecurityType {
    Base = 0,
    Equity,
    Option,
    Commodity,
    Forex,
    Future,
    Cfd,
    Crypto
}

enum TradeDirection {
    Long = 0,
    Short = 1,
}

type RuntimeStatisticsKey = 'Unrealized' |
    'Fees' |
    'Net Profit' |
    'Return' |
    'Equity';

type StatisticsKey = 'Total Trades' |
    'Average Win' |
    'Average Loss' |
    'Compounding Annual Return' |
    'Drawdown' |
    'Expectancy' |
    'Net Profit' |
    'Sharpe Ratio' |
    'Loss Rate' |
    'Win Rate' |
    'Profit-Loss Ratio' |
    'Alpha' |
    'Beta' |
    'Annual Standard Deviation' |
    'Annual Variance' |
    'Information Ratio' |
    'Tracking Error' |
    'Treynor Ratio' |
    'Total Fees';

type RuntimeStatistics = {
    [K in RuntimeStatisticsKey]: string;
};

type Statistics = {
    [K in StatisticsKey]: string;
};

export interface AlgorithmPerformance {
    TradeStatistics: TradeStatistics;
    PortfolioStatistics: PortfolioStatistics;
    ClosedTrades: Trade[];
}

export interface AlphaRuntimeStatistics {
    MeanPopulationScore: MeanPopulationScore;
    RollingAveragedPopulationScore: RollingAveragedPopulationScore;
    LongCount: number;
    ShortCount: number;
    LongShortRatio: number;
    TotalAccumulatedEstimatedAlphaValue: number;
    EstimatedMonthlyAlphaValue: number;
    TotalInsightsGenerated: number;
    TotalInsightsClosed: number;
    TotalInsightsAnalysisCompleted: number;
    MeanPopulationEstimatedInsightValue: number;
}

export interface BaseLiveAlgorithmSettings {
    id: string;
    user: string;
    password: string;
    environment: BrokerageEnvironment;
    account: string;
}

export interface Holding {
    Symbol: Symbol;
    Type: SecurityType;
    CurrencySymbol: string;
    AveragePrice: number;
    Quantity: number;
    MarketPrice: number;
    ConversionRate?: number;
    MarketValue: number;
    UnrealizedPnL: number;
}

export interface HoldingIndexer {
    [key: string]: Holding;
}

export interface LiveResult extends Result {
    Holdings: HoldingIndexer;
    Cash: undefined; //TODO: Implement CashBook
    ServerStatistics: ServerStatistics;
}

export interface LiveResultsData {
    version: number;
    resolution: Resolution;
    results: LiveResult;
}

export interface MeanPopulationScore {
    UpdatedTimeUtc: Date;
    Direction: TradeDirection;
    Magnitude: number;
    IsFinalScore: boolean;
}

export interface Order {
    Type: number;
    Id: number;
    ContingentId: number;
    BrokerId: string[];
    Symbol: Symbol;
    Price: number;
    PriceCurrency: string;
    Time: Date;
    CreatedTime: Date;
    LastFillTime: Date;
    LastUpdateTime?: Date;
    CanceledTime?: Date;
    Quantity: number;
    Status: number;
    TimeInForce: TimeInForce;
    Tag: string;
    Properties: Properties;
    SecurityType: number;
    Direction: TradeDirection;
    AbsoluteQuantity: number;
    Value: number;
    OrderSubmissionData: OrderSubmissionData;
    IsMarketable: boolean;
}

export interface Orders {
    [key: string]: Order;
}

export interface OrderSubmissionData {
    BidPrice: number;
    AskPrice: number;
    LastPrice: number;
}

export interface ProfitLoss {
    [key: string]: number;
}

export interface Properties {
    [key: string]: any;
}

export interface PortfolioStatistics {
    AverageWinRate: number;
    AverageLossRate: number;
    ProfitLossRatio: number;
    WinRate: number;
    LossRate: number;
    Expectancy: number;
    CompoundingAnnualReturn: number;
    Drawdown: number;
    TotalNetProfit: number;
    SharpeRatio: number;
    Alpha: number;
    Beta: number;
    AnnualStandardDeviation: number;
    AnnualVariance: number;
    InformationRatio: number;
    TrackingError: number;
    TreynorRatio: number;
}

export interface RollingAveragedPopulationScore {
    UpdatedTimeUtc: Date;
    Direction: TradeDirection;
    Magnitude: number;
    IsFinalScore: boolean;
}

export interface RollingWindow {
    [key: string]: AlgorithmPerformance;
}

export interface ServerStatistics {
    [key: string]: string;
}

export interface Symbol {
    $type: string;
    Value: string;
    ID: string;
    Permtick: string;
}

export interface TimeInForce {
    $type: string;
}

export interface Trade {
    Symbol: Symbol;
    EntryTime: Date;
    EntryPrice: number;
    Direction: TradeDirection;
    Quantity: number;
    ExitTime: Date;
    ExitPrice: number;
    ProfitLoss: number;
    TotalFees: number;
    MAE: number;
    MFE: number;
    Duration: string;
    EndTradeDrawdown: number;
}

export interface TradeStatistics {
    StartDateTime: Date;
    EndDateTime: Date;
    TotalNumberOfTrades: number;
    NumberOfWinningTrades: number;
    NumberOfLosingTrades: number;
    TotalProfitLoss: number;
    TotalProfit: number;
    TotalLoss: number;
    LargestProfit: number;
    LargestLoss: number;
    AverageProfitLoss: number;
    AverageProfit: number;
    AverageLoss: number;
    AverageTradeDuration: string;
    AverageWinningTradeDuration: string;
    AverageLosingTradeDuration: string;
    MaxConsecutiveWinningTrades: number;
    MaxConsecutiveLosingTrades: number;
    ProfitLossRatio: number;
    WinLossRatio: number;
    WinRate: number;
    LossRate: number;
    AverageMAE: number;
    AverageMFE: number;
    LargestMAE: number;
    LargestMFE: number;
    MaximumClosedTradeDrawdown: number;
    MaximumIntraTradeDrawdown: number;
    ProfitLossStandardDeviation: number;
    ProfitLossDownsideDeviation: number;
    ProfitFactor: number;
    SharpeRatio: number;
    SortinoRatio: number;
    ProfitToMaxDrawdownRatio: number;
    MaximumEndTradeDrawdown: number;
    AverageEndTradeDrawdown: number;
    MaximumDrawdownDuration: string;
    TotalFees: number;
}

export interface Backtest extends FailureResponse {
    name: string;
    note?: string;
    backtestId: string;
    completed: boolean;
    progress: number;
    result?: BacktestResult;
    error?: string;
    stacktrace?: string;
    created: Date;
}

export interface BacktestList extends FailureResponse {
    backtests: Backtest[];
}

export interface BacktestReport extends FailureResponse {
    report: string;
}

export interface FailureResponse {
    success: boolean;
    errors: string[];
}

export interface Result {
    IsFrameworkAlgorithm: boolean;
    AlphaRuntimeStatistics?: AlphaRuntimeStatistics;
    /**As per QuantConnect's TOS, we might have to omit the Charts results.
     * TODO: ping jared and ask if this is okay
     */
    Charts: undefined;
    Orders: Orders;
    ProfitLoss: ProfitLoss;
    Statistics: Statistics;
    RuntimeStatistics: RuntimeStatistics;
}

export interface BacktestResult extends Result {
    RollingWindow: RollingWindow;
    TotalPerformance?: AlgorithmPerformance;
}

export interface Compile extends FailureResponse {
    compileId: string;
    state: CompileState;
    logs: string[];
}

export interface LiveAlgorithm extends FailureResponse {
    projectId: number;
    deployId: string;
    status: AlgorithmStatus;
    launched: Date;
    stopped: Date;
    brokerage: string;
    subscription: string;
    error: string;
}

export interface LiveAlgorithmApiSettingsWrapper {
    versionId: string;
    projectId: number;
    compileId: string;
    serverType: string;
    brokerage: BaseLiveAlgorithmSettings;
}

export interface LiveAlgorithmResults extends FailureResponse {
    LiveResults: LiveResultsData;
}

export interface LiveList extends FailureResponse {
    live: LiveAlgorithm[];
}

export interface LiveLog extends FailureResponse {
    LiveLogs: string[];
}

export interface Project extends FailureResponse {
    projectId: number;
    name: string;
    created: Date;
    modified: Date;
    language: Language;
}

export interface ProjectFile extends FailureResponse {
    name: string;
    content: string;
    modified: Date;
}

export interface ProjectResponse extends FailureResponse {
    projects: Project[];
}

export interface ProjectFilesResponse extends FailureResponse {
    files: ProjectFile[];
}

/**
 * API as defined in https://github.com/QuantConnect/Lean/blob/master/Api/Api.cs
 */
export class LeanApi {
    /**User API key. Obtainable from https://www.quantconnect.com/account */
    apiKey?: string;
    /**User ID. Obtainable from https://www.quantconnect.com/account */
    userId?: string;

    /**Base API url; Configurable to point at another API via workspace `settings.json` file */
    baseUrl: string;

    constructor(apiKey?: string, userId?: string) {
        this.apiKey = apiKey;
        this.userId = userId;

        let baseUrl = vscode.workspace.getConfiguration('quantconnect').get<string>('cloudApiUrl');

        if (this.apiKey === undefined) {
            vscode.window.showErrorMessage('Lean API instance has been initialized with no API key');
        }
        if (this.userId === undefined) {
            vscode.window.showErrorMessage('Lean API instance has been initialized with no user ID');
        }
        // Set a default API in case we don't find any value in the workspace config
        if (baseUrl === undefined) {
            this.baseUrl = 'https://www.quantconnect.com/api/v2/';
            return;
        }
        this.baseUrl = baseUrl;
    }

    /**
     * API Endpoint `GET /api/v2/authenticated`
     * @returns Promise containing boolean indicating whether authentication was successful
     */
    public async authenticated(): Promise<boolean> {
        const response = await this.request<FailureResponse>('authenticate', Method.GET);

        if (response.success) {
            return true;
        }
        return false;
    }
    
    /**
     * API Endpoint `POST /api/v2/projects/create`
     * 
     * Create a project with the specified name and language via QuantConnect.com API
     *  
     * @param name Project name
     * @param language Programming language to use
     * @returns Project object from the API
     */
    public async createProject(name: string, language: Language): Promise<ProjectResponse> {
        return this.request<ProjectResponse>('projects/create', Method.POST, {
            form: {
                name: name,
                language: language
            }
        });
    }

    /**
     * API Endpoint `GET /api/v2/projects/read`
     * 
     * Get details about a single project
     * 
     * @param projectId Id of the project
     * @returns Object satisfying `ProjectResponse` that contains information regarding the project
     */
    public async readProject(projectId: number): Promise<ProjectResponse> {
        return this.request<ProjectResponse>('projects/read', Method.GET, {
            qs: {
                projectId: projectId
            }
        });
    }

    /**
     * API Endpoint `GET /api/v2/projects/read`
     * 
     * List details of all projects
     * 
     * @returns Object satisfying `ProjectResponse` that contains information regarding the project
     */
    public async listProjects(): Promise<ProjectResponse> {
        return this.request<ProjectResponse>('projects/read', Method.GET);
    }

    /**
     * API Endpoint `POST /api/v2/files/create`
     * 
     * Add a file to a project
     * 
     * @param projectId The project to which the file should be added
     * @param name The name of the new file
     * @param content The content of the new file
     * 
     * @returns Object satisfying `ProjectFilesResponse` that includes information about the newly created file
     */
    public async addProjectFile(projectId: number, name: string, content: string): Promise<ProjectFilesResponse> {
        return this.request<ProjectFilesResponse>('files/create', Method.POST, {
            form: {
                projectId: projectId,
                name: name,
                content: content
            }
        });
    }

    /**
     * API Endpoint `POST /api/v2/files/update`
     * 
     * Update the name of a file
     * 
     * @param projectId Project id to which the file belongs
     * @param oldFileName The current name of the file
     * @param newFileName The new name for the file
     * 
     * @returns Object satisfying `FailureResponse` indicating success
     */
    public async updateProjectFileName(projectId: string, oldFileName: string, newFileName: string): Promise<FailureResponse> {
        return this.request<FailureResponse>('files/update', Method.POST, {
            form: {
                projectId: projectId,
                name: oldFileName,
                newName: newFileName
            }
        });
    }

    /**
     * API Endpoint `POST /api/v2/files/update`
     * 
     * Update the contents of a file
     * 
     * @param projectId Project id to which the file belongs
     * @param fileName The name of the file that should be updated
     * @param newFileContents The new contents of the file
     * 
     * @returns Object satisfying `FailureResponse` indicating success
     */
    public async updateProjectFileContent(projectId: number, fileName: string, newFileContents: string): Promise<FailureResponse> {
        return this.request<FailureResponse>('files/update', Method.POST, {
            form: {
                projectId: projectId,
                name: fileName,
                content: newFileContents
            }
        });
    }

    /**
     * API Endpoint `GET /api/v2/files/read`
     * 
     * Read all files in a project
     * 
     * @param projectId Project id to which the file belongs
     * @returns Object satysfing `ProjectFilesResponse` that includes the information about all files in the project
     */
    public async readProjectFiles(projectId: number): Promise<ProjectFilesResponse> {
        return this.request<ProjectFilesResponse>('files/read', Method.GET, {
            qs: {
                projectId: projectId
            }
        });
    }

    /**
     * API Endpoint `GET /api/v2/files/read`
     * 
     * Read a file in a project
     * 
     * @param projectId Project id to which the file belongs
     * @param fileName The name of the file
     * 
     * @returns Object satisfying `ProjectFilesResponse` that includes the file information
     */
    public async readProjectFile(projectId: number, fileName: string): Promise<ProjectFilesResponse> {
        return this.request<ProjectFilesResponse>('files/read', Method.GET, {
            qs: {
                projectId: projectId,
                name: fileName
            }
        });
    }

    /**
     * API Endpoint `POST /api/v2/files/delete`
     * 
     * Delete a file in a project
     * 
     * @param projectId Project id to which the file belongs
     * @param name The name of the file that should be deleted
     * 
     * @returns Object satisfying `FailureResponse` indicating success
     */
    public async deleteProjectFile(projectId: number, name: string): Promise<FailureResponse> {
        return this.request<FailureResponse>('files/delete', Method.POST, {
            form: {
                projectId: projectId,
                name: name
            }
        });
    }

    /**
     * API Endpoint `POST /api/v2/projects/delete`
     * 
     * Delete a project
     * 
     * @param projectId Project id we own and wish to delete
     * @returns Object satisfying `FailureResponse` indicating success
     */
    public async deleteProject(projectId: number): Promise<FailureResponse> {
        return this.request<FailureResponse>('projects/delete', Method.POST, {
            form: {
                projectId: projectId
            }
        });
    }

    /**
     * API Endpoint `POST /api/v2/compile/create`
     * 
     * Create a new compile job request for this project id
     * 
     * @param projectId Project id we wish to compile
     * @returns Compile object result
     */
    public async createCompile(projectId: number): Promise<Compile> {
        return this.request<Compile>('compile/create', Method.POST, {
            form: {
                projectId: projectId
            }
        });
    }

    /**
     * API Endpoint `GET /api/v2/compile/read`
     * 
     * Read a compile packet job result
     * 
     * @param projectId Project id we sent for compile
     * @param compileId Compile id return from the creation request
     * 
     * @returns Object satisfying `Compile`
     */
    public async readCompile(projectId: number, compileId: string): Promise<Compile> {
        return this.request<Compile>('compile/read', Method.GET, {
            qs: {
                projectId: projectId,
                compileId: compileId
            }
        });
    }

    /**
     * Create a new backtest request and get the id
     * 
     * @param projectId Id for the project to backtest
     * @param compileId Compile id for the project
     * @param backtestName Name for the new backtest
     * 
     * @returns Object satsifying `Backtest`
     */
    public async createBacktest(projectId: number, compileId: string, backtestName: string): Promise<Backtest> {
        return this.request<Backtest>('backtests/create', Method.POST, {
            form: {
                projectId: projectId,
                compileId: compileId,
                backtestName: backtestName
            }
        });
    }

    /**
     * Read out a backtest in the project id specified
     * 
     * @param projectId Project id to read
     * @param backtestId Specific backtest id to read
     * 
     * @returns Object satisfying `Backtest`
     */
    public async readBacktest(projectId: number, backtestId: string): Promise<Backtest> {
        return this.request<Backtest>('backtests/read', Method.GET, {
            qs: {
                backtestId: backtestId,
                projectId: projectId
            }
        });
    }

    /**
     * Update a backtest name
     * 
     * @param projectId Project for the backtest we want to update
     * @param backtestId Backtest id we want to update
     * @param name Name we'd like to assign to the backtest. Can be undefined
     * @param note Note attached to the backtest. Can be undefined
     * 
     * @returns Object satisfying `Backtest`
     */
    public async updateBacktest(projectId: number, backtestId: string, name?: string, note?: string): Promise<Backtest> {
        return this.request<Backtest>('backtests/update', Method.POST, {
            form: {
                projectId: projectId,
                backtestId: backtestId,
                name: name,
                note: note
            }
        });
    }

    /**
     * List all the backtests for a project
     * 
     * @param projectId Project ID we'd like to get a list of backtests for
     * @returns Object satisfying `BacktestList` containing a list of backtests
     */
    public async listBacktests(projectId: number): Promise<BacktestList> {
        return this.request<BacktestList>('backtests/read', Method.GET, {
            qs: {
                projectId: projectId
            }
        });
    }

    /**
     * Delete a backtest from the specified project and backtestId
     * 
     * @param projectId Project ID for the backtest we want to delete
     * @param backtestId Backtest ID we want to delete
     * 
     * @returns Object satisfying `FailureResponse` indicating success
     */
    public async deleteBacktest(projectId: number, backtestId: string): Promise<FailureResponse> {
        return this.request<FailureResponse>('backtests/delete', Method.POST, {
            form: {
                backtestId: backtestId,
                projectId: projectId
            }
        });
    }

    /**
     * Create a live algorithm
     * 
     * @param projectId ID of the project on QuantConnect or other platform
     * @param compileId ID of the compilation on QuantConnect or other platform
     * @param serverType Type of server instance that will run the algorithm
     * @param baseLiveAlgorithmSettings Brokerage specific (see `BaseLiveAlgorithmSettings`)
     * @param versionId The version of the Lean used to run the algorithm. -1 is master, however, sometimes this can create problems with live deployments. If you experience problems using, try specifying the version of Lean you would like to use
     * 
     * @returns Information regarding the new algorithm (see `LiveAlgorithm`)
     */
    public async createLiveAlgorithm(
        projectId: number, 
        compileId: string, 
        serverType: string, 
        baseLiveAlgorithmSettings: BaseLiveAlgorithmSettings, 
        versionId?: string): Promise<LiveAlgorithm> {

            return this.request<LiveAlgorithm>('live/create', Method.POST, {
                form: <LiveAlgorithmApiSettingsWrapper> {
                    projectId: projectId,
                    compileId: compileId,
                    serverType: serverType,
                    versionId: versionId,
                    brokerage: baseLiveAlgorithmSettings
                }
            });

    }

    /**
     * API endpoint `GET /api/v2/live/read`
     * 
     * Get a list of live running algorithms for user
     * 
     * @param algorithmStatus Filter the statuses of the algorithms returned from the API
     * @param startTime Earliest launched time of the algorithms returned by the API
     * @param endTime Latest launched tie of the algorithms returned by the API
     * 
     * @returns Object satisfying `LiveList` containing live running algorithms
     */
    public async listLiveAlgorithms(algorithmStatus?: AlgorithmStatus, startTime?: Date, endTime?: Date): Promise<LiveList> {
        if (algorithmStatus !== AlgorithmStatus.Running      &&
            algorithmStatus !== AlgorithmStatus.RuntimeError &&
            algorithmStatus !== AlgorithmStatus.Stopped      &&
            algorithmStatus !== AlgorithmStatus.Liquidated) 
        {
            throw new Error('The API only supports algorithm statuses of: Running, Stopped, RuntimeError, and Liquidated');
        }
        return this.request<LiveList>('live/read', Method.GET, {
            qs: {
                status: algorithmStatus,
                start: startTime === undefined ? 0 : LeanApi.getTimestampFromDate(startTime),
                end: endTime === undefined ? LeanApi.getTimestamp() : LeanApi.getTimestampFromDate(endTime)
            }           
        });
    }

    /**
     * API Endpoint `GET /api/v2/live/read`
     * 
     * Read out a live algorithm in the project id specified
     * 
     * @param projectId Project id to read
     * @param deployId Specific instnace id to read
     * 
     * @returns Object satisfying `LiveAlgorithmResult`
     */
    public async readLiveAlgorithm(projectId: number, deployId: string): Promise<LiveAlgorithmResults> {
        return this.request<LiveAlgorithmResults>('live/read', Method.GET, {
            qs: {
                projectId: projectId,
                deployId: deployId
            }
        });
    }

    /**
     * API Endpoint `POST /api/v2/live/update/liquidate`
     * 
     * Liquidate a live algorithm from the specified project and deployId
     * 
     * @param projectId Project for the live instance we want to stop
     * @returns Object satisfying `FailureResponse` indicating success
     */
    public async liquidateLiveAlgorithm(projectId: number): Promise<FailureResponse> {
        return this.request<FailureResponse>('live/update/liquidate', Method.POST, {
            form: {
                projectId: projectId
            }
        });
    }

    /**
     * API Endpoint `POST /api/v2/live/update/stop`
     * 
     * Stop a live algorithm from the specified project and deployId
     * 
     * @param projectId Project for hte live instance we want to stop
     * @returns Object satisfying `FailureResponse` indicating success
     */
    public async stopLiveAlgorithm(projectId: number): Promise<FailureResponse> {
        return this.request<FailureResponse>('live/update/stop', Method.POST, {
            form: {
                projectId: projectId
            }
        });
    }

    /**
     * API Endpoint `GET /api/v2/live/read/log`
     * 
     * Gets the logs of a specific live algorithm
     * 
     * @param projectId Project ID of the live running algorithm
     * @param algorithmId Algorithm ID of the live running algorithm
     * @param startTime No logs will be returned before this time
     * @param endTime No logs will be returned after this time
     * 
     * @returns Object satsifying `LiveLog`; List of strings that represent the logs of the algorithms.
     */
    public async readLiveLogs(projectId: number, algorithmId: string, startTime?: Date, endTime?: Date): Promise<LiveLog> {
        const startEpoch = startTime === undefined ? 0 : LeanApi.getTimestampFromDate(startTime);
        const endEpoch = endTime === undefined ? LeanApi.getTimestamp() : LeanApi.getTimestampFromDate(endTime);

        return this.request<LiveLog>('live/read/log', Method.GET, {
            qs: {
                format: 'json',
                projectId: projectId,
                algorithmId: algorithmId,
                start: startEpoch,
                end: endEpoch
            }
        });
    }

    /**TODO: We probably won't need this
     * 
     * public async readDataLink(...) {} 
     * 
    */

    /**
     * API Endpoint `POST /api/v2/backtests/read/report`
     * 
     * Read out the report of a backtest in the project id specified 
     * @param projectId Project ID to read
     * @param backtestId Specific backtest ID to read
     */
    public async readBacktestreport(projectId: number, backtestId: string): Promise<BacktestReport> {
        return this.request<BacktestReport>('backtests/read/report', Method.POST, {
            form: {
                backtestId: backtestId,
                projectId: projectId
            }
        });
    }

    /**
     * Utility static method to generate UNIX timestamp
     */
    public static getTimestamp(): number {
        return Math.floor(new Date().getTime() / 1000);
    }

    /**
     * Utility static method to generate UNIX timestamp from a given date
     * @param date Date object to convert to seconds since unix epoch
     */
    public static getTimestampFromDate(date: Date): number {
        return Math.floor(date.getTime() / 1000);
    }

    /**
     * Send out HTTP request to specified endpoint with the given method and options
     * @param endpoint API endpoint/resource
     * @param method GET or POST request method
     * @param options User defined options. POST data will be sent through here
     * 
     * @returns Type T - JSON template for results 
     */
    private async request<T>(endpoint: string, method: Method, options?: request.RequestPromiseOptions): Promise<T> {
        if (!options) {
            options = {};
        }

        if (!options.headers) {
            options.headers = {};
        }

        const authHashTimestamp = this.createHash();
        // Base64 encode userID:authHash for use in Authorization header
        const authHash = Buffer.from(`${this.userId}:${authHashTimestamp[0]}`).toString('base64');
        const timestamp = authHashTimestamp[1];

        // Automatically parses json
        options.json = true;
        // Send authorization parameters in header since `options.auth` doesn't seem to work...
        options.headers['Authorization'] = `Basic ${authHash}`;
        // Set Timestamp in header. Required for a successful request
        options.headers['Timestamp'] = timestamp;
        options.headers['User-Agent'] = `VSCode QC Extension ${VERSION}`;

        switch (method) {
            case Method.GET:
            return request.get(this.baseUrl + endpoint, options).catch(err => {
                vscode.window.showErrorMessage(`Error encountered while querying QuantConnect API at endpoint 'GET ${endpoint}': ${err}`);
            });

            case Method.POST:
            return request.post(this.baseUrl + endpoint, options).catch(err => {
                vscode.window.showErrorMessage(`Error encountered while querying QuantConnect API at endpoint 'POST ${endpoint}': ${err}`);
            });
        }
    }

    /**
     * Creates `Timestamp` header hash.
     * 
     * Header hash is defined as:
     * `sha256('apiKey:epoch seconds')`
     * 
     * @returns Hashed API key
     */
    private createHash(): [string, string] {
        const timestamp = LeanApi.getTimestamp().toString();

        return [
            crypto.createHash('sha256')
                .update(`${this.apiKey}:${timestamp}`)
                .digest()
                .toString('hex'), 
            timestamp
        ];
    }
}