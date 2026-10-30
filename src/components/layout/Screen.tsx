import type { ReactNode } from "react";
import { Link, type LinkProps, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-mobile";
import { Signature } from "./Signature";
import { CabecalhoDeTela } from "./CabecalhoDeTela";
import { DISTANCIA_DO_TITULO, useTituloRecolhivel } from "./useTituloRecolhivel";

export function Screen({
  title,
  subtitle,
  titleLeading,
  voltarPara,
  voltarRotulo = "Voltar",
  voltarBusca,
  wide = false,
  hideHeader = false,
  headerAction,
  assinaturaSoComputador = false,
  barraSimples = false,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Ícone contextual alinhado ao título, também preservado na versão compacta. */
  titleLeading?: ReactNode;
  voltarPara?: LinkProps["to"];
  voltarRotulo?: string;
  /** Busca levada no voltar (ex.: a escolha em andamento de Layout & Tema). */
  voltarBusca?: Record<string, unknown>;
  wide?: boolean;
  hideHeader?: boolean;
  /** Ação contextual alinhada à direita do topo (por exemplo, Categorias na tela Serviços). */
  headerAction?: ReactNode;
  /** Opt-in: assinatura institucional apenas em telas largas; desligada por padrão no app. */
  assinaturaSoComputador?: boolean;
  /** Celular: só a barra com a seta e o título pequeno, sem título grande (barra simples do Figaro, ex.: QR Code). */
  barraSimples?: boolean;
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
  const compactaTituloNoCelular = !hideHeader && (subpaginaGestaoMobile || subpaginaClienteMobile);
  // A barra global da gestão fica no desktop e na Agenda; o app do cliente não tem cabeçalho global.
  const offsetCabecalhoGlobal = caminho.startsWith("/barbeiro") && !subpaginaGestaoMobile;
  const destinoVoltar = voltarPara ?? (subpaginaGestaoMobile ? "/barbeiro" : undefined);
  const recolhivelRef = useTituloRecolhivel({
    enabled: compactaTituloNoCelular && !barraSimples,
    chave: `${caminho}:${title}`,
  });

  const botaoVoltar = destinoVoltar ? (
    <Link
      to={destinoVoltar}
      search={voltarBusca as never}
      aria-label={voltarRotulo}
      className={`-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full ${barraSimples && compactaTituloNoCelular ? "" : "bg-[var(--figaro-surface-container-highest,var(--ink3))]"} text-[var(--figaro-on-surface,var(--paper))] transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none`}
    >
      <ArrowLeft size={24} aria-hidden />
    </Link>
  ) : null;

  return (
    <div
      ref={recolhivelRef}
      data-padrao-figaro="tela"
      data-largura={wide ? "larga" : undefined}
      // No celular, folga do tamanho do recolhimento: a barra recolhe mesmo com pouco conteúdo, como no Figaro.
      style={
        compactaTituloNoCelular && !barraSimples
          ? { minHeight: `calc(100dvh + var(--titulo-distancia, ${DISTANCIA_DO_TITULO}px))` }
          : undefined
      }
      className={`screen-shell mx-auto flex ${offsetCabecalhoGlobal ? "min-h-[calc(100dvh-3.5rem)]" : "min-h-dvh"} w-full flex-col pb-[calc(2rem+env(safe-area-inset-bottom))] ${wide ? "max-w-[1180px]" : "max-w-[760px]"}`}
    >
      {!hideHeader && compactaTituloNoCelular ? (
        <>
          {/* Barra do Figaro (vídeo do dono, 30/10): gruda no topo com a seta e as ações; o título pequeno aparece no
              fim do recolhimento e o conteúdo passa por baixo dela. Sticky (não fixa) para não cobrir abas acima da tela. */}
          <div
            data-figaro-header="compact"
            className="sticky top-0 z-40 flex items-center gap-3 bg-[var(--figaro-background,var(--ink))] px-4 pb-3.5 pt-4"
          >
            <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3">
              {botaoVoltar}
              <div
                aria-hidden
                className={`flex min-w-0 flex-1 items-center gap-3 ${barraSimples ? "" : "opacity-[var(--titulo-pequeno-alfa,0)]"}`}
              >
                {titleLeading ? (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--whatsapp)]">
                    {titleLeading}
                  </span>
                ) : null}
                {/* Título pequeno: titleLarge 22/28. */}
                <span className="min-w-0 flex-1 truncate text-[22px] font-normal leading-7 text-[var(--figaro-on-background,var(--paper))]">
                  {title}
                </span>
              </div>
              {headerAction ? (
                <div className="flex shrink-0 items-center">{headerAction}</div>
              ) : null}
            </div>
          </div>
          {barraSimples ? (
            <h1 className="sr-only">{title}</h1>
          ) : (
            <header
              data-figaro-header="page"
              className="bg-[var(--figaro-background,var(--ink))] px-4 pb-5 [&_h1]:opacity-[var(--titulo-grande-alfa,1)]"
            >
              <CabecalhoDeTela
                title={title}
                {...(subtitle ? { subtitle } : {})}
                {...(titleLeading ? { titleLeading } : {})}
              />
            </header>
          )}
        </>
      ) : !hideHeader ? (
        <header
          data-figaro-header="page"
          className={`relative ${offsetCabecalhoGlobal ? "top-14" : "top-0"} z-10 grid gap-3.5 bg-[var(--figaro-background,var(--ink))] px-4 pb-5 pt-4 md:static md:px-8 md:pb-5 md:pt-6`}
        >
          {destinoVoltar || headerAction ? (
            <div className="flex min-h-11 items-center justify-between gap-3">
              {botaoVoltar ?? <span aria-hidden className="size-11 shrink-0" />}
              {headerAction ? (
                <div className="ml-auto flex min-h-11 items-center">{headerAction}</div>
              ) : null}
            </div>
          ) : null}
          <CabecalhoDeTela
            title={title}
            {...(subtitle ? { subtitle } : {})}
            {...(titleLeading ? { titleLeading } : {})}
          />
        </header>
      ) : null}
      <main data-figaro-conteudo="page" className="screen-content min-w-0 flex-1 px-4 md:px-8">
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
