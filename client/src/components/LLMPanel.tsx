import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { TestTubeDiagonal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LLMPanelProps {
  status?: {
    id: string;
    component: string;
    status: string;
    lastCheck: string;
    metadata: any;
  };
}

export default function LLMPanel({ status }: LLMPanelProps) {
  const { toast } = useToast();

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/test-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to test connections");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.llm.success) {
        toast({
          title: "LLM Connection Test Successful",
          description: `Response time: ${data.llm.responseTime?.toFixed(2)}s`,
        });
      } else {
        toast({
          title: "LLM Connection Test Failed",
          description: data.llm.error || "Unknown error",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Failed to test LLM connection.",
        variant: "destructive",
      });
    },
  });

  const isConnected = status?.status === 'online';
  const endpoint = status?.metadata?.endpoint || 'https://88c46355da8c.ngrok-free.app/';
  const model = status?.metadata?.model || 'llama3.2:1b';
  const responseTime = status?.metadata?.responseTime || '1.2';
  const successRate = 94; // This would come from historical data

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">LLM Integration</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${isConnected ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Ollama Endpoint</label>
          <div className="bg-muted rounded-md px-3 py-2">
            <span className="text-sm font-mono text-foreground" data-testid="text-llm-endpoint">{endpoint}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Model</label>
          <div className="bg-muted rounded-md px-3 py-2">
            <span className="text-sm font-mono text-foreground" data-testid="text-llm-model">{model}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Response Time</label>
          <div className="text-sm text-muted-foreground">
            Last query: <span data-testid="text-llm-response-time">{responseTime}s</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Success Rate</label>
          <div className="flex items-center space-x-2">
            <Progress value={successRate} className="flex-1" />
            <span className="text-sm text-success" data-testid="text-llm-success-rate">{successRate}%</span>
          </div>
        </div>

        <Button 
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => testConnectionMutation.mutate()}
          disabled={testConnectionMutation.isPending}
          data-testid="button-test-llm-connection"
        >
          <TestTubeDiagonal className="w-4 h-4 mr-2" />
          Test Connection
        </Button>
      </div>
    </div>
  );
}
