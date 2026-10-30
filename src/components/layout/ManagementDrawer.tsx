import { useEffect, useMemo, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SinoDeAvisos } from "@/components/notificacoes/SinoDeAvisos";
import { AtalhoCortaiNoCabecalho } from "@/components/ia/FabCortai";
import {
  AcoesRapidas,
  deveMostrarAcoesRapidasNoCabecalho,
} from "@/components/barbeiro/AcoesRapidas";
import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
import { DrawerAjustes } from "@/components/layout/DrawerAjustes";
import { DrawerDestaques } from "@/components/layout/DrawerDestaques";
import { GruposDoMenu } from "@/components/layout/GruposDoMenu";
import { ESTILO_DA_BARRA_NA_AGENDA } from "@/components/layout/barra-da-agenda";
import { CartaoSuporte } from "@/components/layout/CartaoSuporte";
import { getSessao } from "@/lib/sessao.functions";
import { getCapacidades } from "@/lib/capacidades.functions";
import { getAgendaDia } from "@/lib/barbeiro.functions";
import { CAPACIDADES } from "@/lib/capacidades";
import { hojeNoFuso, horarioDoDia, normalizarFuso } from "@/lib/horarios";
import { definirFusoDasTelas } from "@/lib/format";
import { rotuloDoPapel } from "@/lib/navigation";
import {
  alternarGrupo,
  comGrupoAtual,
  gruposAbertosSalvos,
  salvarGruposAbertos,
} from "@/lib/grupos-do-menu";
import {
  GRUPOS_DE_NAVEGACAO,
  itemDeNavegacaoAtivo,
  itensDaBarra,
  itensDoDiaADiaNoMenuMovel,
  modulosDeNavegacao,
} from "@/lib/navegacao-barbeiro";
import { aplicarIdentidade, aplicarModo, identidadeValida, MODE_KEY } from "@/lib/aparencia";
import { useMediaQuery } from "@/hooks/use-mobile";
import avatarPadrao from "@/assets/flow-avatar-padrao.png.asset.json";
import { Barra, BlocoEsqueleto } from "@/components/layout/Esqueleto";
import { useLayoutEquipe } from "@/components/layout/ContextoLayoutEquipe";

export function ManagementHeader() {
  const layoutEquipe = useLayoutEquipe();
  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = layoutEquipe?.menuAberto ?? abertoLocal;
  const setAberto = layoutEquipe?.setMenuAberto ?? setAbertoLocal;
  const [abertos, setAbertos] = useState<string[]>(["Dia a dia"]);
  const celular = useMediaQuery("(max-width: 767px)");
  const inicioDaBorda = useRef<{ x: number; y: number } | null>(null);
  const caminho = useRouterState({ select: (state) => state.location.pathname });
  const mostrarAcoesRapidas = deveMostrarAcoesRapidasNoCabecalho(caminho) && !aberto;
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300_000,
  });
  const { data: capacidades } = useQuery({
    queryKey: ["capacidades"],
    queryFn: () => getCapacidades(),
    staleTime: 300_000,
    enabled: aberto,
  });
  const [logoFalhou, setLogoFalhou] = useState<string | null>(null);
  const logoDoNegocio = sessao?.tenantLogoUrl ?? null;
  const logoUsavel = logoDoNegocio && logoDoNegocio !== logoFalhou ? logoDoNegocio : null;
  const fuso = normalizarFuso(sessao?.tenantFuso);
  const hoje = hojeNoFuso(fuso);
  const { data: agenda } = useQuery({
    queryKey: ["agenda-dia", hoje],
    queryFn: () => getAgendaDia({ data: { dia: hoje } }),
    staleTime: 60_000,
    enabled: aberto,
  });
  const horarioDeHoje = agenda ? horarioDoDia(hoje, agenda.horarios) : null;
  const operacaoAberta = horarioDeHoje ? !horarioDeHoje.fechado : null;
  const atendimentosDeHoje = agenda?.itens.filter(
    (item) => !["cancelado", "remarcado", "nao_compareceu"].includes(item.status),
  ).length;
  const resumoDaAgenda = agenda
    ? atendimentosDeHoje
      ? `Hoje · ${atendimentosDeHoje} ${atendimentosDeHoje === 1 ? "atendimento" : "atendimentos"}`
      : "Hoje · livre"
    : null;

  useEffect(() => {
    // Sem a sessão carregada, mantém o tema que o script inicial lembrou (aplicar "Padrão" aqui piscava o loading).
    if (sessao) aplicarIdentidade(identidadeValida(sessao.identidadeApp));
    if (sessao?.tenantModo && !window.localStorage.getItem(MODE_KEY))
      aplicarModo(sessao.tenantModo, true);
  }, [sessao?.identidadeApp, sessao?.tenantModo]);
  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener("cortai:abrir-menu", abrir);
    return () => window.removeEventListener("cortai:abrir-menu", abrir);
  }, []);
  useEffect(() => definirFusoDasTelas(sessao?.tenantFuso), [sessao?.tenantFuso]);
  useEffect(() => {
    if (!celular || aberto) return;
    const comecar = (evento: TouchEvent) => {
      const toque = evento.touches[0];
      inicioDaBorda.current =
        toque && toque.clientX <= 24 ? { x: toque.clientX, y: toque.clientY } : null;
    };
    const mover = (evento: TouchEvent) => {
      const inicio = inicioDaBorda.current;
      const toque = evento.touches[0];
      if (!inicio || !toque) return;
      const dx = toque.clientX - inicio.x;
      const dy = toque.clientY - inicio.y;
      if (Math.abs(dy) > Math.abs(dx)) inicioDaBorda.current = null;
      else if (dx > 48) {
        evento.preventDefault();
        inicioDaBorda.current = null;
        setAberto(true);
      }
    };
    const terminar = () => {
      inicioDaBorda.current = null;
    };
    window.addEventListener("touchstart", comecar, { passive: true });
    window.addEventListener("touchmove", mover, { passive: false });
    window.addEventListener("touchend", terminar, { passive: true });
    window.addEventListener("touchcancel", terminar, { passive: true });
    return () => {
      window.removeEventListener("touchstart", comecar);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("touchend", terminar);
      window.removeEventListener("touchcancel", terminar);
    };
  }, [aberto, celular]);

  const grupos = useMemo(() => {
    const modulos = modulosDeNavegacao(sessao?.segmento ?? "outro");
    const naBarra = itensDaBarra(sessao?.permissoes).map((item) => item.to as string);
    return GRUPOS_DE_NAVEGACAO.map((titulo) => ({
      titulo,
      itens: (celular && titulo === "Dia a dia"
        ? itensDoDiaADiaNoMenuMovel(sessao?.permissoes)
        : modulos.filter((item) => item.grupo === titulo && !naBarra.includes(item.to))
      )
        .filter((item) => item.to !== "/barbeiro")
        .filter((item) => {
          if (item.permissao && !sessao?.permissoes.includes(item.permissao)) return false;
          const rota = "rotaDaCapacidade" in item ? item.rotaDaCapacidade : undefined;
          if (!rota || !capacidades) return true;
          const capacidade = CAPACIDADES.find((entrada) => entrada.rota === rota);
          if (!capacidade?.recurso) return true;
          return (
            capacidades.liberados[capacidade.recurso] !== false &&
            capacidades.ativos[capacidade.recurso] !== false
          );
        }),
    }));
  }, [capacidades, celular, sessao?.permissoes, sessao?.segmento]);
  const grupoAtual =
    grupos.find((grupo) => grupo.itens.some((item) => itemDeNavegacaoAtivo(caminho, item.to)))
      ?.titulo ?? null;
  useEffect(() => {
    if (aberto) setAbertos(comGrupoAtual(gruposAbertosSalvos(), grupoAtual));
  }, [aberto, grupoAtual]);
  function alternar(titulo: string) {
    setAbertos((atual) => {
      const proximo = alternarGrupo(atual, titulo);
      salvarGruposAbertos(proximo);
      return proximo;
    });
  }

  // Figaro: a barra global fica na Agenda; nas demais subpáginas, Screen usa a barra de página
  // com retorno e ação contextual, sem repetir logo, Flow IA e notificações.
  const telaDaAgenda =
    caminho === "/barbeiro" ||
    caminho === "/barbeiro/" ||
    caminho === "/barbeiro/agenda" ||
    caminho.startsWith("/barbeiro/agenda/");

  if (celular && !telaDaAgenda) return null;

  return (
    <header
      className="management-header"
      style={celular && caminho === "/barbeiro" ? ESTILO_DA_BARRA_NA_AGENDA : undefined}
    >
      <div
        // Agenda no celular: barra de 64 dp do Figaro (`topAppBarHeight`), logo de 40 a 8 px da borda e sino colado à direita.
        className={`mx-auto flex w-full max-w-[1180px] items-center justify-between ${celular && caminho === "/barbeiro" ? "h-16 gap-0.5 px-1 md:px-8" : "h-14 gap-3 px-4 md:px-8"}`}
      >
        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="menu-cortai-trigger h-12 w-12 shrink-0 rounded-[8px] p-0 hover:bg-transparent"
              aria-label="Abrir navegação"
            >
              {logoUsavel ? (
                <img
                  key={logoUsavel}
                  src={logoUsavel}
                  onError={() => setLogoFalhou(logoUsavel)}
                  alt=""
                  aria-hidden
                  className={`object-cover ${celular && caminho === "/barbeiro" ? "h-10 w-10 rounded-full" : "h-11 w-11 rounded-[8px]"}`}
                />
              ) : (
                // Sem foto do negócio: o ícone padrão do Flow (dono, 30/10) até colocarem uma foto própria.
                <img
                  src={avatarPadrao.url}
                  alt=""
                  aria-hidden
                  className={`object-cover ${celular && caminho === "/barbeiro" ? "h-10 w-10 rounded-full" : "h-11 w-11 rounded-full"}`}
                />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            arrastarParaFechar
            esconderX
            className="management-drawer overflow-hidden rounded-r-[28px] border-0 bg-drawer-surface p-0 duration-200"
          >
            {/* Rola o menu inteiro; o topo fica preso por cima e a lista some por baixo dele em degradê (Figaro). */}
            <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
              {/* Como no Figaro: logo, nome e "pessoa · papel", sem saudação; 38 dp até o cartão Sua Página. */}
              <div className="menu-topo-degrade sticky top-0 z-10 px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
                <div className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {sessao ? (
                      <LogoBarbearia
                        nome={sessao.tenantNome ?? "Meu negócio"}
                        url={sessao.tenantLogoUrl ?? null}
                        size={40}
                        className="rounded-full border-0 bg-drawer-card"
                      />
                    ) : (
                      <BlocoEsqueleto className="size-11 shrink-0 rounded-full" />
                    )}
                    <div className="min-w-0">
                      <SheetTitle
                        data-conta-nome=""
                        className={sessao ? "line-clamp-2 break-words text-lg font-bold leading-6 tracking-normal text-paper" : "sr-only"}
                      >
                        {sessao?.tenantNome ?? "Menu"}
                      </SheetTitle>
                      {sessao ? (
                        <SheetDescription data-conta-papel="" className="mt-0.5 truncate text-[13px] leading-[18px] text-mute">
                          {sessao.nome ?? "Equipe"} · {rotuloDoPapel(sessao.papelNaEquipe)}
                        </SheetDescription>
                      ) : (
                        <>
                          <SheetDescription className="sr-only">Carregando o menu</SheetDescription>
                          <span aria-hidden className="block space-y-2">
                            <Barra w="140px" h={16} />
                            <Barra w="96px" h={12} />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <DrawerAjustes
                    identidade={sessao?.identidadeApp}
                    tenantId={sessao?.tenantId ?? undefined}
                    podeAlterarIdentidade={sessao?.papelNaEquipe === "dono"}
                    fecharDrawer={() => setAberto(false)}
                  />
                </div>
              </div>

              <nav
                aria-label="Módulos do negócio"
                className="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
              >
                <DrawerDestaques
                  slug={sessao?.tenantSlug}
                  paginaPublicada={sessao?.tenantPaginaPublicada ?? false}
                  resumoDaAgenda={resumoDaAgenda}
                  agendaAtiva={itemDeNavegacaoAtivo(caminho, "/barbeiro")}
                  operacaoAberta={operacaoAberta}
                  tenantId={sessao?.tenantId ?? null}
                  verDesempenho={celular && !!sessao?.permissoes.includes("relatorios")}
                  menuAberto={aberto}
                  fechar={() => setAberto(false)}
                />
                <GruposDoMenu
                  grupos={grupos}
                  segmento={sessao?.segmento}
                  abertos={abertos}
                  caminho={caminho}
                  onAlternar={alternar}
                  onNavegar={() => setAberto(false)}
                />
                <CartaoSuporte />
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        <div id="topo-centro" className="flex min-w-0 flex-1 justify-center md:hidden" />
        <div className="flex items-center gap-1">
          {mostrarAcoesRapidas ? <AcoesRapidas /> : null}
          {/* A Agenda mantém o topo livre; a Flow IA continua acessível nas demais telas. */}
          {caminho === "/barbeiro" || caminho === "/barbeiro/agenda" ? null : (
            <AtalhoCortaiNoCabecalho />
          )}
          <SinoDeAvisos />
        </div>
      </div>
      <div id="topo-baixo" className="md:hidden" />
    </header>
  );
}
