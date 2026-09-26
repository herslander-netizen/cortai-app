import { Link, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarPlus,
  ChartNoAxesColumn,
  HandCoins,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageCircle,
  Scissors,
  UserRoundPlus,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentProps } from "react";

import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { AgendaTimeline } from "@/components/barbeiro/AgendaTimeline";
import { Screen } from "@/components/layout/Screen";
import { BotaoAjuda } from "@/components/guia/BotaoAjuda";
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
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { aviso, comDesfazer } from "@/lib/avisos";
import {
  getAgendaDia,
  getAgoraProximo,
  mudarEstadoAtendimento,
  type AgendaDia,
  type AgendaItem,
  type EstadoAtendimento,
} from "@/lib/barbeiro.functions";
import { getAguardandoPagamento, getMeuDia } from "@/lib/financeiro.functions";
import { PrimeirosPassos } from "@/components/onboarding/PrimeirosPassos";
import { brl } from "@/lib/format";
import { chamarProximoDaFila, desfazerInicioRapido, getOperacaoFila } from "@/lib/atendimento.functions";
import { hojeNoFuso } from "@/lib/horarios";

const AgendamentoManualLazy = lazy(() =>
  import("@/components/barbeiro/AgendamentoManual").then((m) => ({ default: m.AgendamentoManual })),
);
const AtendimentoRapidoLazy = lazy(() =>
  import("@/components/barbeiro/AtendimentoRapido").then((m) => ({ default: m.AtendimentoRapido })),
);
const FechamentoComandaLazy = lazy(() =>
  import("@/components/financeiro/FechamentoComanda").then((m) => ({ default: m.FechamentoComanda })),
);

const PerfilClienteLazy = lazy(() =>
  import("@/components/cliente-perfil/PerfilClienteSheet").then((m) => ({ default: m.PerfilClienteSheet })),
);

const TOLERANCIA_MIN = 15;
const TERMINAIS = new Set(["finalizado", "cancelado", "remarcado", "nao_compareceu"]);

const ROTULO_ESTADO: Record<string, string> = {
  agendado: "Agendado", chegou: "Chegou", na_cadeira: "Na cadeira", finalizado: "Finalizado",
  cancelado: "Cancelado", nao_compareceu: "Não compareceu", remarcado: "Remarcado",
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

function tempoExcedido(decorrido: number, previsto: number) {
  const excedido = Math.max(0, decorrido - previsto);
  if (excedido < 60) return `+${excedido} min excedido`;
  const horas = Math.floor(excedido / 60);
  const minutosRestantes = excedido % 60;
  return `+${horas}h${String(minutosRestantes).padStart(2, "0")} excedido`;
}

function fichaRelevante(texto: string | null) {
  if (!texto) return null;
  const trecho = texto.split(/[.!?\n]/).find((parte) => /alerg/i.test(parte));
  return trecho?.trim() || null;
}

function nomeEhGenerico(nome: string) {
  return nome.trim().toLocaleLowerCase("pt-BR").startsWith("cliente avulso");
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
  const [manualAberto, setManualAberto] = useState<"agendamento" | null>(acaoInicial && acaoInicial !== "atendimento" ? "agendamento" : null);
  const [rapidoAberto, setRapidoAberto] = useState(acaoInicial === "atendimento");
  const [sugestaoFila, setSugestaoFila] = useState(false);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [profChamada, setProfChamada] = useState<string | null>(null);
  const [fechando, setFechando] = useState<string | null>(null);
  const [iniciarDepois, setIniciarDepois] = useState<string | null>(null);
  const [conflito, setConflito] = useState<{ atual: AgendaItem; novo: AgendaItem } | null>(null);
  const [aguardando, setAguardando] = useState<Set<string>>(() => new Set());
  const [ocupado, setOcupado] = useState(false);
  const [visualizacao, setVisualizacao] = useState<"lista" | "timeline">("lista");
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

  const filaQ = useQuery({ queryKey: ["agenda-fila"], queryFn: () => getOperacaoFila(), staleTime: 30_000, refetchOnWindowFocus: true });
  const aReceberQ = useQuery({ queryKey: ["agenda-a-receber"], queryFn: () => getAguardandoPagamento(), staleTime: 30_000, refetchOnWindowFocus: true });
  const [meuDiaAberto, setMeuDiaAberto] = useState(false);
  const meuDiaQ = useQuery({ queryKey: ["agenda-meu-dia"], queryFn: () => getMeuDia(), staleTime: 60_000, enabled: ehHoje });
  const aReceber = aReceberQ.data ?? [];
  const chegada = filaQ.data?.chegada ?? [];
  const souRecepcao = Boolean(filaQ.data && !filaQ.data.meuProfissionalId);
  const profPadrao = filaQ.data?.profissionais.find((p) => p.livre)?.id ?? filaQ.data?.profissionais[0]?.id ?? null;
  const profEscolhido = profChamada ?? profPadrao;

  const tenantId = agenda.data?.tenant.id;
  useEffect(() => {
    if (agenda.data?.fuso && agenda.data.fuso !== fuso) setFuso(agenda.data.fuso);
  }, [agenda.data?.fuso, fuso]);
  useEffect(() => {
    const atualizar = () => setAgora(Date.now());
    const atraso = 60_000 - (Date.now() % 60_000);
    let timer: number | undefined;
    const alinhamento = window.setTimeout(() => {
      atualizar();
      timer = window.setInterval(atualizar, 60_000);
    }, atraso);
    return () => {
      window.clearTimeout(alinhamento);
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!tenantId) return;
    const canal = supabase
      .channel(`agenda-${tenantId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos", filter: `tenant_id=eq.${tenantId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
        void queryClient.invalidateQueries({ queryKey: ["agenda-agora-proximo"] });
        void queryClient.invalidateQueries({ queryKey: ["agenda-fila"] });
        void queryClient.invalidateQueries({ queryKey: ["agenda-a-receber"] });
        void queryClient.invalidateQueries({ queryKey: ["agenda-meu-dia"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "fila_de_espera", filter: `tenant_id=eq.${tenantId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["agenda-fila"] });
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

  useEffect(() => {
    if (itemSelecionado) setMenuAberto(false);
  }, [itemSelecionado]);

  async function sincronizar() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agenda-dia"] }),
      queryClient.invalidateQueries({ queryKey: ["agenda-agora-proximo"] }),
      queryClient.invalidateQueries({ queryKey: ["agenda-fila"] }),
    ]);
  }

  function oferecerDesfazerInicio(r: { agendamentoId: string; cliente: string; filaId?: string; statusAnterior?: string }) {
    comDesfazer(`${r.cliente}: Na cadeira.`, async () => {
      try {
        await desfazerInicioRapido({ data: { agendamentoId: r.agendamentoId, filaId: r.filaId ?? null, statusAnterior: r.statusAnterior ?? null } });
      } catch {
        aviso.erro("Não foi possível desfazer.");
      }
      await sincronizar();
    });
  }

  async function chamarFila(filaId?: string) {
    setMenuAberto(false);
    setSugestaoFila(false);
    setOcupado(true);
    try {
      const r = await chamarProximoDaFila({ data: { profissionalId: souRecepcao ? profEscolhido : null, filaId: filaId ?? null } });
      setDia(hojeNoFuso(fuso));
      await sincronizar();
      oferecerDesfazerInicio(r);
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não foi possível chamar a fila.");
      await sincronizar();
    } finally {
      setOcupado(false);
    }
  }

  async function transicionar(item: AgendaItem, novo: EstadoAtendimento, oferecerUndo = true) {
    const anterior = item.status as EstadoAtendimento;
    setEstadosLocais((mapa) => ({ ...mapa, [item.id]: novo }));
    setOcupado(true);
    try {
      await mudarEstado({ data: { agendamentoId: item.id, estado: novo } });
      await sincronizar();
      setEstadosLocais((mapa) => { const proximo = { ...mapa }; delete proximo[item.id]; return proximo; });
      if ((novo === "cancelado" || novo === "nao_compareceu") && chegada.length > 0) setSugestaoFila(true);
      if (oferecerUndo) {
        comDesfazer(`${item.cliente}: ${ROTULO_ESTADO[novo] ?? novo}.`, async () => {
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
      aviso.erro("Não foi possível mudar o atendimento. A agenda voltou ao estado anterior.");
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
    if (!itemSelecionado) { setMenuAberto((aberto) => !aberto); return; }
    if (itemSelecionado.status === "na_cadeira") { setFechando(itemSelecionado.id); return; }
    iniciar(itemSelecionado);
  }

  const proximoLivre = futuros[0];
  const diaSemAgenda = !agenda.isLoading && itens.length === 0;

  return (
    <Screen title="Agenda" hideHeader>
      <div className="agenda-operacional pb-32">
        <header className="agenda-cabecalho-compacto">
          <h1 className="sr-only">Agenda</h1>
          <div className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-1" aria-label="Navegar pelos dias">
          <Button variant="ghost" size="icon" aria-label="Dia anterior" onClick={() => setDia(somarDias(dia, -1))}><ChevronLeft /></Button>
          <div className="min-w-0 text-center">
            <p className="truncate text-base font-extrabold text-paper">{dataEditorial(dia)}</p>
            {!ehHoje ? <Button variant="link" size="sm" className="h-auto min-h-0 p-1 text-xs text-mute" onClick={() => setDia(hojeNoFuso(fuso))}>Ir para hoje</Button> : <span className="text-xs font-semibold text-mute">Hoje</span>}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon" aria-label="Próximo dia" onClick={() => setDia(somarDias(dia, 1))}><ChevronRight /></Button>
            <BotaoAjuda />
          </div>
          </div>
        </header>

        {ehHoje && (rapido.isLoading && !agenda.data) ? <EsqueletoAgenda linhas={2} /> : null}

        {ativos.length > 0 ? (
          <section aria-labelledby="agora-titulo" className="mb-6">
            <p id="agora-titulo" className="mb-2 text-xs font-bold uppercase text-mute">Agora</p>
            <div className="space-y-2">
              {ativos.map((item) => {
                const decorrido = minutos(item.startedAt ?? item.inicio, agora);
                const estourou = decorrido > item.duracaoMin;
                const alergia = fichaRelevante(item.ficha);
                return (
                  <Card asChild variant="touchable" key={item.id} className={`agenda-agora ${selecionado === item.id ? "agenda-item-selecionado" : ""}`}>
                  <article onClick={() => setSelecionado(item.id)}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        {item.clienteId ? <Button variant="ghost" type="button" onClick={(e) => { e.stopPropagation(); if (item.clienteId) setPerfil(item.clienteId); }} className={`block h-auto max-w-full justify-start truncate p-0 text-left text-base underline-offset-4 active:underline ${nomeEhGenerico(item.cliente) ? "font-semibold text-mute" : "font-extrabold text-paper"}`}>{item.cliente}</Button> : <p className={`truncate text-base ${nomeEhGenerico(item.cliente) ? "font-semibold text-mute" : "font-extrabold text-paper"}`}>{item.cliente}</p>}
                        <p className="mt-0.5 truncate text-sm text-mute">{item.servico} · {item.profissional}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.clienteId ? (
                          <Button asChild variant="ghost" size="icon" aria-label={`Abrir conversa de ${item.cliente} no WhatsApp`}>
                            <Link to="/barbeiro/cortai" search={{ aba: "conversas", cliente: item.clienteId }} onClick={(e) => e.stopPropagation()}>
                              <MessageCircle />
                            </Link>
                          </Button>
                        ) : null}
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                    {alergia ? <p className="mt-3 border-l-2 border-brick pl-3 text-xs font-semibold text-paper">{alergia}</p> : null}
                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <progress className={`agenda-progress ${estourou ? "agenda-progress-estourado" : ""}`} max={Math.max(item.duracaoMin, decorrido)} value={decorrido} aria-label={`${decorrido} de ${item.duracaoMin} minutos`} />
                      <span className={`agenda-tempo text-xs font-bold ${estourou ? "agenda-tempo-estourado" : ""}`}>{estourou ? tempoExcedido(decorrido, item.duracaoMin) : `${decorrido} de ${item.duracaoMin} min`}</span>
                    </div>
                  </article>
                  </Card>
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
                   <div><p className="text-xs font-bold uppercase text-mute2">{indice === 0 ? "Próximo" : "Depois"}</p><p className="mt-1 text-sm font-extrabold text-paper">{hora(item.inicio, fuso)}</p></div>
                  <Button variant="ghost" type="button" className="min-w-0 text-left" onClick={() => setSelecionado(item.id)}>
                    <span className="block truncate text-sm font-semibold text-paper">{item.cliente}</span>
                    <span className="block truncate text-xs text-mute">{item.servico}</span>
                    {espera > 0 ? <span className="mt-1 block text-xs font-semibold text-brick">~{espera} min de espera</span> : null}
                  </Button>
                  <div className="flex items-center gap-1">
                    {item.clienteId ? (
                      <Button asChild variant="ghost" size="icon" aria-label={`Abrir conversa de ${item.cliente} no WhatsApp`}>
                        <Link to="/barbeiro/cortai" search={{ aba: "conversas", cliente: item.clienteId }}>
                          <MessageCircle />
                        </Link>
                      </Button>
                    ) : null}
                    {espera > 0 && telefone ? <Button asChild variant="secondary" size="sm"><a href={`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noreferrer" aria-label={`Avisar ${item.cliente} pelo WhatsApp`}><MessageCircle />Avisar</a></Button> : <StatusBadge status={item.status} />}
                  </div>
                </div>
              );
            })}
          </section>
        ) : null}

        {chegada.length > 0 ? (
          <section aria-labelledby="fila-titulo" className="mb-6">
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <p id="fila-titulo" className="text-xs font-bold uppercase text-mute">Fila · {chegada.length}</p>
              <Button size="sm" variant="outline" disabled={ocupado} onClick={() => void chamarFila()}><UserRoundPlus />Chamar próximo</Button>
            </div>
            {sugestaoFila ? (
              <div className="agenda-sugestao-fila mb-2">
                <p className="text-sm font-semibold text-paper">Horário liberado. Chamar {chegada[0]?.cliente} da fila?</p>
                <div className="mt-2 flex gap-2"><Button size="sm" disabled={ocupado} onClick={() => void chamarFila()}>Chamar próximo da fila</Button><Button size="sm" variant="ghost" onClick={() => setSugestaoFila(false)}>Agora não</Button></div>
              </div>
            ) : null}
            {souRecepcao && filaQ.data ? (
              <div className="mb-2 flex flex-wrap gap-2" aria-label="Profissional que vai atender">
                {filaQ.data.profissionais.map((p) => (
                  <Button variant="ghost" key={p.id} type="button" className={`agenda-chip ${profEscolhido === p.id ? "agenda-chip-ativo" : ""}`} onClick={() => setProfChamada(p.id)}>{p.nome}{p.livre ? " · livre" : ""}</Button>
                ))}
              </div>
            ) : null}
            <ol className="divide-y divide-line border-y border-line">
              {chegada.map((f, i) => (
                <li key={f.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <span className="text-sm font-extrabold text-mute">{i + 1}</span>
                  <div className="min-w-0">{f.clienteId ? <Button variant="ghost" type="button" onClick={() => { if (f.clienteId) setPerfil(f.clienteId); }} className={`block h-auto max-w-full justify-start truncate p-0 text-left text-sm underline-offset-4 hover:underline ${nomeEhGenerico(f.cliente) ? "font-medium text-mute" : "font-bold text-paper"}`}>{f.cliente}</Button> : <p className={`truncate text-sm ${nomeEhGenerico(f.cliente) ? "font-medium text-mute" : "font-bold text-paper"}`}>{f.cliente}</p>}<p className="truncate text-xs text-mute">{f.servico ?? "Serviço a definir"}</p></div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-mute"><Clock3 aria-hidden size={13} />{minutos(f.criadoEm, agora)} min</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="mb-4 grid grid-cols-2 rounded-lg bg-ink3 p-1" role="tablist" aria-label="Visualização da agenda">
          <Button role="tab" aria-selected={visualizacao === "lista"} variant={visualizacao === "lista" ? "secondary" : "ghost"} size="sm" className={visualizacao === "lista" ? "bg-ink2 shadow-sm" : "text-mute"} onClick={() => setVisualizacao("lista")}>Lista</Button>
          <Button role="tab" aria-selected={visualizacao === "timeline"} variant={visualizacao === "timeline" ? "secondary" : "ghost"} size="sm" className={visualizacao === "timeline" ? "bg-ink2 shadow-sm" : "text-mute"} onClick={() => setVisualizacao("timeline")}>Timeline</Button>
        </div>

        {agenda.isLoading ? <EsqueletoAgenda linhas={5} /> : null}
        {diaSemAgenda ? (
          <div className="border-y border-line py-10 text-center">
            <p className="text-base font-bold text-paper">Dia livre — compartilhe seu link</p>
            <Link to="/barbeiro/marca" className="mt-3 inline-block text-sm font-semibold text-gold underline underline-offset-4">Abrir página da barbearia</Link>
          </div>
        ) : visualizacao === "timeline" ? (
          <AgendaTimeline
            dia={dia}
            fuso={fuso}
            agora={agora}
            itens={itens}
            horarios={agenda.data?.horarios ?? []}
            selecionado={selecionado}
            onSelecionar={(id) => setSelecionado((atual) => atual === id ? null : id)}
            renderStatus={(status) => <StatusBadge status={status} />}
          />
        ) : (
          <ul className="divide-y divide-line">
            {itens.map((item) => {
              const atrasado = ehHoje && item.status === "agendado" && !aguardando.has(item.id) && agora > new Date(item.inicio).getTime() + TOLERANCIA_MIN * 60_000;
              const selecionada = selecionado === item.id;
              return (
                <li key={item.id} className={`agenda-lista-item ${selecionada ? "agenda-item-selecionado" : ""}`} onClick={() => setSelecionado(selecionada ? null : item.id)}>
                  <div className="grid grid-cols-[54px_minmax(0,1fr)_auto] items-start gap-3">
                    <p className="pt-0.5 text-sm font-extrabold text-paper">{hora(item.inicio, fuso)}</p>
                    <div className="min-w-0">
                      {item.clienteId ? <Button variant="ghost" type="button" onClick={(e) => { e.stopPropagation(); if (item.clienteId) setPerfil(item.clienteId); }} className={`block h-auto max-w-full justify-start truncate p-0 text-left text-sm underline-offset-4 hover:underline ${nomeEhGenerico(item.cliente) ? "font-medium text-mute" : "font-bold text-paper"}`}>{item.cliente}</Button> : <p className={`truncate text-sm ${nomeEhGenerico(item.cliente) ? "font-medium text-mute" : "font-bold text-paper"}`}>{item.cliente}</p>}
                      <p className="mt-0.5 truncate text-xs text-mute">{item.servico} · {item.profissional}</p>
                      {(item as { confirmadoEm?: string | null }).confirmadoEm && item.status === "agendado" ? (
                         <p className="status-badge status-badge-confirmado mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold">
                          <Check className="size-3" aria-hidden />Confirmou pelo WhatsApp
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {item.clienteId ? (
                        <Button asChild variant="ghost" size="icon" aria-label={`Abrir conversa de ${item.cliente} no WhatsApp`}>
                          <Link to="/barbeiro/cortai" search={{ aba: "conversas", cliente: item.clienteId }} onClick={(e) => e.stopPropagation()}>
                            <MessageCircle />
                          </Link>
                        </Button>
                      ) : null}
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                  {atrasado ? <div className="mt-3 ml-[66px] flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-brick">Não chegou?</span><Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); void transicionar(item, "nao_compareceu"); }}>Marcar falta</Button><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setAguardando((atuais) => new Set(atuais).add(item.id)); }}>Aguardar</Button></div> : null}
                </li>
              );
            })}
          </ul>
        )}

        {aReceber.length ? (
          <section aria-labelledby="receber-titulo" className="mt-6">
             <p id="receber-titulo" className="mb-2 text-xs font-bold uppercase text-mute">Aguardando pagamento · {aReceber.length}</p>
            <ul className="divide-y divide-line border-y border-line">
              {aReceber.map((c) => (
                <li key={c.id}>
                  <Button variant="ghost" type="button" className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left active:bg-ink2" onClick={() => setFechando(c.agendamentoId)}>
                    <span className="min-w-0"><span className="block truncate text-sm font-bold text-paper">{c.cliente}</span><span className="block truncate text-xs text-mute">{c.profissional} · #{c.numero}{c.pix ? " · Pix a confirmar" : ""}</span></span>
                     <span className="money-value flex items-center gap-2 text-sm text-paper"><HandCoins aria-hidden className="size-4" />{brl(c.total)}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {ehHoje && meuDiaQ.data ? (
          <section className="mt-6 border-t border-line pt-2">
            <Button variant="ghost" type="button" aria-expanded={meuDiaAberto} className="flex min-h-12 w-full items-center justify-between gap-3 text-left" onClick={() => setMeuDiaAberto((v) => !v)}>
              <span className="flex items-center gap-2 text-sm font-bold text-paper"><ChartNoAxesColumn aria-hidden className="size-4" />Meu dia</span>
              <span className="text-xs text-mute">{meuDiaQ.data.atendimentos} atend. · {brl(meuDiaQ.data.vendido)}</span>
            </Button>
            {meuDiaAberto ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pb-3 text-sm">
                <div><dt className="text-xs text-mute">Atendimentos hoje</dt><dd className="text-lg font-extrabold text-paper">{meuDiaQ.data.atendimentos}</dd></div>
                <div><dt className="text-xs text-mute">Vendido (caixa)</dt><dd className="money-value text-lg text-paper">{brl(meuDiaQ.data.vendido)}</dd></div>
                {meuDiaQ.data.temComissao ? <div><dt className="text-xs text-mute">Comissão estimada</dt><dd className="money-value text-lg text-paper">{brl(meuDiaQ.data.comissao)}</dd></div> : null}
                {meuDiaQ.data.fiado ? <div><dt className="text-xs text-mute">No fiado</dt><dd className="money-value text-lg text-paper">{brl(meuDiaQ.data.fiado)}</dd></div> : null}
                {meuDiaQ.data.noPlano ? <div><dt className="text-xs text-mute">Pelo plano</dt><dd className="text-lg font-extrabold text-paper">{meuDiaQ.data.noPlano}</dd></div> : null}
              </dl>
            ) : null}
          </section>
        ) : null}

        {ehHoje ? <PrimeirosPassos /> : null}
      </div>

      <div className="agenda-acao-fixa">
        <Button
          size="lg"
          variant="primary"
          aria-label={!itemSelecionado ? "Ações da agenda" : undefined}
          aria-expanded={!itemSelecionado ? menuAberto : undefined}
          className={`${itemSelecionado ? "agenda-acao-nomeada" : "agenda-acao-redonda"} ${menuAberto ? "pointer-events-none invisible" : ""}`}
          tabIndex={menuAberto ? -1 : undefined}
          aria-hidden={menuAberto || undefined}
          disabled={ocupado || Boolean(itemSelecionado && TERMINAIS.has(itemSelecionado.status))}
          onClick={acaoPrincipal}
        >
          <Scissors />
          {itemSelecionado ? (itemSelecionado.status === "na_cadeira" ? `Finalizar ${itemSelecionado.cliente}` : `Iniciar ${itemSelecionado.cliente}`) : null}
        </Button>
      </div>

      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="bottom" className="agenda-acoes-folha mx-auto w-full max-w-[520px] rounded-t-xl border-line bg-ink2 px-5 pt-5">
          <SheetClose asChild>
            <Button type="button" size="lg" variant="primary" aria-label="Fechar ações da agenda" aria-expanded="true" className="agenda-acao-redonda agenda-acao-fechar">
              <Scissors />
            </Button>
          </SheetClose>
          <SheetHeader className="pr-10 text-left">
            <SheetTitle className="text-base text-paper">Ações da agenda</SheetTitle>
            <SheetDescription className="text-xs text-mute">Escolha o que precisa fazer agora.</SheetDescription>
          </SheetHeader>
          <div className="mt-3 divide-y divide-line" role="menu" aria-label="Ações da agenda">
            <Button variant="ghost" role="menuitem" className="agenda-acao-lista" onClick={() => { setMenuAberto(false); setManualAberto("agendamento"); }}><CalendarPlus /><span><strong>Novo agendamento</strong><small>Marcar dia, horário e profissional</small></span></Button>
            <Button variant="ghost" role="menuitem" className="agenda-acao-lista" onClick={() => { setMenuAberto(false); setRapidoAberto(true); }}><Scissors /><span><strong>Novo atendimento</strong><small>Atender uma pessoa sem horário</small></span></Button>
            {chegada.length > 0 ? <Button variant="ghost" role="menuitem" className="agenda-acao-lista" disabled={ocupado} onClick={() => void chamarFila()}><UserRoundPlus /><span><strong>Chamar próximo da fila</strong><small>{chegada[0]?.cliente} está aguardando</small></span></Button> : null}
            <Button asChild variant="ghost" role="menuitem" className="agenda-acao-lista"><Link to="/barbeiro/horarios" onClick={() => setMenuAberto(false)}><Clock3 /><span><strong>Bloquear horário</strong><small>Reservar um período da agenda</small></span></Link></Button>
          </div>
        </SheetContent>
      </Sheet>

      {manualAberto ? <div className="agenda-manual-auto"><AgendamentoManual key={manualAberto} dia={dia} autoAbrir rotulo="Novo agendamento" onCriado={() => { setManualAberto(null); void sincronizar(); }} /></div> : null}

      {rapidoAberto ? <Suspense fallback={<div className="agenda-folha"><div className="agenda-folha-conteudo"><EsqueletoAgenda linhas={3} /></div></div>}><AtendimentoRapidoLazy onFechar={() => setRapidoAberto(false)} onIniciado={(r) => { setRapidoAberto(false); setDia(hojeNoFuso(fuso)); void sincronizar(); oferecerDesfazerInicio(r); }} /></Suspense> : null}

      <AlertDialog open={Boolean(conflito)} onOpenChange={(aberto) => { if (!aberto) setConflito(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{conflito ? `Finalizar ${conflito.atual.cliente} ou manter os dois?` : "Atendimento aberto"}</AlertDialogTitle><AlertDialogDescription>Você já tem um cliente na cadeira. Escolha como continuar.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { if (conflito) void transicionar(conflito.novo, "na_cadeira"); setConflito(null); }}>Manter os dois</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (conflito) { setIniciarDepois(conflito.novo.id); setFechando(conflito.atual.id); } setConflito(null); }}>Finalizar atual</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {fechando ? <Suspense fallback={<div className="agenda-folha"><EsqueletoAgenda linhas={3} /></div>}><FechamentoComandaLazy agendamentoId={fechando} onFechar={() => { setFechando(null); setIniciarDepois(null); }} onConcluido={() => { const proximo = itens.find((item) => item.id === iniciarDepois); setFechando(null); setIniciarDepois(null); setSelecionado(null); if (proximo) void transicionar(proximo, "na_cadeira"); void sincronizar(); void queryClient.invalidateQueries({ queryKey: ["agenda-a-receber"] }); void queryClient.invalidateQueries({ queryKey: ["agenda-meu-dia"] }); }} /></Suspense> : null}
      {perfil ? <Suspense fallback={null}><PerfilClienteLazy clienteId={perfil} onFechar={() => setPerfil(null)} /></Suspense> : null}
    </Screen>
  );
}