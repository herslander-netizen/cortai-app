import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("esqueleto-barra rounded-md bg-ink3", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
