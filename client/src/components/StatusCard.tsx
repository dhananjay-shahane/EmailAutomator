import { Mail, MessageSquare, Server, TrendingUp } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: string;
  icon: 'envelope' | 'robot' | 'server' | 'chart-line';
  status: 'online' | 'warning' | 'offline';
  subtitle: string;
}

const iconMap = {
  envelope: Mail,
  robot: MessageSquare,
  server: Server,
  'chart-line': TrendingUp,
};

const statusClasses = {
  online: 'status-online',
  warning: 'status-warning', 
  offline: 'status-offline',
};

const iconColorClasses = {
  online: 'text-primary',
  warning: 'text-warning',
  offline: 'text-destructive',
  'chart-line': 'text-success',
};

export default function StatusCard({ title, value, icon, status, subtitle }: StatusCardProps) {
  const Icon = iconMap[icon];
  const statusClass = statusClasses[status] || statusClasses.offline;
  const iconColorClass = icon === 'chart-line' ? iconColorClasses['chart-line'] : iconColorClasses[status] || iconColorClasses.offline;

  return (
    <div className="metric-card rounded-lg p-6" data-testid={`status-card-${title.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className={`h-5 w-5 ${iconColorClass}`} />
        </div>
        <span className={`status-indicator ${statusClass}`}></span>
      </div>
      <h3 className="text-2xl font-bold mb-1 text-foreground" data-testid={`text-${title.toLowerCase().replace(' ', '-')}-value`}>
        {value}
      </h3>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={`text-xs mt-2 ${status === 'online' || icon === 'chart-line' ? 'text-success' : status === 'warning' ? 'text-warning' : 'text-destructive'}`}>
        {subtitle}
      </p>
    </div>
  );
}
