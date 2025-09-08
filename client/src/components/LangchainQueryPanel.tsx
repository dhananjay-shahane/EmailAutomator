import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, AlertCircle, CheckCircle, Bot, User, Brain, Code, Play, Image, Network, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { llmConfigStorage } from "@/lib/llmConfigStorage";

interface LangchainQueryResult {
  id: string;
  query: string;
  agentResponse: {
    steps: Array<{
      tool: string;
      action: string;
      result: string;
      confidence: number;
    }>;
    finalResult: {
      script: string;
      lasFile: string;
      tool: string;
      confidence: number;
      reasoning: string;
    };
  };
  outputFile?: string;
  status: "processing" | "completed" | "error";
  errorMessage?: string;
  processingTime?: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  status?: 'processing' | 'completed' | 'error';
  metadata?: {
    agentResponse?: LangchainQueryResult['agentResponse'];
    outputFile?: string;
    processingTime?: number;
    clarificationOptions?: string[];
    agentSteps?: Array<{
      step: number;
      description: string;
      status: 'pending' | 'running' | 'completed' | 'error';
      tool?: string;
      result?: string;
    }>;
  };
}

interface LangchainClarificationResponse {
  needsClarification: boolean;
  confidence: number;
  suggestions: string[];
  message: string;
  agentPlan?: Array<{
    step: number;
    description: string;
    tool: string;
  }>;
}

export default function LangchainQueryPanel() {
  const [currentInput, setCurrentInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your advanced AI agent powered by Langchain and MCP. I can understand complex queries, create execution plans, and coordinate multiple tools to analyze your LAS data. Ask me anything about your well log analysis!",
      timestamp: new Date()
    }
  ]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Check if query needs clarification using Langchain agent
  const checkLangchainClarificationMutation = useMutation({
    mutationFn: async (queryText: string): Promise<LangchainClarificationResponse> => {
      // Get LLM configuration from localStorage
      const llmConfig = llmConfigStorage.get();
      
      const response = await fetch("/api/langchain/check-clarification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, llmConfig }),
      });
      if (!response.ok) {
        throw new Error(`Langchain agent returned ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }
  });

  const processLangchainQueryMutation = useMutation({
    mutationFn: async (queryText: string) => {
      // Get LLM configuration from localStorage
      const llmConfig = llmConfigStorage.get();
      
      const response = await fetch("/api/langchain/process-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, llmConfig }),
      });
      if (!response.ok) throw new Error("Failed to process query with Langchain agent");
      return response.json();
    },
    onSuccess: (data: LangchainQueryResult) => {
      // Update the processing message with completed status
      setChatMessages(prev => prev.map(msg => 
        msg.id === 'processing' 
          ? {
              ...msg,
              type: 'ai' as const,
              content: data.status === 'completed' 
                ? `Excellent! My AI agent has successfully executed your request through multiple coordinated steps. The final analysis using ${data.agentResponse.finalResult.tool} is complete.`
                : data.status === 'error'
                ? `I encountered an error during the AI agent execution: ${data.errorMessage}`
                : 'Processing your request with the AI agent...',
              status: data.status,
              metadata: {
                agentResponse: data.agentResponse,
                outputFile: data.outputFile,
                processingTime: data.processingTime
              }
            }
          : msg
      ));
      
      queryClient.invalidateQueries({ queryKey: ["/api/output-files"] });
      setIsWaitingForResponse(false);
    },
    onError: (error) => {
      setChatMessages(prev => prev.map(msg => 
        msg.id === 'processing' 
          ? {
              ...msg,
              type: 'ai' as const,
              content: `I'm sorry, my AI agent encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              status: 'error' as const
            }
          : msg
      ));
      setIsWaitingForResponse(false);
    },
  });

  const addMessage = (type: 'user' | 'ai' | 'system', content: string, metadata?: ChatMessage['metadata']) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      metadata
    };
    setChatMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const handleSubmit = async () => {
    if (!currentInput.trim() || isWaitingForResponse) return;

    const userMessage = currentInput.trim();
    setCurrentInput("");
    setIsWaitingForResponse(true);

    // Add user message
    addMessage('user', userMessage);

    try {
      // First check if we need clarification using Langchain agent
      const clarificationResult = await checkLangchainClarificationMutation.mutateAsync(userMessage);
      
      if (clarificationResult.needsClarification) {
        // Add AI clarification message with agent plan if available
        let clarificationContent = clarificationResult.message;
        
        if (clarificationResult.agentPlan && clarificationResult.agentPlan.length > 0) {
          clarificationContent += "\n\nHere's my proposed execution plan:";
          clarificationResult.agentPlan.forEach((step, index) => {
            clarificationContent += `\n${step.step}. ${step.description} (using ${step.tool})`;
          });
        }

        addMessage('ai', clarificationContent, {
          clarificationOptions: clarificationResult.suggestions,
          agentSteps: clarificationResult.agentPlan?.map(step => ({
            step: step.step,
            description: step.description,
            status: 'pending' as const,
            tool: step.tool
          }))
        });
        setIsWaitingForResponse(false);
      } else {
        // Add processing message
        const processingId = addMessage('ai', 'Let me analyze your request and create an execution plan using my AI agent...', {});
        
        // Update message ID for tracking
        setChatMessages(prev => prev.map(msg => 
          msg.id === processingId ? { ...msg, id: 'processing' } : msg
        ));
        
        // Process the query with Langchain agent
        processLangchainQueryMutation.mutate(userMessage);
      }
    } catch (error) {
      addMessage('ai', "I'm having trouble understanding your request with my AI agent. Could you try rephrasing it?");
      setIsWaitingForResponse(false);
    }
  };

  const handleClarificationClick = (suggestion: string) => {
    setCurrentInput(suggestion);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'ai':
        return <Brain className="w-4 h-4" />;
      case 'system':
        return <Network className="w-4 h-4" />;
    }
  };

  const getAgentSteps = (metadata?: ChatMessage['metadata']) => {
    if (!metadata?.agentResponse) return [];
    
    return [
      { icon: <Brain className="w-3 h-3" />, text: `AI Agent: ${metadata.agentResponse.steps.length} coordinated steps` },
      { icon: <Network className="w-3 h-3" />, text: `MCP Protocol: ${metadata.agentResponse.finalResult.confidence > 0.8 ? 'High' : 'Medium'} confidence` },
      { icon: <Code className="w-3 h-3" />, text: `Final Script: ${metadata.agentResponse.finalResult.script}` },
      { icon: <Play className="w-3 h-3" />, text: `LAS File: ${metadata.agentResponse.finalResult.lasFile}` },
      { icon: <Image className="w-3 h-3" />, text: metadata.outputFile ? `Output: ${metadata.outputFile.split('/').pop()}` : 'Generating output...' }
    ];
  };

  const renderAgentSteps = (agentSteps?: Array<{
    step: number;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    tool?: string;
    result?: string;
  }>) => {
    if (!agentSteps || agentSteps.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium opacity-80 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Agent Execution Plan:
        </p>
        <div className="space-y-1">
          {agentSteps.map((step, index: number) => (
            <div key={index} className="flex items-center space-x-2 text-xs opacity-80">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                step.status === 'completed' ? 'bg-green-500' : 
                step.status === 'running' ? 'bg-blue-500' : 
                step.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`}>
                {step.step}
              </span>
              <span>{step.description}</span>
              {step.tool && <Badge variant="outline" className="text-xs px-1 py-0">{step.tool}</Badge>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full h-[600px] flex flex-col" data-testid="card-langchain-query">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          AI Query Assistant
          <Badge variant="secondary" className="ml-2">Langchain + MCP</Badge>
        </CardTitle>
        <CardDescription>
          Advanced AI agent that creates execution plans and coordinates multiple tools to analyze your data.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-4 min-h-0" ref={scrollAreaRef}>
          <div className="space-y-4 min-h-full">
            {chatMessages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start space-x-2 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {getMessageIcon(message.type)}
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Show clarification options */}
                      {message.metadata?.clarificationOptions && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium opacity-80">Try these suggestions:</p>
                          {message.metadata.clarificationOptions.map((option, index) => (
                            <button
                              key={index}
                              onClick={() => handleClarificationClick(option)}
                              className="block w-full text-left p-2 text-xs rounded border border-current/20 hover:bg-current/10 transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Show agent execution plan */}
                      {renderAgentSteps(message.metadata?.agentSteps)}
                      
                      {/* Show processing steps */}
                      {message.metadata?.agentResponse && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium opacity-80 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Agent Analysis Details:
                          </p>
                          <div className="space-y-1">
                            {getAgentSteps(message.metadata).map((step, index) => (
                              <div key={index} className="flex items-center space-x-2 text-xs opacity-80">
                                {step.icon}
                                <span>{step.text}</span>
                              </div>
                            ))}
                          </div>
                          {message.metadata.processingTime && (
                            <p className="text-xs opacity-60 mt-2">
                              Completed in {message.metadata.processingTime}ms
                            </p>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs opacity-60 mt-2">
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isWaitingForResponse && (
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <div className="flex items-start space-x-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500 text-white">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">AI agent is analyzing...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Input Area */}
        <div className="flex-shrink-0 flex space-x-2">
          <Input
            placeholder="Ask complex questions about LAS analysis. I'll create a plan and execute it for you..."
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={isWaitingForResponse}
            className="flex-1"
            data-testid="input-langchain-chat"
          />
          <Button
            onClick={handleSubmit}
            disabled={!currentInput.trim() || isWaitingForResponse}
            size="icon"
            data-testid="button-langchain-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}