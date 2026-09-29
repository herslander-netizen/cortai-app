import { Link, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
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
  ListOrdered,
  Ban,
} from "lucide-react";
import type React from "react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";

import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { AgendaTimeline } from "@/components/barbeiro/AgendaTimeline";
import { AgendaSemana } from "@/components/barbeiro/AgendaSemana";
import { AgendaFocoMobile } from "@/components/barbeiro/AgendaFocoMobile";
import { useIsMobile } from "@/hooks/use-mobile";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { aviso, comDesfazer } from "@/lib/avisos";
import {
  getAgendaDia,
  getAgoraProximo,
  mudarEstadoAtendimento,
  moverAgendamentoPainel,
  type AgendaDia,
  type AgendaItem,
  type EstadoAtendimento,
} from "@/lib/barbeiro.functions";
import { getAguardandoPagamento, getMeuDia } from "@/lib/financeiro.functions";
import { PrimeirosPassos } from "@/components/onboarding/PrimeirosPassos";
import { brl } from "@/lib/format";
import {
  chamarProximoDaFila,
  desfazerInicioRapido,
  getOperacaoFila,
} from "@/lib/atendimento.functions";
import { hojeNoFuso } from "@/lib/horarios";

const AgendamentoManualLazy = lazy(() =>
  import("@/components/barbeiro/AgendamentoManual").then((m) => ({ default: m.AgendamentoManual })),
);
const AtendimentoRapidoLazy = lazy(() =>
  import("@/components/barbeiro/AtendimentoRapido").then((m) => ({ default: m.AtendimentoRapido })),
);
const FechamentoComandaLazy = lazy(() =>
  import("@/components/financeiro/FechamentoComanda").then((m) => ({
    default: m.FechamentoComanda,
  })),
);

const PerfilClienteLazy = lazy(() =>
  import("@/components/cliente-perfil/PerfilClienteSheet").then((m) => ({
    default: m.PerfilClienteSheet,
  })),
);

const TOLERANCIA_MIN = 15;
const TERMINAIS = new Set(["finalizado", "cancelado", "remarcado", "nao_compareceu"]);

const ROTULO_ESTADO: Record<string, string> = {
  agendado: "Agendado",
  chegou: "Chegou",
  na_cadeira: "Na cadeira",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
  remarcado: "Remarcado",
};

function somarDias(dia: string, passo: number) {
  const [ano, mes, data] = dia.split("-").map(Number);
  const base = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, data ?? 1));
  base.setUTCDate(base.getUTCDate() + passo);
  return base.toISOString().slice(0, 10);
}

function dataEditorial(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`);
  const semana = data
    .toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
    .replace(".", "")
    .toUpperCase();
  const resto = data
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })
    .replace(" de ", " ")
    .replace(".", "")
    .toUpperCase();
  return `${semana} · ${resto}`;
}

function hora(iso: string, fuso?: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  });
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
    <Suspense fallback={<div aria-hidden className="h-11 surface" />}>
      <AgendamentoManualLazy {...props} />
    </Suspense>
  );
}

function useEhDesktop() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const f = () => setV(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return v;
}

export function AgendaOperacional() {
  const busca = useSearch({ strict: false });
  const acaoInicial =
    busca["acao"] === "agendamento" ||
    busca["acao"] === "atendimento" ||
    busca["acao"] === "cliente"
      ? busca["acao"]
      : undefined;
  const mudarEstado = useServerFn(mudarEstadoAtendimento);
  const moverAgendamento = useServerFn(moverAgendamentoPainel);
  const queryClient = useQueryClient();
  const [dia, setDia] = useState(() => hojeNoFuso());
  const [fuso, setFuso] = useState<string>("America/Sao_Paulo");
  const [agora, setAgora] = useState(Date.now());
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [estadosLocais, setEstadosLocais] = useState<Record<string, string>>({});
  const [menuAberto, setMenuAberto] = useState(false);
  const [manualAberto, setManualAberto] = useState<"agendamento" | null>(
    acaoInicial && acaoInicial !== "atendimento" ? "agendamento" : null,
  );
  const [rapidoAberto, setRapidoAberto] = useState(acaoInicial === "atendimento");
  const [sugestaoFila, setSugestaoFila] = useState(false);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [profChamada, setProfChamada] = useState<string | null>(null);
  const [fechando, setFechando] = useState<string | null>(null);
  const [iniciarDepois, setIniciarDepois] = useState<string | null>(null);
  const [conflito, setConflito] = useState<{ atual: AgendaItem; novo: AgendaItem } | null>(null);
  const [aguardando, setAguardando] = useState<Set<string>>(() => new Set());
  const [ocupado, setOcupado] = useState(false);
  const [visualizacao, setVisualizacao] = useState<"lista" | "timeline" | "semana">("timeline");
  const celular = useIsMobile();
  const [profVazio, setProfVazio] = useState<string | null>(null);
  const [filaAberta, setFilaAberta] = useState(false);
  const [profFiltro, setProfFiltro] = useState<string | null>(null);
  const filtroInicial = useRef(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const [horaVazia, setHoraVazia] = useState<string | undefined>();
  const [remarcarHora, setRemarcarHora] = useState("");
  const [novos, setNovos] = useState<Set<string>>(() => new Set());
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const idsConhecidos = useRef<{ dia: string; ids: Set<string> } | null>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const ehHoje = dia === hojeNoFuso(fuso);
  const ehDesktop = useEhDesktop();

  const rapido = useQuery({
    queryKey: ["agenda-agora-proximo"],
    queryFn: () => getAgoraProximo(),
    enabled: ehHoje,
    staleTime: 30_000,
  });
  const agenda = useQuery<AgendaDia>({
    queryKey: ["agenda-dia", dia],
    queryFn: async () => {
      try {
        const dados = await getAgendaDia({ data: { dia } });
        window.localStorage.setItem("cortai-agenda-tenant-atual", dados.tenant.id);
        window.localStorage.setItem(
          `cortai-agenda-cache:${dados.tenant.id}:${dia}`,
          JSON.stringify(dados),
        );
        return dados;
      } catch (erro) {
        const tenantAtual = window.localStorage.getItem("cortai-agenda-tenant-atual");
        const salvo = tenantAtual
          ? window.localStorage.getItem(`cortai-agenda-cache:${tenantAtual}:${dia}`)
          : null;
        if (salvo) return JSON.parse(salvo) as AgendaDia;
        throw erro;
      }
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });
  const segmentoAgenda = agenda.data?.tenant.segmento ?? "barbearia";
  const rotuloAtendimento = segmentoAgenda === "barbearia" ? "Na cadeira" : "Em atendimento";

  const filaQ = useQuery({
    queryKey: ["agenda-fila"],
    queryFn: () => getOperacaoFila(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const aReceberQ = useQuery({
    queryKey: ["agenda-a-receber"],
    queryFn: () => getAguardandoPagamento(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const [meuDiaAberto, setMeuDiaAberto] = useState(false);
  const meuDiaQ = useQuery({
    queryKey: ["agenda-meu-dia"],
    queryFn: () => getMeuDia(),
    staleTime: 60_000,
    enabled: ehHoje,
  });
  const aReceber = aReceberQ.data ?? [];
  const chegada = filaQ.data?.chegada ?? [];
  const souRecepcao = Boolean(filaQ.data && !filaQ.data.meuProfissionalId);
  const profPadrao =
    filaQ.data?.profissionais.find((p) => p.livre)?.id ?? filaQ.data?.profissionais[0]?.id ?? null;
  const profEscolhido = profChamada ?? profPadrao;

  const tenantId = agenda.data?.tenant.id;
  useEffect(() => {
    const conectar = () => {
      setOnline(true);
      void queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
    };
    const desconectar = () => setOnline(false);
    window.addEventListener("online", conectar);
    window.addEventListener("offline", desconectar);
    return () => {
      window.removeEventListener("online", conectar);
      window.removeEventListener("offline", desconectar);
    };
  }, [queryClient]);
  // Troca de barbearia: apaga o cache offline da anterior para não misturar dados.
  useEffect(() => {
    if (!tenantId) return;
    try {
      const anterior = window.localStorage.getItem("cortai-agenda-tenant-atual");
      if (anterior && anterior !== tenantId) {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith(`cortai-agenda-cache:${anterior}:`))
          .forEach((k) => window.localStorage.removeItem(k));
      }
      window.localStorage.setItem("cortai-agenda-tenant-atual", tenantId);
    } catch {
      /* cache opcional */
    }
  }, [tenantId]);
  useEffect(() => {
    idsConhecidos.current = null;
  }, [dia]);
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
    let invalidacao: number | undefined;
    let agendaPendente = false;
    const reagendar = (incluiAgenda: boolean) => {
      agendaPendente ||= incluiAgenda;
      if (invalidacao !== undefined) window.clearTimeout(invalidacao);
      invalidacao = window.setTimeout(() => {
        if (agendaPendente) {
          void queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
          void queryClient.invalidateQueries({ queryKey: ["agenda-agora-proximo"] });
          void queryClient.invalidateQueries({ queryKey: ["agenda-a-receber"] });
          void queryClient.invalidateQueries({ queryKey: ["agenda-meu-dia"] });
        }
        void queryClient.invalidateQueries({ queryKey: ["agenda-fila"] });
        agendaPendente = false;
      }, 250);
    };
    const canal = supabase
      .channel(`agenda-${tenantId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos", filter: `tenant_id=eq.${tenantId}` },
        () => reagendar(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fila_de_espera",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => reagendar(false),
      )
      .subscribe();
    return () => {
      if (invalidacao !== undefined) window.clearTimeout(invalidacao);
      void supabase.removeChannel(canal);
    };
  }, [tenantId, queryClient]);

  // Link direto de aviso: /barbeiro/agenda?agendamento=<id> vai ao dia e abre o painel.
  const alvoLink =
    typeof busca["agendamento"] === "string" ? (busca["agendamento"] as string) : null;
  const linkTratado = useRef<string | null>(null);
  useEffect(() => {
    if (!alvoLink || linkTratado.current === alvoLink || !agenda.data) return;
    if (agenda.data.itens.some((i) => i.id === alvoLink)) {
      linkTratado.current = alvoLink;
      abrir(alvoLink);
      return;
    }
    let ativo = true;
    void supabase
      .from("agendamentos")
      .select("inicio")
      .eq("id", alvoLink)
      .maybeSingle()
      .then(({ data }) => {
        if (!ativo || !data?.inicio) {
          linkTratado.current = alvoLink;
          return;
        }
        const diaAlvo = new Intl.DateTimeFormat("en-CA", {
          timeZone: agenda.data?.fuso || "America/Sao_Paulo",
        }).format(new Date(data.inicio));
        if (diaAlvo !== dia) setDia(diaAlvo);
        else linkTratado.current = alvoLink;
      });
    return () => {
      ativo = false;
    };
  }, [alvoLink, agenda.data, dia]);

  const profissionaisDoDia = useMemo(
    () =>
      [
        ...new Set(
          (agenda.data?.itens ?? [])
            .map((item) => item.profissional)
            .filter((nome) => nome && nome !== "—"),
        ),
      ].sort(),
    [agenda.data?.itens],
  );
  // Barbeiro vê a própria agenda por padrão; dono/recepção vê todos.
  const meuNome =
    filaQ.data?.profissionais.find((p) => p.id === filaQ.data?.meuProfissionalId)?.nome ?? null;
  useEffect(() => {
    if (filtroInicial.current || !filaQ.data) return;
    filtroInicial.current = true;
    if (meuNome) setProfFiltro(meuNome);
  }, [filaQ.data, meuNome]);
  const itens = useMemo(
    () =>
      (agenda.data?.itens ?? [])
        .filter((item) => !profFiltro || item.profissional === profFiltro)
        .map((item) => ({ ...item, status: estadosLocais[item.id] ?? item.status }))
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()),
    [agenda.data?.itens, estadosLocais, profFiltro],
  );
  useEffect(() => {
    const lista = agenda.data?.itens;
    if (!lista || agenda.isPlaceholderData) return;
    const ids = new Set(lista.map((i) => i.id));
    const antes = idsConhecidos.current;
    idsConhecidos.current = { dia, ids };
    if (!antes || antes.dia !== dia) return;
    const chegaram = [...ids].filter((id) => !antes.ids.has(id));
    if (!chegaram.length) return;
    setNovos((atual) => new Set([...atual, ...chegaram]));
    const t = window.setTimeout(
      () =>
        setNovos((atual) => {
          const n = new Set(atual);
          chegaram.forEach((id) => n.delete(id));
          return n;
        }),
      4000,
    );
    return () => window.clearTimeout(t);
  }, [agenda.data?.itens, agenda.isPlaceholderData, dia]);
  const semana = useMemo(() => {
    const dow = (new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, i) => somarDias(dia, i - dow));
  }, [dia]);
  const agendadosDia = itens.filter(
    (item) => !TERMINAIS.has(item.status) || item.status === "finalizado",
  ).length;
  // Horários livres (blocos de 30 min) do profissional em foco, a partir de agora.
  const livres = useMemo(() => {
    if (!profFiltro && profissionaisDoDia.length > 1) return null;
    const dow = new Date(`${dia}T12:00:00Z`).getUTCDay();
    const h = (agenda.data?.horarios ?? []).find((x) => x.diaSemana === dow && !x.fechado);
    if (!h) return null;
    const minDe = (v: string) => {
      const [a = 0, b = 0] = v.split(":").map(Number);
      return a * 60 + b;
    };
    const minNoFuso = (v: string | number) => {
      const p = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: fuso,
      }).formatToParts(new Date(v));
      return (
        Number(p.find((x) => x.type === "hour")?.value ?? 0) * 60 +
        Number(p.find((x) => x.type === "minute")?.value ?? 0)
      );
    };
    const ocupados = itens
      .filter((i) => !["cancelado", "remarcado", "nao_compareceu"].includes(i.status))
      .map((i) => [minNoFuso(i.inicio), minNoFuso(i.fim)] as const);
    let ini = minDe(h.abre);
    const fim = minDe(h.fecha);
    if (ehHoje) ini = Math.max(ini, Math.ceil(minNoFuso(agora) / 30) * 30);
    let n = 0;
    for (let m = ini; m + 30 <= fim; m += 30)
      if (!ocupados.some(([a, b]) => m < b && m + 30 > a)) n++;
    return n;
  }, [
    agenda.data?.horarios,
    agora,
    dia,
    ehHoje,
    fuso,
    itens,
    profFiltro,
    profissionaisDoDia.length,
  ]);
  const resumo = `${agendadosDia} ${agendadosDia === 1 ? "agendado" : "agendados"}${livres !== null ? ` · ${livres} ${livres === 1 ? "livre" : "livres"}` : ""}${chegada.length ? ` · ${chegada.length} na fila` : ""}`;
  const ativos = itens.filter((item) => item.status === "na_cadeira");
  const futuros = itens.filter(
    (item) =>
      !TERMINAIS.has(item.status) &&
      item.status !== "na_cadeira" &&
      new Date(item.fim).getTime() >= agora,
  );
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

  function oferecerDesfazerInicio(r: {
    agendamentoId: string;
    cliente: string;
    filaId?: string;
    statusAnterior?: string;
  }) {
    comDesfazer(`${r.cliente}: ${rotuloAtendimento}.`, async () => {
      try {
        await desfazerInicioRapido({
          data: { agendamentoId: r.agendamentoId, filaId: r.filaId ?? null },
        });
      } catch (e) {
        aviso.erro(e instanceof Error ? e.message : "Não foi possível desfazer.");
      }
      await sincronizar();
    });
  }

  async function chamarFila(filaId?: string) {
    setMenuAberto(false);
    setSugestaoFila(false);
    setOcupado(true);
    try {
      const r = await chamarProximoDaFila({
        data: { profissionalId: souRecepcao ? profEscolhido : null, filaId: filaId ?? null },
      });
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
    let pedido: Promise<unknown> | null = null;
    // Otimista: "Desfazer" aparece no toque; desfazer espera o pedido original terminar.
    if (oferecerUndo) {
      comDesfazer(
        `${item.cliente}: ${novo === "na_cadeira" ? rotuloAtendimento : (ROTULO_ESTADO[novo] ?? novo)}.`,
        async () => {
          setEstadosLocais((mapa) => ({ ...mapa, [item.id]: anterior }));
          try {
            if (pedido) await pedido.catch(() => undefined);
            await mudarEstado({
              data: { agendamentoId: item.id, estado: anterior, estadoAnterior: novo },
            });
            await sincronizar();
          } finally {
            setEstadosLocais((mapa) => {
              const proximo = { ...mapa };
              delete proximo[item.id];
              return proximo;
            });
          }
        },
      );
    }
    try {
      pedido = mudarEstado({
        data: { agendamentoId: item.id, estado: novo, estadoAnterior: anterior },
      });
      await pedido;
      await sincronizar();
      setEstadosLocais((mapa) =>
        mapa[item.id] === novo
          ? (() => {
              const proximo = { ...mapa };
              delete proximo[item.id];
              return proximo;
            })()
          : mapa,
      );
      if ((novo === "cancelado" || novo === "nao_compareceu") && chegada.length > 0)
        setSugestaoFila(true);
    } catch {
      setEstadosLocais((mapa) => {
        const proximo = { ...mapa };
        delete proximo[item.id];
        return proximo;
      });
      toast.dismiss();
      aviso.erro("Não foi possível mudar o atendimento. A agenda voltou ao estado anterior.");
    } finally {
      setOcupado(false);
    }
  }

  function iniciar(item: AgendaItem) {
    const outro = ativos.find((atual) => atual.id !== item.id);
    if (outro) {
      if (import.meta.env.DEV)
        console.info("[agenda] conflito: já há cliente na cadeira", {
          atual: outro.id,
          novo: item.id,
        });
      setConflito({ atual: outro, novo: item });
    } else void transicionar(item, "na_cadeira");
  }

  function abrir(id: string | null) {
    setSelecionado(id);
    setPainelAberto(Boolean(id));
  }

  async function mover(item: AgendaItem, deltaMin: number, desfazivel = true) {
    const novoInicio = new Date(new Date(item.inicio).getTime() + deltaMin * 60_000).toISOString();
    queryClient.setQueryData<AgendaDia>(["agenda-dia", dia], (atual) =>
      atual
        ? {
            ...atual,
            itens: atual.itens.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    inicio: novoInicio,
                    fim: new Date(new Date(i.fim).getTime() + deltaMin * 60_000).toISOString(),
                  }
                : i,
            ),
          }
        : atual,
    );
    try {
      await moverAgendamento({ data: { agendamentoId: item.id, novoInicio } });
      if (desfazivel)
        comDesfazer(`Remarcado · ${item.cliente} às ${hora(novoInicio, fuso)}`, async () => {
          await mover(
            {
              ...item,
              inicio: novoInicio,
              fim: new Date(new Date(item.fim).getTime() + deltaMin * 60_000).toISOString(),
            },
            -deltaMin,
            false,
          );
        });
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não foi possível remarcar.");
    } finally {
      await sincronizar();
    }
  }

  function acaoPrincipal() {
    if (!itemSelecionado) {
      setMenuAberto((aberto) => !aberto);
      return;
    }
    if (itemSelecionado.status === "na_cadeira") {
      setFechando(itemSelecionado.id);
      return;
    }
    iniciar(itemSelecionado);
  }

  const proximoLivre = futuros[0];
  const diaSemAgenda = !agenda.isLoading && itens.length === 0;

  if (celular) {
    return (
      <Screen title="Agenda" hideHeader wide>
        <AgendaFocoMobile
          dia={dia}
          hoje={ehHoje}
          fuso={fuso}
          agora={agora}
          itens={itens}
          profissional={profFiltro}
          profissionais={profissionaisDoDia}
          online={online}
          ocupado={ocupado}
          onDia={setDia}
          onProfissional={setProfFiltro}
          onChegou={(item) => void transicionar(item, "chegou")}
          onComecar={iniciar}
          onTerminar={(item) => setFechando(item.id)}
          onMaisOpcoes={(item) => abrir(item.id)}
          fila={chegada.length}
          onChamarFila={() => void chamarFila()}
        />
        <Sheet
          open={painelAberto && Boolean(itemSelecionado)}
          onOpenChange={(v) => {
            setPainelAberto(v);
            if (!v) setRemarcarHora("");
          }}
        >
          <SheetContent
            side="bottom"
            className="agenda-painel mx-auto w-full max-w-[520px] rounded-t-xl border-line bg-ink2 px-5 pt-5"
          >
            {itemSelecionado ? (
              <>
                <SheetHeader className="pr-10 text-left">
                  <SheetTitle className="truncate text-lg text-paper">
                    {itemSelecionado.cliente}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-mute">
                    {hora(itemSelecionado.inicio, fuso)} · {itemSelecionado.servico} ·{" "}
                    {itemSelecionado.profissional}
                  </SheetDescription>
                  <div>
                    <StatusBadge status={itemSelecionado.status} />
                  </div>
                </SheetHeader>
                <div className="agenda-painel-acoes mt-4">
                  {itemSelecionado.status === "agendado" ? (
                    <Button
                      variant="outline"
                      disabled={ocupado || !online}
                      onClick={() => {
                        setPainelAberto(false);
                        void transicionar(itemSelecionado, "chegou");
                      }}
                    >
                      <UserRoundPlus />
                      Chegou
                    </Button>
                  ) : null}
                  {itemSelecionado.status === "agendado" || itemSelecionado.status === "chegou" ? (
                    <Button
                      variant="outline"
                      disabled={ocupado || !online}
                      onClick={() => {
                        setPainelAberto(false);
                        iniciar(itemSelecionado);
                      }}
                    >
                      <Scissors />
                      Iniciar
                    </Button>
                  ) : null}
                  {itemSelecionado.status === "na_cadeira" ? (
                    <Button
                      variant="outline"
                      disabled={!online}
                      onClick={() => {
                        setPainelAberto(false);
                        setFechando(itemSelecionado.id);
                      }}
                    >
                      <Check />
                      Concluir
                    </Button>
                  ) : null}
                  {itemSelecionado.status === "agendado" || itemSelecionado.status === "chegou" ? (
                    <Button
                      variant="outline"
                      disabled={!online}
                      onClick={() => setRemarcarHora(hora(itemSelecionado.inicio, fuso))}
                    >
                      <CalendarPlus />
                      Remarcar
                    </Button>
                  ) : null}
                  {itemSelecionado.status === "agendado" || itemSelecionado.status === "chegou" ? (
                    <Button
                      variant="outline"
                      disabled={ocupado || !online}
                      onClick={() => {
                        setPainelAberto(false);
                        void transicionar(itemSelecionado, "nao_compareceu");
                      }}
                    >
                      <Clock3 />
                      Falta
                    </Button>
                  ) : null}
                  {itemSelecionado.status === "agendado" || itemSelecionado.status === "chegou" ? (
                    <Button
                      variant="outline"
                      disabled={ocupado || !online}
                      onClick={() => {
                        setPainelAberto(false);
                        void transicionar(itemSelecionado, "cancelado");
                      }}
                    >
                      <Ban />
                      Cancelar
                    </Button>
                  ) : null}
                  {itemSelecionado.clienteId ? (
                    <Button asChild variant="outline">
                      <Link
                        to="/barbeiro/cortai"
                        search={{ aba: "conversas", cliente: itemSelecionado.clienteId }}
                      >
                        <MessageCircle />
                        WhatsApp
                      </Link>
                    </Button>
                  ) : null}
                  {itemSelecionado.clienteId ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPainelAberto(false);
                        if (itemSelecionado.clienteId) setPerfil(itemSelecionado.clienteId);
                      }}
                    >
                      <UserRoundPlus />
                      Notas
                    </Button>
                  ) : null}
                </div>
                {remarcarHora ? (
                  <form
                    className="mt-4 flex items-end gap-2 border-t border-line pt-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const [h = 0, m = 0] = remarcarHora.split(":").map(Number);
                      const [h0 = 0, m0 = 0] = hora(itemSelecionado.inicio, fuso)
                        .split(":")
                        .map(Number);
                      const delta = h * 60 + m - (h0 * 60 + m0);
                      setPainelAberto(false);
                      setRemarcarHora("");
                      if (delta) void mover(itemSelecionado, delta);
                    }}
                  >
                    <label className="flex-1 text-xs font-semibold text-mute">
                      Novo horário
                      <input
                        type="time"
                        step={900}
                        value={remarcarHora}
                        onChange={(e) => setRemarcarHora(e.target.value)}
                        className="mt-1 block h-12 w-full rounded-md border border-line bg-ink px-3 text-base text-paper"
                      />
                    </label>
                    <Button type="submit" size="lg" disabled={!online}>
                      Remarcar
                    </Button>
                  </form>
                ) : null}
              </>
            ) : null}
          </SheetContent>
        </Sheet>
        {fechando ? (
          <Suspense
            fallback={
              <div className="agenda-folha">
                <EsqueletoAgenda linhas={3} />
              </div>
            }
          >
            <FechamentoComandaLazy
              agendamentoId={fechando}
              onFechar={() => setFechando(null)}
              onConcluido={() => {
                setFechando(null);
                setSelecionado(null);
                void sincronizar();
              }}
            />
          </Suspense>
        ) : null}
        {perfil ? (
          <Suspense fallback={null}>
            <PerfilClienteLazy
              clienteId={perfil}
              onFechar={() => setPerfil(null)}
              segmento={agenda.data?.tenant.segmento ?? "barbearia"}
            />
          </Suspense>
        ) : null}
      </Screen>
    );
  }

  function inicioToque(e: React.TouchEvent) {
    const alvo = e.target as HTMLElement;
    if (alvo.closest(".agenda-timeline-bloco, .agenda-chips, input, [role=dialog]")) {
      toque.current = null;
      return;
    }
    const t = e.touches[0];
    toque.current = t ? { x: t.clientX, y: t.clientY } : null;
  }
  function fimToque(e: React.TouchEvent) {
    const ini = toque.current;
    toque.current = null;
    const t = e.changedTouches[0];
    if (!ini || !t) return;
    const dx = t.clientX - ini.x;
    const dy = t.clientY - ini.y;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 40) setDia(somarDias(dia, dx < 0 ? 1 : -1));
  }

  return (
    <Screen title="Agenda" hideHeader wide>
      <div
        key={dia}
        className="agenda-operacional agenda-troca-dia pb-32"
        onTouchStart={inicioToque}
        onTouchEnd={fimToque}
      >
        <header className="agenda-cabecalho-compacto">
          <h1 className="sr-only">Agenda</h1>
          <div className="mb-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Semana anterior"
                onClick={() => setDia(somarDias(dia, -7))}
              >
                <ChevronLeft />
              </Button>
              <p className="truncate text-sm font-extrabold text-paper">{dataEditorial(dia)}</p>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Próxima semana"
                onClick={() => setDia(somarDias(dia, 7))}
              >
                <ChevronRight />
              </Button>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {chegada.length > 0 ? (
                <Button size="sm" variant="outline" onClick={() => setFilaAberta(true)}>
                  <ListOrdered />
                  Fila ({chegada.length})
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={ehHoje ? "ghost" : "secondary"}
                disabled={ehHoje}
                onClick={() => setDia(hojeNoFuso(fuso))}
              >
                Hoje
              </Button>
              <BotaoAjuda />
            </div>
          </div>
          <div className="agenda-semana" role="group" aria-label="Dias da semana">
            {semana.map((d) => {
              const data = new Date(`${d}T12:00:00Z`);
              return (
                <button
                  key={d}
                  type="button"
                  className="agenda-semana-dia"
                  aria-pressed={d === dia}
                  data-hoje={d === hojeNoFuso(fuso)}
                  onClick={() => setDia(d)}
                >
                  <span>
                    {data
                      .toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
                      .replace(".", "")
                      .slice(0, 3)}
                  </span>
                  <strong>{data.getUTCDate()}</strong>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs font-semibold text-mute" aria-live="polite">
            {resumo}
          </p>
          {profissionaisDoDia.length > 1 ? (
            <div className="agenda-chips mt-2" role="group" aria-label="Profissional">
              <Button
                variant="ghost"
                size="sm"
                className={`agenda-chip ${profFiltro === null ? "agenda-chip-ativo" : ""}`}
                onClick={() => setProfFiltro(null)}
              >
                Todos
              </Button>
              {profissionaisDoDia.map((nome) => (
                <Button
                  key={nome}
                  variant="ghost"
                  size="sm"
                  className={`agenda-chip ${profFiltro === nome ? "agenda-chip-ativo" : ""}`}
                  onClick={() => setProfFiltro(nome)}
                >
                  {nome}
                </Button>
              ))}
            </div>
          ) : null}
        </header>

        {ehHoje && rapido.isLoading && !agenda.data ? <EsqueletoAgenda linhas={2} /> : null}

        {ativos.length > 0 ? (
          <section aria-labelledby="agora-titulo" className="mb-6">
            <p id="agora-titulo" className="mb-2 text-xs font-bold uppercase text-mute">
              Agora
            </p>
            <div className="space-y-2">
              {ativos.map((item) => {
                const decorrido = minutos(item.startedAt ?? item.inicio, agora);
                const estourou = decorrido > item.duracaoMin;
                const alergia = fichaRelevante(item.ficha);
                return (
                  <Card
                    asChild
                    variant="touchable"
                    key={item.id}
                    className={`agenda-agora ${selecionado === item.id ? "agenda-item-selecionado" : ""}`}
                  >
                    <article onClick={() => abrir(item.id)}>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          {item.clienteId ? (
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.clienteId) setPerfil(item.clienteId);
                              }}
                              className={`block h-auto max-w-full justify-start truncate p-0 text-left text-base underline-offset-4 active:underline ${nomeEhGenerico(item.cliente) ? "font-semibold text-mute" : "font-extrabold text-paper"}`}
                            >
                              {item.cliente}
                            </Button>
                          ) : (
                            <p
                              className={`truncate text-base ${nomeEhGenerico(item.cliente) ? "font-semibold text-mute" : "font-extrabold text-paper"}`}
                            >
                              {item.cliente}
                            </p>
                          )}
                          <p className="mt-0.5 truncate text-sm text-mute">
                            {item.servico} · {item.profissional}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {item.clienteId ? (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              aria-label={`Abrir conversa de ${item.cliente} no WhatsApp`}
                            >
                              <Link
                                to="/barbeiro/cortai"
                                search={{ aba: "conversas", cliente: item.clienteId }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MessageCircle />
                              </Link>
                            </Button>
                          ) : null}
                          <StatusBadge status={item.status} />
                        </div>
                      </div>
                      {alergia ? (
                        <p className="mt-3 border-l-2 border-brick pl-3 text-xs font-semibold text-paper">
                          {alergia}
                        </p>
                      ) : null}
                      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <progress
                          className={`agenda-progress ${estourou ? "agenda-progress-estourado" : ""}`}
                          max={Math.max(item.duracaoMin, decorrido)}
                          value={decorrido}
                          aria-label={`${decorrido} de ${item.duracaoMin} minutos`}
                        />
                        <span
                          className={`agenda-tempo text-xs font-bold ${estourou ? "agenda-tempo-estourado" : ""}`}
                        >
                          {estourou
                            ? tempoExcedido(decorrido, item.duracaoMin)
                            : `${decorrido} de ${item.duracaoMin} min`}
                        </span>
                      </div>
                    </article>
                  </Card>
                );
              })}
            </div>
          </section>
        ) : ehHoje ? (
          <div className="mb-6 border-y border-line py-4">
            <p className="text-sm font-semibold text-paper">
              Livre agora{proximoLivre ? ` · próximo às ${hora(proximoLivre.inicio, fuso)}` : ""}
            </p>
          </div>
        ) : null}

        {destaques.length > 0 ? (
          <section
            className="mb-6 divide-y divide-line border-y border-line"
            aria-label="Próximos atendimentos"
          >
            {destaques.map((item, indice) => {
              const fimPrevisto = ativos.length
                ? Math.max(
                    ...ativos.map(
                      (atual) =>
                        new Date(atual.startedAt ?? atual.inicio).getTime() +
                        atual.duracaoMin * 60_000,
                    ),
                  )
                : 0;
              const espera = Math.max(
                0,
                Math.ceil((fimPrevisto - new Date(item.inicio).getTime()) / 60_000),
              );
              const telefone = item.telefone?.replace(/\D/g, "") ?? "";
              const mensagem = `Olá, ${item.cliente}! O atendimento anterior atrasou um pouco. A previsão de espera é de cerca de ${espera} minutos. Avisamos assim que liberar.`;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-3 py-3"
                >
                  <div>
                    <p className="text-xs font-bold uppercase text-mute2">
                      {indice === 0 ? "Próximo" : "Depois"}
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-paper">
                      {hora(item.inicio, fuso)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-auto min-w-0 flex-col items-start justify-center gap-0 px-2 text-left"
                    onClick={() => abrir(item.id)}
                  >
                    <span className="block truncate text-sm font-semibold text-paper">
                      {item.cliente}
                    </span>
                    <span className="block truncate text-xs text-mute">{item.servico}</span>
                    {espera > 0 ? (
                      <span className="mt-1 block text-xs font-semibold text-brick">
                        ~{espera} min de espera
                      </span>
                    ) : null}
                  </Button>
                  <div className="flex items-center gap-1">
                    {item.clienteId ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        aria-label={`Abrir conversa de ${item.cliente} no WhatsApp`}
                      >
                        <Link
                          to="/barbeiro/cortai"
                          search={{ aba: "conversas", cliente: item.clienteId }}
                        >
                          <MessageCircle />
                        </Link>
                      </Button>
                    ) : null}
                    {espera > 0 && telefone ? (
                      <Button asChild variant="secondary" size="sm">
                        <a
                          href={`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Avisar ${item.cliente} pelo WhatsApp`}
                        >
                          <MessageCircle />
                          Avisar
                        </a>
                      </Button>
                    ) : (
                      <StatusBadge status={item.status} />
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        ) : null}

        <Sheet open={filaAberta && chegada.length > 0} onOpenChange={setFilaAberta}>
          <SheetContent
            side="bottom"
            className="mx-auto max-h-[80dvh] w-full max-w-[520px] overflow-y-auto rounded-t-xl border-line bg-ink2 px-5 pt-5"
          >
            <SheetHeader className="pr-10 text-left">
              <SheetTitle className="text-base text-paper">Fila · {chegada.length}</SheetTitle>
              <SheetDescription className="text-xs text-mute">
                Quem chegou sem horário, por ordem de chegada.
              </SheetDescription>
            </SheetHeader>
            <section aria-label="Fila de chegada" className="mt-3 pb-4">
              <div className="mb-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={ocupado}
                  onClick={() => {
                    setFilaAberta(false);
                    void chamarFila();
                  }}
                >
                  <UserRoundPlus />
                  Chamar próximo
                </Button>
              </div>
              {souRecepcao && filaQ.data ? (
                <div
                  className="mb-2 flex flex-wrap gap-2"
                  aria-label="Profissional que vai atender"
                >
                  {filaQ.data.profissionais.map((p) => (
                    <Button
                      variant="ghost"
                      key={p.id}
                      type="button"
                      className={`agenda-chip ${profEscolhido === p.id ? "agenda-chip-ativo" : ""}`}
                      onClick={() => setProfChamada(p.id)}
                    >
                      {p.nome}
                      {p.livre ? " · livre" : ""}
                    </Button>
                  ))}
                </div>
              ) : null}
              <ol className="divide-y divide-line border-y border-line">
                {chegada.map((f, i) => (
                  <li
                    key={f.id}
                    className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 py-3"
                  >
                    <span className="text-sm font-extrabold text-mute">{i + 1}</span>
                    <div className="min-w-0">
                      {f.clienteId ? (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => {
                            if (f.clienteId) setPerfil(f.clienteId);
                          }}
                          className={`block h-auto max-w-full justify-start truncate p-0 text-left text-sm underline-offset-4 hover:underline ${nomeEhGenerico(f.cliente) ? "font-medium text-mute" : "font-bold text-paper"}`}
                        >
                          {f.cliente}
                        </Button>
                      ) : (
                        <p
                          className={`truncate text-sm ${nomeEhGenerico(f.cliente) ? "font-medium text-mute" : "font-bold text-paper"}`}
                        >
                          {f.cliente}
                        </p>
                      )}
                      <p className="truncate text-xs text-mute">
                        {f.servico ?? "Serviço a definir"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-mute">
                      <Clock3 aria-hidden size={13} />
                      {minutos(f.criadoEm, agora)} min
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </SheetContent>
        </Sheet>

        {sugestaoFila && chegada.length > 0 ? (
          <div className="agenda-sugestao-fila mb-4">
            <p className="text-sm font-semibold text-paper">
              Horário liberado. Chamar {chegada[0]?.cliente} da fila?
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" disabled={ocupado} onClick={() => void chamarFila()}>
                Chamar próximo da fila
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSugestaoFila(false)}>
                Agora não
              </Button>
            </div>
          </div>
        ) : null}

        <div
          className="mb-4 grid grid-cols-2 rounded-lg bg-ink3 p-1 md:grid-cols-3"
          role="tablist"
          aria-label="Visualização da agenda"
        >
          <Button
            role="tab"
            aria-selected={visualizacao === "lista"}
            variant={visualizacao === "lista" ? "secondary" : "ghost"}
            size="sm"
            className={visualizacao === "lista" ? "bg-ink2 shadow-sm" : "text-mute"}
            onClick={() => setVisualizacao("lista")}
          >
            Lista
          </Button>
          <Button
            role="tab"
            aria-selected={visualizacao === "timeline"}
            variant={visualizacao === "timeline" ? "secondary" : "ghost"}
            size="sm"
            className={visualizacao === "timeline" ? "bg-ink2 shadow-sm" : "text-mute"}
            onClick={() => setVisualizacao("timeline")}
          >
            Timeline
          </Button>
          <Button
            role="tab"
            aria-selected={visualizacao === "semana"}
            variant={visualizacao === "semana" ? "secondary" : "ghost"}
            size="sm"
            className={`hidden md:inline-flex ${visualizacao === "semana" ? "bg-ink2 shadow-sm" : "text-mute"}`}
            onClick={() => setVisualizacao("semana")}
          >
            Semana
          </Button>
        </div>

        {agenda.isLoading && !agenda.data ? <EsqueletoAgenda linhas={5} /> : null}
        {visualizacao === "semana" && !celular ? (
          <AgendaSemana
            semana={semana}
            fuso={fuso}
            hoje={hojeNoFuso(fuso)}
            profissional={profFiltro}
            onAbrirDia={(d) => {
              setDia(d);
              setVisualizacao("timeline");
            }}
          />
        ) : diaSemAgenda ? (
          <div className="border-y border-line py-10 text-center">
            <p className="text-base font-bold text-paper">Dia livre — compartilhe seu link</p>
            <Link
              to="/barbeiro/marca"
              className="mt-3 inline-block text-sm font-semibold text-gold underline underline-offset-4"
            >
              Abrir página da barbearia
            </Link>
          </div>
        ) : visualizacao !== "lista" && !celular && !profFiltro && profissionaisDoDia.length > 1 ? (
          <div
            className="agenda-colunas"
            style={{
              gridTemplateColumns: `repeat(${profissionaisDoDia.length}, minmax(220px, 1fr))`,
            }}
          >
            {profissionaisDoDia.map((nome) => (
              <section key={nome} className="min-w-0">
                <button
                  type="button"
                  className="agenda-coluna-titulo"
                  onClick={() => setProfFiltro(nome)}
                >
                  {nome}
                </button>
                <AgendaTimeline
                  dia={dia}
                  fuso={fuso}
                  agora={agora}
                  itens={itens.filter((item) => item.profissional === nome)}
                  itensEscala={itens}
                  alinhado
                  horarios={agenda.data?.horarios ?? []}
                  selecionado={selecionado}
                  onSelecionar={(id) => abrir(id)}
                  onMover={(item, delta) => void mover(item, delta)}
                  onHorarioVazio={(h) => {
                    setHoraVazia(h);
                    setProfVazio(nome);
                    setManualAberto("agendamento");
                  }}
                  destaques={novos}
                  renderStatus={(status) => <StatusBadge status={status} />}
                />
              </section>
            ))}
          </div>
        ) : visualizacao !== "lista" ? (
          <AgendaTimeline
            dia={dia}
            fuso={fuso}
            agora={agora}
            itens={itens}
            horarios={agenda.data?.horarios ?? []}
            selecionado={selecionado}
            onSelecionar={(id) => abrir(id)}
            onMover={(item, delta) => void mover(item, delta)}
            onHorarioVazio={(h) => {
              setHoraVazia(h);
              setManualAberto("agendamento");
            }}
            destaques={novos}
            renderStatus={(status) => <StatusBadge status={status} />}
          />
        ) : (
          <ul className="divide-y divide-line">
            {itens.map((item) => {
              const atrasado =
                ehHoje &&
                item.status === "agendado" &&
                !aguardando.has(item.id) &&
                agora > new Date(item.inicio).getTime() + TOLERANCIA_MIN * 60_000;
              const selecionada = selecionado === item.id;
              return (
                <li
                  key={item.id}
                  className={`agenda-lista-item ${selecionada ? "agenda-item-selecionado" : ""} ${novos.has(item.id) ? "agenda-novo" : ""}`}
                  onClick={() => abrir(item.id)}
                >
                  <div className="grid grid-cols-[54px_minmax(0,1fr)_auto] items-start gap-3">
                    <p className="pt-0.5 text-sm font-extrabold text-paper">
                      {hora(item.inicio, fuso)}
                    </p>
                    <div className="min-w-0">
                      {item.clienteId ? (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.clienteId) setPerfil(item.clienteId);
                          }}
                          className={`block h-auto max-w-full justify-start truncate p-0 text-left text-sm underline-offset-4 hover:underline ${nomeEhGenerico(item.cliente) ? "font-medium text-mute" : "font-bold text-paper"}`}
                        >
                          {item.cliente}
                        </Button>
                      ) : (
                        <p
                          className={`truncate text-sm ${nomeEhGenerico(item.cliente) ? "font-medium text-mute" : "font-bold text-paper"}`}
                        >
                          {item.cliente}
                        </p>
                      )}
                      <p className="mt-0.5 truncate text-xs text-mute">
                        {item.servico} · {item.profissional}
                      </p>
                      {(item as { confirmadoEm?: string | null }).confirmadoEm &&
                      item.status === "agendado" ? (
                        <p className="status-badge status-badge-confirmado mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold">
                          <Check className="size-3" aria-hidden />
                          Confirmou pelo WhatsApp
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {item.clienteId ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={`Abrir conversa de ${item.cliente} no WhatsApp`}
                        >
                          <Link
                            to="/barbeiro/cortai"
                            search={{ aba: "conversas", cliente: item.clienteId }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle />
                          </Link>
                        </Button>
                      ) : null}
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                  {atrasado ? (
                    <div className="mt-3 ml-[66px] flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-brick">Não chegou?</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void transicionar(item, "nao_compareceu");
                        }}
                      >
                        Marcar falta
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAguardando((atuais) => new Set(atuais).add(item.id));
                        }}
                      >
                        Aguardar
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {aReceber.length ? (
          <section aria-labelledby="receber-titulo" className="mt-6">
            <p id="receber-titulo" className="mb-2 text-xs font-bold uppercase text-mute">
              Aguardando pagamento · {aReceber.length}
            </p>
            <ul className="divide-y divide-line border-y border-line">
              {aReceber.map((c) => (
                <li key={c.id}>
                  <Button
                    variant="ghost"
                    type="button"
                    className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left active:bg-ink2"
                    onClick={() => setFechando(c.agendamentoId)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-paper">
                        {c.cliente}
                      </span>
                      <span className="block truncate text-xs text-mute">
                        {c.profissional} · #{c.numero}
                        {c.pix ? " · Pix a confirmar" : ""}
                      </span>
                    </span>
                    <span className="money-value flex items-center gap-2 text-sm text-paper">
                      <HandCoins aria-hidden className="size-4" />
                      {brl(c.total)}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {ehHoje && meuDiaQ.data ? (
          <section className="mt-6 border-t border-line pt-2">
            <Button
              variant="ghost"
              type="button"
              aria-expanded={meuDiaAberto}
              className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
              onClick={() => setMeuDiaAberto((v) => !v)}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-paper">
                <ChartNoAxesColumn aria-hidden className="size-4" />
                Meu dia
              </span>
              <span className="text-xs text-mute">
                {meuDiaQ.data.atendimentos} atend. · {brl(meuDiaQ.data.vendido)}
              </span>
            </Button>
            {meuDiaAberto ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pb-3 text-sm">
                <div>
                  <dt className="text-xs text-mute">Atendimentos hoje</dt>
                  <dd className="text-lg font-extrabold text-paper">{meuDiaQ.data.atendimentos}</dd>
                </div>
                <div>
                  <dt className="text-xs text-mute">Vendido (caixa)</dt>
                  <dd className="money-value text-lg text-paper">{brl(meuDiaQ.data.vendido)}</dd>
                </div>
                {meuDiaQ.data.temComissao ? (
                  <div>
                    <dt className="text-xs text-mute">Comissão estimada</dt>
                    <dd className="money-value text-lg text-paper">{brl(meuDiaQ.data.comissao)}</dd>
                  </div>
                ) : null}
                {meuDiaQ.data.fiado ? (
                  <div>
                    <dt className="text-xs text-mute">No fiado</dt>
                    <dd className="money-value text-lg text-paper">{brl(meuDiaQ.data.fiado)}</dd>
                  </div>
                ) : null}
                {meuDiaQ.data.noPlano ? (
                  <div>
                    <dt className="text-xs text-mute">Pelo plano</dt>
                    <dd className="text-lg font-extrabold text-paper">{meuDiaQ.data.noPlano}</dd>
                  </div>
                ) : null}
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
          {itemSelecionado
            ? itemSelecionado.status === "na_cadeira"
              ? `Finalizar ${itemSelecionado.cliente}`
              : `Iniciar ${itemSelecionado.cliente}`
            : null}
        </Button>
      </div>

      <Sheet
        open={painelAberto && Boolean(itemSelecionado)}
        onOpenChange={(v) => {
          setPainelAberto(v);
          if (!v) setRemarcarHora("");
        }}
      >
        <SheetContent
          side={ehDesktop ? "right" : "bottom"}
          className={`agenda-painel border-line bg-ink2 px-5 pt-5 ${ehDesktop ? "w-[380px]" : "mx-auto w-full max-w-[520px] rounded-t-xl"}`}
        >
          {itemSelecionado ? (
            <>
              <SheetHeader className="pr-10 text-left">
                <SheetTitle className="truncate text-lg text-paper">
                  {itemSelecionado.cliente}
                </SheetTitle>
                <SheetDescription className="text-sm text-mute">
                  {hora(itemSelecionado.inicio, fuso)} · {itemSelecionado.servico} ·{" "}
                  {itemSelecionado.profissional}
                </SheetDescription>
                <div>
                  <StatusBadge status={itemSelecionado.status} />
                </div>
              </SheetHeader>
              <div className="agenda-painel-acoes mt-4">
                {itemSelecionado.status === "agendado" ? (
                  <Button
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => {
                      setPainelAberto(false);
                      void transicionar(itemSelecionado, "chegou");
                    }}
                  >
                    <UserRoundPlus />
                    Chegou
                  </Button>
                ) : null}
                {itemSelecionado.status === "agendado" || itemSelecionado.status === "chegou" ? (
                  <Button
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => {
                      setPainelAberto(false);
                      iniciar(itemSelecionado);
                    }}
                  >
                    <Scissors />
                    Iniciar
                  </Button>
                ) : null}
                {itemSelecionado.status === "na_cadeira" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPainelAberto(false);
                      setFechando(itemSelecionado.id);
                    }}
                  >
                    <Check />
                    Concluir
                  </Button>
                ) : null}
                {itemSelecionado.status === "agendado" || itemSelecionado.status === "chegou" ? (
                  <Button
                    variant="outline"
                    onClick={() => setRemarcarHora(hora(itemSelecionado.inicio, fuso))}
                  >
                    <CalendarPlus />
                    Remarcar
                  </Button>
                ) : null}
                {itemSelecionado.status === "agendado" || itemSelecionado.status === "chegou" ? (
                  <Button
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => {
                      setPainelAberto(false);
                      void transicionar(itemSelecionado, "nao_compareceu");
                    }}
                  >
                    <Clock3 />
                    Falta
                  </Button>
                ) : null}
                {itemSelecionado.status === "agendado" || itemSelecionado.status === "chegou" ? (
                  <Button
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => {
                      setPainelAberto(false);
                      void transicionar(itemSelecionado, "cancelado");
                    }}
                  >
                    <Ban />
                    Cancelar
                  </Button>
                ) : null}
                {itemSelecionado.clienteId ? (
                  <Button asChild variant="outline">
                    <Link
                      to="/barbeiro/cortai"
                      search={{ aba: "conversas", cliente: itemSelecionado.clienteId }}
                    >
                      <MessageCircle />
                      WhatsApp
                    </Link>
                  </Button>
                ) : null}
                {itemSelecionado.status !== "cancelado" &&
                itemSelecionado.status !== "nao_compareceu" &&
                itemSelecionado.status !== "remarcado" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPainelAberto(false);
                      setFechando(itemSelecionado.id);
                    }}
                  >
                    <HandCoins />
                    Comanda
                  </Button>
                ) : null}
              </div>
              {remarcarHora ? (
                <form
                  className="mt-4 flex items-end gap-2 border-t border-line pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const [h = 0, m = 0] = remarcarHora.split(":").map(Number);
                    const [h0 = 0, m0 = 0] = hora(itemSelecionado.inicio, fuso)
                      .split(":")
                      .map(Number);
                    const delta = h * 60 + m - (h0 * 60 + m0);
                    setPainelAberto(false);
                    setRemarcarHora("");
                    if (delta) void mover(itemSelecionado, delta);
                  }}
                >
                  <label className="flex-1 text-xs font-semibold text-mute">
                    Novo horário
                    <input
                      type="time"
                      step={900}
                      value={remarcarHora}
                      onChange={(e) => setRemarcarHora(e.target.value)}
                      className="mt-1 block h-12 w-full rounded-md border border-line bg-ink px-3 text-base text-paper"
                    />
                  </label>
                  <Button type="submit" size="lg">
                    Remarcar
                  </Button>
                </form>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent
          side="bottom"
          className="agenda-acoes-folha mx-auto w-full max-w-[520px] rounded-t-xl border-line bg-ink2 px-5 pt-5"
        >
          <SheetClose asChild>
            <Button
              type="button"
              size="lg"
              variant="primary"
              aria-label="Fechar ações da agenda"
              aria-expanded="true"
              className="agenda-acao-redonda agenda-acao-fechar"
            >
              <Scissors />
            </Button>
          </SheetClose>
          <SheetHeader className="pr-10 text-left">
            <SheetTitle className="text-base text-paper">Ações da agenda</SheetTitle>
            <SheetDescription className="text-xs text-mute">
              Escolha o que precisa fazer agora.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 divide-y divide-line" role="menu" aria-label="Ações da agenda">
            <Button
              variant="ghost"
              role="menuitem"
              className="agenda-acao-lista"
              onClick={() => {
                setMenuAberto(false);
                setManualAberto("agendamento");
              }}
            >
              <CalendarPlus />
              <span>
                <strong>Novo agendamento</strong>
                <small>Marcar dia, horário e profissional</small>
              </span>
            </Button>
            <Button
              variant="ghost"
              role="menuitem"
              className="agenda-acao-lista"
              onClick={() => {
                setMenuAberto(false);
                setRapidoAberto(true);
              }}
            >
              <Scissors />
              <span>
                <strong>Novo atendimento</strong>
                <small>Atender uma pessoa sem horário</small>
              </span>
            </Button>
            {chegada.length > 0 ? (
              <Button
                variant="ghost"
                role="menuitem"
                className="agenda-acao-lista"
                disabled={ocupado}
                onClick={() => void chamarFila()}
              >
                <UserRoundPlus />
                <span>
                  <strong>Chamar próximo da fila</strong>
                  <small>{chegada[0]?.cliente} está aguardando</small>
                </span>
              </Button>
            ) : null}
            <Button asChild variant="ghost" role="menuitem" className="agenda-acao-lista">
              <Link to="/barbeiro/horarios" onClick={() => setMenuAberto(false)}>
                <Clock3 />
                <span>
                  <strong>Bloquear horário</strong>
                  <small>Reservar um período da agenda</small>
                </span>
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {manualAberto ? (
        <div className="agenda-manual-auto">
          <AgendamentoManual
            key={`${manualAberto}-${horaVazia ?? ""}`}
            dia={dia}
            {...(horaVazia ? { horaInicial: horaVazia } : {})}
            profissionalInicial={profVazio ?? profFiltro ?? meuNome}
            autoAbrir
            rotulo="Novo agendamento"
            onCriado={() => {
              setManualAberto(null);
              setHoraVazia(undefined);
              setProfVazio(null);
              void sincronizar();
            }}
          />
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(conflito)}
        onOpenChange={(aberto) => {
          if (!aberto) setConflito(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {conflito
                ? `Finalizar ${conflito.atual.cliente} ou manter os dois?`
                : "Atendimento aberto"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {segmentoAgenda === "barbearia"
                ? "Você já tem um cliente na cadeira."
                : "Você já tem um atendimento em andamento."}{" "}
              Escolha como continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (conflito) void transicionar(conflito.novo, "na_cadeira");
                setConflito(null);
              }}
            >
              Manter os dois
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (conflito) {
                  setIniciarDepois(conflito.novo.id);
                  setFechando(conflito.atual.id);
                }
                setConflito(null);
              }}
            >
              Finalizar atual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Suspense
        fallback={
          <div className="agenda-folha">
            <div className="agenda-folha-conteudo">
              <EsqueletoAgenda linhas={3} />
            </div>
          </div>
        }
      >
        {rapidoAberto ? (
          <AtendimentoRapidoLazy
            onFechar={() => setRapidoAberto(false)}
            onIniciado={(r) => {
              setRapidoAberto(false);
              setDia(hojeNoFuso(fuso));
              void sincronizar();
              oferecerDesfazerInicio(r);
            }}
          />
        ) : null}

        {fechando ? (
          <FechamentoComandaLazy
            agendamentoId={fechando}
            onFechar={() => {
              setFechando(null);
              setIniciarDepois(null);
            }}
            onConcluido={() => {
              const proximo = itens.find((item) => item.id === iniciarDepois);
              setFechando(null);
              setIniciarDepois(null);
              setSelecionado(null);
              if (proximo) void transicionar(proximo, "na_cadeira");
              void sincronizar();
              void queryClient.invalidateQueries({ queryKey: ["agenda-a-receber"] });
              void queryClient.invalidateQueries({ queryKey: ["agenda-meu-dia"] });
            }}
          />
        ) : null}
        {perfil ? (
          <PerfilClienteLazy
            clienteId={perfil}
            onFechar={() => setPerfil(null)}
            segmento={agenda.data?.tenant.segmento ?? "barbearia"}
          />
        ) : null}
      </Suspense>
    </Screen>
  );
}
