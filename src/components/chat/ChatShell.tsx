import type { CSSProperties, ReactNode } from "react";

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

export function ChatHeader({
  nome,
  avatarUrl,
  status,
  detalhe,
  processando = false,
}: {
  nome: string;
  avatarUrl?: string | null;
  status?: string;
  detalhe?: string;
  processando?: boolean;
}) {
  const nomeExibido = nome
    .trim()
    .replace(/^recep(?:ç|c)[aã]o\s+/i, "")
    .replace(/^recep(?:ç|c)[aã]o$/i, detalhe?.trim().split(/\s+/)[0] ?? "Cortaí");

  return (
    <header className="chat-header">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="size-11 shrink-0 rounded-full object-cover ring-2 ring-white/15"
        />
      ) : (
        <span className="chat-avatar-letra size-11">{nomeExibido.slice(0, 1).toUpperCase()}</span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-extrabold">{nomeExibido}</h1>
        {status || detalhe ? (
          <p
            className="flex items-center gap-1.5 truncate text-xs font-semibold"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {detalhe ? <span className="chat-estabelecimento truncate">{detalhe}</span> : null}
            {status ? (
              <>
                {detalhe ? <span className="chat-mute" aria-hidden>·</span> : null}
                {processando ? (
                  <span className="chat-status-typing" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <span className="chat-status-dot" aria-hidden />
                )}
                <span className="chat-status-text">{status}</span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
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
