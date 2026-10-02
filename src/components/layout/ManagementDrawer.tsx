import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, CreditCard, LifeBuoy, Settings, type LucideIcon } from "lucide-react";
import { alternarGrupo, comGrupoAtual, gruposAbertosSalvos, salvarGruposAbertos } from "@/lib/grupos-do-menu";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SinoDeAvisos } from "@/components/notificacoes/SinoDeAvisos";
import { IconeCortai } from "@/components/marca/MarcaCortai";
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
import { aplicarIdentidade, aplicarModo, identidadeValida, MODE_KEY } from "@/lib/aparencia";
import {
  GRUPOS_DE_NAVEGACAO,
  itemDeNavegacaoAtivo,
  itensDaBarra,
  modulosDeNavegacao,
} from "@/lib/navegacao-barbeiro";

type ItemDoMenu = {
  label: string;
  to: string;
  icon: LucideIcon;
  permissao?: ChaveDePermissao;
  rotaDaCapacidade?: string;
};

export function ManagementHeader() {
  const [aberto, setAberto] = useState(false);
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

  useEffect(() => {
    aplicarIdentidade(identidadeValida(sessao?.identidadeApp));
    if (sessao?.tenantModo && !window.localStorage.getItem(MODE_KEY))
      aplicarModo(sessao.tenantModo, true);
  }, [sessao?.identidadeApp, sessao?.tenantModo]);
  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener("cortai:abrir-menu", abrir);
    return () => window.removeEventListener("cortai:abrir-menu", abrir);
  }, []);
  useEffect(() => {
    definirFusoDasTelas(sessao?.tenantFuso);
  }, [sessao?.tenantFuso]);

  const grupos = useMemo(() => {
    const modulos = modulosDeNavegacao(sessao?.segmento ?? "outro");
    const naBarra = itensDaBarra(sessao?.permissoes).map((b) => b.to as string);
    const operacionais = GRUPOS_DE_NAVEGACAO.map((titulo) => ({
      titulo,
      itens: modulos
        .filter((item) => item.grupo === titulo && !naBarra.includes(item.to))
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
  }, [capacidades, sessao?.permissoes, sessao?.segmento]);

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
              className="h-11 w-11 rounded-full p-0 hover:bg-ink3"
              aria-label="Abrir navegação"
            >
              <IconeCortai className="h-10 w-10 rounded-full" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="management-drawer w-[88vw] max-w-[360px] border-line bg-ink2 p-0 duration-200"
          >
            <div className="border-b border-line px-5 pb-4 pt-5 pr-12">
              <SheetTitle className="truncate text-base text-paper">
                {sessao?.tenantNome ?? "Meu negócio"}
              </SheetTitle>
              <SheetDescription className="mt-1 truncate text-xs text-mute">
                {sessao?.nome ?? "Conta conectada"} · {rotuloDoPapel(sessao?.papelNaEquipe)}
              </SheetDescription>
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
                        aria-controls={`menu-grupo-${grupo.titulo}`}
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
                      id={`menu-grupo-${grupo.titulo}`}
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

        <div className="flex items-center gap-1">
          {caminho === "/barbeiro" || caminho === "/barbeiro/agenda" ? null : <AcoesRapidas />}
          <SinoDeAvisos />
        </div>
      </div>
    </header>
  );
}
