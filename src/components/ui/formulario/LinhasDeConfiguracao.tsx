import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Peças das telas de configuração, no padrão do Figaro (`FigarooListGroup`, `FigarooListRow`,
 * `FigarooSectionHeader`): grupo com cantos externos de 28 dp e internos de 4 dp, 2 dp entre linhas,
 * linha de 56 dp ou mais, ícone líder de 48 dp em círculo e seta/valor/interruptor no fim.
 */
export function GrupoDeLinhas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "flex flex-col gap-0.5 [&>li]:overflow-hidden [&>li]:rounded-[4px] [&>li]:bg-[var(--figaro-surface-container-high,var(--ink2))] [&>li:first-child]:rounded-t-[28px] [&>li:last-child]:rounded-b-[28px]",
        className,
      )}
    >
      {children}
    </ul>
  );
}

const CORPO_DA_LINHA = "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left";

function ConteudoDaLinha({
  icone: Icone,
  lider,
  titulo,
  suporte,
  fim,
  navegavel,
}: {
  icone?: LucideIcon | undefined;
  /** Slot líder próprio (ex.: avatar), no lugar do ícone em círculo. */
  lider?: ReactNode;
  titulo: ReactNode;
  suporte?: ReactNode;
  fim?: ReactNode;
  navegavel?: boolean;
}) {
  return (
    <>
      {lider ?? null}
      {!lider && Icone ? (
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-primary"
        >
          <Icone className="size-5" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-5 text-paper">{titulo}</span>
        {suporte ? (
          <span className="mt-0.5 block text-sm leading-5 text-mute">{suporte}</span>
        ) : null}
      </span>
      {fim ? <span className="shrink-0 text-sm text-mute">{fim}</span> : null}
      {navegavel ? <ChevronRight aria-hidden className="size-5 shrink-0 text-mute2" /> : null}
    </>
  );
}

/** Linha que leva a outra tela (`para`), abre um link (`href`) ou executa uma ação (`aoTocar`). */
export function LinhaDeConfiguracao({
  icone,
  lider,
  titulo,
  suporte,
  fim,
  para,
  parametros,
  href,
  aoTocar,
  desabilitada,
}: {
  icone?: LucideIcon;
  lider?: ReactNode;
  titulo: ReactNode;
  suporte?: ReactNode;
  fim?: ReactNode;
  para?: LinkProps["to"];
  /** Parâmetros da rota de `para` (ex.: `{ id }`). */
  parametros?: Record<string, string>;
  href?: string;
  aoTocar?: () => void;
  desabilitada?: boolean;
}) {
  const conteudo = (
    <ConteudoDaLinha
      icone={icone}
      lider={lider}
      titulo={titulo}
      suporte={suporte}
      fim={fim}
      navegavel={Boolean(para || href || aoTocar)}
    />
  );
  return (
    <li>
      {para ? (
        <Link
          to={para}
          {...(parametros ? { params: parametros as never } : {})}
          className={cn(CORPO_DA_LINHA, "active:bg-paper/5")}
        >
          {conteudo}
        </Link>
      ) : href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={cn(CORPO_DA_LINHA, "active:bg-paper/5")}
        >
          {conteudo}
        </a>
      ) : aoTocar ? (
        <button
          type="button"
          disabled={desabilitada}
          onClick={aoTocar}
          className={cn(CORPO_DA_LINHA, "active:bg-paper/5 disabled:opacity-50")}
        >
          {conteudo}
        </button>
      ) : (
        <div className={CORPO_DA_LINHA}>{conteudo}</div>
      )}
    </li>
  );
}

/** Linha com interruptor: tocar em qualquer parte dela liga ou desliga (`FigarooListRow` + `FigarooSwitch`). */
export function LinhaComInterruptor({
  icone,
  titulo,
  suporte,
  marcado,
  aoMudar,
  desabilitado,
}: {
  icone?: LucideIcon;
  titulo: string;
  suporte?: string;
  marcado: boolean;
  aoMudar: (valor: boolean) => void;
  desabilitado?: boolean;
}) {
  return (
    <li>
      <label className={cn(CORPO_DA_LINHA, "cursor-pointer", desabilitado && "opacity-50")}>
        <ConteudoDaLinha icone={icone} titulo={titulo} suporte={suporte} />
        <Switch
          checked={marcado}
          disabled={desabilitado}
          onCheckedChange={aoMudar}
          aria-label={titulo}
        />
      </label>
    </li>
  );
}

/** Cabeçalho de seção de formulário (13/18 semibold, espaçado) com nota de rodapé opcional. */
export function SecaoDeConfiguracao({
  titulo,
  rodape,
  children,
  className,
}: {
  titulo?: string;
  rodape?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8", className)}>
      {titulo ? (
        <h2 className="mb-2 px-4 text-[13px] font-semibold uppercase leading-[18px] tracking-[0.06em] text-mute">
          {titulo}
        </h2>
      ) : null}
      {children}
      {rodape ? <p className="mt-2 px-4 text-xs leading-[18px] text-mute">{rodape}</p> : null}
    </section>
  );
}

/** Cartão de perfil do topo das opções da conta (avatar, nome, e-mail e papel). */
export function CartaoDePerfil({
  nome,
  email,
  papel,
  avatar,
}: {
  nome: string;
  email?: string | null;
  papel?: string | null;
  avatar?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[28px] bg-[var(--figaro-surface-container-low,var(--ink2))] p-4">
      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-ink3 text-lg font-bold text-paper">
        {avatar ?? nome.trim().charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-paper">{nome}</p>
        {email ? <p className="truncate text-sm text-mute">{email}</p> : null}
        {papel ? (
          <span className="mt-1.5 inline-flex rounded-full bg-ink3 px-2.5 py-0.5 text-xs font-semibold text-mute">
            {papel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Aviso de configuração no topo da tela (como "Verifique seu e-mail" na conta do Figaro). */
export function AvisoDeConfiguracao({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto: string;
  acao?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="rounded-[28px] bg-[color-mix(in_oklab,var(--figaro-primary,var(--primary))_14%,var(--figaro-surface-container,var(--ink2)))] p-4"
    >
      <p className="text-[15px] font-semibold leading-5 text-paper">{titulo}</p>
      <p className="mt-1 text-sm leading-5 text-mute">{texto}</p>
      {acao ? <div className="mt-3">{acao}</div> : null}
    </div>
  );
}
