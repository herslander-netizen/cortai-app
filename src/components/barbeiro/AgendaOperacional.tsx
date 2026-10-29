import { lazyComRecuperacao } from "@/lib/pwa/recuperar-chunk";
import { invalidarComandas } from "@/lib/comanda-ticket";
import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock3, HandCoins, Lock, Plus, UserRoundPlus } from "lucide-react";
import type React from "react";
import { AnimatePresence } from "framer-motion";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { AgendaTimeline } from "@/components/barbeiro/AgendaTimeline";
import { AgendaSemana } from "@/components/barbeiro/AgendaSemana";
import { AgendaFocoMobile } from "@/components/barbeiro/AgendaFocoMobile";
import { efeitoDaAcaoCard } from "@/components/barbeiro/agenda/acao-card";
import { BloquearHorarioSheet } from "@/components/barbeiro/agenda/BloquearHorarioSheet";
import { AjustarIntervaloSheet } from "@/components/barbeiro/agenda/AjustarIntervaloSheet";
import { DetalheBloqueioSheet } from "@/components/barbeiro/agenda/DetalheBloqueioSheet";
import { CabecalhoAgenda } from "@/components/barbeiro/agenda/CabecalhoAgenda";
import { mesDoDia, tituloDoMes } from "@/components/barbeiro/agenda/calendario";
import { filaDeChegadaVisivel } from "@/components/barbeiro/agenda/fila-visivel";
import {
  AgendaCarregando,
  AgendaErro,
  AgendaVazia,
  FaixaConexao,
} from "@/components/barbeiro/agenda/EstadosAgenda";
import { FolhaDoTicket } from "@/components/comanda/FolhaDoTicket";
import { ListaAgenda } from "@/components/barbeiro/agenda/ListaAgenda";
import { MenuAcoesAgenda } from "@/components/barbeiro/agenda/MenuAcoesAgenda";
import { comandoDeVozSuportado } from "@/components/ia/useGravadorDeVoz";
import { prefereMenosMovimento } from "@/lib/motion";
import { segmentoParaApresentacao } from "@/lib/segmentos";
import { BotaoAgoraPrincipal } from "@/components/barbeiro/agenda/BotaoAgoraPrincipal";
import {
  PainelAtendimento,
  type PedidoRemarcar,
} from "@/components/barbeiro/agenda/PainelAtendimento";
import { ResumoDia } from "@/components/barbeiro/agenda/ResumoDia";
import { SeletorProfissionais } from "@/components/barbeiro/agenda/SeletorProfissionais";
import { FiltroDaAgenda } from "@/components/barbeiro/agenda/FiltroDaAgenda";
import { useZoomDaEdicao } from "@/components/barbeiro/agenda/zoom-agenda";
import {
  ROTULO_ESTADO,
  hora,
  minutosDecorridos,
  nomeDaAgenda,
  nomeEhGenerico,
  somarDias,
  dataEditorial,
  diaNoFuso,
} from "@/components/barbeiro/agenda/tempo";
import { useAgendaDia } from "@/components/barbeiro/agenda/useAgendaDia";
import { useIsMobile, useMediaQuery } from "@/hooks/use-mobile";
import { useAgora } from "@/hooks/useAgora";
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
import { Chip } from "@/components/ui/chip";
import { BarraDeEdicaoDeHorario } from "@/components/barbeiro/agenda/BarraDeEdicaoDeHorario";
import { CabecalhoDeEdicao } from "@/components/barbeiro/agenda/CabecalhoDeEdicao";
import { MarcaDoLimiteDoDia, SemanaDoTopo } from "@/components/barbeiro/agenda/SemanaDoTopo";
import { ListaPeriodo, opcoesAgendaPeriodo } from "@/components/barbeiro/agenda/ListaPeriodo";
import {
  RecolheNaLista,
  TrocaDeVisualizacao,
} from "@/components/barbeiro/agenda/TrocaDeVisualizacao";
import { NaBarraDoTopo } from "@/components/barbeiro/agenda/NaBarraDoTopo";
import { TransicaoVerticalDoModoEdicao } from "@/components/barbeiro/agenda/TransicaoVerticalDoModoEdicao";
import { useRascunhoDeHorario } from "@/components/barbeiro/agenda/useRascunhoDeHorario";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { aviso, comDesfazer } from "@/lib/avisos";
import { getCapacidades } from "@/lib/capacidades.functions";
import {
  mudarEstadoAtendimento,
  moverAgendamentoPainel,
  type AgendaDia,
  type AgendaItem,
  type EstadoAtendimento,
} from "@/lib/barbeiro.functions";
import { getAguardandoPagamento } from "@/lib/financeiro.functions";
import { brl } from "@/lib/format";
import {
  chamarProximoDaFila,
  desfazerInicioRapido,
  getOperacaoFila,
} from "@/lib/atendimento.functions";
import { hojeNoFuso, isoNoFusoDaBarbearia } from "@/lib/horarios";
import {
  modoDiscretoInicial,
  preferenciaAgendaInicial,
  salvarModoDiscreto,
  salvarPreferenciaAgenda,
  ultimaVisaoCompleta,
  dicaDaAgendaVista,
  marcarDicaDaAgendaVista,
} from "@/components/barbeiro/agenda/preferencias";
import { CamadasVizinhas, PreviaDoGesto } from "@/components/barbeiro/agenda/PreviaDiaVizinho";
import { useGestoDia } from "@/components/barbeiro/agenda/useGestoDia";
import { useLayoutEquipe } from "@/components/layout/ContextoLayoutEquipe";
import {
  contextoInicialDaAgenda,
  useLugarDaAgenda,
} from "@/components/barbeiro/agenda/useLugarDaAgenda";

const AssistenteCortaiLazy = lazyComRecuperacao(() =>
  import("@/components/ia/AssistenteCortai").then((m) => ({ default: m.AssistenteCortai })),
);
const AgendamentoManualLazy = lazyComRecuperacao(() =>
  import("@/components/barbeiro/AgendamentoManual").then((m) => ({ default: m.AgendamentoManual })),
);
const AtendimentoRapidoLazy = lazyComRecuperacao(() =>
  import("@/components/barbeiro/AtendimentoRapido").then((m) => ({ default: m.AtendimentoRapido })),
);
const FechamentoComandaLazy = lazyComRecuperacao(() =>
  import("@/components/financeiro/FechamentoComanda").then((m) => ({
    default: m.FechamentoComanda,
  })),
);
const PerfilClienteLazy = lazyComRecuperacao(() =>
  import("@/components/cliente-perfil/PerfilClienteSheet").then((m) => ({
    default: m.PerfilClienteSheet,
  })),
);

type Visualizacao = "lista" | "timeline" | "semana";

function useEhDesktop() {
  return useMediaQuery("(min-width: 768px)");
}

/** Folha da fila de chegada. Usa relógio próprio para não redesenhar a agenda. */
function FolhaFila(props: {
  aberta: boolean;
  onAberta: (v: boolean) => void;
  chegada: {
    id: string;
    cliente: string;
    clienteId: string | null;
    servico: string | null;
    criadoEm: string;
  }[];
  profissionais: { id: string; nome: string; livre: boolean }[] | null;
  profEscolhido: string | null;
  onProf: (id: string) => void;
  ocupado: boolean;
  online: boolean;
  onChamar: () => void;
  onPerfil: (id: string) => void;
  discreto: boolean;
}) {
  const agora = useAgora();
  return (
    <Sheet open={props.aberta} onOpenChange={props.onAberta}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[80dvh] w-full max-w-[520px] overflow-y-auto rounded-t-xl border-line bg-ink2 px-5 pt-5"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="text-base text-paper">
            Fila de chegada · {props.chegada.length}
          </SheetTitle>
          <SheetDescription className="text-xs text-mute">
            Quem chegou sem horário, por ordem de chegada.
          </SheetDescription>
        </SheetHeader>
        <section aria-label="Fila de chegada" className="mt-3 pb-4">
          {props.chegada.length === 0 ? (
            <p className="py-6 text-center text-sm text-mute">Ninguém na fila agora.</p>
          ) : (
            <>
              <div className="mb-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  disabled={props.ocupado || !props.online}
                  onClick={props.onChamar}
                >
                  <UserRoundPlus /> Chamar próximo
                </Button>
              </div>
              {props.profissionais ? (
                <div
                  className="mb-2 flex flex-wrap gap-2"
                  aria-label="Profissional que vai atender"
                >
                  {props.profissionais.map((p) => (
                    <Chip
                      className="rounded-lg"
                      key={p.id}
                      selecionado={props.profEscolhido === p.id}
                      onClick={() => props.onProf(p.id)}
                    >
                      {p.nome}
                      {p.livre ? " · livre" : ""}
                    </Chip>
                  ))}
                </div>
              ) : null}
              <ol className="divide-y divide-line border-y border-line">
                {props.chegada.map((f, i) => (
                  <li
                    key={f.id}
                    className="grid min-h-14 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 py-2"
                  >
                    <span className="text-sm font-extrabold text-mute">{i + 1}</span>
                    <div className="min-w-0">
                      {f.clienteId ? (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (f.clienteId) props.onPerfil(f.clienteId);
                          }}
                          className={`min-h-12 w-full justify-start truncate px-0 text-left text-sm ${nomeEhGenerico(f.cliente) ? "text-mute" : "text-paper"}`}
                        >
                          {nomeDaAgenda(f.cliente, props.discreto)}
                        </Button>
                      ) : (
                        <p
                          className={`truncate text-left text-sm font-bold ${nomeEhGenerico(f.cliente) ? "text-mute" : "text-paper"}`}
                        >
                          {nomeDaAgenda(f.cliente, props.discreto)}
                        </p>
                      )}
                      <p className="truncate text-xs text-mute">
                        {f.servico ?? "Serviço a definir"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-mute">
                      <Clock3 aria-hidden size={13} />
                      {minutosDecorridos(f.criadoEm, agora)} min
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Função de identidade fixa que sempre chama a versão mais recente (ref). A linha do tempo é memorizada: se os
 * manipuladores mudassem de identidade a cada render, a troca de dia refaria a grade inteira à toa.
 */
function useFuncaoEstavel<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const atual = useRef(fn);
  atual.current = fn;
  return useCallback((...args: A) => atual.current(...args), []);
}

export function AgendaOperacional() {
  const busca = useSearch({ strict: false });
  const caminho = useRouterState({ select: (estado) => estado.location.pathname });
  const layoutEquipe = useLayoutEquipe();
  const acaoInicial =
    busca["acao"] === "agendamento" ||
    busca["acao"] === "atendimento" ||
    busca["acao"] === "cliente"
      ? busca["acao"]
      : undefined;
  const mudarEstado = useServerFn(mudarEstadoAtendimento);
  const moverAgendamento = useServerFn(moverAgendamentoPainel);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Abrir a Agenda sempre começa em "hoje" (fuso do negócio); o lugar salvo
  // só é restaurado (visualização/rolagem) quando era o próprio dia de hoje.
  const [restaurado] = useState(() => {
    const c = contextoInicialDaAgenda(typeof busca["agendamento"] === "string");
    return c && c.dia === hojeNoFuso(c.fuso) ? c : null;
  });
  const [dia, setDia] = useState(() => restaurado?.dia ?? hojeNoFuso());
  const [direcaoDia, setDirecaoDia] = useState<"anterior" | "proximo">("proximo");
  const [fuso, setFuso] = useState<string>("America/Sao_Paulo");
  const fusoAnterior = useRef(fuso);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  const [estadosLocais, setEstadosLocais] = useState<Record<string, string>>({});
  const [menuAberto, setMenuAberto] = useState(false);
  // Agendar por voz: abre a Flow IA já ouvindo. Só existe se o navegador grava áudio.
  const [vozAberta, setVozAberta] = useState(false);
  const [vozSuportada, setVozSuportada] = useState(false);
  useEffect(() => setVozSuportada(comandoDeVozSuportado()), []);
  const [bloquearAberto, setBloquearAberto] = useState(false);
  const [intervaloAberto, setIntervaloAberto] = useState(false);
  const [bloqueioSelecionado, setBloqueioSelecionado] = useState<{
    id: string;
    inicio: string;
    fim: string;
    motivo: string | null;
  } | null>(null);
  const [focoTrancado, setFocoTrancado] = useState(false);
  const [manualAberto, setManualAberto] = useState(
    acaoInicial === "agendamento" || acaoInicial === "cliente",
  );
  const [novoCliente, setNovoCliente] = useState(acaoInicial === "cliente");
  const [rapidoAberto, setRapidoAberto] = useState(acaoInicial === "atendimento");
  const [sugestaoFila, setSugestaoFila] = useState(false);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [profChamada, setProfChamada] = useState<string | null>(null);
  const [fechando, setFechando] = useState<string | null>(null);
  // Uma superfície por vez: ao sair da cobrança/ticket sem concluir, a ficha volta.
  const [voltarParaFicha, setVoltarParaFicha] = useState<string | null>(null);
  const [ticketAberto, setTicketAberto] = useState<string | null>(null);
  const [iniciarDepois, setIniciarDepois] = useState<string | null>(null);
  const [conflito, setConflito] = useState<{ atual: AgendaItem; novo: AgendaItem } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const inicial = useRef<{
    celular: boolean;
    preferencia: ReturnType<typeof preferenciaAgendaInicial>;
  } | null>(null);
  if (!inicial.current) {
    const celularLido = window.matchMedia("(max-width: 767px)").matches;
    const salva = preferenciaAgendaInicial(celularLido);
    const volta = restaurado && salva !== "foco" ? restaurado.visualizacao : salva;
    inicial.current = {
      celular: celularLido,
      preferencia: celularLido && volta === "semana" ? "lista" : volta,
    };
  }
  const celularInicial = inicial.current.celular;
  const preferenciaInicial = inicial.current.preferencia;
  const [visualizacao, setVisualizacao] = useState<Visualizacao>(() =>
    preferenciaInicial === "foco" ? ultimaVisaoCompleta() : preferenciaInicial,
  );
  const celular = useIsMobile();
  const faixaCelular = useMediaQuery("(max-width: 600px)");
  const ehDesktop = useEhDesktop();
  const [profVazio, setProfVazio] = useState<string | null>(null);
  const [horaVazia, setHoraVazia] = useState<string | undefined>();
  const [filaAberta, setFilaAberta] = useState(false);
  const [profFiltro, setProfFiltro] = useState<string | null>(null);
  const [acaoPainel, setAcaoPainel] = useState<"remarcar" | "cancelar" | null>(null);
  const filtroInicial = useRef(false);
  const [modoFoco, setModoFoco] = useState(preferenciaInicial === "foco" && celularInicial);
  const [modoDiscreto, setModoDiscreto] = useState(modoDiscretoInicial);
  const [novos, setNovos] = useState<Set<string>>(() => new Set());
  const idsConhecidos = useRef<{ dia: string; ids: Set<string> } | null>(null);
  const ehHoje = dia === hojeNoFuso(fuso);
  const rotaDaAgenda = caminho === "/barbeiro" || caminho === "/barbeiro/agenda";
  const temSobreposicao = Boolean(
    painelAberto ||
    bloquearAberto ||
    intervaloAberto ||
    Boolean(bloqueioSelecionado) ||
    focoTrancado ||
    manualAberto ||
    rapidoAberto ||
    perfil ||
    fechando ||
    ticketAberto ||
    conflito ||
    filaAberta ||
    layoutEquipe?.menuAberto,
  );
  const acoesFlutuantesVisiveis = rotaDaAgenda && !temSobreposicao;

  useEffect(() => {
    if (!acoesFlutuantesVisiveis && menuAberto) setMenuAberto(false);
  }, [acoesFlutuantesVisiveis, menuAberto]);

  function alterarVisualizacao(proxima: Visualizacao) {
    const segura = celular && proxima === "semana" ? "lista" : proxima;
    // Celular: a lista começa em hoje, no topo (como no vídeo do dono).
    if (celular && segura === "lista" && visualizacao !== "lista") window.scrollTo({ top: 0 });
    setVisualizacao(segura);
    salvarPreferenciaAgenda(segura);
  }

  function alternarModoDiscreto() {
    setModoDiscreto((atual) => {
      salvarModoDiscreto(!atual);
      return !atual;
    });
  }

  function mudarDia(proximo: string) {
    setDirecaoDia(proximo < dia ? "anterior" : "proximo");
    // Trocar de dia nunca abre (nem reabre) o novo agendamento.
    setManualAberto(false);
    setNovoCliente(false);
    setHoraVazia(undefined);
    setProfVazio(null);
    // Como no Figaro, escolher um dia no mês leva até ele e o calendário continua aberto (dono, 29/10).
    setDia(proximo);
  }

  const { agenda, online, aoVivo } = useAgendaDia(dia);
  useLugarDaAgenda({ dia, visualizacao, fuso, foco: modoFoco, pronto: !!agenda.data, restaurado });

  useEffect(() => {
    const voltar = () => setModoFoco(false);
    window.addEventListener("popstate", voltar);
    return () => window.removeEventListener("popstate", voltar);
  }, []);

  const capacidadesQ = useQuery({
    queryKey: ["capacidades"],
    queryFn: () => getCapacidades(),
    staleTime: 300_000,
  });
  const focoNoPlano = capacidadesQ.data?.liberados["modo_foco"] !== false;
  // Desligado pelo dono em Funcionalidades: vale também no celular.
  const focoDesligado = capacidadesQ.data?.ativos["modo_foco"] === false;
  useEffect(() => {
    if (focoDesligado && modoFoco) setModoFoco(false);
  }, [focoDesligado, modoFoco]);

  function entrarNoModoFoco() {
    if (modoFoco || focoDesligado) return;
    const hoje = hojeNoFuso(fuso);
    if (dia !== hoje) setDia(hoje);
    if (meuId) setProfFiltro(meuId);
    else if (!profFiltro && profissionais[0]) setProfFiltro(profissionais[0].id);
    if (celular) {
      salvarPreferenciaAgenda("foco");
      setModoFoco(true);
      return;
    }
    if (!focoNoPlano) {
      setFocoTrancado(true);
      return;
    }
    window.history.pushState({ ...window.history.state, modoFoco: true }, "");
    setModoFoco(true);
  }
  function sairDoModoFoco() {
    if (celular) {
      const anterior = ultimaVisaoCompleta();
      setModoFoco(false);
      alterarVisualizacao(anterior);
      return;
    }
    if (window.history.state?.modoFoco) window.history.back();
    else setModoFoco(false);
  }

  const segmentoAgenda = agenda.data?.tenant.segmento ?? "outro";
  const rotuloAtendimento = segmentoAgenda === "barbearia" ? "Na cadeira" : "Em atendimento";
  const passoMin = agenda.data?.passoMin ?? 30;

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
  const aReceber = aReceberQ.data ?? [];
  const chegada = filaQ.data?.chegada ?? [];
  const mostrarFila = filaDeChegadaVisivel(filaQ.data?.filaDeChegadaAtiva, chegada.length);
  const souRecepcao = Boolean(filaQ.data && !filaQ.data.meuProfissionalId);
  const profPadrao =
    filaQ.data?.profissionais.find((p) => p.livre)?.id ?? filaQ.data?.profissionais[0]?.id ?? null;
  const profEscolhido = profChamada ?? profPadrao;

  useEffect(() => {
    idsConhecidos.current = null;
  }, [dia]);
  useEffect(() => {
    const recebido = agenda.data?.fuso;
    if (!recebido || recebido === fuso) return;
    const eraHoje = dia === hojeNoFuso(fusoAnterior.current);
    fusoAnterior.current = recebido;
    setFuso(recebido);
    if (eraHoje) setDia(hojeNoFuso(recebido));
  }, [agenda.data?.fuso, dia, fuso]);

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

  // Todos os profissionais ativos (mesmo sem atendimento no dia), por ID.
  const profissionais = useMemo(() => {
    const ativos = agenda.data?.profissionais;
    if (ativos?.length) return ativos;
    const mapa = new Map<string, string>();
    (agenda.data?.itens ?? []).forEach((i) => {
      if (i.profissionalId) mapa.set(i.profissionalId, i.profissional);
    });
    return [...mapa]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [agenda.data?.profissionais, agenda.data?.itens]);
  const nomeDoProf = (id: string | null) =>
    id ? (profissionais.find((p) => p.id === id)?.nome ?? null) : null;
  const meuId = filaQ.data?.meuProfissionalId ?? null;

  useEffect(() => {
    if (!modoFoco) return;
    const hoje = hojeNoFuso(fuso);
    if (dia !== hoje) setDia(hoje);
    if (meuId && profFiltro !== meuId) setProfFiltro(meuId);
    else if (!meuId && !profFiltro && profissionais[0]) setProfFiltro(profissionais[0].id);
  }, [modoFoco, dia, fuso, meuId, profFiltro, profissionais]);

  // Barbeiro vê a própria agenda por padrão; dono/recepção vê todos.
  useEffect(() => {
    if (filtroInicial.current || !filaQ.data) return;
    filtroInicial.current = true;
    if (meuId) setProfFiltro(meuId);
  }, [filaQ.data, meuId]);

  const itensBase = useMemo(
    () =>
      // Dia ainda não baixado: nunca mostra os cartões do dia anterior debaixo da data nova.
      (agenda.isPlaceholderData ? [] : (agenda.data?.itens ?? []))
        .map((item) => ({ ...item, status: estadosLocais[item.id] ?? item.status }))
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()),
    [agenda.data?.itens, agenda.isPlaceholderData, estadosLocais],
  );
  // Editar horário: arrastar ou esticar só propõe; nada grava até Salvar.
  const relogioDaEdicao = useAgora();
  const ancoraZoomEdicao = useRef<{ id: string; y: number } | null>(null);
  const edicao = useRascunhoDeHorario({
    itens: itensBase,
    dia,
    fuso,
    agora: relogioDaEdicao,
    salvar: (original, novo, avisar) =>
      remarcarPara(original, novo.inicio, original.profissionalId ?? null, true, {
        fim: novo.fim,
        avisarCliente: avisar,
      }),
  });
  // Figaro: o zoom entra ao segurar, acompanha o ponto pressionado e volta ao sair.
  useZoomDaEdicao(edicao.rascunho?.id ?? null, ancoraZoomEdicao);
  const gestoDia = useGestoDia(dia, mudarDia);
  // A Agenda não é desmontada ao trocar de dia (nada pisca e a rolagem fica onde estava).
  // Troca por seta, calendário ou "Hoje": um deslize curto, sem sumir; pelo gesto, nada.
  const palcoDoDia = useRef<HTMLDivElement | null>(null);
  const { ref: refDoGesto, entradaPeloGesto } = gestoDia;
  const refDoPalco = useCallback(
    (el: HTMLDivElement | null) => {
      palcoDoDia.current = el;
      refDoGesto(el);
    },
    [refDoGesto],
  );
  const diaAnterior = useRef(dia);
  useEffect(() => {
    if (diaAnterior.current === dia) return;
    diaAnterior.current = dia;
    const el = palcoDoDia.current;
    if (!el || entradaPeloGesto || prefereMenosMovimento() || typeof el.animate !== "function")
      return;
    const lado = direcaoDia === "anterior" ? -1 : 1;
    el.animate(
      [
        { transform: `translate3d(${lado * 16}px,0,0)`, opacity: 0.6 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
  }, [dia, direcaoDia, entradaPeloGesto]);
  const { aplicar: aplicarRascunho } = edicao;
  const todosItens = useMemo(() => aplicarRascunho(itensBase), [aplicarRascunho, itensBase]);
  const itens = useMemo(
    () => todosItens.filter((item) => !profFiltro || item.profissionalId === profFiltro),
    [todosItens, profFiltro],
  );
  /** Bloqueios cadastrados do dia; os da equipe toda (sem profissional) valem para qualquer coluna. */
  const bloqueiosDoDia = (profissional: string | null) =>
    (agenda.data?.bloqueiosDoDia ?? [])
      .filter((b) => !b.profissional_id || !profissional || b.profissional_id === profissional)
      .map((b) => ({
        id: b.id,
        inicio: b.inicio,
        fim: b.fim,
        motivo: b.motivo,
        profissional: nomeDoProf(b.profissional_id),
      }));

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
      2000,
    );
    return () => window.clearTimeout(t);
  }, [agenda.data?.itens, agenda.isPlaceholderData, dia]);

  const semana = useMemo(() => {
    const dow = (new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, i) => somarDias(dia, i - dow));
  }, [dia]);

  const [calAberto, setCalAberto] = useState(false);
  const [mesCal, setMesCal] = useState(() => mesDoDia(dia));
  const [mostrarDica, setMostrarDica] = useState(false);
  useEffect(() => {
    if (dicaDaAgendaVista()) return;
    setMostrarDica(true);
    marcarDicaDaAgendaVista();
  }, []);
  const ativos = itens.filter((item) => item.status === "na_cadeira");
  const itemSelecionado = todosItens.find((item) => item.id === selecionado) ?? null;

  async function sincronizar() {
    // Criar, cancelar, remarcar, falta ou pagar mudam também a comanda/ticket.
    invalidarComandas(queryClient);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agenda-dia"] }),
      queryClient.invalidateQueries({ queryKey: ["agenda-periodo"] }),
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

  async function chamarFila() {
    setSugestaoFila(false);
    setOcupado(true);
    try {
      const r = await chamarProximoDaFila({
        data: { profissionalId: souRecepcao ? profEscolhido : null, filaId: null },
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
    const limpar = () =>
      setEstadosLocais((mapa) => {
        const proximo = { ...mapa };
        delete proximo[item.id];
        return proximo;
      });
    if (oferecerUndo) {
      comDesfazer(
        `${item.cliente}: ${novo === "na_cadeira" ? rotuloAtendimento : (ROTULO_ESTADO[novo] ?? novo)}.`,
        async () => {
          setEstadosLocais((mapa) => ({ ...mapa, [item.id]: anterior }));
          try {
            if (pedido) await pedido.catch(() => undefined);
            await mudarEstado({
              data: {
                agendamentoId: item.id,
                estado: anterior,
                estadoAnterior: novo,
                desfazer: true,
              },
            });
            await sincronizar();
          } catch (e) {
            aviso.erro(e instanceof Error ? e.message : "Não foi possível desfazer.");
          } finally {
            limpar();
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
      setEstadosLocais((mapa) => {
        if (mapa[item.id] !== novo) return mapa;
        const proximo = { ...mapa };
        delete proximo[item.id];
        return proximo;
      });
      if ((novo === "cancelado" || novo === "nao_compareceu") && chegada.length > 0)
        setSugestaoFila(true);
    } catch {
      limpar();
      toast.dismiss();
      aviso.erro("Não foi possível mudar o atendimento. A agenda voltou ao estado anterior.");
    } finally {
      setOcupado(false);
    }
  }

  function iniciar(item: AgendaItem) {
    const outro = todosItens.find(
      (atual) =>
        atual.status === "na_cadeira" &&
        atual.id !== item.id &&
        atual.profissionalId === item.profissionalId,
    );
    if (outro) setConflito({ atual: outro, novo: item });
    else void transicionar(item, "na_cadeira");
  }

  function abrir(id: string | null) {
    setAcaoPainel(null);
    setSelecionado(id);
    setPainelAberto(Boolean(id));
  }
  function abrirAcao(item: AgendaItem, acao: "remarcar" | "cancelar") {
    setAcaoPainel(acao);
    setSelecionado(item.id);
    setPainelAberto(true);
  }
  function fecharPainel() {
    setPainelAberto(false);
    setSelecionado(null);
  }

  /**
   * Remarca para um instante/profissional (e, opcionalmente, nova duração); desfazer volta ao
   * horário, duração e profissional anteriores. Devolve se gravou.
   */
  async function remarcarPara(
    item: AgendaItem,
    novoInicio: string,
    profissionalId: string | null,
    desfazivel = true,
    opcoes: { fim?: string; avisarCliente?: boolean } = {},
  ): Promise<boolean> {
    const duracaoAtual = new Date(item.fim).getTime() - new Date(item.inicio).getTime();
    const novoFim =
      opcoes.fim ?? new Date(new Date(novoInicio).getTime() + duracaoAtual).toISOString();
    const novaDuracaoMin = Math.round(
      (new Date(novoFim).getTime() - new Date(novoInicio).getTime()) / 60_000,
    );
    const mudouDuracao =
      new Date(novoFim).getTime() - new Date(novoInicio).getTime() !== duracaoAtual;
    queryClient.setQueryData<AgendaDia>(["agenda-dia", dia], (atual) =>
      atual
        ? {
            ...atual,
            itens: atual.itens.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    inicio: novoInicio,
                    fim: novoFim,
                    profissionalId: profissionalId ?? i.profissionalId ?? null,
                    profissional: nomeDoProf(profissionalId) ?? i.profissional,
                  }
                : i,
            ),
          }
        : atual,
    );
    try {
      await moverAgendamento({
        data: {
          agendamentoId: item.id,
          novoInicio,
          inicioOriginal: item.inicio,
          fimOriginal: item.fim,
          profissionalId,
          ...(mudouDuracao ? { novaDuracaoMin } : {}),
          ...(opcoes.avisarCliente !== undefined ? { avisarCliente: opcoes.avisarCliente } : {}),
        },
      });
      if (desfazivel) {
        const outroDia =
          new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date(novoInicio)) !== dia;
        const soDuracao = novoInicio === item.inicio;
        comDesfazer(
          soDuracao
            ? `Duração alterada · ${item.cliente} até ${hora(novoFim, fuso)}`
            : `Remarcado · ${item.cliente} ${outroDia ? `em ${dataEditorial(new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date(novoInicio)))} ` : ""}às ${hora(novoInicio, fuso)}`,
          async () => {
            await remarcarPara(
              { ...item, inicio: novoInicio, fim: novoFim },
              item.inicio,
              item.profissionalId ?? null,
              false,
              {
                fim: item.fim,
                ...(opcoes.avisarCliente !== undefined
                  ? { avisarCliente: opcoes.avisarCliente }
                  : {}),
              },
            );
          },
        );
      }
      return true;
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não foi possível remarcar.");
      return false;
    } finally {
      await sincronizar();
    }
  }

  function moverPorArrasto(item: AgendaItem, deltaMin: number) {
    edicao.propor(item.id, deltaMin);
  }
  function iniciarEdicaoPorGesto(item: AgendaItem, yDoToque?: number) {
    ancoraZoomEdicao.current = typeof yDoToque === "number" ? { id: item.id, y: yDoToque } : null;
    edicao.iniciar(item.id);
  }
  function atualizarYDoGesto(id: string, yDoToque: number) {
    if (ancoraZoomEdicao.current?.id !== id) return;
    ancoraZoomEdicao.current = { id, y: yDoToque };
  }
  // Toque curto fora do cartão e das barras sai do modo de edição, como no Figaro (spec 2-agenda §6,
  // "Toque fora"). Só toque no celular: um toque longo arma o cartão e arrastar não conta como toque.
  const descartarEdicao = useRef(edicao.descartar);
  descartarEdicao.current = edicao.descartar;
  const editando = Boolean(edicao.rascunho);
  useEffect(() => {
    if (!editando) return;
    let toque: { id: number; x: number; y: number; t: number } | null = null;
    const comecar = (e: PointerEvent) => {
      toque =
        e.pointerType === "mouse" || !e.isPrimary
          ? null
          : { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const terminar = (e: PointerEvent) => {
      const inicio = toque;
      toque = null;
      if (!inicio || e.pointerId !== inicio.id) return;
      if (performance.now() - inicio.t > 300) return;
      if (Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 8) return;
      const alvo = e.target instanceof Element ? e.target : null;
      if (
        !alvo ||
        alvo.closest(
          '[data-agendamento],[data-edicao-ui],button,a,input,select,textarea,[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]',
        )
      )
        return;
      descartarEdicao.current();
    };
    document.addEventListener("pointerdown", comecar, true);
    document.addEventListener("pointerup", terminar, true);
    return () => {
      document.removeEventListener("pointerdown", comecar, true);
      document.removeEventListener("pointerup", terminar, true);
    };
  }, [editando]);
  function redimensionarPorAlca(item: AgendaItem, deltaMin: number) {
    edicao.propor(item.id, 0, deltaMin);
  }

  async function verificarRemarcar(item: AgendaItem, pedido: PedidoRemarcar) {
    const r = await moverAgendamento({
      data: {
        agendamentoId: item.id,
        novoInicio: isoNoFusoDaBarbearia(pedido.dia, pedido.hora, fuso),
        inicioOriginal: item.inicio,
        fimOriginal: item.fim,
        profissionalId: pedido.profissionalId,
        apenasVerificar: true,
      },
    });
    return Boolean(r.livre);
  }

  const carregandoInicial = agenda.isLoading && !agenda.data;
  // Celular: deixa a lista de cartões pronta em segundo plano; a troca da linha do tempo para os cartões
  // não passa por um carregamento.
  const hojeDaLista = hojeNoFuso(fuso);
  useEffect(() => {
    if (!celular || carregandoInicial) return;
    const id = window.setTimeout(
      () => void queryClient.prefetchInfiniteQuery(opcoesAgendaPeriodo(hojeDaLista)),
      1500,
    );
    return () => window.clearTimeout(id);
  }, [celular, carregandoInicial, hojeDaLista, queryClient]);
  const erroInicial = agenda.isError && !agenda.data;
  const mensagemErro = agenda.error instanceof Error ? agenda.error.message : undefined;
  // Identidades estáveis para a linha do tempo memorizada (veja useFuncaoEstavel).
  const abrirEstavel = useFuncaoEstavel(abrir);
  const moverEstavel = useFuncaoEstavel(moverPorArrasto);
  const redimensionarEstavel = useFuncaoEstavel(redimensionarPorAlca);
  const editarEstavel = useFuncaoEstavel(iniciarEdicaoPorGesto);
  const atualizarYEstavel = useFuncaoEstavel(atualizarYDoGesto);
  const horarioVazioGeralEstavel = useFuncaoEstavel((h: string) => {
    setHoraVazia(h);
    setProfVazio(null);
    setManualAberto(true);
  });
  const cartaoEmEdicaoMemo = useMemo(
    () =>
      edicao.original
        ? {
            id: edicao.original.id,
            motivo: edicao.textoDoMotivo,
            // O cartão desenha o fantasma do horário original quando o horário mostrado muda.
            original: { inicio: edicao.original.inicio, fim: edicao.original.fim },
          }
        : undefined,
    [edicao.original, edicao.textoDoMotivo],
  );
  const bloqueiosDoDiaGeral = useMemo(
    () => bloqueiosDoDia(profFiltro),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depende só dos dados e do filtro
    [agenda.data?.bloqueiosDoDia, profFiltro, profissionais],
  );
  const vizinhosMemo = useMemo(
    () =>
      celular ? (
        <CamadasVizinhas
          diaAtual={dia}
          profissionalId={profFiltro}
          discreto={modoDiscreto}
          diaCompleto
        />
      ) : undefined,
    [celular, dia, profFiltro, modoDiscreto],
  );
  const faixa = (
    <FaixaConexao
      online={online}
      origem={agenda.data?.origem}
      salvoEm={agenda.data?.salvoEm}
      fuso={fuso}
    />
  );

  function abrirAgendamentoPorVoz() {
    setMenuAberto(false);
    setPainelAberto(false);
    setSelecionado(null);
    setVozAberta(true);
  }

  const menuAcoes = (
    <MenuAcoesAgenda
      aberto={menuAberto}
      onAberto={setMenuAberto}
      fila={chegada.length}
      proximoDaFila={chegada[0] ? nomeDaAgenda(chegada[0].cliente, modoDiscreto) : undefined}
      mostrarFila={mostrarFila}
      online={online}
      ocupado={ocupado}
      onNovoAgendamento={() => setManualAberto(true)}
      onEncaixe={() => setRapidoAberto(true)}
      onChamarFila={() => void chamarFila()}
      onBloquear={() => setBloquearAberto(true)}
      onNovoCliente={() => {
        setNovoCliente(true);
        setManualAberto(true);
      }}
      {...(vozSuportada ? { onAgendarPorVoz: abrirAgendamentoPorVoz } : {})}
      comBotaoFechar={!modoFoco}
      visivel={acoesFlutuantesVisiveis && !edicao.rascunho}
    />
  );

  // Folhas e diálogos compartilhados pelas duas telas (normal e Modo Foco).
  const compartilhados = (
    <>
      {vozAberta ? (
        <Suspense fallback={null}>
          <AssistenteCortaiLazy
            segmento={segmentoParaApresentacao(segmentoAgenda)}
            iniciarPorVoz
            onFechar={() => setVozAberta(false)}
          />
        </Suspense>
      ) : null}
      <PainelAtendimento
        item={itemSelecionado}
        aberto={painelAberto}
        onFechar={fecharPainel}
        iniciarEm={acaoPainel}
        lateral={ehDesktop && !modoFoco}
        fuso={fuso}
        online={online}
        ocupado={ocupado}
        passoMin={passoMin}
        profissionais={profissionais}
        onChegou={(i) => void transicionar(i, "chegou")}
        onIniciar={iniciar}
        onComanda={(i) => {
          setVoltarParaFicha(i.id);
          setFechando(i.id);
        }}
        onVerComanda={(i, comandaId) => {
          setVoltarParaFicha(i.id);
          setTicketAberto(comandaId);
        }}
        onFalta={(i) => void transicionar(i, "nao_compareceu")}
        onCancelar={(i) => void transicionar(i, "cancelado")}
        onPerfil={setPerfil}
        onVerificar={verificarRemarcar}
        onRemarcar={async (i, p) => {
          await remarcarPara(i, isoNoFusoDaBarbearia(p.dia, p.hora, fuso), p.profissionalId);
        }}
      />
      <FolhaDoTicket
        comandaId={ticketAberto}
        onFechar={() => {
          setTicketAberto(null);
          const volta = voltarParaFicha;
          setVoltarParaFicha(null);
          if (volta && todosItens.some((item) => item.id === volta)) abrir(volta);
        }}
      />
      {menuAcoes}
      <BloquearHorarioSheet
        aberto={bloquearAberto}
        onAberto={setBloquearAberto}
        dia={dia}
        horarios={agenda.data?.horarios ?? []}
        profissionais={agenda.data?.profissionais ?? []}
        fuso={fuso}
      />
      <AjustarIntervaloSheet
        aberto={intervaloAberto}
        onAberto={setIntervaloAberto}
        dia={dia}
        fuso={fuso}
        horarios={agenda.data?.horarios ?? []}
        intervaloPersonalizado={agenda.data?.intervaloPersonalizado ?? null}
      />
      {bloqueioSelecionado ? (
        <DetalheBloqueioSheet
          aberto
          bloqueio={bloqueioSelecionado}
          dia={dia}
          fuso={fuso}
          onAberto={(aberto) => {
            if (!aberto) setBloqueioSelecionado(null);
          }}
        />
      ) : null}
      <FolhaFila
        aberta={filaAberta}
        onAberta={setFilaAberta}
        chegada={chegada}
        profissionais={souRecepcao && filaQ.data ? filaQ.data.profissionais : null}
        profEscolhido={profEscolhido}
        onProf={setProfChamada}
        ocupado={ocupado}
        online={online}
        onChamar={() => {
          setFilaAberta(false);
          void chamarFila();
        }}
        onPerfil={setPerfil}
        discreto={modoDiscreto}
      />
      {manualAberto ? (
        <div className="agenda-manual-auto">
          <Suspense fallback={null}>
            <AgendamentoManualLazy
              key={`${dia}-${horaVazia ?? ""}-${profVazio ?? ""}`}
              dia={dia}
              {...(horaVazia ? { horaInicial: horaVazia } : {})}
              profissionalInicial={nomeDoProf(profVazio ?? profFiltro ?? meuId)}
              iniciarNovoCliente={novoCliente}
              autoAbrir
              rotulo="Novo agendamento"
              onFechar={() => {
                setManualAberto(false);
                setNovoCliente(false);
                setHoraVazia(undefined);
                setProfVazio(null);
              }}
              onCriado={(agendamentoId) => {
                setManualAberto(false);
                setNovoCliente(false);
                setHoraVazia(undefined);
                setProfVazio(null);
                void sincronizar().then(() => abrir(agendamentoId));
              }}
            />
          </Suspense>
        </div>
      ) : null}
      <AlertDialog open={Boolean(conflito)} onOpenChange={(aberto) => !aberto && setConflito(null)}>
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
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (conflito) void transicionar(conflito.novo, "na_cadeira");
                setConflito(null);
              }}
            >
              Manter os dois
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (conflito) {
                  setIniciarDepois(conflito.novo.id);
                  setFechando(conflito.atual.id);
                }
                setConflito(null);
              }}
            >
              Finalizar e cobrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={focoTrancado} onOpenChange={setFocoTrancado}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="size-4" aria-hidden /> Modo Foco
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tela cheia com o atendimento atual, cronômetro e próximo cliente. Faz parte do plano
              Profissional. A agenda continua completa no seu plano atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction onClick={() => void navigate({ to: "/barbeiro/plano" })}>
              Ver planos
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
              const volta = voltarParaFicha;
              setVoltarParaFicha(null);
              if (volta && todosItens.some((item) => item.id === volta)) abrir(volta);
            }}
            onConcluido={() => {
              const proximo = todosItens.find((item) => item.id === iniciarDepois);
              setFechando(null);
              setIniciarDepois(null);
              setVoltarParaFicha(null);
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
            segmento={segmentoAgenda}
          />
        ) : null}
      </Suspense>
    </>
  );

  const focoAtivo = modoFoco;
  if (focoAtivo) {
    return (
      <Screen title="Agenda" hideHeader wide assinaturaSoComputador>
        {faixa}
        <AgendaFocoMobile
          fuso={fuso}
          itens={itens}
          profissional={profFiltro}
          profissionais={profissionais}
          podeEscolherProfissional={!meuId}
          online={online}
          ocupado={ocupado}
          carregando={carregandoInicial}
          erro={erroInicial ? (mensagemErro ?? "Tente novamente.") : null}
          onSair={() => {
            sairDoModoFoco();
          }}
          onProfissional={setProfFiltro}
          onChegou={(item) => void transicionar(item, "chegou")}
          onComecar={iniciar}
          onTerminar={(item) => setFechando(item.id)}
          onFalta={(item) => void transicionar(item, "nao_compareceu")}
          onRemarcar={(item) => abrirAcao(item, "remarcar")}
          onCancelar={(item) => abrirAcao(item, "cancelar")}
          onMaisOpcoes={(item) => abrir(item.id)}
          fila={chegada.length}
          onChamarFila={() => void chamarFila()}
          onNovoAtendimento={() => setRapidoAberto(true)}
          onReceber={(item) => setFechando(item.id)}
          pagamentosPendentes={new Set(aReceber.map((item) => item.agendamentoId))}
          onTentarNovamente={() => void agenda.refetch()}
          discreto={modoDiscreto}
        />
        {compartilhados}
      </Screen>
    );
  }

  const abas: { id: Visualizacao; rotulo: string; soDesktop?: boolean }[] = [
    { id: "timeline", rotulo: "Timeline" },
    { id: "lista", rotulo: "Lista" },
    { id: "semana", rotulo: "Semana", soDesktop: true },
  ];
  const abasVisiveis = abas.filter((a) => !a.soDesktop || !celular);
  function teclasAbas(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const atual = abasVisiveis.findIndex((a) => a.id === visualizacao);
    const n = abasVisiveis.length;
    const proximo =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? n - 1
          : (atual + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    const alvo = abasVisiveis[proximo];
    if (!alvo) return;
    alterarVisualizacao(alvo.id);
    document.getElementById(`agenda-aba-${alvo.id}`)?.focus();
  }

  // Celular: uma timeline só; trocar profissional apenas filtra. Colunas só em telas largas.
  const colunas =
    !celular && visualizacao === "timeline" && !profFiltro && profissionais.length > 1;
  const diaSemAgenda =
    !carregandoInicial &&
    !erroInicial &&
    !colunas &&
    (visualizacao === "timeline" ? todosItens.length === 0 : itens.length === 0);

  return (
    <Screen title="Agenda" hideHeader wide assinaturaSoComputador>
      <AnimatePresence initial={false}>
        {edicao.rascunho && !celular ? (
          <TransicaoVerticalDoModoEdicao key="edicao-topo-desktop" direcao="topo">
            <CabecalhoDeEdicao dia={dia} />
          </TransicaoVerticalDoModoEdicao>
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {edicao.rascunho && edicao.original && edicao.novo ? (
          <BarraDeEdicaoDeHorario
            key="barra-edicao-horario"
            cliente={edicao.original.cliente}
            inicio={edicao.novo.inicio}
            fim={edicao.novo.fim}
            fuso={fuso}
            motivo={edicao.textoDoMotivo}
            avisar={edicao.rascunho.avisar}
            salvando={edicao.salvando}
            salvo={edicao.salvo}
            semMudanca={edicao.semMudanca}
            onAvisar={edicao.definirAviso}
            onDescartar={edicao.descartar}
            onSalvar={() => void edicao.confirmar()}
          />
        ) : null}
      </AnimatePresence>
      <div
        className="agenda-operacional pb-32"
        data-direcao={direcaoDia}
        data-entrada={entradaPeloGesto ? "gesto" : undefined}
        ref={refDoPalco}
      >
        {celular ? (
          <>
            {/* O painel de edição fica sempre no centro do topo, com a própria entrada e saída (desce e sobe como
                as gavetas, levando o fundo junto); a faixa da semana fica no lugar dela, como antes, sem animar. */}
            <NaBarraDoTopo alvoId="topo-centro">
              <AnimatePresence initial={false}>
                {edicao.rascunho ? (
                  <TransicaoVerticalDoModoEdicao
                    key="edicao-topo-mobile"
                    className="w-full"
                    direcao="topo"
                  >
                    <CabecalhoDeEdicao
                      dia={dia}
                      naBarra
                      onReagendar={() => {
                        const original = edicao.original;
                        edicao.descartar();
                        if (original) abrirAcao(original, "remarcar");
                      }}
                    />
                  </TransicaoVerticalDoModoEdicao>
                ) : null}
              </AnimatePresence>
            </NaBarraDoTopo>
            <NaBarraDoTopo alvoId="topo-baixo">
              {edicao.rascunho ? null : (
                <div className="w-full">
                  <RecolheNaLista visivel={visualizacao !== "lista"}>
                    <SemanaDoTopo
                      dia={dia}
                      hoje={hojeNoFuso(fuso)}
                      profissionalId={profFiltro}
                      onDia={mudarDia}
                      expandido={calAberto}
                      onExpandido={setCalAberto}
                    />
                  </RecolheNaLista>
                </div>
              )}
            </NaBarraDoTopo>
          </>
        ) : null}
        <CabecalhoAgenda
          dia={dia}
          ehHoje={ehHoje}
          onDia={mudarDia}
          onHoje={() => mudarDia(hojeNoFuso(fuso))}
          fila={chegada.length}
          onFila={() => setFilaAberta(true)}
          mostrarFila={mostrarFila}
          onModoFoco={entrarNoModoFoco}
          focoNoPlano={(celular || focoNoPlano) && !focoDesligado}
          visualizacao={visualizacao}
          onVisualizacao={alterarVisualizacao}
          mostrarSemana={!celular}
          ocultarSeletor={faixaCelular}
          celular={celular}
          onTeclasVisualizacao={teclasAbas}
          discreto={modoDiscreto}
          onDiscreto={alternarModoDiscreto}
          tituloCelular={tituloDoMes(dia)}
          emEdicao={Boolean(edicao.rascunho)}
          calendarioAberto={calAberto}
          onCalendario={() => {
            setMesCal(mesDoDia(dia));
            setCalAberto((v) => !v);
          }}
          resumo={
            agenda.data ? (
              <ResumoDia
                itens={itens}
                horarios={agenda.data.horarios}
                dia={dia}
                fuso={fuso}
                passoMin={passoMin}
                profissionalIds={profFiltro ? [profFiltro] : profissionais.map((p) => p.id)}
                ehHoje={ehHoje}
                fila={chegada.length}
                rotuloAtendimento={rotuloAtendimento}
              />
            ) : (
              " "
            )
          }
        >
          {/* Celular: como no Figaro, a troca de agenda fica na foto da barra de baixo. */}
          {profissionais.length > 1 && !celular ? (
            <SeletorProfissionais
              profissionais={profissionais}
              itens={todosItens}
              selecionado={profFiltro}
              onSelecionar={(id) => {
                setProfFiltro(id);
                setCalAberto(false);
              }}
            />
          ) : null}
        </CabecalhoAgenda>

        {faixa}

        {/* A altura que antes pertencia ao rótulo "Agora · Livre" passa a integrar o respiro
            inferior do calendário compacto; assim a grade não salta ao trocar o dia. */}

        {sugestaoFila && chegada.length > 0 ? (
          <div className="agenda-sugestao-fila mb-4" role="status">
            <p className="text-sm font-semibold text-paper">
              Horário liberado. Chamar{" "}
              {chegada[0] ? nomeDaAgenda(chegada[0].cliente, modoDiscreto) : "cliente"} da fila?
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                className="min-h-11"
                disabled={ocupado || !online}
                onClick={() => void chamarFila()}
              >
                Chamar da fila
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11"
                onClick={() => setSugestaoFila(false)}
              >
                Agora não
              </Button>
            </div>
          </div>
        ) : null}

        <div
          id="agenda-painel-visualizacao"
          aria-label={`Visualização ${visualizacao}`}
          className="relative"
        >
          {/* Celular, como no vídeo do dono: a timeline sai subindo e esmaecendo enquanto a lista
              entra subindo no lugar (as duas ao mesmo tempo). */}
          <TrocaDeVisualizacao chave={celular && visualizacao === "lista" ? "lista" : "grade"}>
            {carregandoInicial ? (
              <AgendaCarregando formato={visualizacao === "lista" ? "lista" : "timeline"} />
            ) : erroInicial ? (
              <AgendaErro mensagem={mensagemErro} onTentar={() => void agenda.refetch()} />
            ) : visualizacao === "semana" && !celular ? (
              <AgendaSemana
                semana={semana}
                fuso={fuso}
                hoje={hojeNoFuso(fuso)}
                profissional={nomeDoProf(profFiltro)}
                onAbrirDia={(d) => {
                  mudarDia(d);
                  alterarVisualizacao("timeline");
                }}
              />
            ) : diaSemAgenda && !celular ? (
              <AgendaVazia
                titulo="Sem atendimentos neste dia"
                texto={`${dataEditorial(dia)} · não há horários marcados para esta data. Seus agendamentos de outros dias continuam salvos na agenda.`}
              >
                <Button className="min-h-11" onClick={() => setManualAberto(true)}>
                  <Plus /> Novo agendamento
                </Button>
                {ehHoje ? (
                  <Button
                    variant="ghost"
                    className="min-h-11"
                    onClick={() => setRapidoAberto(true)}
                  >
                    Encaixe
                  </Button>
                ) : null}
              </AgendaVazia>
            ) : celular && visualizacao === "lista" && diaSemAgenda ? (
              <ListaPeriodo
                hoje={hojeNoFuso(fuso)}
                fuso={fuso}
                profissionalId={profFiltro}
                mostrarProfissional={!profFiltro && profissionais.length > 1}
                discreto={modoDiscreto}
                selecionado={selecionado}
                onAbrir={(item) => {
                  const doItem = diaNoFuso(item.inicio, fuso);
                  if (doItem !== dia) mudarDia(doItem);
                  abrir(item.id);
                }}
              />
            ) : colunas ? (
              <div
                className="agenda-colunas"
                style={{
                  gridTemplateColumns: `repeat(${profissionais.length}, minmax(${celular ? "176px" : "220px"}, 1fr))`,
                }}
              >
                {profissionais.map((p) => (
                  <section key={p.id} className="min-w-0" aria-label={p.nome}>
                    <Button
                      variant="ghost"
                      className="agenda-coluna-titulo"
                      onClick={() => setProfFiltro(p.id)}
                    >
                      {p.nome}
                    </Button>
                    <AgendaTimeline
                      dia={dia}
                      fuso={fuso}
                      itens={itens.filter((item) => item.profissionalId === p.id)}
                      itensEscala={itens}
                      bloqueiosDoDia={bloqueiosDoDia(p.id)}
                      alinhado
                      horarios={agenda.data?.horarios ?? []}
                      intervaloPersonalizado={agenda.data?.intervaloPersonalizado ?? null}
                      onAbrirIntervalo={
                        dia >= hojeNoFuso(fuso) ? () => setIntervaloAberto(true) : undefined
                      }
                      onAbrirBloqueio={(bloqueio) => setBloqueioSelecionado(bloqueio)}
                      selecionado={selecionado}
                      onSelecionar={abrirEstavel}
                      onMover={moverEstavel}
                      onRedimensionar={redimensionarEstavel}
                      onEditar={editarEstavel}
                      onAtualizarYDoToque={atualizarYEstavel}
                      passoMin={passoMin}
                      edicaoDoCartao={cartaoEmEdicaoMemo}
                      onHorarioVazio={(h) => {
                        setHoraVazia(h);
                        setProfVazio(p.id);
                        setManualAberto(true);
                      }}
                      destaques={novos}
                      mostrarProfissional={false}
                      discreto={modoDiscreto}
                      diaCompleto={celular}
                    />
                  </section>
                ))}
              </div>
            ) : visualizacao !== "lista" ? (
              <>
                {celular ? (
                  // Captura do Figaro (29/10): os pontinhos ficam 7 px acima da linha do 00.
                  <MarcaDoLimiteDoDia
                    className="mb-[-9px] mt-[6.5px]"
                    carregando={agenda.isFetching}
                    naPagina
                  />
                ) : null}
                <AgendaTimeline
                  dia={dia}
                  fuso={fuso}
                  itens={itens}
                  itensEscala={todosItens}
                  bloqueiosDoDia={bloqueiosDoDiaGeral}
                  horarios={agenda.data?.horarios ?? []}
                  intervaloPersonalizado={agenda.data?.intervaloPersonalizado ?? null}
                  onAbrirIntervalo={
                    dia >= hojeNoFuso(fuso) ? () => setIntervaloAberto(true) : undefined
                  }
                  selecionado={selecionado}
                  onSelecionar={abrirEstavel}
                  onMover={moverEstavel}
                  onRedimensionar={redimensionarEstavel}
                  onEditar={editarEstavel}
                  onAtualizarYDoToque={atualizarYEstavel}
                  passoMin={passoMin}
                  edicaoDoCartao={cartaoEmEdicaoMemo}
                  onHorarioVazio={horarioVazioGeralEstavel}
                  destaques={novos}
                  mostrarProfissional={!profFiltro && profissionais.length > 1}
                  discreto={modoDiscreto}
                  diaCompleto={celular}
                  vizinhos={vizinhosMemo}
                />
                {celular ? (
                  <MarcaDoLimiteDoDia
                    className="mt-[-2.5px] mb-0.5"
                    carregando={agenda.isFetching}
                    naPagina
                  />
                ) : null}
              </>
            ) : celular ? (
              <ListaPeriodo
                hoje={hojeNoFuso(fuso)}
                fuso={fuso}
                profissionalId={profFiltro}
                mostrarProfissional={!profFiltro && profissionais.length > 1}
                discreto={modoDiscreto}
                selecionado={selecionado}
                onAbrir={(item) => {
                  const doItem = diaNoFuso(item.inicio, fuso);
                  if (doItem !== dia) mudarDia(doItem);
                  abrir(item.id);
                }}
              />
            ) : (
              <ListaAgenda
                itens={itens}
                fuso={fuso}
                ehHoje={ehHoje}
                selecionado={selecionado}
                novos={novos}
                online={online}
                mostrarProfissional={!profFiltro && profissionais.length > 1}
                discreto={modoDiscreto}
                onAbrir={abrir}
                onFalta={(i) => void transicionar(i, "nao_compareceu")}
                onAcao={(i, acao) => {
                  const efeito = efeitoDaAcaoCard(acao);
                  if (efeito === "marcar_chegada") void transicionar(i, "chegou");
                  else if (efeito === "comecar") iniciar(i);
                  else setFechando(i.id);
                }}
              />
            )}
          </TrocaDeVisualizacao>
        </div>

        {visualizacao === "timeline" && agenda.data && mostrarDica ? (
          <p className="mt-0.5 text-center text-[11px] leading-4 text-mute2 opacity-80" role="note">
            Segure para agendar · Segure e arraste para mover
          </p>
        ) : null}

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
                        {nomeDaAgenda(c.cliente, modoDiscreto)}
                      </span>
                      <span className="block truncate text-xs text-mute">
                        {c.profissional} · #{c.numero}
                        {c.pix ? " · Pix a confirmar" : ""}
                      </span>
                    </span>
                    <span className="money-value flex items-center gap-2 text-sm text-paper">
                      <HandCoins aria-hidden className="size-4" />
                      {modoDiscreto ? "R$ •••" : brl(c.total)}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* Celular na grade: os dias vizinhos já entram pelo carrossel dentro da timeline. */}
      {celular && visualizacao !== "lista" && !colunas ? null : (
        <PreviaDoGesto
          refAnterior={gestoDia.refPreviaAnterior}
          refProximo={gestoDia.refPreviaProxima}
          diaAtual={dia}
          visualizacao={visualizacao === "lista" ? "lista" : "timeline"}
          profissionalId={profFiltro}
          discreto={modoDiscreto}
          diaCompleto={celular}
        />
      )}

      <BotaoAgoraPrincipal
        visualizacao={visualizacao}
        onVisualizacao={alterarVisualizacao}
        ehHoje={ehHoje}
        onHoje={() => mudarDia(hojeNoFuso(fuso))}
        menuAberto={menuAberto}
        visivel={acoesFlutuantesVisiveis && !edicao.rascunho}
        {...(vozSuportada ? { onAgendarPorVoz: abrirAgendamentoPorVoz } : {})}
        filtro={
          celular && profissionais.length > 1 ? (
            <FiltroDaAgenda
              profissionais={profissionais}
              selecionado={profFiltro}
              meuId={meuId}
              hoje={hojeNoFuso(fuso)}
              onSelecionar={(id) => {
                setProfFiltro(id);
                setCalAberto(false);
              }}
            />
          ) : undefined
        }
        onAlternarMenu={() => {
          setPainelAberto(false);
          setSelecionado(null);
          setMenuAberto((aberto) => !aberto);
        }}
      />

      {compartilhados}
    </Screen>
  );
}
