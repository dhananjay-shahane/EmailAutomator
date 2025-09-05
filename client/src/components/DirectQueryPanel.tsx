import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, AlertCircle, CheckCircle, Bot, User, Brain, Code, Play, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { llmConfigStorage } from "@/lib/llmConfigStorage";

interface QueryResult {
  id: string;
  query: string;
  llmResponse: {
    script: string;
    lasFile: string;
    tool: string;
    confidence: number;
    reasoning: string;
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
    llmResponse?: QueryResult['llmResponse'];
    outputFile?: string;
    processingTime?: number;
    clarificationOptions?: string[];
  };
}

interface ClarificationResponse {
  needsClarification: boolean;
  confidence: number;
  suggestions: string[];
  message: string;
}

export default function DirectQueryPanel() {
  const [currentInput, setCurrentInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your LAS file analysis assistant. I can help you analyze well log data using gamma ray analysis or depth visualization. What would you like to analyze today?",
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

  // Check if query needs clarification
  const checkClarificationMutation = useMutation({
    mutationFn: async (queryText: string): Promise<ClarificationResponse> => {
      // Get LLM configuration from localStorage
      const llmConfig = llmConfigStorage.get();
      
      const response = await fetch("/api/check-clarification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, llmConfig }),
      });
      if (!response.ok) {
        // If endpoint doesn't exist, create a mock response based on simple heuristics
        const hasGamma = queryText.toLowerCase().includes('gamma');
        const hasDepth = queryText.toLowerCase().includes('depth') || queryText.toLowerCase().includes('plot');
        const hasSpecificScript = hasGamma || hasDepth;
        
        return {
          needsClarification: !hasSpecificScript,
          confidence: hasSpecificScript ? 0.8 : 0.3,
          suggestions: hasSpecificScript ? [] : [
            "Gamma ray analysis with production_well_02.las",
            "Depth visualization with sample_well_01.las",
            "Tell me more about your specific analysis needs"
          ],
          message: hasSpecificScript ? 
            "I understand your request. Let me process that for you." :
            "I'm not quite sure what type of analysis you need. Could you clarify?"
        };
      }
      return response.json();
    }
  });

  const processQueryMutation = useMutation({
    mutationFn: async (queryText: string) => {
      // Get LLM configuration from localStorage
      const llmConfig = llmConfigStorage.get();
      
      const response = await fetch("/api/process-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, llmConfig }),
      });
      if (!response.ok) throw new Error("Failed to process query");
      return response.json();
    },
    onSuccess: (data: QueryResult) => {
      // Update the processing message with completed status
      setChatMessages(prev => prev.map(msg => 
        msg.id === 'processing' 
          ? {
              ...msg,
              type: 'ai' as const,
              content: data.status === 'completed' 
                ? `Great! I've successfully analyzed your data. The ${data.llmResponse.tool} analysis is complete.`
                : data.status === 'error'
                ? `I encountered an error while processing your request: ${data.errorMessage}`
                : 'Processing your request...',
              status: data.status,
              metadata: {
                llmResponse: data.llmResponse,
                outputFile: data.outputFile,
                processingTime: data.processingTime
              }
            }
          : msg
      ));
      
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsWaitingForResponse(false);
    },
    onError: (error) => {
      setChatMessages(prev => prev.map(msg => 
        msg.id === 'processing' 
          ? {
              ...msg,
              type: 'ai' as const,
              content: `I'm sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      // First check if we need clarification
      const clarificationResult = await checkClarificationMutation.mutateAsync(userMessage);
      
      if (clarificationResult.needsClarification && clarificationResult.confidence < 0.6) {
        // Add AI clarification message
        addMessage('ai', clarificationResult.message, {
          clarificationOptions: clarificationResult.suggestions
        });
        setIsWaitingForResponse(false);
      } else {
        // Add processing message
        const processingId = addMessage('ai', 'Let me analyze your request and process the data...', {});
        
        // Update message ID for tracking
        setChatMessages(prev => prev.map(msg => 
          msg.id === processingId ? { ...msg, id: 'processing' } : msg
        ));
        
        // Process the query
        processQueryMutation.mutate(userMessage);
      }
    } catch (error) {
      addMessage('ai', "I'm having trouble understanding your request. Could you try rephrasing it?");
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
        return <Bot className="w-4 h-4" />;
      case 'system':
        return <Brain className="w-4 h-4" />;
    }
  };

  const getProcessingSteps = (metadata?: ChatMessage['metadata']) => {
    if (!metadata?.llmResponse) return [];
    
    return [
      { icon: <Brain className="w-3 h-3" />, text: `AI Analysis: ${metadata.llmResponse.confidence > 0.8 ? 'High' : 'Medium'} confidence` },
      { icon: <Code className="w-3 h-3" />, text: `Script: ${metadata.llmResponse.script}` },
      { icon: <Play className="w-3 h-3" />, text: `LAS File: ${metadata.llmResponse.lasFile}` },
      { icon: <Image className="w-3 h-3" />, text: metadata.outputFile ? `Output: ${metadata.outputFile.split('/').pop()}` : 'Generating output...' }
    ];
  };

  return (
    <Card className="w-full h-[600px] flex flex-col" data-testid="card-direct-query">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Query Assistant
        </CardTitle>
        <CardDescription>
          Chat with AI to analyze your LAS files. Ask questions and get step-by-step guidance.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {chatMessages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start space-x-2 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {getMessageIcon(message.type)}
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      
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
                      
                      {/* Show processing steps */}
                      {message.metadata?.llmResponse && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium opacity-80">Analysis Details:</p>
                          <div className="space-y-1">
                            {getProcessingSteps(message.metadata).map((step, index) => (
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
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="rounded-lg p-3 bg-secondary text-secondary-foreground">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
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
            placeholder="Ask about gamma ray analysis, depth visualization, or LAS file processing..."
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={isWaitingForResponse}
            className="flex-1"
            data-testid="input-chat"
          />
          <Button
            onClick={handleSubmit}
            disabled={!currentInput.trim() || isWaitingForResponse}
            size="icon"
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}