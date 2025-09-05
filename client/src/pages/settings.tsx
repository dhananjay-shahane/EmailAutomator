import Sidebar from "@/components/Sidebar";
import EmailConfig from "@/components/EmailConfig";
import LLMPanel from "@/components/LLMPanel";
import MCPPanel from "@/components/MCPPanel";
import { Button } from "@/components/ui/button";
import { Settings, Save, RefreshCw } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SystemStatus {
  id: string;
  component: string;
  status: string;
  lastCheck: string;
  metadata: any;
}

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: systemStatus, isLoading } = useQuery<SystemStatus[]>({
    queryKey: ["/api/system-status"],
    refetchInterval: 30000,
  });

  const testConnectionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/test-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to test connections");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connections Tested",
        description: "All service connections have been tested successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system-status"] });
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Failed to test service connections.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  const llmStatus = systemStatus?.find(s => s.component === 'llm');
  const mcpStatus = systemStatus?.find(s => s.component === 'mcp_server');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Settings
              </h2>
              <p className="text-muted-foreground">Configure email processing, LLM integration, and MCP services</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => testConnectionsMutation.mutate()}
                disabled={testConnectionsMutation.isPending}
                variant="outline"
                data-testid="button-test-connections"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${testConnectionsMutation.isPending ? 'animate-spin' : ''}`} />
                Test Connections
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Email Configuration */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-foreground">Email Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Configure IMAP and SMTP settings for email processing automation
                </p>
              </div>
              <EmailConfig />
            </div>

            {/* LLM Integration */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-foreground">LLM Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Configure connection to Ollama LLM service for email content analysis
                </p>
              </div>
              <LLMPanel status={llmStatus} />
            </div>

            {/* MCP Server */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-foreground">MCP Server Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Manage Model Context Protocol server for LAS file processing and script execution
                </p>
              </div>
              <MCPPanel status={mcpStatus} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}