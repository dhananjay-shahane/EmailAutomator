import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Folder, FileImage, Eye, Download, RefreshCw, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface OutputFile {
  path: string;
  name: string;
  timestamp: string;
  size: number;
  isImage: boolean;
}

interface OutputFolder {
  name: string;
  files: OutputFile[];
  createdAt: string;
}

export default function OutputViewer() {
  const [selectedImage, setSelectedImage] = useState<OutputFile | null>(null);

  const { data: outputFiles, isLoading, refetch } = useQuery<OutputFolder[]>({
    queryKey: ["/api/output-files"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getImageUrl = (filePath: string) => {
    return `/api/output-files/view?path=${encodeURIComponent(filePath)}`;
  };

  const downloadFile = (filePath: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = `/api/output-files/download?path=${encodeURIComponent(filePath)}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full" data-testid="card-output-viewer">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Output Files
            </CardTitle>
            <CardDescription>
              View and download generated visualizations and analysis results
            </CardDescription>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            data-testid="button-refresh-files"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading output files...</span>
          </div>
        ) : !outputFiles || outputFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No output files found</p>
            <p className="text-sm">Process some queries to generate visualizations</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {outputFiles.map((folder) => (
                <div key={folder.name} className="border rounded-lg p-4" data-testid={`folder-${folder.name}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{folder.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {folder.files.length} files
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(new Date(folder.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {folder.files.map((file) => (
                      <div
                        key={file.path}
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-md hover:bg-secondary/50 transition-colors"
                        data-testid={`file-${file.name}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileImage className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{formatFileSize(file.size)}</span>
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {format(new Date(file.timestamp), 'HH:mm:ss')}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {file.isImage && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedImage(file)}
                                  data-testid={`button-view-${file.name}`}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh]">
                                <DialogHeader>
                                  <DialogTitle>{file.name}</DialogTitle>
                                </DialogHeader>
                                <div className="overflow-auto">
                                  <img
                                    src={getImageUrl(file.path)}
                                    alt={file.name}
                                    className="max-w-full h-auto rounded-lg"
                                    data-testid={`image-${file.name}`}
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(file.path, file.name)}
                            data-testid={`button-download-${file.name}`}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}