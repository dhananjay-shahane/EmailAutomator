import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

interface MCPPanelProps {
  status?: {
    id: string;
    component: string;
    status: string;
    lastCheck: string;
    metadata: any;
  };
}

interface MCPResource {
  name: string;
  type: 'las_file' | 'script' | 'tool';
  path: string;
  size?: number;
  lastModified?: Date;
}

export default function MCPPanel({ status }: MCPPanelProps) {
  const { data: resources, refetch } = useQuery<MCPResource[]>({
    queryKey: ["/api/mcp-resources"],
    refetchInterval: 60000, // Refresh every minute
  });

  const isInitializing = status?.status === 'warning';
  const isOnline = status?.status === 'online';

  const lasFiles = resources?.filter(r => r.type === 'las_file') || [];
  const scripts = resources?.filter(r => r.type === 'script') || [];
  const tools = resources?.filter(r => r.type === 'tool') || [];

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">MCP Server</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${
            isOnline ? 'bg-success/10 text-success' : 
            isInitializing ? 'bg-warning/10 text-warning' : 
            'bg-destructive/10 text-destructive'
          }`}>
            {isOnline ? 'Online' : isInitializing ? 'Initializing' : 'Offline'}
          </span>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Available Resources</label>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">LAS Files</span>
              <span className="text-success" data-testid="text-mcp-las-files">{lasFiles.length} available</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Processing Scripts</span>
              <span className="text-success" data-testid="text-mcp-scripts">{scripts.length} available</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Active Tools</label>
          <div className="flex flex-wrap gap-1">
            {tools.slice(0, 3).map((tool) => (
              <span key={tool.name} className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded" data-testid={`tool-${tool.name}`}>
                {tool.name}
              </span>
            ))}
            {tools.length > 3 && (
              <span className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded">
                +{tools.length - 3} more
              </span>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Output Directory</label>
          <div className="bg-muted rounded-md px-3 py-2">
            <span className="text-sm font-mono text-foreground" data-testid="text-mcp-output-dir">./output/</span>
          </div>
        </div>

        <Button 
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          onClick={() => refetch()}
          data-testid="button-refresh-mcp-resources"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Resources
        </Button>
      </div>
    </div>
  );
}
