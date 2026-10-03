import type { CSSProperties, ReactNode } from "react";

import { ArrowLeft, MoreVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import fundo from "@/assets/chat-fundo-cortai.png.asset.json";

/**
 * Sistema visual compartilhado dos chats do Cortaí.
 * Camadas: fundo → efeitos → cabeçalho → conversa → bandeja inferior.
 * Só apresentação: nenhum estado de agenda ou regra de negócio mora aqui.
 */
export function ChatBackground({ capaUrl }: { capaUrl?: string | null | undefined }) {
  return (
    <div aria-hidden className="chat-fundo">
      <img src={capaUrl || fundo.url} alt="" className="chat-fundo-img" decoding="async" />
      <div className="chat-fundo-veu" />
    </div>
  );
}

export type AcaoDoCabecalho = {
  rotulo: string;
  icone?: ReactNode;
  href?: string;
  externo?: boolean;
  onSelect?: () => void;
};

/**
 * Cabeçalho de mensageria: voltar · avatar · nome · um status · menu.
 * `detalhe` continua aceito só para demonstrações que mostram o canal.
 */
export function ChatHeader({
  nome,
  avatarUrl,
  status,
  detalhe,
  processando = false,
  voltar,
  acoes = [],
}: {
  nome: string;
  avatarUrl?: string | null;
  status?: string;
  detalhe?: string;
  processando?: boolean;
  voltar?: { href?: string; onClick?: () => void; rotulo?: string };
  acoes?: AcaoDoCabecalho[];
}) {
  const nomeExibido = nome
    .trim()
    .replace(/^recep(?:ç|c)[aã]o\s+/i, "")
    .replace(/^recep(?:ç|c)[aã]o$/i, detalhe?.trim().split(/\s+/)[0] ?? "Cortaí");
  const rotuloVoltar = voltar?.rotulo ?? "Voltar";

  return (
    <header className="chat-header">
      {voltar ? (
        voltar.href ? (
          <a href={voltar.href} className="chat-header-botao -ml-2" aria-label={rotuloVoltar} onClick={voltar.onClick}>
            <ArrowLeft className="size-6" aria-hidden />
          </a>
        ) : (
          <button type="button" className="chat-header-botao -ml-2" aria-label={rotuloVoltar} onClick={voltar.onClick}>
            <ArrowLeft className="size-6" aria-hidden />
          </button>
        )
      ) : null}
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="chat-header-avatar" />
      ) : (
        <span className="chat-avatar-letra chat-header-avatar" aria-hidden>
          {nomeExibido.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-extrabold leading-tight">{nomeExibido}</h1>
        {status ? (
          <p className="flex items-center gap-1.5 truncate text-xs font-semibold" role="status" aria-live="polite" aria-atomic="true">
            {detalhe ? (
              <>
                <span className="chat-estabelecimento truncate">{detalhe}</span>
                <span className="chat-mute" aria-hidden>·</span>
              </>
            ) : null}
            {processando ? (
              <span className="chat-status-typing" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            ) : (
              <span className="chat-status-dot" aria-hidden />
            )}
            <span className="chat-status-text truncate">{status}</span>
          </p>
        ) : null}
      </div>
      {acoes.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="chat-header-botao -mr-2" aria-label="Mais opções">
              <MoreVertical className="size-6" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
            {acoes.map((a) =>
              a.href ? (
                <DropdownMenuItem key={a.rotulo} asChild className="min-h-12">
                  <a href={a.href} {...(a.externo ? { target: "_blank", rel: "noreferrer" } : {})}>
                    {a.icone}
                    {a.rotulo}
                  </a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={a.rotulo} className="min-h-12" onSelect={a.onSelect}>
                  {a.icone}
                  {a.rotulo}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  );
}

export function ChatShell({
  header,
  children,
  capaUrl,
  style,
}: {
  header: ReactNode;
  children: ReactNode;
  capaUrl?: string | null;
  style?: CSSProperties;
}) {
  return (
    <main className="chat-sistema" style={style} data-personalizado={capaUrl ? "true" : "false"}>
      <ChatBackground capaUrl={capaUrl} />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[760px] flex-col overflow-hidden">
        {header}
        {children}
        <footer className="chat-assinatura">By Alvo Digital • Cortaí</footer>
      </div>
    </main>
  );
}

export function TypingIndicator({ rotulo = "Digitando" }: { rotulo?: string }) {
  return (
    <span
      className="chat-bolha-ia inline-flex h-10 items-center gap-1 px-4"
      role="status"
      aria-label={rotulo}
    >
      <i className="chat-dot" />
      <i className="chat-dot" />
      <i className="chat-dot" />
    </span>
  );
}
