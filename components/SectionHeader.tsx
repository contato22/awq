import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  linkLabel?: string;
  linkHref?: string;
  className?: string;
}

export default function SectionHeader({
  icon,
  title,
  badge,
  linkLabel,
  linkHref,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-5", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <span className="text-gray-400 shrink-0">{icon}</span>
        )}
        <h2 className="text-sm font-semibold text-gray-900 truncate">{title}</h2>
        {badge}
      </div>
      {linkLabel && linkHref && (
        <Link
          href={linkHref}
          className="text-[11px] text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors font-medium shrink-0 ml-4"
        >
          {linkLabel}
          <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}
