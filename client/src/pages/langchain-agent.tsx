import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { RefreshCw, Brain, Cpu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LangchainQueryPanel from "@/components/LangchainQueryPanel";
import OutputViewer from "@/components/OutputViewer";

interface SystemStatus {
  id: string;
  component: string;
  status: string;
  lastCheck: string;
  metadata: any;
}

export default function LangchainAgentPage() {
  const { toast } = useToast();
  const [wsConnected, setWsConnected] = useState(false);

  const { data: systemStatus, isLoading } = useQuery<SystemStatus[]>({
    queryKey: ["/api/system-status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading Langchain Agent...</p>
        </div>
      </div>
    );
  }

  const langchainStatus = systemStatus?.find(s => s.component === 'langchain_llm');
  const mcpStatus = systemStatus?.find(s => s.component === 'mcp_server');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Langchain Agent</h2>
              <p className="text-muted-foreground">Advanced AI agent using Langchain with MCP server integration</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-success' : 'bg-destructive'}`} />
                <span className="text-xs text-muted-foreground">
                  {wsConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-secondary rounded-md">
                <Brain className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {langchainStatus?.status === 'online' ? 'Langchain Active' : 'Langchain Offline'}
                </span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-secondary rounded-md">
                <Cpu className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">
                  {mcpStatus?.status === 'online' ? 'MCP Ready' : 'MCP Offline'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* AI Query Assistant and Output Files - Same layout as dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LangchainQueryPanel />
            <OutputViewer />
          </div>

          {/* Additional Info Section */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              About Langchain MCP Agent
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-2">Enhanced AI Capabilities</h4>
                <ul className="space-y-1">
                  <li>• Advanced query understanding with Langchain agents</li>
                  <li>• Multi-step reasoning and tool orchestration</li>
                  <li>• Automatic tool selection and execution</li>
                  <li>• Context-aware processing workflows</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">MCP Protocol Benefits</h4>
                <ul className="space-y-1">
                  <li>• Standardized tool and resource access</li>
                  <li>• Seamless integration with external systems</li>
                  <li>• Efficient data exchange and processing</li>
                  <li>• Scalable architecture for AI workflows</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}