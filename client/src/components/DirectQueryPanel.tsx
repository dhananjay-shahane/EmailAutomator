import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function DirectQueryPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const { toast } = useToast();

  const processQueryMutation = useMutation({
    mutationFn: async (queryText: string) => {
      const response = await fetch("/api/process-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText }),
      });
      if (!response.ok) throw new Error("Failed to process query");
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Query Processed",
        description: "Your query has been submitted for processing.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process query",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!query.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a query to process.",
        variant: "destructive",
      });
      return;
    }
    processQueryMutation.mutate(query.trim());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "error":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full" data-testid="card-direct-query">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Direct Query Interface
        </CardTitle>
        <CardDescription>
          Enter your LAS analysis request directly and get instant processing results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="query-input" className="text-sm font-medium">
            Analysis Request
          </label>
          <Textarea
            id="query-input"
            placeholder="Example: Analyze gamma ray data from sample_well_01.las and generate depth visualization charts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            className="min-h-[100px]"
            data-testid="textarea-query"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={processQueryMutation.isPending || !query.trim()}
          className="w-full"
          data-testid="button-submit-query"
        >
          {processQueryMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Process Query
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Processing Result</h4>
              <Badge className={getStatusColor(result.status)} data-testid={`badge-status-${result.status}`}>
                {getStatusIcon(result.status)}
                <span className="ml-1 capitalize">{result.status}</span>
              </Badge>
            </div>

            {result.llmResponse && (
              <Alert data-testid="alert-llm-response">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <div><strong>LLM Analysis:</strong></div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Script:</strong> {result.llmResponse.script}</div>
                    <div><strong>LAS File:</strong> {result.llmResponse.lasFile}</div>
                    <div><strong>Tool:</strong> {result.llmResponse.tool}</div>
                    <div><strong>Confidence:</strong> {(result.llmResponse.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div><strong>Reasoning:</strong> {result.llmResponse.reasoning}</div>
                </AlertDescription>
              </Alert>
            )}

            {result.status === "completed" && result.outputFile && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" data-testid="alert-completed">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div><strong>Processing completed successfully!</strong></div>
                  <div className="text-sm mt-1">
                    Output file: {result.outputFile}
                    {result.processingTime && (
                      <span className="ml-2">
                        (Processing time: {result.processingTime}ms)
                      </span>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result.status === "error" && result.errorMessage && (
              <Alert variant="destructive" data-testid="alert-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div><strong>Processing failed:</strong></div>
                  <div className="text-sm mt-1">{result.errorMessage}</div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}