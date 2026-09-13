import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-paper">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-relaxed text-mute">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("empty-state", className)}>
      <p className="text-sm font-semibold text-paper">{title}</p>
      {description ? <p className="mt-1 text-sm leading-relaxed text-mute">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}