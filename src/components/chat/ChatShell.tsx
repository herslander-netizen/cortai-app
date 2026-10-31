import type { CSSProperties, ReactNode } from "react";

import { ArrowLeft, MoreVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import fundo from "@/assets/flow-chat-fundo.png.asset.json";
import avatarPadrao from "@/assets/flow-avatar-padrao.png.asset.json";
import type { PaginaConfig } from "@/lib/pagina-config";

type ChatConfig = PaginaConfig["chat"];

/** Atributos que ligam o estilo escolhido (Personalizar Chat) ao CSS `.chat-sistema[data-*]`. */
export function atributosDoChat(chat?: Partial<ChatConfig> | undefined) {
  return {
    "data-estilo": chat?.estilo ?? "vidro",
    "data-fundo": chat?.fundo ?? "capa",
    "data-cabecalho": chat?.cabecalho ?? "barra",
    "data-avatar": chat?.avatar ?? "redondo",
    "data-texto": chat?.texto ?? "normal",
    "data-chips": chat?.chips ?? "pilula",
  } as const;
}

/**
 * Sistema visual compartilhado dos chats do Flow.
 * Camadas: fundo → efeitos → cabeçalho → conversa → bandeja inferior.
 * Só apresentação: nenhum estado de agenda ou regra de negócio mora aqui.
 */
export function ChatBackground({
  capaUrl,
  modo = "capa",
}: {
  capaUrl?: string | null | undefined;
  modo?: ChatConfig["fundo"];
}) {
  // capa = foto do negócio (ou o fundo do Flow); padrao = sempre o fundo do Flow; liso = só a cor.
  const imagem = modo === "liso" ? null : modo === "padrao" ? fundo.url : capaUrl || fundo.url;
  return (
    <div aria-hidden className="chat-fundo">
      {imagem ? <img src={imagem} alt="" className="chat-fundo-img" decoding="async" /> : null}
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
export function deveMostrarStatusDoChat(status: string | undefined) {
  return Boolean(status);
}

export function ChatHeader({
  nome,
  avatarUrl,
  status,
  detalhe,
  processando = false,
  online = false,
  voltar,
  acoes = [],
}: {
  nome: string;
  avatarUrl?: string | null;
  status?: string;
  detalhe?: string;
  processando?: boolean;
  /** Mostra o ponto de presença sobre o avatar, como nos apps de mensagem. */
  online?: boolean;
  voltar?: { href?: string; onClick?: () => void; rotulo?: string };
  acoes?: AcaoDoCabecalho[];
}) {
  const nomeExibido = nome
    .trim()
    .replace(/^recep(?:ç|c)[aã]o\s+/i, "")
    .replace(/^recep(?:ç|c)[aã]o$/i, detalhe?.trim().split(/\s+/)[0] ?? "Flow");
  const rotuloVoltar = voltar?.rotulo ?? "Voltar";
  const mostrarStatus = deveMostrarStatusDoChat(status);

  return (
    <header className="chat-header">
      {voltar ? (
        voltar.href ? (
          <a
            href={voltar.href}
            className="chat-header-botao -ml-2"
            aria-label={rotuloVoltar}
            onClick={voltar.onClick}
          >
            <ArrowLeft className="size-6" aria-hidden />
          </a>
        ) : (
          <button
            type="button"
            className="chat-header-botao -ml-2"
            aria-label={rotuloVoltar}
            onClick={voltar.onClick}
          >
            <ArrowLeft className="size-6" aria-hidden />
          </button>
        )
      ) : null}
      <span className="chat-header-avatar-caixa">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="chat-header-avatar !rounded-full object-cover" />
        ) : (
          // Sem foto: o ícone padrão do Flow, como no topo da Agenda (dono, 31/10), até o negócio personalizar.
          <img
            src={avatarPadrao.url}
            alt=""
            className="chat-header-avatar !rounded-full object-cover"
          />
        )}
        {online ? <span className="chat-presenca" aria-hidden /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-extrabold leading-tight">{nomeExibido}</h1>
        {mostrarStatus ? (
          <p
            className="flex items-center gap-1.5 truncate text-xs font-semibold"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {detalhe ? (
              <>
                <span className="chat-estabelecimento truncate">{detalhe}</span>
                <span className="chat-mute" aria-hidden>
                  ·
                </span>
              </>
            ) : null}
            {processando ? (
              <span className="chat-status-typing" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            ) : null}
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
                <DropdownMenuItem
                  key={a.rotulo}
                  className="min-h-12"
                  onSelect={() => a.onSelect?.()}
                >
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
  estilo,
}: {
  header: ReactNode;
  children: ReactNode;
  capaUrl?: string | null;
  style?: CSSProperties;
  estilo?: Partial<ChatConfig> | undefined;
}) {
  return (
    <main
      className="chat-sistema"
      style={style}
      data-personalizado={capaUrl ? "true" : "false"}
      {...atributosDoChat(estilo)}
    >
      <ChatBackground capaUrl={capaUrl} modo={estilo?.fundo ?? "capa"} />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[760px] flex-col overflow-hidden">
        {header}
        {children}
        <footer className="chat-assinatura">By Alvo Digital • Flow</footer>
      </div>
    </main>
  );
}

export function TypingIndicator({ rotulo = "Digitando" }: { rotulo?: string }) {
  return (
    <span
      className="chat-bolha-ia chat-bolha-digitando inline-flex h-10 items-center gap-1 px-4"
      role="status"
      aria-label={rotulo}
    >
      <i className="chat-dot" />
      <i className="chat-dot" />
      <i className="chat-dot" />
    </span>
  );
}
