import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { TestTubeDiagonal, Save, RefreshCw } from "lucide-react";
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

const CLAUDE_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];

const MISTRAL_MODELS = [
  'mistral-large-latest',
  'mistral-medium-latest',
  'mistral-small-latest',
  'codestral-latest'
];

export default function LLMPanel({ status }: LLMPanelProps) {
  const { toast } = useToast();
  const [provider, setProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');

  const isConnected = status?.status === 'online';
  const currentEndpoint = status?.metadata?.endpoint || '';
  const currentModel = status?.metadata?.model || '';
  const currentProvider = status?.metadata?.provider || '';
  const responseTime = status?.metadata?.responseTime || '0';
  const successRate = 94; // This would come from historical data

  // Load current configuration when component mounts or status updates
  useEffect(() => {
    setProvider(currentProvider || '');
    setSelectedModel(currentModel || '');
    setEndpoint(currentEndpoint || '');
  }, [currentProvider, currentModel, currentEndpoint]);

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
        title: 'Configuration Updated',
        description: 'LLM configuration has been saved successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Failed to save LLM configuration.',
        variant: 'destructive'
      });
    }
  });

  const handleUpdateConfiguration = () => {
    if (!provider) {
      toast({
        title: "Validation Error",
        description: "Please select a provider",
        variant: "destructive"
      });
      return;
    }

    if (!selectedModel) {
      toast({
        title: "Validation Error", 
        description: "Please select a model",
        variant: "destructive"
      });
      return;
    }

    if (requiresEndpoint() && !endpoint) {
      toast({
        title: "Validation Error",
        description: "Please enter an endpoint URL",
        variant: "destructive"
      });
      return;
    }

    if (requiresApiKey() && !apiKey) {
      toast({
        title: "Validation Error",
        description: "Please enter an API key",
        variant: "destructive"
      });
      return;
    }

    const config = {
      provider,
      model: selectedModel,
      endpoint: requiresEndpoint() ? endpoint : undefined,
      apiKey: requiresApiKey() ? apiKey : undefined
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
      case 'claude':
        return CLAUDE_MODELS;
      case 'mistral':
        return MISTRAL_MODELS;
      default:
        return ['custom-model'];
    }
  };

  const requiresApiKey = () => {
    return provider && provider !== 'ollama' && provider !== 'local';
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
            <span className={`px-2 py-1 text-xs rounded-full ${isConnected ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Setup Instructions */}
        {!isConnected && (
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h4 className="text-sm font-medium text-foreground mb-2">Setup Instructions</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>For Ollama:</strong> Install Ollama locally and run <code className="bg-muted px-1 rounded">ollama serve</code></p>
              <p><strong>For API Services:</strong> Get an API key from your provider (OpenAI, Anthropic, etc.)</p>
              <p><strong>Endpoint Examples:</strong> http://localhost:11434 (Ollama) or https://api.openai.com (OpenAI)</p>
            </div>
          </div>
        )}

        {/* LLM Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider" className="text-sm font-medium text-foreground">LLM Provider</Label>
          <Select value={provider} onValueChange={(value) => {
            setProvider(value);
            setSelectedModel(''); // Reset model when provider changes
          }} data-testid="select-llm-provider">
            <SelectTrigger>
              <SelectValue placeholder="Select LLM Provider" />
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

        {/* Model Selection */}
        {provider && (
          <div className="space-y-2">
            <Label htmlFor="model" className="text-sm font-medium text-foreground">Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel} data-testid="select-llm-model">
              <SelectTrigger>
                <SelectValue placeholder="Select Model" />
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
        )}

        {/* Endpoint URL (for Ollama/Local) */}
        {requiresEndpoint() && (
          <div className="space-y-2">
            <Label htmlFor="endpoint" className="text-sm font-medium text-foreground">Endpoint URL</Label>
            <Input
              id="endpoint"
              type="url"
              placeholder="http://localhost:11434"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              data-testid="input-llm-endpoint"
            />
            <p className="text-xs text-muted-foreground">
              Enter your {provider === 'ollama' ? 'Ollama' : 'local'} server endpoint URL
            </p>
          </div>
        )}

        {/* API Key (for cloud providers) */}
        {requiresApiKey() && (
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm font-medium text-foreground">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-testid="input-llm-api-key"
            />
            <p className="text-xs text-muted-foreground">
              Your API key for {LLM_PROVIDERS.find(p => p.value === provider)?.label}
            </p>
          </div>
        )}

        {/* Configuration Status */}
        {provider && (
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-foreground">Current Configuration</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Provider:</span>
                <span className="ml-2 font-mono" data-testid="text-current-provider">
                  {LLM_PROVIDERS.find(p => p.value === provider)?.label || 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Model:</span>
                <span className="ml-2 font-mono" data-testid="text-current-model">
                  {selectedModel || 'Not set'}
                </span>
              </div>
              {requiresEndpoint() && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Endpoint:</span>
                  <span className="ml-2 font-mono break-all" data-testid="text-current-endpoint">
                    {endpoint || 'Not set'}
                  </span>
                </div>
              )}
              {requiresApiKey() && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">API Key:</span>
                  <span className="ml-2 font-mono" data-testid="text-current-api-key">
                    {apiKey ? '•'.repeat(20) : 'Not set'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Performance Stats */}
        {isConnected && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Response Time</Label>
              <div className="text-sm text-muted-foreground">
                Last query: <span data-testid="text-llm-response-time">{responseTime}s</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Success Rate</Label>
              <div className="flex items-center space-x-2">
                <Progress value={successRate} className="flex-1" />
                <span className="text-sm text-success" data-testid="text-llm-success-rate">{successRate}%</span>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleUpdateConfiguration}
            disabled={saveConfigurationMutation.isPending}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-update-llm-config"
          >
            {saveConfigurationMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Update Configuration
          </Button>
          
          <Button 
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isPending || !provider}
            variant="outline"
            className="flex-1"
            data-testid="button-test-llm-connection"
          >
            {testConnectionMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TestTubeDiagonal className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>
      </div>
    </div>
  );
}