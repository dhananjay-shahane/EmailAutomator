import { FileCode, Download, Trash2, Brain, Code, Play, Image, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface EmailLog {
  id: string;
  sender: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
  processingTime: number;
  outputFile: string;
  errorMessage: string;
  mcpScript?: string;
  lasFile?: string;
  llmResponse?: {
    script: string;
    lasFile: string;
    tool: string;
    confidence: number;
    reasoning: string;
  };
  completedAt?: string;
}

interface ProcessingQueueProps {
  emailLogs: EmailLog[];
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">Completed</span>;
    case 'processing':
      return <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-full">Processing</span>;
    case 'error':
      return <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-full">Error</span>;
    default:
      return <span className="px-2 py-1 bg-muted/10 text-muted-foreground text-xs rounded-full">Pending</span>;
  }
};

const formatProcessingTime = (time: number | null) => {
  if (!time) return 'N/A';
  if (time < 1000) return `${time}ms`;
  return `${(time / 1000).toFixed(1)}s`;
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const getProcessingSteps = (log: EmailLog) => {
  const steps = [
    {
      id: 'received',
      title: 'Query Received',
      description: `Received query: "${log.body.substring(0, 50)}${log.body.length > 50 ? '...' : ''}"`,
      icon: <FileCode className="h-4 w-4" />,
      status: 'completed',
      timestamp: log.createdAt
    },
    {
      id: 'llm_analysis',
      title: 'LLM Analysis',
      description: log.llmResponse ? 
        `AI selected: ${log.llmResponse.script} with ${log.llmResponse.lasFile} (${(log.llmResponse.confidence * 100).toFixed(0)}% confidence)` :
        'Analyzing query with AI to determine script and data requirements',
      icon: <Brain className="h-4 w-4" />,
      status: log.llmResponse ? 'completed' : (log.status === 'processing' ? 'processing' : 'pending'),
      timestamp: log.createdAt
    },
    {
      id: 'script_selection',
      title: 'Script & File Selection',
      description: log.llmResponse ? 
        `Script: ${log.llmResponse.script}, LAS File: ${log.llmResponse.lasFile}, Tool: ${log.llmResponse.tool}` :
        'Waiting for LLM analysis completion',
      icon: <Code className="h-4 w-4" />,
      status: log.llmResponse ? 'completed' : 'pending',
      timestamp: log.createdAt
    },
    {
      id: 'execution',
      title: 'Script Execution',
      description: log.status === 'completed' ? 
        `Python script executed successfully in ${formatProcessingTime(log.processingTime)}` :
        log.status === 'processing' ? 'Running Python analysis script...' :
        log.status === 'error' ? `Execution failed: ${log.errorMessage}` :
        'Waiting to execute script',
      icon: <Play className="h-4 w-4" />,
      status: log.status === 'completed' ? 'completed' : 
              log.status === 'processing' ? 'processing' : 
              log.status === 'error' ? 'error' : 'pending',
      timestamp: log.createdAt
    },
    {
      id: 'output_generation',
      title: 'Output Generation',
      description: log.outputFile ? 
        `Generated visualization: ${log.outputFile.split('/').pop()}` :
        log.status === 'error' ? 'Output generation failed' :
        'Generating visualization file...',
      icon: <Image className="h-4 w-4" />,
      status: log.outputFile ? 'completed' : 
              log.status === 'error' ? 'error' : 
              log.status === 'processing' ? 'processing' : 'pending',
      timestamp: log.completedAt || log.createdAt
    }
  ];
  
  return steps;
};

const getStepIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'processing':
      return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
  }
};

const getStepColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-600 border-green-300 bg-green-50';
    case 'processing':
      return 'text-blue-600 border-blue-300 bg-blue-50';
    case 'error':
      return 'text-red-600 border-red-300 bg-red-50';
    default:
      return 'text-gray-400 border-gray-300 bg-gray-50';
  }
};

export default function ProcessingQueue({ emailLogs }: ProcessingQueueProps) {
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Processing Queue & Logs</h3>
          <div className="flex items-center space-x-2">
            <button className="text-muted-foreground hover:text-foreground" data-testid="button-download-logs">
              <Download className="h-4 w-4" />
            </button>
            <button className="text-muted-foreground hover:text-foreground" data-testid="button-clear-logs">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {emailLogs.length === 0 ? (
            <div className="text-center py-8">
              <FileCode className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No processing logs available</p>
            </div>
          ) : (
            emailLogs.map((log) => (
              <div key={log.id} className="border border-border rounded-lg p-4" data-testid={`processing-log-${log.id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileCode className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground" data-testid={`text-log-filename-${log.id}`}>
                        {log.lasFile || 'Unknown LAS file'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Requested by: <span data-testid={`text-log-requester-${log.id}`}>{log.sender}</span>
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(log.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="text-muted-foreground">Script Used</label>
                    <p className="text-foreground" data-testid={`text-log-script-${log.id}`}>
                      {log.mcpScript || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">Processing Time</label>
                    <p className="text-foreground" data-testid={`text-log-processing-time-${log.id}`}>
                      {formatProcessingTime(log.processingTime)}
                    </p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">Output</label>
                    <p className={`cursor-pointer hover:underline ${log.outputFile ? 'text-primary' : 'text-muted-foreground'}`}>
                      {log.outputFile ? log.outputFile.split('/').pop() : 'No output'}
                    </p>
                  </div>
                </div>
                
                {log.status === 'processing' && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-muted-foreground">Progress</label>
                      <div className="flex-1">
                        <Progress value={75} className="h-2" />
                      </div>
                      <span className="text-xs text-muted-foreground">~30 seconds</span>
                    </div>
                  </div>
                )}
                
                {/* Processing Timeline */}
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium mb-3 text-foreground">Processing Timeline</h4>
                  <div className="space-y-3">
                    {getProcessingSteps(log).map((step, index) => (
                      <div key={step.id} className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${getStepColor(step.status)}`}>
                          {getStepIcon(step.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">{step.title}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(step.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {step.description}
                          </p>
                          {step.status === 'processing' && (
                            <div className="mt-2">
                              <Progress value={60} className="h-1" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {log.errorMessage && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="bg-destructive/10 rounded-md p-3">
                      <p className="text-sm text-destructive font-medium">Error Details:</p>
                      <p className="text-sm text-destructive mt-1" data-testid={`text-log-error-${log.id}`}>
                        {log.errorMessage}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
