"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useArrastarParaFechar } from "@/hooks/useArrastarParaFechar";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "mov-overlay fixed inset-0 z-50 bg-[rgb(0_0_0/0.32)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "mov-sheet fixed z-50 gap-4 overflow-y-auto bg-ink3 p-6 shadow-none transition data-[state=closed]:duration-200 data-[state=open]:duration-280 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 max-h-[92dvh] border-t pb-[calc(1.5rem+env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /**
   * Barra (alça) para recolher a gaveta no celular: arrastar a barra, ou tocar nela, fecha.
   * Só a barra reage ao arrasto; o resto da gaveta é conteúdo. Padrão: ligada nas gavetas de
   * baixo. No computador (≥768px) a barra some e o "X" continua.
   */
  arrastarParaFechar?: boolean;
  /** Menu lateral: arrastar em qualquer ponto da gaveta fecha (eixo travado; rolar continua rolando). */
  arrastarDeQualquerPonto?: boolean;
  /** Esconde o "X" também no computador (gaveta que fecha por fora, como o menu lateral). */
  esconderX?: boolean;
}

/** Barra de recolher a gaveta: pílula discreta numa zona de toque maior. */
function AlcaDaGaveta({ side }: { side: "top" | "bottom" | "left" | "right" }) {
  const horizontal = side === "left" || side === "right";
  return (
    <SheetPrimitive.Close
      data-fechar-gaveta=""
      data-alca-gaveta=""
      aria-label="Fechar"
      className={cn(
        "absolute z-[1] flex cursor-grab touch-none items-center justify-center rounded-none border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden",
        horizontal
          ? `top-1/2 h-36 w-8 -translate-y-1/2 ${side === "left" ? "right-0 justify-end pr-2" : "left-0 justify-start pl-2"}`
          : "inset-x-0 top-0 h-12 items-start pt-2",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "rounded-full bg-mute2/60 transition-[background-color] duration-[120ms] [button:active>&]:bg-mute2",
          horizontal ? "h-10 w-1.5" : "h-1.5 w-10",
        )}
      />
    </SheetPrimitive.Close>
  );
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      side = "right",
      className,
      children,
      arrastarParaFechar,
      arrastarDeQualquerPonto = false,
      esconderX = false,
      ...props
    },
    ref,
  ) => {
    const [elementoGaveta, setElementoGaveta] = React.useState<HTMLDivElement | null>(null);
    const comAlca = (arrastarParaFechar ?? side === "bottom") && side !== "top";
    useArrastarParaFechar(elementoGaveta, side ?? "right", comAlca, arrastarDeQualquerPonto);
    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={(elemento) => {
            setElementoGaveta(elemento);
            if (typeof ref === "function") ref(elemento);
            else if (ref) ref.current = elemento;
          }}
          className={cn(
            sheetVariants({ side }),
            "data-[arrastado=true]:data-[state=closed]:animate-none",
            className,
          )}
          {...props}
        >
          {comAlca ? <AlcaDaGaveta side={side ?? "right"} /> : null}
          <SheetPrimitive.Close
            data-fechar-gaveta=""
            className={cn(
              "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
              esconderX ? "hidden" : comAlca ? "max-md:hidden" : "",
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </SheetPrimitive.Close>
          {children}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
