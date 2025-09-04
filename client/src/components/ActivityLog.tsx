import { CheckCircle, Mail, AlertTriangle, ExternalLink } from "lucide-react";

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
}

interface ActivityLogProps {
  emailLogs: EmailLog[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'processing':
      return <Mail className="h-4 w-4 text-primary" />;
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default:
      return <Mail className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-success/10';
    case 'processing':
      return 'bg-primary/10';
    case 'error':
      return 'bg-destructive/10';
    default:
      return 'bg-muted/10';
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  
  return date.toLocaleDateString();
};

export default function ActivityLog({ emailLogs }: ActivityLogProps) {
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <button className="text-muted-foreground hover:text-foreground" data-testid="button-view-all-logs">
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {emailLogs.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            emailLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="log-entry flex items-start space-x-3 p-3 rounded-md" data-testid={`activity-log-${log.id}`}>
                <div className={`w-8 h-8 ${getStatusColor(log.status)} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {getStatusIcon(log.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {log.status === 'completed' && 'Email processed successfully from '}
                    {log.status === 'processing' && 'Processing email from '}
                    {log.status === 'error' && 'Processing failed for '}
                    <span className="text-primary">{log.sender}</span>
                  </p>
                  {log.outputFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Generated: {log.outputFile.split('/').pop()}
                    </p>
                  )}
                  {log.errorMessage && (
                    <p className="text-xs text-destructive mt-1">
                      Error: {log.errorMessage}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground" data-testid={`text-activity-timestamp-${log.id}`}>
                    {formatTimeAgo(log.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
