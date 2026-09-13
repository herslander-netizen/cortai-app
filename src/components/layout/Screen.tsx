import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Signature } from "./Signature";
import { BotaoAjuda } from "@/components/guia/BotaoAjuda";
import { SinoDeNotificacoes } from "@/components/notificacoes/SinoDeNotificacoes";

export function Screen({
  title,
  subtitle,
  voltarPara,
  voltarRotulo = "Voltar",
  children,
}: {
  title: string;
  subtitle?: string;
  voltarPara?: LinkProps["to"];
  voltarRotulo?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 pb-5 pt-8">
        <div className="min-w-0">
          {voltarPara ? (
            <Link to={voltarPara} className="mb-2 inline-flex items-center gap-1 text-xs text-mute">
              <ChevronLeft size={14} />
              {voltarRotulo}
            </Link>
          ) : null}
          <h1 className="screen-title">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-mute">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <SinoDeNotificacoes />
          <BotaoAjuda />
        </div>
      </header>
      <main className="flex-1 px-5">{children}</main>
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
