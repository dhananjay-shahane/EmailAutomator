import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatusCard from "@/components/StatusCard";
import ActivityLog from "@/components/ActivityLog";
import EmailConfig from "@/components/EmailConfig";
import LLMPanel from "@/components/LLMPanel";
import MCPPanel from "@/components/MCPPanel";
import ProcessingQueue from "@/components/ProcessingQueue";
import DirectQueryPanel from "@/components/DirectQueryPanel";
import OutputViewer from "@/components/OutputViewer";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  systemStatus: Array<{
    id: string;
    component: string;
    status: string;
    lastCheck: string;
    metadata: any;
  }>;
  emailLogs: Array<{
    id: string;
    sender: string;
    subject: string;
    body: string;
    status: string;
    createdAt: string;
    processingTime: number;
    outputFile: string;
    errorMessage: string;
  }>;
  stats: {
    processedToday: number;
    totalProcessed: number;
    successRate: number;
  };
}

export default function Dashboard() {
  const { toast } = useToast();
  const [wsConnected, setWsConnected] = useState(false);

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const manualTriggerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/trigger-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to trigger manual process");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Manual Trigger Initiated",
        description: "Email processing has been triggered manually.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: () => {
      toast({
        title: "Trigger Failed",
        description: "Failed to initiate manual trigger.",
        variant: "destructive",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-status"] });
    },
    onSuccess: () => {
      toast({
        title: "Dashboard Refreshed",
        description: "All data has been refreshed successfully.",
      });
    },
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        
        if (data.type === 'status_update' || data.type === 'new_email' || data.type === 'email_processed') {
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
      
      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const systemStatus = dashboardData?.systemStatus || [];
  const emailLogs = dashboardData?.emailLogs || [];
  const stats = dashboardData?.stats || { processedToday: 0, totalProcessed: 0, successRate: 0 };

  const emailMonitorStatus = systemStatus.find(s => s.component === 'email_monitor');
  const llmStatus = systemStatus.find(s => s.component === 'llm');
  const mcpStatus = systemStatus.find(s => s.component === 'mcp_server');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">System Dashboard</h2>
              <p className="text-muted-foreground">Monitor and manage your email automation workflow</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-success' : 'bg-destructive'}`} />
                <span className="text-xs text-muted-foreground">
                  {wsConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <Button
                onClick={() => manualTriggerMutation.mutate()}
                disabled={manualTriggerMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-manual-trigger"
              >
                <Play className="w-4 h-4 mr-2" />
                Manual Trigger
              </Button>
              <Button
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                variant="secondary"
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatusCard
              title="Email Monitor"
              value={emailMonitorStatus?.status === 'online' ? 'Active' : emailMonitorStatus?.status === 'warning' ? 'Processing' : 'Offline'}
              icon="envelope"
              status={emailMonitorStatus?.status as 'online' | 'warning' | 'offline' || 'offline'}
              subtitle={emailMonitorStatus?.metadata?.lastCheck ? `Last check: ${new Date(emailMonitorStatus.metadata.lastCheck).toLocaleTimeString()}` : 'No data'}
            />
            
            <StatusCard
              title={llmStatus?.metadata?.provider ? `${llmStatus.metadata.provider.charAt(0).toUpperCase() + llmStatus.metadata.provider.slice(1)} LLM` : 'LLM Integration'}
              value={llmStatus?.status === 'online' ? 'Connected' : 'Disconnected'}
              icon="robot"
              status={llmStatus?.status as 'online' | 'warning' | 'offline' || 'offline'}
              subtitle={llmStatus?.metadata?.model ? `Model: ${llmStatus.metadata.model}` : 'Not configured'}
            />
            
            <StatusCard
              title="MCP Server"
              value={mcpStatus?.status === 'online' ? 'Online' : mcpStatus?.status === 'warning' ? 'Initializing' : 'Offline'}
              icon="server"
              status={mcpStatus?.status as 'online' | 'warning' | 'offline' || 'offline'}
              subtitle={mcpStatus?.status === 'warning' ? 'Starting resources...' : 'Ready'}
            />
            
            <StatusCard
              title="Processed Today"
              value={stats.processedToday.toString()}
              icon="chart-line"
              status="online"
              subtitle={`+${stats.processedToday} from yesterday`}
            />
          </div>

          {/* Direct Query and Output Viewer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DirectQueryPanel />
            <OutputViewer />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <ActivityLog emailLogs={emailLogs} />
          </div>

          <ProcessingQueue emailLogs={emailLogs} />
        </main>
      </div>
    </div>
  );
}
