import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SinoDeAvisos } from "@/components/notificacoes/SinoDeAvisos";
import {
  AcoesRapidas,
  deveMostrarAcoesRapidasNoCabecalho,
} from "@/components/barbeiro/AcoesRapidas";
import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
import { DrawerAjustes } from "@/components/layout/DrawerAjustes";
import { DrawerDestaques } from "@/components/layout/DrawerDestaques";
import { IconeDoMenu } from "@/components/layout/IconeDoMenu";
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
import {
  APPEARANCE_EVENT,
  aplicarIdentidade,
  aplicarModo,
  identidadeValida,
  MODE_KEY,
} from "@/lib/aparencia";
import { termos } from "@/lib/segmentos";
import { useMediaQuery } from "@/hooks/use-mobile";
import { horaNoFuso, saudacaoDoMenu } from "@/lib/saudacao-menu";
import menuClaro from "@/assets/cortai-menu-light.webp.asset.json";
import menuEscuro from "@/assets/cortai-menu-dark.webp.asset.json";
import { useLayoutEquipe } from "@/components/layout/ContextoLayoutEquipe";

export function ManagementHeader() {
  const layoutEquipe = useLayoutEquipe();
  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = layoutEquipe?.menuAberto ?? abertoLocal;
  const setAberto = layoutEquipe?.setMenuAberto ?? setAbertoLocal;
  const [modoClaro, setModoClaro] = useState(false);
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
  const saudacao = saudacaoDoMenu({
    dia: hoje,
    hora: horaNoFuso(fuso),
    nome: sessao?.nome ?? null,
  });
  const atendimentosDeHoje = agenda?.itens.filter(
    (item) => !["cancelado", "remarcado", "nao_compareceu"].includes(item.status),
  ).length;
  const resumoDaAgenda = agenda
    ? atendimentosDeHoje
      ? `Hoje · ${atendimentosDeHoje} ${atendimentosDeHoje === 1 ? "atendimento" : "atendimentos"}`
      : "Hoje · livre"
    : null;

  useEffect(() => {
    aplicarIdentidade(identidadeValida(sessao?.identidadeApp));
    if (sessao?.tenantModo && !window.localStorage.getItem(MODE_KEY))
      aplicarModo(sessao.tenantModo, true);
  }, [sessao?.identidadeApp, sessao?.tenantModo]);
  useEffect(() => {
    const atualizar = () => setModoClaro(document.documentElement.classList.contains("light"));
    atualizar();
    window.addEventListener(APPEARANCE_EVENT, atualizar);
    return () => window.removeEventListener(APPEARANCE_EVENT, atualizar);
  }, []);
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

  return (
    <header className="management-header">
      <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center justify-between gap-3 px-4 md:px-8">
        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="menu-cortai-trigger h-12 w-12 shrink-0 rounded-[8px] p-0 hover:bg-transparent"
              aria-label="Abrir navegação"
            >
              <img
                key={logoUsavel ?? "cortai"}
                src={logoUsavel ?? (modoClaro ? menuEscuro.url : menuClaro.url)}
                onError={() => logoUsavel && setLogoFalhou(logoUsavel)}
                alt=""
                aria-hidden
                className="h-11 w-11 rounded-[8px] object-cover"
              />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            arrastarParaFechar
            className="management-drawer w-[90vw] max-w-[390px] overflow-hidden rounded-r-[28px] border-0 bg-drawer-surface p-0 duration-200 [&>button:first-child]:hidden"
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
                <div className="grid grid-cols-[minmax(0,1fr)_48px] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <LogoBarbearia
                      nome={sessao?.tenantNome ?? "Meu negócio"}
                      url={sessao?.tenantLogoUrl ?? null}
                      size={56}
                      className="rounded-full border-0 bg-drawer-card"
                    />
                    <div className="min-w-0">
                      <SheetTitle
                        className={`line-clamp-2 break-words font-semibold text-paper ${(sessao?.tenantNome ?? "").length > 28 ? "text-xl leading-6" : "text-2xl leading-7"}`}
                      >
                        {sessao?.tenantNome ?? "Meu negócio"}
                      </SheetTitle>
                      <SheetDescription className="mt-1 truncate text-[15px] text-mute">
                        {sessao?.nome?.split(" ")[0] ?? "Equipe"} ·{" "}
                        {rotuloDoPapel(sessao?.papelNaEquipe)}
                      </SheetDescription>
                    </div>
                  </div>
                  <DrawerAjustes
                    identidade={sessao?.identidadeApp}
                    tenantId={sessao?.tenantId ?? undefined}
                    podeAlterarIdentidade={sessao?.papelNaEquipe === "dono"}
                    fecharDrawer={() => setAberto(false)}
                  />
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-mute">
                  <strong className="font-semibold text-paper">{saudacao.titulo}</strong> ·{" "}
                  {saudacao.frase}
                </p>
              </div>

              <nav
                aria-label="Módulos do negócio"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
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
                <div className="mt-6 space-y-4">
                  {grupos.map((grupo) =>
                    grupo.itens.length ? (
                      <section key={grupo.titulo}>
                        <Button
                          variant="ghost"
                          className="min-h-12 w-full justify-between px-1 text-lg font-bold text-menu-icone hover:bg-transparent"
                          aria-expanded={abertos.includes(grupo.titulo)}
                          aria-controls={`menu-grupo-${grupo.titulo.replace(/\s+/g, "-")}`}
                          onClick={() => alternar(grupo.titulo)}
                        >
                          {grupo.titulo === "Negócio"
                            ? capitalizar(termos(sessao?.segmento).possessivo)
                            : grupo.titulo}
                          <ChevronDown
                            className={`size-5 transition-transform duration-[120ms] motion-reduce:transition-none ${abertos.includes(grupo.titulo) ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                        </Button>
                        {abertos.includes(grupo.titulo) ? (
                          <ul
                            id={`menu-grupo-${grupo.titulo.replace(/\s+/g, "-")}`}
                            className="space-y-1.5 animate-in fade-in-0 duration-[120ms] motion-reduce:animate-none"
                          >
                            {grupo.itens.map((item, indice) => {
                              const Icon = item.icon;
                              const ativo = itemDeNavegacaoAtivo(caminho, item.to);
                              const raio =
                                grupo.itens.length === 1
                                  ? "rounded-[24px]"
                                  : indice === 0
                                    ? "rounded-t-[24px] rounded-b-[9px]"
                                    : indice === grupo.itens.length - 1
                                      ? "rounded-t-[9px] rounded-b-[24px]"
                                      : "rounded-[9px]";
                              return (
                                <li key={`${grupo.titulo}-${item.label}`}>
                                  <Link
                                    to={item.to as never}
                                    preload="intent"
                                    onClick={() => setAberto(false)}
                                    aria-current={ativo ? "page" : undefined}
                                    className={`grid min-h-16 grid-cols-[40px_minmax(0,1fr)] items-center gap-3 border border-drawer-borda bg-drawer-card px-4 py-3 text-lg font-medium text-paper ${raio} ${ativo ? "ring-2 ring-primary/30" : ""}`}
                                  >
                                    <IconeDoMenu icone={Icon} ativo={ativo} />
                                    <span className="truncate">{item.label}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </section>
                    ) : null,
                  )}
                </div>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        <div id="topo-centro" className="flex min-w-0 flex-1 justify-center md:hidden" />
        <div className="flex items-center gap-1">
          {mostrarAcoesRapidas ? <AcoesRapidas /> : null}
          <SinoDeAvisos />
        </div>
      </div>
    </header>
  );
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
