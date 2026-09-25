import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold cursor-pointer transition-[color,background-color,border-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border border-input bg-transparent text-foreground hover:border-line2 hover:bg-ink3 active:bg-ink2",
        outline: "border border-input bg-transparent text-foreground hover:border-line2 hover:bg-ink3 active:bg-ink2",
        ghost: "bg-transparent text-foreground hover:bg-ink3 active:bg-ink2",
        text: "bg-transparent px-0 text-foreground underline-offset-4 hover:underline",
        link: "bg-transparent px-0 text-foreground underline-offset-4 hover:underline",
        icon: "bg-transparent text-foreground hover:bg-ink3 active:bg-ink2",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-12 px-4",
        sm: "h-12 px-3 text-xs",
        lg: "h-14 px-6 text-base",
        icon: "size-12 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  success?: boolean;
  onClick?: ((event: React.MouseEvent<HTMLButtonElement>) => void | Promise<unknown>) | undefined;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, success = false, disabled, onClick, children, style, ...props }, forwardedRef) => {
    const [pending, setPending] = React.useState(false);
    const [showSpinner, setShowSpinner] = React.useState(false);
    const internalRef = React.useRef<HTMLButtonElement | null>(null);
    const alive = React.useRef(true);
    const width = React.useRef<number | null>(null);

    React.useEffect(() => () => { alive.current = false; }, []);
    React.useEffect(() => {
      if (!loading) { setShowSpinner(false); return; }
      const timer = window.setTimeout(() => setShowSpinner(true), 300);
      return () => window.clearTimeout(timer);
    }, [loading]);

    function setRefs(node: HTMLButtonElement | null) {
      internalRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }

    function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
      if (pending || loading) return;
      const result = onClick?.(event);
      if (!result || typeof (result as Promise<unknown>).then !== "function") return;
      width.current = internalRef.current?.offsetWidth ?? null;
      setPending(true);
      const timer = window.setTimeout(() => alive.current && setShowSpinner(true), 300);
      void Promise.resolve(result).finally(() => {
        window.clearTimeout(timer);
        if (alive.current) { setPending(false); setShowSpinner(false); }
      });
    }

    const busy = pending || loading;
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={setRefs}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        onClick={handleClick}
        style={width.current && busy ? { ...style, minWidth: width.current } : style}
        {...props}
      >
        {!asChild && showSpinner ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {!asChild && success ? <Check aria-hidden /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };