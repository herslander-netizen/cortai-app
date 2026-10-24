import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Signature } from "./Signature";
import { CabecalhoDeTela } from "./CabecalhoDeTela";
import { BotaoAjuda } from "@/components/guia/BotaoAjuda";

export function Screen({
  title,
  subtitle,
  voltarPara,
  voltarRotulo = "Voltar",
  wide = false,
  hideHeader = false,
  assinaturaSoComputador = false,
  children,
}: {
  title: string;
  subtitle?: string;
  voltarPara?: LinkProps["to"];
  voltarRotulo?: string;
  wide?: boolean;
  hideHeader?: boolean;
  /** Agenda 3.0: sem rodapé no celular. */
  assinaturaSoComputador?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      data-largura={wide ? "larga" : undefined}
      className={`screen-shell mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full flex-col pb-[calc(2rem+env(safe-area-inset-bottom))] ${wide ? "max-w-[1180px]" : "max-w-[760px]"}`}
    >
      {!hideHeader ? (
        <header className="sticky top-14 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-line bg-ink px-5 pb-5 pt-6 md:static md:border-b-0 md:px-8 md:pb-7 md:pt-8">
          <div className="flex min-w-0 items-start gap-3">
            {voltarPara ? (
              // Botão redondo de 44 dp do topo do Figaro (`FigarooAgendaTopBar`, spec 1 §6.5).
              <Link
                to={voltarPara}
                aria-label={voltarRotulo}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))] text-paper transition-[background-color,transform] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <ArrowLeft size={24} aria-hidden />
              </Link>
            ) : null}
            <CabecalhoDeTela title={title} {...(subtitle ? { subtitle } : {})} />
          </div>
          <div className="flex items-center gap-2">
            <BotaoAjuda />
          </div>
        </header>
      ) : null}
      <main className="screen-content min-w-0 flex-1 px-5 md:px-8">{children}</main>
      {assinaturaSoComputador ? (
        <div className="hidden md:block">
          <Signature />
        </div>
      ) : (
        <Signature />
      )}
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
