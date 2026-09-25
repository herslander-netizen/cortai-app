import { Link, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  MessageCircle,
  Scissors,
  UserRoundPlus,
  UserX,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentProps } from "react";

import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { comDesfazer } from "@/lib/avisos";
import {
  getAgendaDia,
  getAgoraProximo,
  mudarEstadoAtendimento,
  type AgendaDia,
  type AgendaItem,
  type EstadoAtendimento,
} from "@/lib/barbeiro.functions";
import { hojeNoFuso } from "@/lib/horarios";

const AgendamentoManualLazy = lazy(() =>
  import("@/components/barbeiro/AgendamentoManual").then((m) => ({ default: m.AgendamentoManual })),
);
const FechamentoComandaLazy = lazy(() =>
  import("@/components/financeiro/FechamentoComanda").then((m) => ({ default: m.FechamentoComanda })),
);

const TOLERANCIA_MIN = 15;
const TERMINAIS = new Set(["finalizado", "cancelado", "remarcado", "nao_compareceu"]);

const ESTADO: Record<string, { rotulo: string; classe: string; Icone: typeof Circle }> = {
  agendado: { rotulo: "Agendado", classe: "agenda-status-agendado", Icone: Clock3 },
  chegou: { rotulo: "Chegou", classe: "agenda-status-chegou", Icone: UserRoundPlus },
  na_cadeira: { rotulo: "Na cadeira", classe: "agenda-status-cadeira", Icone: Scissors },
  finalizado: { rotulo: "Finalizado", classe: "agenda-status-finalizado", Icone: Check },
  cancelado: { rotulo: "Cancelado", classe: "agenda-status-falta", Icone: X },
  nao_compareceu: { rotulo: "Não compareceu", classe: "agenda-status-falta", Icone: UserX },
  remarcado: { rotulo: "Remarcado", classe: "agenda-status-agendado", Icone: Clock3 },
};

function somarDias(dia: string, passo: number) {
  const [ano, mes, data] = dia.split("-").map(Number);
  const base = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, data ?? 1));
  base.setUTCDate(base.getUTCDate() + passo);
  return base.toISOString().slice(0, 10);
}

function dataEditorial(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`);
  const semana = data.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "").toUpperCase();
  const resto = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).replace(" de ", " ").replace(".", "").toUpperCase();
  return `${semana} · ${resto}`;
}

function hora(iso: string, fuso?: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso });
}

function minutos(inicio: string | null, agora: number) {
  return inicio ? Math.max(0, Math.floor((agora - new Date(inicio).getTime()) / 60_000)) : 0;
}

function fichaRelevante(texto: string | null) {
  if (!texto) return null;
  const trecho = texto.split(/[.!?\n]/).find((parte) => /alerg/i.test(parte));
  return trecho?.trim() || null;
}

function Status({ status }: { status: string }) {
  const estado = ESTADO[status] ?? ESTADO["agendado"];
  if (!estado) return null;
  const Icone = estado.Icone;
  return (
    <span className={`agenda-status ${estado.classe}`}>
      <Icone aria-hidden size={13} />
      {estado.rotulo}
    </span>
  );
}

function AgendamentoManual(props: ComponentProps<typeof AgendamentoManualLazy>) {
  return (
    <Suspense fallback={<div aria-hidden className="h-11 rounded-lg border border-line bg-ink2" />}>
      <AgendamentoManualLazy {...props} />
    </Suspense>
  );
}

export function AgendaOperacional() {
  const busca = useSearch({ strict: false });
  const acaoInicial = busca["acao"] === "agendamento" || busca["acao"] === "atendimento" || busca["acao"] === "cliente" ? busca["acao"] : undefined;
  const mudarEstado = useServerFn(mudarEstadoAtendimento);
  const queryClient = useQueryClient();
  const [dia, setDia] = useState(() => hojeNoFuso());
  const [fuso, setFuso] = useState<string>();
  const [agora, setAgora] = useState(Date.now());
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [estadosLocais, setEstadosLocais] = useState<Record<string, string>>({});
  const [menuAberto, setMenuAberto] = useState(false);
  const [manualAberto, setManualAberto] = useState<"agendamento" | "atendimento" | null>(acaoInicial === "atendimento" ? "atendimento" : acaoInicial ? "agendamento" : null);
  const [fechando, setFechando] = useState<string | null>(null);
  const [iniciarDepois, setIniciarDepois] = useState<string | null>(null);
  const [conflito, setConflito] = useState<{ atual: AgendaItem; novo: AgendaItem } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ehHoje = dia === hojeNoFuso(fuso);

  const rapido = useQuery({
    queryKey: ["agenda-agora-proximo"],
    queryFn: () => getAgoraProximo(),
    enabled: ehHoje,
    staleTime: 30_000,
  });
  const agenda = useQuery<AgendaDia>({
    queryKey: ["agenda-dia", dia],
    queryFn: () => getAgendaDia({ data: { dia } }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const tenantId = agenda.data?.tenant.id;
  useEffect(() => {
    if (agenda.data?.fuso && agenda.data.fuso !== fuso) setFuso(agenda.data.fuso);
  }, [agenda.data?.fuso, fuso]);
  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!tenantId) return;
    const canal = supabase
      .channel(`agenda-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos", filter: `tenant_id=eq.${tenantId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
        void queryClient.invalidateQueries({ queryKey: ["agenda-agora-proximo"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [tenantId, queryClient]);

  const itens = useMemo(
    () => (agenda.data?.itens ?? []).map((item) => ({ ...item, status: estadosLocais[item.id] ?? item.status })).sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()),
    [agenda.data?.itens, estadosLocais],
  );
  const ativos = itens.filter((item) => item.status === "na_cadeira");
  const futuros = itens.filter((item) => !TERMINAIS.has(item.status) && item.status !== "na_cadeira" && new Date(item.fim).getTime() >= agora);
  const destaques = futuros.slice(0, 2);
  const itemSelecionado = itens.find((item) => item.id === selecionado) ?? null;

  async function sincronizar() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agenda-dia"] }),
      queryClient.invalidateQueries({ queryKey: ["agenda-agora-proximo"] }),
    ]);
  }

  async function transicionar(item: AgendaItem, novo: EstadoAtendimento, oferecerUndo = true) {
    const anterior = item.status as EstadoAtendimento;
    setEstadosLocais((mapa) => ({ ...mapa, [item.id]: novo }));
    setOcupado(true);
    try {
      await mudarEstado({ data: { agendamentoId: item.id, estado: novo } });
      await sincronizar();
      setEstadosLocais((mapa) => { const proximo = { ...mapa }; delete proximo[item.id]; return proximo; });
      if (oferecerUndo) {
        comDesfazer(`${item.cliente}: ${ESTADO[novo]?.rotulo ?? novo}.`, async () => {
          setEstadosLocais((mapa) => ({ ...mapa, [item.id]: anterior }));
          try {
            await mudarEstado({ data: { agendamentoId: item.id, estado: anterior } });
            await sincronizar();
          } finally {
            setEstadosLocais((mapa) => { const proximo = { ...mapa }; delete proximo[item.id]; return proximo; });
          }
        });
      }
    } catch {
      setEstadosLocais((mapa) => { const proximo = { ...mapa }; delete proximo[item.id]; return proximo; });
    } finally {
      setOcupado(false);
    }
  }

  function iniciar(item: AgendaItem) {
    const outro = ativos.find((atual) => atual.id !== item.id);
    if (outro) setConflito({ atual: outro, novo: item });
    else void transicionar(item, "na_cadeira");
  }

  function acaoPrincipal() {
    if (!itemSelecionado) { setMenuAberto(true); return; }
    if (itemSelecionado.status === "na_cadeira") { setFechando(itemSelecionado.id); return; }
    iniciar(itemSelecionado);
  }

  const proximoLivre = futuros[0];
  const diaSemAgenda = !agenda.isLoading && itens.length === 0;

  return (
    <Screen title="Agenda" subtitle={agenda.data?.tenant.nome ?? "Operação do dia"}>
      <div className="pb-28">
        <div className="mb-5 grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2" aria-label="Navegar pelos dias">
          <Button variant="ghost" size="icon" aria-label="Dia anterior" onClick={() => setDia(somarDias(dia, -1))}><ChevronLeft /></Button>
          <div className="min-w-0 text-center">
            <p className="truncate text-base font-extrabold text-paper">{dataEditorial(dia)}</p>
            {!ehHoje ? <Button variant="link" size="sm" className="h-auto min-h-0 p-1 text-xs" onClick={() => setDia(hojeNoFuso(fuso))}>Hoje</Button> : <span className="text-xs font-semibold text-gold">Hoje</span>}
          </div>
          <Button variant="ghost" size="icon" aria-label="Próximo dia" onClick={() => setDia(somarDias(dia, 1))}><ChevronRight /></Button>
        </div>

        {ehHoje && (rapido.isLoading && !agenda.data) ? <EsqueletoAgenda linhas={2} /> : null}

        {ativos.length > 0 ? (
          <section aria-labelledby="agora-titulo" className="mb-6">
            <p id="agora-titulo" className="mb-2 text-[11px] font-bold uppercase text-mute">Agora</p>
            <div className="space-y-2">
              {ativos.map((item) => {
                const decorrido = minutos(item.startedAt ?? item.inicio, agora);
                const estourou = decorrido > item.duracaoMin;
                const alergia = fichaRelevante(item.ficha);
                return (
                  <article key={item.id} className={`agenda-agora ${selecionado === item.id ? "agenda-item-selecionado" : ""}`} onClick={() => setSelecionado(item.id)}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        {item.clienteId ? <Link to="/barbeiro/clientes/$id" params={{ id: item.clienteId }} onClick={(e) => e.stopPropagation()} className="block truncate text-lg font-extrabold text-paper">{item.cliente}</Link> : <p className="truncate text-lg font-extrabold text-paper">{item.cliente}</p>}
                        <p className="mt-0.5 truncate text-sm text-mute">{item.servico} · {item.profissional}</p>
                      </div>
                      <Status status={item.status} />
                    </div>
                    {alergia ? <p className="mt-3 border-l-2 border-brick pl-3 text-xs font-semibold text-paper">{alergia}</p> : null}
                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <progress className={`agenda-progress ${estourou ? "agenda-progress-estourado" : ""}`} max={Math.max(item.duracaoMin, decorrido)} value={decorrido} aria-label={`${decorrido} de ${item.duracaoMin} minutos`} />
                      <span className={`text-xs font-bold ${estourou ? "text-brick" : "text-gold"}`}>{decorrido} / {item.duracaoMin} min</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : ehHoje ? (
          <div className="mb-6 border-y border-line py-4">
            <p className="text-sm font-semibold text-paper">Livre agora{proximoLivre ? ` · próximo às ${hora(proximoLivre.inicio, fuso)}` : ""}</p>
          </div>
        ) : null}

        {destaques.length > 0 ? (
          <section className="mb-6 divide-y divide-line border-y border-line" aria-label="Próximos atendimentos">
            {destaques.map((item, indice) => {
              const fimPrevisto = ativos.length ? Math.max(...ativos.map((atual) => new Date(atual.startedAt ?? atual.inicio).getTime() + atual.duracaoMin * 60_000)) : 0;
              const espera = Math.max(0, Math.ceil((fimPrevisto - new Date(item.inicio).getTime()) / 60_000));
              const telefone = item.telefone?.replace(/\D/g, "") ?? "";
              const mensagem = `Olá, ${item.cliente}! O atendimento anterior atrasou um pouco. A previsão de espera é de cerca de ${espera} minutos. Avisamos assim que liberar.`;
              return (
                <div key={item.id} className="grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div><p className="text-[10px] font-bold uppercase text-mute2">{indice === 0 ? "Próximo" : "Depois"}</p><p className="mt-1 text-sm font-extrabold text-paper">{hora(item.inicio, fuso)}</p></div>
                  <button type="button" className="min-w-0 text-left" onClick={() => setSelecionado(item.id)}>
                    <span className="block truncate text-sm font-semibold text-paper">{item.cliente}</span>
                    <span className="block truncate text-xs text-mute">{item.servico}</span>
                    {espera > 0 ? <span className="mt-1 block text-xs font-semibold text-brick">~{espera} min de espera</span> : null}
                  </button>
                  {espera > 0 && telefone ? <Button asChild variant="outline" size="sm"><a href={`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noreferrer" aria-label={`Avisar ${item.cliente} pelo WhatsApp`}><MessageCircle />Avisar</a></Button> : <Status status={item.status} />}
                </div>
              );
            })}
          </section>
        ) : null}

        <div className="mb-4 grid grid-cols-2 rounded-lg bg-ink3 p-1" role="tablist" aria-label="Visualização da agenda">
          <Button role="tab" aria-selected variant="secondary" size="sm" className="bg-ink2 shadow-sm">Lista</Button>
          <Button role="tab" aria-selected={false} variant="ghost" size="sm" disabled title="Disponível na próxima etapa">Timeline</Button>
        </div>

        {agenda.isLoading ? <EsqueletoAgenda linhas={5} /> : null}
        {diaSemAgenda ? (
          <div className="border-y border-line py-10 text-center">
            <p className="text-base font-bold text-paper">Dia livre — compartilhe seu link</p>
            <Link to="/barbeiro/marca" className="mt-3 inline-block text-sm font-semibold text-gold underline underline-offset-4">Abrir página da barbearia</Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {itens.map((item) => {
              const atrasado = ehHoje && (item.status === "agendado") && agora > new Date(item.inicio).getTime() + TOLERANCIA_MIN * 60_000;
              const selecionada = selecionado === item.id;
              return (
                <li key={item.id} className={`agenda-lista-item ${selecionada ? "agenda-item-selecionado" : ""}`} onClick={() => setSelecionado(selecionada ? null : item.id)}>
                  <div className="grid grid-cols-[54px_minmax(0,1fr)_auto] items-start gap-3">
                    <p className="pt-0.5 text-sm font-extrabold text-paper">{hora(item.inicio, fuso)}</p>
                    <div className="min-w-0">
                      {item.clienteId ? <Link to="/barbeiro/clientes/$id" params={{ id: item.clienteId }} onClick={(e) => e.stopPropagation()} className="block truncate text-sm font-bold text-paper underline-offset-4 hover:underline">{item.cliente}</Link> : <p className="truncate text-sm font-bold text-paper">{item.cliente}</p>}
                      <p className="mt-0.5 truncate text-xs text-mute">{item.servico} · {item.profissional}</p>
                    </div>
                    <Status status={item.status} />
                  </div>
                  {atrasado ? <div className="mt-3 ml-[66px] flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-brick">Não chegou?</span><Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); void transicionar(item, "nao_compareceu"); }}>Marcar falta</Button><Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>Aguardar</Button></div> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="agenda-acao-fixa">
        <Button size="lg" className="h-14 w-full text-base" disabled={ocupado || Boolean(itemSelecionado && TERMINAIS.has(itemSelecionado.status))} onClick={acaoPrincipal}>
          <Scissors />
          {!itemSelecionado ? "Ações da agenda" : itemSelecionado.status === "na_cadeira" ? `Finalizar ${itemSelecionado.cliente}` : `Iniciar ${itemSelecionado.cliente}`}
        </Button>
      </div>

      {menuAberto ? <div className="agenda-folha" role="dialog" aria-modal="true" aria-label="Ações da agenda" onClick={() => setMenuAberto(false)}><div className="agenda-folha-conteudo" onClick={(e) => e.stopPropagation()}><div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h2 className="text-lg font-extrabold text-paper">Ações da agenda</h2><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setMenuAberto(false)}><X /></Button></div><div className="grid gap-2"><Button variant="outline" className="h-12 justify-start" onClick={() => { setMenuAberto(false); setManualAberto("atendimento"); }}><Scissors />Atendimento manual</Button><Button asChild variant="outline" className="h-12 justify-start"><Link to="/barbeiro/fila"><UserRoundPlus />Chamar próximo da fila</Link></Button><Button variant="outline" className="h-12 justify-start" onClick={() => { setMenuAberto(false); setManualAberto("agendamento"); }}><CalendarPlus />Novo agendamento</Button><Button asChild variant="outline" className="h-12 justify-start"><Link to="/barbeiro/horarios"><Clock3 />Bloquear horário</Link></Button></div></div></div> : null}

      {manualAberto ? <div className="hidden"><AgendamentoManual key={manualAberto} dia={dia} autoAbrir rotulo={manualAberto === "atendimento" ? "Atendimento manual" : "Novo agendamento"} onCriado={() => { setManualAberto(null); void sincronizar(); }} /></div> : null}

      <AlertDialog open={Boolean(conflito)} onOpenChange={(aberto) => { if (!aberto) setConflito(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{conflito ? `Finalizar ${conflito.atual.cliente} ou manter os dois?` : "Atendimento aberto"}</AlertDialogTitle><AlertDialogDescription>Você já tem um cliente na cadeira. Escolha como continuar.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { if (conflito) void transicionar(conflito.novo, "na_cadeira"); setConflito(null); }}>Manter os dois</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (conflito) { setIniciarDepois(conflito.novo.id); setFechando(conflito.atual.id); } setConflito(null); }}>Finalizar atual</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {fechando ? <Suspense fallback={<div className="agenda-folha"><EsqueletoAgenda linhas={3} /></div>}><FechamentoComandaLazy agendamentoId={fechando} onFechar={() => { setFechando(null); setIniciarDepois(null); }} onConcluido={() => { const proximo = itens.find((item) => item.id === iniciarDepois); setFechando(null); setIniciarDepois(null); if (proximo) void transicionar(proximo, "na_cadeira"); void sincronizar(); }} /></Suspense> : null}
    </Screen>
  );
}