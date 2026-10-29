import { lazyComRecuperacao } from "@/lib/pwa/recuperar-chunk";
import { invalidarComandas } from "@/lib/comanda-ticket";
import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChartNoAxesColumn, Clock3, HandCoins, Lock, Plus, UserRoundPlus } from "lucide-react";
import type React from "react";
import { Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { EsqueletoAgenda } from "@/components/layout/Esqueleto";
import { AgendaTimeline } from "@/components/barbeiro/AgendaTimeline";
import { AgendaSemana } from "@/components/barbeiro/AgendaSemana";
import { AgendaFocoMobile } from "@/components/barbeiro/AgendaFocoMobile";
import { efeitoDaAcaoCard } from "@/components/barbeiro/agenda/acao-card";
import { BloquearHorarioSheet } from "@/components/barbeiro/agenda/BloquearHorarioSheet";
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
import { segmentoParaApresentacao } from "@/lib/segmentos";
import { BotaoAgoraPrincipal } from "@/components/barbeiro/agenda/BotaoAgoraPrincipal";
import {
  PainelAtendimento,
  type PedidoRemarcar,
} from "@/components/barbeiro/agenda/PainelAtendimento";
import { ResumoDia } from "@/components/barbeiro/agenda/ResumoDia";
import { SeletorProfissionais } from "@/components/barbeiro/agenda/SeletorProfissionais";
import {
  ROTULO_ESTADO,
  hora,
  minutosDecorridos,
  nomeDaAgenda,
  nomeEhGenerico,
  somarDias,
  dataEditorial,
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
import { BarraDeEdicaoDeHorario } from "@/components/barbeiro/agenda/BarraDeEdicaoDeHorario";
import { CabecalhoDeEdicao } from "@/components/barbeiro/agenda/CabecalhoDeEdicao";
import { MarcaDoLimiteDoDia, SemanaDoTopo } from "@/components/barbeiro/agenda/SemanaDoTopo";
import { NaBarraDoTopo } from "@/components/barbeiro/agenda/NaBarraDoTopo";
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
import { listarBloqueiosDoDia } from "@/lib/bloqueios.functions";
import {
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
import { PreviaDoGesto } from "@/components/barbeiro/agenda/PreviaDiaVizinho";
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
                    <Button
                      variant="ghost"
                      key={p.id}
                      type="button"
                      className={`agenda-chip ${props.profEscolhido === p.id ? "agenda-chip-ativo" : ""}`}
                      onClick={() => props.onProf(p.id)}
                    >
                      {p.nome}
                      {p.livre ? " · livre" : ""}
                    </Button>
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
  const listarBloqueios = useServerFn(listarBloqueiosDoDia);
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
  // Agendar por voz: abre a CortAI já ouvindo. Só existe se o navegador grava áudio.
  const [vozAberta, setVozAberta] = useState(false);
  const [vozSuportada, setVozSuportada] = useState(false);
  useEffect(() => setVozSuportada(comandoDeVozSuportado()), []);
  const [bloquearAberto, setBloquearAberto] = useState(false);
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
    setCalAberto(false);
    setDia(proximo);
  }

  const { agenda, online, aoVivo } = useAgendaDia(dia);
  const bloqueiosQ = useQuery({
    queryKey: ["bloqueios", dia],
    queryFn: () => listarBloqueios({ data: { dia } }),
    enabled: visualizacao === "timeline" && Boolean(agenda.data),
    staleTime: 15_000,
  });
  const gestoDia = useGestoDia(dia, mudarDia);
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

  const segmentoAgenda = agenda.data?.tenant.segmento ?? "barbearia";
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
  const [meuDiaAberto, setMeuDiaAberto] = useState(false);
  const meuDiaQ = useQuery({
    queryKey: ["agenda-meu-dia"],
    queryFn: () => getMeuDia(),
    staleTime: 60_000,
    enabled: ehHoje,
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
      (agenda.data?.itens ?? [])
        .map((item) => ({ ...item, status: estadosLocais[item.id] ?? item.status }))
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()),
    [agenda.data?.itens, estadosLocais],
  );
  // Editar horário: arrastar ou esticar só propõe; nada grava até Salvar.
  const relogioDaEdicao = useAgora();
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
  const { aplicar: aplicarRascunho } = edicao;
  const todosItens = useMemo(() => aplicarRascunho(itensBase), [aplicarRascunho, itensBase]);
  const itens = useMemo(
    () => todosItens.filter((item) => !profFiltro || item.profissionalId === profFiltro),
    [todosItens, profFiltro],
  );
  const bloqueiosVisiveis = useMemo(
    () =>
      (bloqueiosQ.data ?? []).filter(
        (bloqueio) =>
          !profFiltro || !bloqueio.profissionalId || bloqueio.profissionalId === profFiltro,
      ),
    [bloqueiosQ.data, profFiltro],
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
  const cartaoEmEdicao = edicao.original
    ? { id: edicao.original.id, motivo: edicao.textoDoMotivo }
    : undefined;
  function redimensionarPorAlca(item: AgendaItem, deltaMin: number) {
    edicao.propor(item.id, 0, deltaMin);
  }

  async function verificarRemarcar(item: AgendaItem, pedido: PedidoRemarcar) {
    const r = await moverAgendamento({
      data: {
        agendamentoId: item.id,
        novoInicio: isoNoFusoDaBarbearia(pedido.dia, pedido.hora, fuso),
        profissionalId: pedido.profissionalId,
        apenasVerificar: true,
      },
    });
    return Boolean(r.livre);
  }

  const carregandoInicial = agenda.isLoading && !agenda.data;
  const erroInicial = agenda.isError && !agenda.data;
  const mensagemErro = agenda.error instanceof Error ? agenda.error.message : undefined;
  const faixa = (
    <FaixaConexao
      online={online}
      origem={agenda.data?.origem}
      salvoEm={agenda.data?.salvoEm}
      aoVivo={aoVivo}
      temDados={Boolean(agenda.data)}
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
    (visualizacao === "timeline"
      ? todosItens.length === 0 &&
        bloqueiosVisiveis.length === 0 &&
        !bloqueiosQ.isPending &&
        !bloqueiosQ.isError
      : itens.length === 0);

  return (
    <Screen title="Agenda" hideHeader wide assinaturaSoComputador>
      {edicao.rascunho && !celular ? <CabecalhoDeEdicao dia={dia} /> : null}
      {edicao.rascunho && edicao.original && edicao.novo ? (
        <BarraDeEdicaoDeHorario
          cliente={edicao.original.cliente}
          inicio={edicao.novo.inicio}
          fim={edicao.novo.fim}
          fuso={fuso}
          motivo={edicao.textoDoMotivo}
          avisar={edicao.rascunho.avisar}
          salvando={edicao.salvando}
          semMudanca={edicao.semMudanca}
          onAvisar={edicao.definirAviso}
          onDescartar={edicao.descartar}
          onSalvar={() => void edicao.confirmar()}
        />
      ) : null}
      <div
        key={dia}
        className="agenda-operacional agenda-troca-dia pb-32"
        data-direcao={direcaoDia}
        data-entrada={gestoDia.entradaPeloGesto ? "gesto" : undefined}
        ref={gestoDia.ref}
      >
        {celular ? (
          <>
            <NaBarraDoTopo>
              {edicao.rascunho ? (
                <CabecalhoDeEdicao dia={dia} naBarra />
              ) : (
                <SemanaDoTopo
                  dia={dia}
                  hoje={hojeNoFuso(fuso)}
                  profissionalId={profFiltro}
                  onDia={mudarDia}
                  expandido={calAberto}
                  onExpandido={setCalAberto}
                />
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
          {profissionais.length > 1 ? (
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

        {ehHoje && visualizacao === "timeline" && ativos.length === 0 ? (
          <p className="mb-2 text-xs font-semibold text-mute" role="status">
            Agora · Livre
          </p>
        ) : null}

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

        {celular && ehHoje && diaSemAgenda ? (
          <div className="mb-3">
            <PrimeirosPassos />
          </div>
        ) : null}

        <div id="agenda-painel-visualizacao" aria-label={`Visualização ${visualizacao}`}>
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
          ) : diaSemAgenda && !(celular && visualizacao !== "lista") ? (
            <AgendaVazia
              titulo="Agenda livre"
              texto={`${dataEditorial(dia)} · nenhum atendimento marcado`}
            >
              <Button className="min-h-11" onClick={() => setManualAberto(true)}>
                <Plus /> Novo agendamento
              </Button>
              {ehHoje ? (
                <Button variant="ghost" className="min-h-11" onClick={() => setRapidoAberto(true)}>
                  Encaixe
                </Button>
              ) : null}
              {ehHoje ? <PrimeirosPassos /> : null}
            </AgendaVazia>
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
                    bloqueios={bloqueiosQ.data ?? []}
                    profissionalId={p.id}
                    profissionais={[p]}
                    itensEscala={itens}
                    alinhado
                    horarios={agenda.data?.horarios ?? []}
                    selecionado={selecionado}
                    onSelecionar={abrir}
                    onMover={moverPorArrasto}
                    onRedimensionar={redimensionarPorAlca}
                    onEditar={(item) => edicao.iniciar(item.id)}
                    passoMin={passoMin}
                    edicaoDoCartao={cartaoEmEdicao}
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
                <MarcaDoLimiteDoDia className="mb-1" carregando={agenda.isFetching} />
              ) : null}
              <AgendaTimeline
                dia={dia}
                fuso={fuso}
                itens={itens}
                bloqueios={bloqueiosQ.data ?? []}
                profissionalId={profFiltro}
                profissionais={profissionais}
                itensEscala={todosItens}
                horarios={agenda.data?.horarios ?? []}
                selecionado={selecionado}
                onSelecionar={abrir}
                onMover={moverPorArrasto}
                onRedimensionar={redimensionarPorAlca}
                onEditar={(item) => edicao.iniciar(item.id)}
                passoMin={passoMin}
                edicaoDoCartao={cartaoEmEdicao}
                onHorarioVazio={(h) => {
                  setHoraVazia(h);
                  setProfVazio(null);
                  setManualAberto(true);
                }}
                destaques={novos}
                mostrarProfissional={!profFiltro && profissionais.length > 1}
                discreto={modoDiscreto}
                diaCompleto={celular}
              />
              {celular ? (
                <MarcaDoLimiteDoDia className="mt-1" carregando={agenda.isFetching} />
              ) : null}
            </>
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
                {meuDiaQ.data.atendimentos} atend. ·{" "}
                {modoDiscreto ? "R$ •••" : brl(meuDiaQ.data.vendido)}
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
                  <dd className="money-value text-lg text-paper">
                    {modoDiscreto ? "R$ •••" : brl(meuDiaQ.data.vendido)}
                  </dd>
                </div>
                {meuDiaQ.data.temComissao ? (
                  <div>
                    <dt className="text-xs text-mute">Comissão estimada</dt>
                    <dd className="money-value text-lg text-paper">
                      {modoDiscreto ? "R$ •••" : brl(meuDiaQ.data.comissao)}
                    </dd>
                  </div>
                ) : null}
                {meuDiaQ.data.fiado ? (
                  <div>
                    <dt className="text-xs text-mute">No fiado</dt>
                    <dd className="money-value text-lg text-paper">
                      {modoDiscreto ? "R$ •••" : brl(meuDiaQ.data.fiado)}
                    </dd>
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
      </div>

      <PreviaDoGesto
        ref={gestoDia.refPrevia}
        diaAtual={dia}
        visualizacao={visualizacao === "lista" ? "lista" : "timeline"}
        profissionalId={profFiltro}
        discreto={modoDiscreto}
        diaCompleto={celular}
      />

      <BotaoAgoraPrincipal
        visualizacao={visualizacao}
        onVisualizacao={alterarVisualizacao}
        ehHoje={ehHoje}
        onHoje={() => mudarDia(hojeNoFuso(fuso))}
        menuAberto={menuAberto}
        visivel={acoesFlutuantesVisiveis && !edicao.rascunho}
        {...(vozSuportada ? { onAgendarPorVoz: abrirAgendamentoPorVoz } : {})}
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
