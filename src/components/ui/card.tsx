import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-[12px] border-0 text-card-foreground", {
  variants: {
    variant: {
      surface:
        "bg-[var(--agenda-cartao,var(--card))] transition-[border-color,background-color,box-shadow] duration-[var(--mov-base)]",
      elevated:
        "bg-[var(--agenda-cartao,var(--card))] shadow-none transition-[border-color,background-color,box-shadow] duration-[var(--mov-base)]",
      // Encolhe a 0,98 ao tocar com a mola do Figaro (`SnappyPressAnimation`, spec 6 §2, B1).
      touchable:
        "bg-[var(--agenda-cartao,var(--card))] active:scale-[0.98] active:bg-ink3 [transition:border-color_var(--mov-base),background-color_var(--mov-base),box-shadow_var(--mov-base),transform_var(--mola-toque-duracao)_var(--mola-toque)] motion-reduce:[transition:none]",
    },
    density: { default: "p-4", compact: "p-3", none: "p-0" },
  },
  defaultVariants: { variant: "surface", density: "default" },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, density, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp ref={ref} className={cn(cardVariants({ variant, density }), className)} {...props} />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("font-semibold leading-none", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";
const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(className)} {...props} />,
);
CardContent.displayName = "CardContent";
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
