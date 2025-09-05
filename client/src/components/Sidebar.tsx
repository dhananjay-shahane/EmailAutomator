import { Mail, BarChart3, MessageSquare, Server, FileCode, History, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', icon: BarChart3, href: '/' },
  { name: 'Email Monitor', icon: Mail, href: '#' },
  { name: 'LLM Integration', icon: MessageSquare, href: '#' },
  { name: 'MCP Server', icon: Server, href: '#' },
  { name: 'LAS Files', icon: FileCode, href: '#' },
  { name: 'Processing Logs', icon: History, href: '#' },
  { name: 'Settings', icon: Settings, href: '/settings' },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="sidebar w-64 p-6 border-r border-border flex flex-col">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Mail className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Email Automation</h1>
          <p className="text-xs text-muted-foreground">LAS Processing System</p>
        </div>
      </div>
      
      <nav className="space-y-2 flex-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-4 border-t border-border">
        <div className="flex items-center space-x-3 text-sm">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">dhanushahane01@gmail.com</p>
            <p className="text-muted-foreground">System Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
