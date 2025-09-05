import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Folder, FileImage, Eye, Download, RefreshCw, Calendar, Clock, FolderOpen, X } from "lucide-react";
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
  const [selectedFolder, setSelectedFolder] = useState<OutputFolder | null>(null);
  const [selectedImage, setSelectedImage] = useState<OutputFile | null>(null);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

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

  const openFolder = (folder: OutputFolder) => {
    setSelectedFolder(folder);
    setIsFolderDialogOpen(true);
  };

  const openImageViewer = (file: OutputFile) => {
    setSelectedImage(file);
    setIsImageDialogOpen(true);
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
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No output folders found</p>
            <p className="text-sm">Process some queries to generate visualizations</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-2">
              {outputFiles.map((folder) => (
                <div
                  key={folder.name}
                  className="flex flex-col items-center p-4 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group"
                  onClick={() => openFolder(folder)}
                  data-testid={`folder-${folder.name}`}
                >
                  <div className="relative mb-2">
                    <Folder className="w-12 h-12 text-blue-500 group-hover:text-blue-600 transition-colors" />
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-1 -right-1 text-xs px-1 py-0 min-w-0 h-5 rounded-full"
                    >
                      {folder.files.length}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-center line-clamp-2 leading-tight">
                    {folder.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(folder.createdAt), 'MMM dd')}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Folder Contents Dialog */}
        <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-500" />
                {selectedFolder?.name}
              </DialogTitle>
              <DialogDescription>
                Created on {selectedFolder && format(new Date(selectedFolder.createdAt), 'MMMM dd, yyyy')} • {selectedFolder?.files.length} files
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="grid grid-cols-1 gap-3 p-2">
                {selectedFolder?.files.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-md hover:bg-secondary/50 transition-colors"
                    data-testid={`file-${file.name}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileImage className="w-5 h-5 text-green-500 flex-shrink-0" />
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openImageViewer(file)}
                          data-testid={`button-view-${file.name}`}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
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
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Image Viewer Dialog */}
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedImage?.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsImageDialogOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                {selectedImage && (
                  <div className="flex items-center gap-4 text-sm">
                    <span>{formatFileSize(selectedImage.size)}</span>
                    <span>{format(new Date(selectedImage.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-auto rounded-lg bg-secondary/20 p-4">
              {selectedImage && (
                <img
                  src={getImageUrl(selectedImage.path)}
                  alt={selectedImage.name}
                  className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                  data-testid={`image-${selectedImage.name}`}
                />
              )}
            </div>
            {selectedImage && (
              <div className="flex justify-center pt-2">
                <Button
                  onClick={() => downloadFile(selectedImage.path, selectedImage.name)}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Image
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}