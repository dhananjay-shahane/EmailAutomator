import { FileCode, Download, Trash2 } from "lucide-react";
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
