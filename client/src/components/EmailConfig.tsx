import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit } from "lucide-react";

export default function EmailConfig() {
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Email Configuration</h3>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">IMAP Server Status</label>
          <div className="flex items-center space-x-2">
            <span className="status-indicator status-online"></span>
            <span className="text-sm text-foreground" data-testid="text-imap-server">imap.gmail.com:993</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">SMTP Server Status</label>
          <div className="flex items-center space-x-2">
            <span className="status-indicator status-online"></span>
            <span className="text-sm text-foreground" data-testid="text-smtp-server">smtp.gmail.com:587</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Filter Email</label>
          <div className="bg-muted rounded-md px-3 py-2">
            <span className="text-sm font-mono text-foreground" data-testid="text-filter-email">dhananjayshahane24@gmail.com</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Monitoring Frequency</label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-foreground">Every</span>
            <Select defaultValue="1-minute">
              <SelectTrigger className="w-32" data-testid="select-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30-seconds">30 seconds</SelectItem>
                <SelectItem value="1-minute">1 minute</SelectItem>
                <SelectItem value="5-minutes">5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" data-testid="button-edit-config">
          <Edit className="w-4 h-4 mr-2" />
          Edit Configuration
        </Button>
      </div>
    </div>
  );
}
