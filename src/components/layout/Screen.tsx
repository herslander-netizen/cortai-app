import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Signature } from "./Signature";
import { BotaoAjuda } from "@/components/guia/BotaoAjuda";

export function Screen({
  title,
  subtitle,
  voltarPara,
  voltarRotulo = "Voltar",
  wide = false,
  hideHeader = false,
  children,
}: {
  title: string;
  subtitle?: string;
  voltarPara?: LinkProps["to"];
  voltarRotulo?: string;
  wide?: boolean;
  hideHeader?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      data-largura={wide ? "larga" : undefined}
      className={`screen-shell mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full flex-col pb-[calc(2rem+env(safe-area-inset-bottom))] ${wide ? "max-w-[1180px]" : "max-w-[760px]"}`}
    >
      {!hideHeader ? (
        <header className="sticky top-14 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-line bg-ink px-5 pb-5 pt-6 md:static md:border-b-0 md:px-8 md:pb-7 md:pt-8">
          <div className="min-w-0">
            {voltarPara ? (
              <Link
                to={voltarPara}
                className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-xs text-mute transition-colors hover:text-paper"
              >
                <ChevronLeft size={14} />
                {voltarRotulo}
              </Link>
            ) : null}
            <h1 className="screen-title">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-sm leading-relaxed text-mute">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <BotaoAjuda />
          </div>
        </header>
      ) : null}
      <main className="screen-content min-w-0 flex-1 px-5 md:px-8">{children}</main>
      <Signature />
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="border-y border-line py-8 text-center">
      <p className="text-sm text-mute">{text}</p>
    </div>
  );
}
