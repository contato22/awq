import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-6",
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
        {icon ?? <Inbox size={20} className="text-gray-400" />}
      </div>
      <p className={cn("font-semibold text-gray-900", compact ? "text-sm" : "text-base")}>
        {title}
      </p>
      {description && (
        <p className="text-sm text-gray-500 mt-1.5 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
