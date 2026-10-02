import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, CreditCard, LifeBuoy, Settings, type LucideIcon } from "lucide-react";
import {
  alternarGrupo,
  comGrupoAtual,
  gruposAbertosSalvos,
  salvarGruposAbertos,
} from "@/lib/grupos-do-menu";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SinoDeAvisos } from "@/components/notificacoes/SinoDeAvisos";
import { getSessao } from "@/lib/sessao.functions";
import { hojeNoFuso, horarioDoDia, normalizarFuso } from "@/lib/horarios";
import { definirFusoDasTelas } from "@/lib/format";
import { getCapacidades } from "@/lib/capacidades.functions";
import { CAPACIDADES } from "@/lib/capacidades";
import { getAgendaDia } from "@/lib/barbeiro.functions";
import { rotuloDoPapel } from "@/lib/navigation";
import type { ChaveDePermissao } from "@/lib/permissoes";
import { AcoesRapidas } from "@/components/barbeiro/AcoesRapidas";
import { ModeMenuItem } from "@/components/layout/ThemeToggle";
import { APPEARANCE_EVENT, aplicarIdentidade, aplicarModo, identidadeValida, MODE_KEY } from "@/lib/aparencia";
import {
  GRUPOS_DE_NAVEGACAO,
  itemDeNavegacaoAtivo,
  itensDaBarra,
  itensDoDiaADiaNoMenuMovel,
  modulosDeNavegacao,
} from "@/lib/navegacao-barbeiro";
import { useMediaQuery } from "@/hooks/use-mobile";
import { horaNoFuso, saudacaoDoMenu } from "@/lib/saudacao-menu";
import menuClaro from "@/assets/cortai-menu-light.png.asset.json";
import menuEscuro from "@/assets/cortai-menu-dark.png.asset.json";

type ItemDoMenu = {
  label: string;
  to: string;
  icon: LucideIcon;
  permissao?: ChaveDePermissao;
  rotaDaCapacidade?: string;
};

export function ManagementHeader() {
  const [aberto, setAberto] = useState(false);
  const [modoClaro, setModoClaro] = useState(false);
  const celular = useMediaQuery("(max-width: 767px)");
  const inicioDaBorda = useRef<{ x: number; y: number } | null>(null);
  const caminho = useRouterState({ select: (state) => state.location.pathname });
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
  // Dia real da barbearia (fuso do negócio), o mesmo usado pela agenda.
  const hoje = hojeNoFuso(normalizarFuso(sessao?.tenantFuso));
  const { data: agenda } = useQuery({
    queryKey: ["agenda-dia", hoje],
    queryFn: () => getAgendaDia({ data: { dia: hoje } }),
    staleTime: 60_000,
    enabled: aberto,
  });
  const horarioDeHoje = agenda ? horarioDoDia(hoje, agenda.horarios) : null;
  const operacaoAberta = horarioDeHoje ? !horarioDeHoje.fechado : null;
  const fuso = normalizarFuso(sessao?.tenantFuso);
  const saudacao = saudacaoDoMenu({ dia: hoje, hora: horaNoFuso(fuso), nome: sessao?.nome });
  const atendimentosDeHoje = agenda?.itens.filter(
    (item) => !["cancelado", "remarcado", "nao_compareceu"].includes(item.status),
  ).length;
  const apoio = agenda
    ? atendimentosDeHoje
      ? `Hoje: ${atendimentosDeHoje} ${atendimentosDeHoje === 1 ? "atendimento" : "atendimentos"}`
      : "Agenda livre hoje"
    : saudacao.frase;

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
  useEffect(() => {
    definirFusoDasTelas(sessao?.tenantFuso);
  }, [sessao?.tenantFuso]);
  useEffect(() => {
    if (!celular || aberto) return;
    const comecar = (evento: TouchEvent) => {
      const toque = evento.touches[0];
      inicioDaBorda.current = toque && toque.clientX <= 24 ? { x: toque.clientX, y: toque.clientY } : null;
    };
    const mover = (evento: TouchEvent) => {
      const inicio = inicioDaBorda.current;
      const toque = evento.touches[0];
      if (!inicio || !toque) return;
      const dx = toque.clientX - inicio.x;
      const dy = toque.clientY - inicio.y;
      if (Math.abs(dy) > Math.abs(dx)) {
        inicioDaBorda.current = null;
        return;
      }
      if (dx > 48) {
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
    const naBarra = itensDaBarra(sessao?.permissoes).map((b) => b.to as string);
    const operacionais = GRUPOS_DE_NAVEGACAO.map((titulo) => ({
      titulo,
      itens: (celular && titulo === "Dia a dia"
        ? itensDoDiaADiaNoMenuMovel(sessao?.permissoes)
        : modulos.filter((item) => item.grupo === titulo && !naBarra.includes(item.to)))
        .filter((item) => {
          if (item.permissao && !sessao?.permissoes.includes(item.permissao)) return false;
          const rotaDaCapacidade = "rotaDaCapacidade" in item ? item.rotaDaCapacidade : undefined;
          if (!rotaDaCapacidade || !capacidades) return true;
          const capacidade = CAPACIDADES.find((entrada) => entrada.rota === rotaDaCapacidade);
          return !capacidade?.recurso || capacidades.liberados[capacidade.recurso] !== false;
        }),
    }));
    const sistema: { titulo: string; itens: ItemDoMenu[] } = {
      titulo: "Sistema",
      itens: [
        { label: "Conta e negócio", to: "/barbeiro/conta", icon: Settings },
        { label: "Plano", to: "/barbeiro/plano", icon: CreditCard },
        { label: "Ajustes e ajuda", to: "/barbeiro/mais", icon: LifeBuoy },
      ],
    };
    return [...operacionais, sistema];
  }, [capacidades, celular, sessao?.permissoes, sessao?.segmento]);

  const [abertos, setAbertos] = useState<string[]>(["Dia a dia"]);
  const grupoAtual =
    grupos.find((g) => g.itens.some((i) => itemDeNavegacaoAtivo(caminho, i.to)))?.titulo ?? null;
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
                src={modoClaro ? menuClaro.url : menuEscuro.url}
                alt=""
                aria-hidden
                className="h-11 w-11 rounded-[8px] object-cover"
              />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="management-drawer w-[88vw] max-w-[360px] border-line bg-ink2 p-0 duration-200"
          >
            <div className="border-b border-line px-5 pb-4 pt-5 pr-12">
              <SheetTitle className="truncate text-lg text-paper">
                {saudacao.titulo}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-mute">
                {apoio}
              </SheetDescription>
              <p className="mt-4 truncate text-sm font-semibold text-paper">
                {sessao?.tenantNome ?? "Meu negócio"}
              </p>
              <p className="mt-0.5 truncate text-xs text-mute">
                {rotuloDoPapel(sessao?.papelNaEquipe)}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-mute">
                <span
                  className={`h-2 w-2 rounded-full ${operacaoAberta === false ? "bg-brick" : "bg-sage"}`}
                />
                {operacaoAberta === null
                  ? "Carregando operação…"
                  : operacaoAberta
                    ? `Aberta hoje · ${horarioDeHoje?.abre}–${horarioDeHoje?.fecha}`
                    : "Fechada hoje"}
              </div>
            </div>

            <nav aria-label="Módulos do negócio" className="px-3 py-3">
              {grupos.map((grupo) =>
                grupo.itens.length ? (
                  <section key={grupo.titulo} className="mb-2">
                    <h2 className="text-xs font-bold uppercase text-mute2">
                      <Button
                        variant="ghost"
                        className="min-h-12 w-full justify-between px-2 text-xs font-bold uppercase text-mute2"
                        aria-expanded={abertos.includes(grupo.titulo)}
                        aria-controls={`menu-grupo-${grupo.titulo.replace(/\s+/g, "-")}`}
                        onClick={() => alternar(grupo.titulo)}
                      >
                        {grupo.titulo}
                        <ChevronDown
                          aria-hidden
                          className={`size-4 transition-transform duration-[120ms] motion-reduce:transition-none ${abertos.includes(grupo.titulo) ? "rotate-180" : ""}`}
                        />
                      </Button>
                    </h2>
                    {abertos.includes(grupo.titulo) ? (
                      <ul
                        id={`menu-grupo-${grupo.titulo.replace(/\s+/g, "-")}`}
                        className="animate-in fade-in-0 duration-[120ms] motion-reduce:animate-none"
                      >
                        {grupo.itens.map((item) => {
                          const Icon = item.icon;
                          const ativo = itemDeNavegacaoAtivo(caminho, item.to);
                          return (
                            <li key={`${grupo.titulo}-${item.label}`}>
                              <Link
                                to={item.to as never}
                                preload="intent"
                                activeOptions={{ exact: true }}
                                onClick={() => setAberto(false)}
                                className={`drawer-link ${ativo ? "drawer-link-active" : ""}`}
                              >
                                <Icon size={17} strokeWidth={1.8} aria-hidden />
                                <span>{item.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                        {grupo.titulo === "Sistema" ? (
                          <li>
                            <ModeMenuItem />
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </section>
                ) : null,
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Espaço central: só a Agenda desenha a data aqui, no celular. */}
        <div id="topo-centro" className="flex min-w-0 flex-1 justify-center md:hidden" />

        <div className="flex items-center gap-1">
          {caminho === "/barbeiro" || caminho === "/barbeiro/agenda" ? null : <AcoesRapidas />}
          <SinoDeAvisos />
        </div>
      </div>
    </header>
  );
}
