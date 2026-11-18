import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--ink2)",
          "--normal-text": "var(--paper)",
          "--normal-border": "var(--line)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-line group-[.toaster]:bg-ink2 group-[.toaster]:text-paper group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-mute",
          success: "border-l-[3px] border-l-sage",
          error: "border-l-[3px] border-l-brick",
          warning: "border-l-[3px] border-l-gold",
          info: "border-l-[3px] border-l-gold",
          actionButton: "min-h-11 group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-ink3 group-[.toast]:text-paper",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
