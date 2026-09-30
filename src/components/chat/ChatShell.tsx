import type { ReactNode } from "react";

import fundo from "@/assets/chat-fundo-cortai.png.asset.json";
import logoCortai from "@/assets/cortai-logo-clara-oficial.png.asset.json";

/**
 * Sistema visual compartilhado dos chats do Cortaí.
 * Camadas: fundo → efeitos → cabeçalho → conversa → bandeja inferior.
 * Só apresentação: nenhum estado de agenda ou regra de negócio mora aqui.
 */
export function ChatBackground() {
  return (
    <div aria-hidden className="chat-fundo">
      <img src={fundo.url} alt="" className="chat-fundo-img" decoding="async" />
      <div className="chat-fundo-veu" />
    </div>
  );
}

export function ChatHeader({
  nome,
  avatarUrl,
  status,
  detalhe,
}: {
  nome: string;
  avatarUrl?: string | null;
  status?: string;
  detalhe?: string;
}) {
  return (
    <header className="chat-header">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-11 shrink-0 rounded-full object-cover ring-2 ring-white/15" />
      ) : (
        <span className="chat-avatar-letra size-11">{nome.slice(0, 1).toUpperCase()}</span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-extrabold">{nome}</h1>
        {status || detalhe ? (
          <p className="flex items-center gap-1.5 truncate text-xs font-semibold">
            {status ? (
              <>
                <span className="chat-status-dot" aria-hidden />
                <span>{status}</span>
              </>
            ) : null}
            {detalhe ? <span className="chat-mute">{status ? "· " : ""}{detalhe}</span> : null}
          </p>
        ) : null}
      </div>
      <img src={logoCortai.url} alt="Cortaí" className="h-7 w-auto shrink-0" />
    </header>
  );
}

export function ChatShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <main className="chat-sistema">
      <ChatBackground />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[760px] flex-col overflow-hidden">
        {header}
        {children}
      </div>
    </main>
  );
}

export function TypingIndicator({ rotulo = "Recepção digitando" }: { rotulo?: string }) {
  return (
    <span className="chat-bolha-ia inline-flex h-10 items-center gap-1 px-4" role="status" aria-label={rotulo}>
      <i className="chat-dot" />
      <i className="chat-dot" />
      <i className="chat-dot" />
    </span>
  );
}
