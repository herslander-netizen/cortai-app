import type { ReactNode } from "react";
import { Link, type LinkProps, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-mobile";
import { Signature } from "./Signature";
import { CabecalhoDeTela } from "./CabecalhoDeTela";
import { useCabecalhoCompacto } from "./useCabecalhoCompacto";

export function Screen({
  title,
  subtitle,
  titleLeading,
  voltarPara,
  voltarRotulo = "Voltar",
  wide = false,
  hideHeader = false,
  headerAction,
  assinaturaSoComputador = false,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Ícone contextual alinhado ao título, também preservado na versão compacta. */
  titleLeading?: ReactNode;
  voltarPara?: LinkProps["to"];
  voltarRotulo?: string;
  wide?: boolean;
  hideHeader?: boolean;
  /** Ação contextual alinhada à direita do topo (por exemplo, Categorias na tela Serviços). */
  headerAction?: ReactNode;
  /** Opt-in: assinatura institucional apenas em telas largas; desligada por padrão no app. */
  assinaturaSoComputador?: boolean;
  children?: ReactNode;
}) {
  const caminho = useRouterState({ select: (state) => state.location.pathname });
  const celular = useMediaQuery("(max-width: 767px)");
  const telaDaAgenda =
    caminho === "/barbeiro" ||
    caminho === "/barbeiro/" ||
    caminho === "/barbeiro/agenda" ||
    caminho.startsWith("/barbeiro/agenda/");
  const subpaginaGestaoMobile = celular && caminho.startsWith("/barbeiro/") && !telaDaAgenda;
  const subpaginaClienteMobile = celular && caminho.startsWith("/app/");
  const compactaTituloNoCelular =
    !hideHeader && (subpaginaGestaoMobile || subpaginaClienteMobile);
  // A barra global da gestão fica no desktop e na Agenda; o app do cliente não tem cabeçalho global.
  const offsetCabecalhoGlobal =
    caminho.startsWith("/barbeiro") && !subpaginaGestaoMobile;
  const destinoVoltar = voltarPara ?? (subpaginaGestaoMobile ? "/barbeiro" : undefined);
  const { ref: cabecalhoInicialRef, visivel: cabecalhoCompactoVisivel } = useCabecalhoCompacto({
    enabled: compactaTituloNoCelular,
    chave: `${caminho}:${title}`,
  });



  return (
    <div
      data-padrao-figaro="tela"
      data-largura={wide ? "larga" : undefined}
      className={`screen-shell mx-auto flex ${offsetCabecalhoGlobal ? "min-h-[calc(100dvh-3.5rem)]" : "min-h-dvh"} w-full flex-col pb-[calc(2rem+env(safe-area-inset-bottom))] ${wide ? "max-w-[1180px]" : "max-w-[760px]"}`}
    >
      {!hideHeader ? (
        <>
          <header
            ref={cabecalhoInicialRef}
            aria-hidden={cabecalhoCompactoVisivel || undefined}
            inert={cabecalhoCompactoVisivel || undefined}
            data-figaro-header="page"
            className={`relative ${offsetCabecalhoGlobal ? "top-14" : "top-0"} z-10 grid gap-4 bg-[var(--figaro-background,var(--ink))] px-4 pb-3 pt-4 md:static md:px-8 md:pb-5 md:pt-6`}
          >
            {destinoVoltar || headerAction ? (
              <div className="flex min-h-11 items-center justify-between gap-3">
                {destinoVoltar ? (
                  <Link
                    to={destinoVoltar}
                    aria-label={voltarRotulo}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))] text-[var(--figaro-on-surface,var(--paper))] transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <ArrowLeft size={24} aria-hidden />
                  </Link>
                ) : (
                  <span aria-hidden className="size-11 shrink-0" />
                )}
                {headerAction ? <div className="ml-auto flex min-h-11 items-center">{cabecalhoCompactoVisivel ? null : headerAction}</div> : null}
              </div>
            ) : null}
            <CabecalhoDeTela
              title={title}
              {...(subtitle ? { subtitle } : {})}
              {...(titleLeading ? { titleLeading } : {})}
            />
          </header>

          {compactaTituloNoCelular ? (
            <div
              data-figaro-header="compact"
              aria-hidden={!cabecalhoCompactoVisivel || undefined}
              inert={!cabecalhoCompactoVisivel || undefined}
              className={`fixed inset-x-0 top-0 z-40 flex min-h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center gap-3 bg-[var(--figaro-background,var(--ink))] px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] transition-[opacity,transform] duration-200 motion-reduce:transition-none ${cabecalhoCompactoVisivel ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"}`}
            >
              {destinoVoltar ? (
                <Link
                  to={destinoVoltar}
                  aria-label={voltarRotulo}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))] text-[var(--figaro-on-surface,var(--paper))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowLeft size={22} aria-hidden />
                </Link>
              ) : null}
              {titleLeading ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--whatsapp)]">
                  {titleLeading}
                </span>
              ) : null}
              <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-[var(--figaro-on-background,var(--paper))]">{title}</h1>
              {headerAction ? <div className="flex shrink-0 items-center">{cabecalhoCompactoVisivel ? headerAction : null}</div> : null}
            </div>
          ) : null}
        </>
      ) : null}
      <main
        data-figaro-conteudo="page"
        className="screen-content min-w-0 flex-1 px-4 md:px-8"
      >
        {children}
      </main>
      {assinaturaSoComputador ? (
        <div className="hidden md:block">
          <Signature />
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div
      data-figaro-empty-state="true"
      className="flex min-h-28 flex-col items-center justify-center rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] px-5 py-8 text-center"
    >
      <p className="text-sm leading-relaxed text-mute">{text}</p>
    </div>
  );
}
