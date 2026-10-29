import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useMediaQuery } from "@/hooks/use-mobile";
import { CabecalhoDeTela } from "@/components/layout/CabecalhoDeTela";
import { useCabecalhoCompacto } from "@/components/layout/useCabecalhoCompacto";
import { Aviso } from "@/components/ui/aviso";

export function AdminScreen({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const caminho = useRouterState({ select: (state) => state.location.pathname });
  const celular = useMediaQuery("(max-width: 767px)");
  const {
    ref: cabecalhoInicialRef,
    visivel: cabecalhoCompactoVisivel,
  } = useCabecalhoCompacto({
    enabled: celular,
    chave: `${caminho}:${title}`,
  });

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 md:px-8 md:pb-12 md:pt-6">
      <header
        ref={cabecalhoInicialRef}
        aria-hidden={cabecalhoCompactoVisivel || undefined}
        inert={cabecalhoCompactoVisivel || undefined}
        data-figaro-header="page"
        className="mb-5 grid min-w-0 gap-4"
      >
        {actions ? (
          <div
            aria-hidden={cabecalhoCompactoVisivel || undefined}
            inert={cabecalhoCompactoVisivel || undefined}
            className="flex min-h-12 min-w-0 flex-wrap items-center justify-end gap-2"
          >
            {cabecalhoCompactoVisivel ? null : actions}
          </div>
        ) : null}
        <CabecalhoDeTela title={title} {...(subtitle ? { subtitle } : {})} />
      </header>
      {celular ? (
        <div
          data-figaro-header="compact"
          aria-hidden={!cabecalhoCompactoVisivel || undefined}
          inert={!cabecalhoCompactoVisivel || undefined}
          role="region"
          aria-label="Cabeçalho da página"
          className={`fixed inset-x-0 top-0 z-40 flex min-h-[calc(4.25rem+env(safe-area-inset-top,0px))] items-center gap-3 bg-[var(--figaro-background,var(--ink))] px-4 pb-2 pt-[calc(1rem+env(safe-area-inset-top,0px))] transition-[opacity,transform] duration-[var(--mola-padrao-duracao)] ease-[var(--mola-padrao)] motion-reduce:transition-none ${cabecalhoCompactoVisivel ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"}`}
        >
          <h1 className="min-w-0 flex-1 truncate text-[22px] font-normal leading-7 text-[var(--figaro-on-background,var(--paper))]">
            {title}
          </h1>
          {actions ? (
            <div className="ml-auto flex max-w-[55%] shrink-0 items-center gap-2 overflow-x-auto overscroll-contain">
              {cabecalhoCompactoVisivel ? actions : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <main>{children}</main>
    </div>
  );
}

export function AdminNotice({ error }: { error: unknown }) {
  const message =
    error instanceof Error && !error.message.toLowerCase().includes("unauthorized")
      ? error.message
      : "Entre com a conta do dono da plataforma para ver estes dados.";
  return (
    <Aviso tom="acao" titulo="Acesso restrito">
      {message}
    </Aviso>
  );
}
