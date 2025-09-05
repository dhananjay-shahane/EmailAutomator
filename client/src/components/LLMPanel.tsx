import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TestTubeDiagonal, Edit, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface LLMPanelProps {
  status?: {
    id: string;
    component: string;
    status: string;
    lastCheck: string;
    metadata: any;
  };
}

const LLM_PROVIDERS = [
  { value: 'ollama', label: 'Ollama' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'claude', label: 'Anthropic Claude' },
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'huggingface', label: 'Hugging Face' },
  { value: 'local', label: 'Local Model' }
];

const OLLAMA_MODELS = [
  'llama3.2:1b',
  'llama3.2:3b', 
  'llama3.1:8b',
  'llama3.1:70b',
  'mistral:7b',
  'codellama:7b',
  'qwen2.5:7b',
  'gemma2:9b',
  'phi3:mini',
  'llava:7b'
];

const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'text-davinci-003'
];

const GEMINI_MODELS = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-pro',
  'gemini-pro-vision'
];

export default function LLMPanel({ status }: LLMPanelProps) {
  const { toast } = useToast();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [provider, setProvider] = useState('ollama');
  const [selectedModel, setSelectedModel] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');

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
  const currentEndpoint = status?.metadata?.endpoint || 'https://88c46355da8c.ngrok-free.app/';
  const currentModel = status?.metadata?.model || 'llama3.2:1b';
  const currentProvider = status?.metadata?.provider || 'ollama';
  const responseTime = status?.metadata?.responseTime || '1.2';
  const successRate = 94; // This would come from historical data

  // Load current configuration when dialog opens
  useEffect(() => {
    if (isConfigOpen) {
      setProvider(currentProvider);
      setSelectedModel(currentModel);
      setEndpoint(currentEndpoint);
    }
  }, [isConfigOpen, currentProvider, currentModel, currentEndpoint]);

  const saveConfigurationMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/llm-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to save configuration');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Configuration Saved',
        description: 'LLM configuration has been updated successfully.'
      });
      setIsConfigOpen(false);
    },
    onError: () => {
      toast({
        title: 'Save Failed',
        description: 'Failed to save LLM configuration.',
        variant: 'destructive'
      });
    }
  });

  const handleSaveConfiguration = () => {
    const config = {
      provider,
      model: selectedModel,
      endpoint: provider === 'ollama' || provider === 'local' ? endpoint : undefined,
      apiKey: provider !== 'ollama' && provider !== 'local' ? apiKey : undefined
    };
    saveConfigurationMutation.mutate(config);
  };

  const getModelsForProvider = () => {
    switch (provider) {
      case 'ollama':
        return OLLAMA_MODELS;
      case 'openai':
        return OPENAI_MODELS;
      case 'gemini':
        return GEMINI_MODELS;
      default:
        return ['custom-model'];
    }
  };

  const requiresApiKey = () => {
    return provider !== 'ollama' && provider !== 'local';
  };

  const requiresEndpoint = () => {
    return provider === 'ollama' || provider === 'local';
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">LLM Integration</h3>
          <div className="flex items-center gap-2">
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-edit-llm-config">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configure LLM Integration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">LLM Provider</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {LLM_PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {getModelsForProvider().map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {requiresEndpoint() && (
                    <div className="space-y-2">
                      <Label htmlFor="endpoint">Endpoint URL</Label>
                      <Input
                        id="endpoint"
                        type="url"
                        placeholder="https://localhost:11434"
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                      />
                    </div>
                  )}

                  {requiresApiKey() && (
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveConfiguration}
                      disabled={saveConfigurationMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <span className={`px-2 py-1 text-xs rounded-full ${isConnected ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Provider</label>
          <div className="bg-muted rounded-md px-3 py-2">
            <span className="text-sm font-mono text-foreground" data-testid="text-llm-provider">
              {LLM_PROVIDERS.find(p => p.value === currentProvider)?.label || 'Ollama'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Model</label>
          <div className="bg-muted rounded-md px-3 py-2">
            <span className="text-sm font-mono text-foreground" data-testid="text-llm-model">{currentModel}</span>
          </div>
        </div>

        {(currentProvider === 'ollama' || currentProvider === 'local') && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Endpoint</label>
            <div className="bg-muted rounded-md px-3 py-2">
              <span className="text-sm font-mono text-foreground" data-testid="text-llm-endpoint">{currentEndpoint}</span>
            </div>
          </div>
        )}

        {currentProvider !== 'ollama' && currentProvider !== 'local' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">API Key</label>
            <div className="bg-muted rounded-md px-3 py-2">
              <span className="text-sm font-mono text-foreground" data-testid="text-llm-api-key">
                {apiKey ? '•'.repeat(20) : 'Not configured'}
              </span>
            </div>
          </div>
        )}
        
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
