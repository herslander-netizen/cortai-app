import { OrigemDoAgendamento } from "@/components/barbeiro/agenda/OrigemDoAgendamento";
import { CalendarX, Clock3 } from "lucide-react";
import { IconeDoEstado } from "@/components/barbeiro/agenda/IconeDoEstado";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  memo,
  useState,
  type ReactNode,
} from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import {
  alturaDoTopoDaAgenda,
  estaAtrasado,
  faixasForaDoExpediente,
  intervaloDoDia,
  nomeDaAgenda,
} from "@/components/barbeiro/agenda/tempo";
import { ladoDoAgora, publicarAgora } from "@/components/barbeiro/agenda/pilula-agora";
import { criarBloqueioDeRolagem } from "@/components/barbeiro/agenda/bloqueio-rolagem";
import { AlcaDeDuracao } from "@/components/barbeiro/agenda/AlcaDeDuracao";
import { PASSO_DO_AJUSTE_MIN, limitesDaAlca, passoDoGesto } from "@/lib/remarcacao-regras";
import {
  aoCorrigirRolagemDoZoom,
  usePincaDaTimeline,
  usePxPorMinuto,
} from "@/components/barbeiro/agenda/zoom-agenda";
import { vibrar } from "@/lib/vibrar";
import { criarToqueLongoVazio } from "@/components/barbeiro/agenda/toque-longo-vazio";
import {
  fantasmaDoHorario,
  formaDoFantasma,
} from "@/components/barbeiro/agenda/fantasma-do-horario";
import {
  corDaCategoria,
  faixaDoCartao,
  glifoDoEstado,
  mostraCliente,
  mostraDetalhes,
  mostraHorario,
  opacidadeDasLinhasDe5,
  ROTULO_DO_GLIFO,
} from "@/components/barbeiro/agenda/cartao-figaro";
import { prefereMenosMovimento } from "@/lib/motion";
import {
  deslocamentoDeRolagem,
  velocidadeDeRolagemNaBorda,
} from "@/components/barbeiro/agenda/rolagem-automatica";

const CELULAR = "(max-width: 600px)";
const celularAgora = () => typeof window !== "undefined" && window.matchMedia(CELULAR).matches;

/** Área livre do celular: abaixo do cabeçalho que gruda e acima do controle do pé. */
function areaLivre() {
  const topo = alturaDoTopoDaAgenda();
  const controle = document.querySelector<HTMLElement>(".agenda-botao-agora-principal");
  const base = controle ? controle.getBoundingClientRect().top - 8 : window.innerHeight;
  return { top: topo, bottom: Math.max(topo + 1, base) };
}

type HorarioFuncionamento = {
  diaSemana: number;
  fechado: boolean;
  abre: string;
  fecha: string;
  intervaloInicio?: string | null;
  intervaloFim?: string | null;
};

type AgendaTimelineProps = {
  dia: string;
  fuso: string | undefined;
  agora?: number;
  itens: AgendaItem[];
  horarios: HorarioFuncionamento[];
  selecionado: string | null;
  onSelecionar: (id: string) => void;
  /** Mantido por compatibilidade; a timeline mostra só estados especiais. */
  renderStatus?: (status: string) => ReactNode;
  onMover?: (item: AgendaItem, deltaMin: number) => void;
  /** Esticar ou encurtar a duração pela alça da base do cartão (variação em minutos). */
  onRedimensionar?: (item: AgendaItem, deltaMin: number) => void;
  /** Segurar o cartão sem arrastar (toque): entra no modo de editar horário. */
  onEditar?: (item: AgendaItem, yDoToque?: number) => void;
  /** Atualiza a âncora do zoom no dedo em movimento sem reabrir o rascunho. */
  onAtualizarYDoToque?: (id: string, yDoToque: number) => void;
  /** Passo do negócio, em minutos (o arrasto e a alça andam sempre de 5 em 5; veja `passoDoGesto`). */
  passoMin?: number;
  /** Cartão em edição: mostra o intervalo novo ou o motivo de não poder salvar. */
  /** Cartão em edição e o horário original dele (ISO), para o fantasma. */
  edicaoDoCartao?: { id: string; original?: { inicio: string; fim: string } } | undefined;
  onHorarioVazio?: (horaMin: string) => void;
  destaques?: Set<string>;
  itensEscala?: AgendaItem[];
  alinhado?: boolean;
  mostrarProfissional?: boolean;
  discreto?: boolean;
  /** Prévia só de leitura (dia vizinho no gesto): sem efeitos, ponteiros nem cápsula. */
  previa?: boolean;
  /** Celular 3.0: sempre de 00:00 a 23:00, rola até o agora (hoje) ou à abertura. */
  diaCompleto?: boolean;
  /**
   * Troca de dia em páginas (celular): os dias vizinhos ficam ao lado, cada um com as próprias
   * horas. A página inteira desliza com o dedo (`useGestoDia`).
   */
  vizinhos?: ReactNode;
  /** Página de um dia vizinho dentro da troca de dia: sem rolagem própria nem alinhamento. */
  emCamada?: boolean;
  /** Bloqueios do dia (já filtrados para esta coluna): faixa visual, sem ponteiros. */
  bloqueiosDoDia?: {
    id: string;
    inicio: string;
    fim: string;
    motivo: string | null;
    /** Nome de quem está bloqueado (Figaro: "Bloqueio · Lucas"); sem ele, o bloqueio vale para todos. */
    profissional?: string | null;
  }[];
  /** Intervalo alterado apenas para a data selecionada. */
  intervaloPersonalizado?: { inicio: string; fim: string } | null;
  /** Abre os ajustes rápidos do intervalo da data selecionada. */
  onAbrirIntervalo?: (() => void) | undefined;
  /** Tocar no bloqueio abre os detalhes e permite liberar o horário com confirmação. */
  onAbrirBloqueio?: (bloqueio: {
    id: string;
    inicio: string;
    fim: string;
    motivo: string | null;
  }) => void;
};

const MARGEM_AGORA_MIN = 90;
const ESPACO_ENTRE_BLOCOS = 6;
/** Altura mínima do cartão (Figaro `MinCardHeight`). */
const ALTURA_MINIMA_DO_CARTAO = 28;
const RESPIRO_DO_CARTAO = 1;

function minutosDoHorario(valor: string) {
  const [hora = 0, minuto = 0] = valor.split(":").map(Number);
  return hora * 60 + minuto;
}

function minutosNoFuso(valor: string | number, fuso?: string) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: fuso,
  }).formatToParts(new Date(valor));
  const hora = Number(partes.find((parte) => parte.type === "hour")?.value ?? 0);
  const minuto = Number(partes.find((parte) => parte.type === "minute")?.value ?? 0);
  return hora * 60 + minuto;
}

function horaMinuto(total: number) {
  const normalizado = Math.max(0, Math.min(24 * 60, total));
  const hora = Math.floor(normalizado / 60);
  const minuto = normalizado % 60;
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

function horaReal(valor: string | null, fuso?: string) {
  return valor ? horaMinuto(minutosNoFuso(valor, fuso)) : null;
}

function diaDaSemana(dia: string) {
  return new Date(`${dia}T12:00:00Z`).getUTCDay();
}

function AgendaTimelineBase({
  dia,
  fuso,
  agora: agoraProp,
  itens,
  horarios,
  selecionado,
  onSelecionar,
  onMover,
  onRedimensionar,
  onEditar,
  onAtualizarYDoToque,
  passoMin,
  edicaoDoCartao,
  onHorarioVazio,
  destaques,
  itensEscala,
  alinhado: alinhadoPedido,
  mostrarProfissional = false,
  discreto = false,
  previa = false,
  diaCompleto = false,
  vizinhos,
  emCamada = false,
  bloqueiosDoDia = [],
  intervaloPersonalizado,
  onAbrirIntervalo,
  onAbrirBloqueio,
}: AgendaTimelineProps) {
  const relogio = useAgora();
  const agora = agoraProp ?? relogio;
  // Como no Figaro: no dia completo (celular) os cartões ficam sempre no horário real, com colunas
  // na sobreposição. Empilhar somava espaço depois dos cartões curtos e as horas de um dia ficavam
  // em outra altura que as do dia vizinho na troca de dia.
  const alinhado = Boolean(alinhadoPedido || diaCompleto);
  const [toqueVazio, setToqueVazio] = useState<number | null>(null);
  const rolagemRef = useRef<HTMLDivElement>(null);
  // Escala da grade (pixels por minuto): muda com a pinça de dois dedos (zoom-agenda.ts).
  const PX_POR_MINUTO = usePxPorMinuto(!previa);
  const gradeRef = useRef<HTMLDivElement>(null);
  const linhaAgoraRef = useRef<HTMLDivElement>(null);
  const posicionouRef = useRef<string | null>(null);
  const [agoraVisivel, setAgoraVisivel] = useState(true);
  const [arrasto, setArrasto] = useState<{ id: string; dy: number } | null>(null);
  const [redim, setRedim] = useState<{ id: string; dy: number } | null>(null); // Desempenho (Figaro só move o cartão arrastado, sem recompor a lista): o estado só muda quando o PASSO
  // arredondado muda; o deslocamento fino do cartão vai direto no estilo. Sem isto, cada pixel do dedo
  // re-renderizava a linha do tempo inteira.
  const ultimoPassoDoArrasto = useRef<number | null>(null);
  const ultimoPassoDaAlca = useRef<number | null>(null);
  const passo = passoDoGesto(passoMin);
  const gesto = useRef<{
    id: string;
    y0: number;
    x0: number;
    pointerY: number;
    alvo: HTMLElement;
    ativo: boolean;
    timer?: number;
    arrastou: boolean;
    longo?: boolean;
    rolagem0: number;
    dy: number;
    deslocamentoMin: number;
  } | null>(null);
  const quadroRolagemAutomatica = useRef<number | null>(null);
  const instanteRolagemAutomatica = useRef<number | null>(null);
  const pxPorMinutoRef = useRef(PX_POR_MINUTO);
  pxPorMinutoRef.current = PX_POR_MINUTO;
  const bloqueio = useRef<ReturnType<typeof criarBloqueioDeRolagem> | null>(null);
  useEffect(
    () =>
      aoCorrigirRolagemDoZoom((destino, delta) => {
        const g = gesto.current;
        if (!g?.ativo || !g.longo) return;
        if ((destino === window && celularAgora()) || destino === rolagemRef.current) {
          // Não tratar o scroll de ancoragem do zoom como movimento provocado pelo dedo.
          g.rolagem0 += delta;
        }
      }),
    [],
  );
  function travarRolagemDoToque() {
    bloqueio.current ??= criarBloqueioDeRolagem(
      () => Boolean(gesto.current?.ativo) || document.querySelector(".agenda-arrastando") !== null,
    );
    bloqueio.current.travar();
  }
  function soltarRolagemDoToque() {
    bloqueio.current?.soltar();
  }
  useEffect(() => soltarRolagemDoToque, []);
  useEffect(
    () => () => {
      if (quadroRolagemAutomatica.current !== null) {
        window.cancelAnimationFrame(quadroRolagemAutomatica.current);
      }
    },
    [],
  );
  const ignorarClique = useRef(false);
  const horarioVazioRef = useRef<number | null>(null);
  const ponteirosDeToque = useRef(new Set<number>());
  const multitoque = useRef(false);
  const toqueLongoVazio = useRef<ReturnType<typeof criarToqueLongoVazio> | null>(null);
  toqueLongoVazio.current ??= criarToqueLongoVazio({
    lerRolagem: () => window.scrollY,
    aoConfirmar: () => {
      const minuto = horarioVazioRef.current;
      horarioVazioRef.current = null;
      if (minuto === null) return;
      // Indicador só aparece confirmado, junto com a vibração, e abre logo depois.
      setToqueVazio(minuto);
      navigator.vibrate?.(10);
      window.setTimeout(() => {
        setToqueVazio(null);
        onHorarioVazio?.(horaMinuto(minuto));
      }, 160);
    },
    aoCancelar: () => {
      horarioVazioRef.current = null;
      setToqueVazio(null);
    },
  });
  useEffect(() => {
    const cancelar = () => toqueLongoVazio.current?.cancelar();
    const aoRolar = () => toqueLongoVazio.current?.rolou(window.scrollY);
    const aoEsconder = () => {
      if (document.visibilityState !== "visible") cancelar();
    };
    const novoPonteiro = (evento: PointerEvent) => {
      if (evento.pointerType === "mouse") return;
      if (ponteirosDeToque.current.size > 0 && !ponteirosDeToque.current.has(evento.pointerId)) {
        multitoque.current = true;
        cancelar();
      }
      ponteirosDeToque.current.add(evento.pointerId);
    };
    const fimDoPonteiro = (evento: PointerEvent) => {
      ponteirosDeToque.current.delete(evento.pointerId);
      if (ponteirosDeToque.current.size === 0) multitoque.current = false;
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("blur", cancelar);
    document.addEventListener("visibilitychange", aoEsconder);
    document.addEventListener("pointerdown", novoPonteiro, { capture: true, passive: true });
    document.addEventListener("pointerup", fimDoPonteiro, { capture: true, passive: true });
    document.addEventListener("pointercancel", fimDoPonteiro, { capture: true, passive: true });
    return () => {
      cancelar();
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("blur", cancelar);
      document.removeEventListener("visibilitychange", aoEsconder);
      document.removeEventListener("pointerdown", novoPonteiro, { capture: true });
      document.removeEventListener("pointerup", fimDoPonteiro, { capture: true });
      document.removeEventListener("pointercancel", fimDoPonteiro, { capture: true });
    };
  }, []);
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(agora));
  const ehHoje = dia === hoje;

  const escala = useMemo(() => {
    const funcionamento = horarios.find(
      (item) => item.diaSemana === diaDaSemana(dia) && !item.fechado,
    );
    const base = itensEscala ?? itens;
    const inicios = base.map((item) => minutosNoFuso(item.inicio, fuso));
    const finais = base.map((item) => minutosNoFuso(item.fim, fuso));
    const minutoAtual = minutosNoFuso(agora, fuso);
    const referenciasInicio = [
      funcionamento ? minutosDoHorario(funcionamento.abre) : 8 * 60,
      ...inicios,
    ];
    const referenciasFim = [
      funcionamento ? minutosDoHorario(funcionamento.fecha) : 20 * 60,
      ...finais,
    ];
    if (ehHoje) {
      referenciasInicio.push(minutoAtual - MARGEM_AGORA_MIN);
      referenciasFim.push(minutoAtual + MARGEM_AGORA_MIN);
    }
    if (diaCompleto) return { inicio: 0, fim: 24 * 60, minutoAtual };
    const inicio = Math.max(0, Math.floor(Math.min(...referenciasInicio) / 30) * 30);
    const fim = Math.min(24 * 60, Math.ceil(Math.max(...referenciasFim) / 30) * 30);
    return { inicio, fim: Math.max(inicio + 60, fim), minutoAtual };
  }, [agora, dia, ehHoje, fuso, horarios, itens, itensEscala, diaCompleto]);

  const marcas = useMemo(() => {
    const resultado: number[] = [];
    const ultimo = diaCompleto ? escala.fim - 60 : escala.fim;
    // Figaro: só a hora cheia é linha fixa; as de 5 em 5 min surgem com o zoom (ver `opacidadeDasLinhasDe5`).
    const primeira = Math.ceil(escala.inicio / 60) * 60;
    for (let minuto = primeira; minuto <= ultimo; minuto += 60) resultado.push(minuto);
    return resultado;
  }, [escala.fim, escala.inicio, diaCompleto]);

  const layout = useMemo(() => {
    const resultado = new Map<
      string,
      {
        inicio: number;
        fim: number;
        topo: number;
        altura: number;
        coluna?: number;
        colunas?: number;
      }
    >();
    const acrescimos: Array<{ depoisDe: number; pixels: number }> = [];
    const ordenados = itens
      .map((item) => {
        const inicio = minutosNoFuso(item.inicio, fuso);
        // No horário real (alinhado, como no Figaro) o cartão tem a duração exata; empilhado, no
        // mínimo 30 min para caber o texto.
        const minimo = alinhado ? 1 : 30;
        return { item, inicio, fim: Math.max(inicio + minimo, minutosNoFuso(item.fim, fuso)) };
      })
      .sort((a, b) => a.inicio - b.inicio);
    let grupo: typeof ordenados = [];
    let fimDoGrupo = -1;
    let pixelsAcrescidos = 0;
    const distribuir = () => {
      const inicioGrupo = Math.min(...grupo.map((evento) => evento.inicio));
      const fimGrupo = Math.max(...grupo.map((evento) => evento.fim));
      const topoNatural = (inicioGrupo - escala.inicio) * PX_POR_MINUTO + pixelsAcrescidos;
      let cursor = topoNatural;

      // Encaixe sobreposto aparece lado a lado, no horário real.
      if (grupo.length > 1 && (alinhado || grupo.some((evento) => evento.item.encaixe))) {
        const colunas = Math.min(grupo.length, 3);
        grupo.forEach((evento, i) => {
          const altura = Math.max(1, (evento.fim - evento.inicio) * PX_POR_MINUTO);
          const topo = (evento.inicio - escala.inicio) * PX_POR_MINUTO + pixelsAcrescidos;
          resultado.set(evento.item.id, {
            inicio: evento.inicio,
            fim: evento.fim,
            topo,
            altura,
            coluna: i % colunas,
            colunas,
          });
          cursor = Math.max(cursor, topo + altura + ESPACO_ENTRE_BLOCOS);
        });
      } else {
        grupo.forEach((evento) => {
          if (alinhado) {
            const topo = (evento.inicio - escala.inicio) * PX_POR_MINUTO;
            const altura = Math.max(1, (evento.fim - evento.inicio) * PX_POR_MINUTO);
            resultado.set(evento.item.id, { inicio: evento.inicio, fim: evento.fim, topo, altura });
            cursor = topo + altura + ESPACO_ENTRE_BLOCOS;
            return;
          }
          const altura = Math.max(1, (evento.fim - evento.inicio) * PX_POR_MINUTO);
          resultado.set(evento.item.id, {
            inicio: evento.inicio,
            fim: evento.fim,
            topo: cursor,
            altura,
          });
          cursor += altura + ESPACO_ENTRE_BLOCOS;
        });
      }

      const alturaNatural = (fimGrupo - inicioGrupo) * PX_POR_MINUTO;
      const alturaEmpilhada = cursor - topoNatural - ESPACO_ENTRE_BLOCOS;
      const extra = Math.max(0, alturaEmpilhada - alturaNatural);
      if (extra > 0 && !alinhado) {
        pixelsAcrescidos += extra;
        acrescimos.push({ depoisDe: fimGrupo, pixels: extra });
      }
    };
    ordenados.forEach((evento) => {
      if (grupo.length > 0 && evento.inicio >= fimDoGrupo) {
        distribuir();
        grupo = [];
        fimDoGrupo = -1;
      }
      grupo.push(evento);
      fimDoGrupo = Math.max(fimDoGrupo, evento.fim);
    });
    if (grupo.length > 0) distribuir();
    return { posicoes: resultado, acrescimos, pixelsAcrescidos };
  }, [alinhado, escala.inicio, fuso, itens, PX_POR_MINUTO]);

  const deslocamentoAte = (minuto: number) =>
    layout.acrescimos.reduce(
      (total, item) => total + (item.depoisDe <= minuto ? item.pixels : 0),
      0,
    );
  const altura = (escala.fim - escala.inicio) * PX_POR_MINUTO + layout.pixelsAcrescidos;
  const posicaoAgora =
    (escala.minutoAtual - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(escala.minutoAtual);

  function voltarParaAgora(comportamento: ScrollBehavior = "smooth") {
    const area = rolagemRef.current;
    const linha = linhaAgoraRef.current;
    if (!area || !linha) return;
    if (window.matchMedia(CELULAR).matches) {
      // No celular, organizar a grade pela HORA cheia atual: ela fica no topo da área útil,
      // enquanto a linha rosa permanece na posição real do minuto (ex.: 08:04 fica 4 min
      // abaixo de 08:00). Assim sobra espaço para a linha "correr" dentro daquela hora.
      // Calculamos a distância entre a hora cheia e o minuto atual no mesmo eixo da timeline,
      // incluindo os acréscimos de espaço criados pelos cartões.
      const minutoDaHora = Math.floor(escala.minutoAtual / 60) * 60;
      const distanciaDaHoraAteAgora =
        (escala.minutoAtual - minutoDaHora) * PX_POR_MINUTO +
        deslocamentoAte(escala.minutoAtual) -
        deslocamentoAte(minutoDaHora);
      const topo =
        linha.getBoundingClientRect().top +
        window.scrollY -
        distanciaDaHoraAteAgora -
        alturaDoTopoDaAgenda() -
        8;
      window.scrollTo({
        top: Math.max(0, topo),
        behavior: comportamento === "smooth" && prefereMenosMovimento() ? "auto" : comportamento,
      });
      return;
    }
    area.scrollTo({
      top: Math.max(0, linha.offsetTop - area.clientHeight * 0.42),
      behavior: comportamento,
    });
  }

  // Posicionamento automático só na primeira abertura da Agenda. Depois, trocar de dia mantém a
  // rolagem onde a pessoa deixou (puxar a página sozinho brigava com o dedo).
  useEffect(() => {
    if (previa || !ehHoje || posicionouRef.current !== null) return;
    const quadro = window.requestAnimationFrame(() => {
      voltarParaAgora("auto");
      posicionouRef.current = dia;
    });
    return () => window.cancelAnimationFrame(quadro);
  }, [dia, ehHoje, altura, previa]);

  // Abriu num dia sem posicionamento automático: conta como posicionado, para uma troca
  // posterior (ex.: para hoje) não puxar a página.
  useEffect(() => {
    if (previa || ehHoje || diaCompleto || posicionouRef.current !== null) return;
    posicionouRef.current = dia;
  }, [dia, ehHoje, diaCompleto, previa]);

  // Dia completo fora de hoje: começa na abertura do expediente, não à meia-noite.
  useEffect(() => {
    if (previa || ehHoje || !diaCompleto || posicionouRef.current !== null) return;
    const area = rolagemRef.current;
    const func = horarios.find((h) => h.diaSemana === diaDaSemana(dia) && !h.fechado);
    if (!area) return;
    const quadro = window.requestAnimationFrame(() => {
      const alvo = func ? minutosDoHorario(func.abre) : 8 * 60;
      const topo = area.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, topo + alvo * PX_POR_MINUTO - 120), behavior: "auto" });
      posicionouRef.current = dia;
    });
    return () => window.cancelAnimationFrame(quadro);
  }, [dia, ehHoje, diaCompleto, previa, horarios]);

  function acompanharAgora() {
    const area = rolagemRef.current;
    const linha = linhaAgoraRef.current;
    if (!area || !linha || !ehHoje) {
      setAgoraVisivel(true);
      return;
    }
    if (window.matchMedia(CELULAR).matches) return;
    const topo = linha.offsetTop;
    setAgoraVisivel(topo >= area.scrollTop && topo <= area.scrollTop + area.clientHeight);
  }

  // Celular: disponibiliza a rolagem da linha atual para o botão composto do pé.
  const irAgoraRef = useRef(() => voltarParaAgora());
  irAgoraRef.current = () => voltarParaAgora();
  useEffect(() => {
    if (previa) return;
    const linha = linhaAgoraRef.current;
    if (
      !ehHoje ||
      !linha ||
      !window.matchMedia(CELULAR).matches ||
      !("IntersectionObserver" in window)
    ) {
      publicarAgora({ lado: null, ir: null });
      return;
    }
    const ir = () => irAgoraRef.current();
    let observador: IntersectionObserver | undefined;
    const montar = () => {
      observador?.disconnect();
      const area = areaLivre();
      // Margens nunca negativas: no celular a área pode passar da janela e gerar "--Xpx" inválido.
      const topo = Math.max(0, Math.round(area.top));
      const base = Math.max(0, Math.round(window.innerHeight - area.bottom));
      const aoCruzar = ([entrada]: IntersectionObserverEntry[]) => {
        if (!entrada) return;
        const lado = entrada.isIntersecting
          ? "visivel"
          : ladoDoAgora(entrada.boundingClientRect, entrada.rootBounds ?? area);
        publicarAgora({ lado, ir });
      };
      try {
        observador = new IntersectionObserver(aoCruzar, {
          rootMargin: `-${topo}px 0px -${base}px 0px`,
        });
      } catch {
        observador = new IntersectionObserver(aoCruzar);
      }
      observador.observe(linha);
    };
    montar();
    // No celular o "resize" dispara muito durante a rolagem (barras do navegador): remonta no
    // máximo uma vez por quadro e só quando o tamanho da janela mudou de verdade.
    let quadro = 0;
    let tamanho = `${window.innerWidth}x${window.innerHeight}`;
    const aoRedimensionar = () => {
      if (quadro) return;
      quadro = window.requestAnimationFrame(() => {
        quadro = 0;
        const novo = `${window.innerWidth}x${window.innerHeight}`;
        if (novo === tamanho) return;
        tamanho = novo;
        montar();
      });
    };
    window.addEventListener("resize", aoRedimensionar);
    return () => {
      window.removeEventListener("resize", aoRedimensionar);
      if (quadro) window.cancelAnimationFrame(quadro);
      observador?.disconnect();
      publicarAgora({ lado: null, ir: null });
    };
  }, [ehHoje, altura, previa]);

  useEffect(() => {
    if (previa || !ehHoje || window.matchMedia(CELULAR).matches) return;
    const acompanhar = () => acompanharAgora();
    window.addEventListener("resize", acompanhar);
    acompanhar();
    return () => window.removeEventListener("resize", acompanhar);
  }, [ehHoje, altura, previa]);

  const podeMover = (item: AgendaItem) =>
    Boolean(onMover) && (item.status === "agendado" || item.status === "chegou");

  function inicioGesto(e: React.PointerEvent, item: AgendaItem) {
    if (!podeMover(item)) return;
    const toque = e.pointerType !== "mouse";
    const cartaoArmado = toque && edicaoDoCartao?.id === item.id;
    const alvo = e.currentTarget as HTMLElement;
    const pid = e.pointerId;
    const g = {
      id: item.id,
      y0: e.clientY,
      x0: e.clientX,
      pointerY: e.clientY,
      alvo,
      ativo: e.pointerType === "mouse" || cartaoArmado,
      ...(cartaoArmado ? { longo: true } : {}),
      arrastou: false,
      rolagem0: celularAgora() ? window.scrollY : (rolagemRef.current?.scrollTop ?? 0),
      dy: 0,
      deslocamentoMin: 0,
    } as NonNullable<typeof gesto.current>;
    gesto.current = g;

    if (cartaoArmado) {
      // Só o segundo gesto captura o ponteiro e bloqueia a rolagem: o primeiro toque
      // longo apenas arma a edição e mantém a rolagem nativa disponível.
      try {
        alvo.setPointerCapture(pid);
      } catch {
        gesto.current = null;
        return;
      }
      travarRolagemDoToque();
      return;
    }

    if (toque) {
      g.timer = window.setTimeout(() => {
        if (gesto.current !== g) return;
        g.longo = true;
        // O toque longo só arma a edição; ela abre ao soltar, sem capturar o ponteiro.
        // A rolagem nativa continua disponível durante todo este primeiro gesto.
        vibrar("pressao");
      }, 300);
    }
  }
  function pararRolagemAutomatica() {
    if (quadroRolagemAutomatica.current !== null) {
      window.cancelAnimationFrame(quadroRolagemAutomatica.current);
    }
    quadroRolagemAutomatica.current = null;
    instanteRolagemAutomatica.current = null;
  }

  function atualizarDeslocamentoArrastado(g: NonNullable<typeof gesto.current>, dy: number) {
    const delta = dy - g.dy;
    if (delta !== 0) g.deslocamentoMin += delta / pxPorMinutoRef.current;
    g.dy = dy;
    g.alvo.style.transform = `translateY(${dy}px) scale(1.02)`;
    const passoAtual = Math.round(dy / pxPorMinutoRef.current / passo);
    if (ultimoPassoDoArrasto.current === passoAtual) return;
    ultimoPassoDoArrasto.current = passoAtual;
    setArrasto({ id: g.id, dy });
  }

  function quadroDeRolagemAutomatica(agora: number) {
    quadroRolagemAutomatica.current = null;
    const g = gesto.current;
    if (!g?.ativo || !g.arrastou || !g.alvo.isConnected) {
      instanteRolagemAutomatica.current = null;
      return;
    }

    const anterior = instanteRolagemAutomatica.current ?? agora;
    const deltaMs = Math.min(33, Math.max(0, agora - anterior));
    instanteRolagemAutomatica.current = agora;

    const celular = celularAgora();
    const area = rolagemRef.current;
    const limites = celular ? areaLivre() : area?.getBoundingClientRect();
    if (limites) {
      const velocidade = velocidadeDeRolagemNaBorda(g.pointerY, limites.top, limites.bottom);
      const deslocamento = deslocamentoDeRolagem(velocidade, deltaMs);
      if (deslocamento !== 0) {
        if (celular) window.scrollBy(0, deslocamento);
        else if (area) area.scrollTop += deslocamento;
      }
    }

    const rolagemAtual = celular ? window.scrollY : (area?.scrollTop ?? 0);
    const dy = g.pointerY - g.y0 + rolagemAtual - g.rolagem0;
    if (Math.abs(dy - g.dy) > 0.01) atualizarDeslocamentoArrastado(g, dy);
    quadroRolagemAutomatica.current = window.requestAnimationFrame(quadroDeRolagemAutomatica);
  }

  function iniciarRolagemAutomatica() {
    if (quadroRolagemAutomatica.current !== null) return;
    instanteRolagemAutomatica.current = null;
    quadroRolagemAutomatica.current = window.requestAnimationFrame(quadroDeRolagemAutomatica);
  }

  function moverGesto(e: React.PointerEvent) {
    const g = gesto.current;
    if (!g) return;
    g.pointerY = e.clientY;
    if (g.longo && g.ativo) onAtualizarYDoToque?.(g.id, e.clientY);

    const celular = celularAgora();
    const area = rolagemRef.current;
    const rolagemAtual = celular ? window.scrollY : (area?.scrollTop ?? 0);
    const dy = e.clientY - g.y0 + (g.longo && !g.arrastou ? 0 : rolagemAtual - g.rolagem0);

    if (!g.ativo) {
      // Antes de confirmar o toque longo, deslocamento cancela o gesto.
      // Depois de confirmado, el usuario puede continuar rolando; a edição arma ao soltar.
      if (!g.longo && (Math.abs(e.clientY - g.y0) > 10 || Math.abs(e.clientX - g.x0) > 10)) {
        window.clearTimeout(g.timer);
        gesto.current = null;
      }
      return;
    }
    if (!g.arrastou && Math.abs(dy) < 5) return;
    if (!g.arrastou) {
      // Ao começar a mover, desconta o scroll que a animação de zoom aplicou até aqui.
      if (g.longo) g.rolagem0 = rolagemAtual;
      g.deslocamentoMin = dy / pxPorMinutoRef.current;
      // O cartão armado já capturou o ponteiro no início do segundo gesto.
      // Mouse e gestos que começaram sem captura capturam no primeiro movimento.
      if (!g.longo) {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* */
        }
      }
    } else {
      g.deslocamentoMin += (dy - g.dy) / pxPorMinutoRef.current;
    }
    g.arrastou = true;
    e.preventDefault();
    g.dy = dy;
    g.alvo.style.transform = `translateY(${dy}px) scale(1.02)`;
    const passoAtual = Math.round(dy / pxPorMinutoRef.current / passo);
    if (ultimoPassoDoArrasto.current !== passoAtual) {
      ultimoPassoDoArrasto.current = passoAtual;
      setArrasto({ id: g.id, dy });
    }
    // Continua rolando, mesmo quando o dedo fica parado no limite da área visível.
    iniciarRolagemAutomatica();
  }

  function fimGesto(item: AgendaItem, ySolto?: number) {
    const g = gesto.current;
    pararRolagemAutomatica();
    if (g?.longo && g.ativo && ySolto !== undefined) onAtualizarYDoToque?.(g.id, ySolto);
    gesto.current = null;
    soltarRolagemDoToque();
    if (!g) return;
    window.clearTimeout(g.timer);
    const dy = g.id === item.id ? g.dy : 0;
    ultimoPassoDoArrasto.current = null;
    setArrasto(null);
    if (!g.arrastou) {
      if (g.longo) {
        ignorarClique.current = true;
        // Primeiro gesto: abre a edição somente no pointerup. O cartão armado
        // usa o gesto seguinte para mover, sem confundir rolagem com arrasto.
        if (!g.ativo) onEditar?.(item, ySolto ?? g.y0);
      }
      return;
    }
    ignorarClique.current = true;
    const delta = Math.round(g.deslocamentoMin / passo) * passo;
    if (delta !== 0) {
      navigator.vibrate?.(18);
      onMover?.(item, delta);
    }
  }
  function minutoNoVazio(e: { clientY: number; currentTarget: HTMLDivElement }) {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    let minuto = escala.inicio + y / PX_POR_MINUTO;
    minuto -= deslocamentoAte(minuto) / PX_POR_MINUTO;
    const arredondado = Math.floor(minuto / 15) * 15;
    if (intervalo && arredondado >= intervalo[0] && arredondado < intervalo[1]) return null;
    return arredondado;
  }
  function cliqueMouseNoVazio(e: React.PointerEvent<HTMLDivElement>) {
    if (!onHorarioVazio || e.pointerType !== "mouse" || e.target !== e.currentTarget) return;
    const arredondado = minutoNoVazio(e);
    if (arredondado === null) return;
    setToqueVazio(arredondado);
    window.setTimeout(() => {
      setToqueVazio(null);
      onHorarioVazio(horaMinuto(arredondado));
    }, 160);
  }
  const intervalosPorData = intervaloPersonalizado
    ? {
        [dia]: {
          intervaloInicio: intervaloPersonalizado.inicio,
          intervaloFim: intervaloPersonalizado.fim,
        },
      }
    : undefined;
  const intervalo = intervaloDoDia(horarios, dia, intervalosPorData);
  const faixasFora = faixasForaDoExpediente(horarios, dia, escala);

  // Prévia: posição em que o dia vai assentar (hoje no agora; senão topo do expediente).
  const funcionamentoDoDia = horarios.find((h) => h.diaSemana === diaDaSemana(dia) && !h.fechado);
  const deslocamentoPrevia = !previa
    ? 0
    : ehHoje
      ? Math.max(
          0,
          posicaoAgora - (typeof window === "undefined" ? 600 : window.innerHeight - 56) / 2 + 40,
        )
      : Math.max(
          0,
          funcionamentoDoDia
            ? (minutosDoHorario(funcionamentoDoDia.abre) - escala.inicio) * PX_POR_MINUTO
            : 0,
        );
  const interativo = !previa;
  usePincaDaTimeline({
    grade: gradeRef,
    ativo: interativo && diaCompleto,
    inicioDaEscala: escala.inicio,
  });
  const alinharNoCelular = previa && diaCompleto && !emCamada;
  const trilho = vizinhos ? { "data-trilho-dia": "" } : {};
  const abreEm = funcionamentoDoDia ? minutosDoHorario(funcionamentoDoDia.abre) : 8 * 60;
  const envolturaRef = useRef<HTMLDivElement>(null);
  // Celular: a prévia do dia vizinho já aparece no lugar exato em que ele vai assentar
  // (hoje com o agora no meio da tela; outro dia com a abertura do expediente), na mesma
  // coluna da grade atual. Assim o dia que entra pelo gesto não "pula" ao ser confirmado.
  useLayoutEffect(() => {
    const envoltura = envolturaRef.current;
    const area = rolagemRef.current;
    const real = document.querySelector<HTMLElement>(
      ".agenda-timeline-wrap:not(.agenda-timeline-previa)",
    );
    if (!alinharNoCelular || !envoltura || !area || !real) return;
    const medida = real.getBoundingClientRect();
    // A Agenda de verdade já pode estar andando com o dedo: descontar esse deslocamento.
    const palcoReal = real.closest<HTMLElement>(".agenda-operacional");
    const andado = palcoReal
      ? new DOMMatrixReadOnly(getComputedStyle(palcoReal).transform).m41 || 0
      : 0;
    const esquerdaReal = medida.left - andado;
    envoltura.style.width = `${medida.width}px`;
    area.style.transform = "";
    const grade = area.querySelector<HTMLElement>(".agenda-timeline")?.getBoundingClientRect();
    const eu = envoltura.getBoundingClientRect();
    // A prévia inteira anda com o dedo: medir a coluna em relação a ela, não à tela.
    const palco = envoltura.closest<HTMLElement>(".agenda-previa-vizinho")?.getBoundingClientRect();
    const esquerdaNoPalco = eu.left - (palco?.left ?? 0);
    if (!grade) return;
    // A página vizinha precisa conservar o mesmo referencial vertical da página atual.
    // Alinhar a marca das 09h (ou a abertura, se 09h não estiver visível na escala)
    // evita que a grade "salte" quando o gesto termina e a prévia vira a agenda real.
    const marcaDasNove = (raiz: ParentNode) =>
      Array.from(raiz.querySelectorAll<HTMLElement>(".agenda-timeline-marca")).find(
        (marca) => marca.querySelector("span")?.textContent?.trim() === "09",
      );
    const marcaReal = marcaDasNove(real);
    const marcaVizinha = marcaDasNove(area);
    const topoReferenciaReal = marcaReal?.getBoundingClientRect().top;
    const topoReferenciaVizinha = marcaVizinha?.getBoundingClientRect().top;
    const topoDesejado =
      topoReferenciaReal !== undefined && topoReferenciaVizinha !== undefined
        ? topoReferenciaReal
        : ehHoje
          ? window.innerHeight / 2 - posicaoAgora
          : 120;
    const topoAtual =
      topoReferenciaReal !== undefined && topoReferenciaVizinha !== undefined
        ? topoReferenciaVizinha
        : grade.top + (ehHoje ? posicaoAgora : (abreEm - escala.inicio) * PX_POR_MINUTO);
    area.style.transform = `translate3d(${esquerdaReal - esquerdaNoPalco}px,${topoDesejado - topoAtual}px,0)`;
  }, [alinharNoCelular, ehHoje, posicaoAgora, abreEm, altura, itens.length, escala.inicio]);

  return (
    <div
      ref={envolturaRef}
      className={`agenda-timeline-wrap${previa ? " agenda-timeline-previa" : ""}${vizinhos ? " agenda-timeline-paginas" : ""}`}
      aria-hidden={previa || undefined}
      style={previa ? { pointerEvents: "none" } : undefined}
    >
      {interativo && ehHoje && !agoraVisivel && !celularAgora() ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="agenda-voltar-agora"
          onClick={() => voltarParaAgora()}
        >
          <Clock3 aria-hidden />
          Voltar para agora
        </Button>
      ) : null}
      <div
        ref={rolagemRef}
        className="agenda-timeline-scroll sem-barra"
        aria-label={previa ? undefined : "Timeline de atendimentos"}
        onScroll={
          interativo
            ? () => {
                toqueLongoVazio.current?.cancelar();
                acompanharAgora();
              }
            : undefined
        }
        style={
          previa
            ? {
                maxHeight: "none",
                overflow: "visible",
                transform:
                  alinharNoCelular || emCamada ? undefined : `translateY(${-deslocamentoPrevia}px)`,
              }
            : undefined
        }
      >
        <div
          ref={gradeRef}
          className="agenda-timeline"
          id={previa ? undefined : "agenda-timeline-grade"}
          tabIndex={previa ? undefined : -1}
          {...trilho}
          style={{
            height: `${altura}px`,
          }}
          {...(previa
            ? {}
            : {
                onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
                  if (!onHorarioVazio || e.target !== e.currentTarget) return;
                  if (e.pointerType === "mouse") return;
                  if (multitoque.current) return;
                  const minuto = minutoNoVazio(e);
                  if (minuto === null) return;
                  horarioVazioRef.current = minuto;
                  toqueLongoVazio.current?.comecar({
                    pointerId: e.pointerId,
                    x: e.clientX,
                    y: e.clientY,
                  });
                },
                onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
                  toqueLongoVazio.current?.mover(e.pointerId, e.clientX, e.clientY);
                },
                onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
                  if (e.pointerType === "mouse") cliqueMouseNoVazio(e);
                  else toqueLongoVazio.current?.terminar(e.pointerId);
                },
                onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) =>
                  toqueLongoVazio.current?.terminar(e.pointerId),
                onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => {
                  if (window.matchMedia("(pointer: coarse)").matches) e.preventDefault();
                },
              })}
        >
          {faixasFora.map((faixa) => (
            <div
              key={`${faixa.inicio}-${faixa.fim}`}
              className="agenda-timeline-intervalo agenda-timeline-fora-expediente"
              style={{
                top: `${(faixa.inicio - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(faixa.inicio)}px`,
                height: `${(faixa.fim - faixa.inicio) * PX_POR_MINUTO + deslocamentoAte(faixa.fim) - deslocamentoAte(faixa.inicio)}px`,
              }}
              aria-hidden
            >
              {faixa.fechado ? <span>Fechado</span> : null}
            </div>
          ))}
          {bloqueiosDoDia.map((b) => {
            const de = Math.max(minutosNoFuso(b.inicio, fuso), escala.inicio);
            const ate = Math.min(minutosNoFuso(b.fim, fuso) || 24 * 60, escala.fim);
            if (ate <= de) return null;
            const estilo = {
              top: `${(de - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(de)}px`,
              height: `${(ate - de) * PX_POR_MINUTO + deslocamentoAte(ate) - deslocamentoAte(de)}px`,
            };
            const rotulo = `Horário bloqueado, ${horaMinuto(de)} às ${horaMinuto(ate)}${b.motivo ? `, ${b.motivo}` : ""}${b.profissional ? `, ${b.profissional}` : ""}`;
            // Cartão do Figaro (apk/3 §7): título "Bloqueio · profissional", horário embaixo e o
            // calendário com X no canto; o horário some quando o bloqueio é curto demais.
            const altura = (ate - de) * PX_POR_MINUTO;
            const conteudo = (
              <span className="agenda-bloqueio-corpo" aria-hidden>
                <span className="agenda-bloqueio-titulo">
                  <span className="agenda-bloqueio-nome">{b.motivo?.trim() || "Bloqueio"}</span>
                  {b.profissional ? (
                    <span className="agenda-bloqueio-quem"> · {b.profissional}</span>
                  ) : null}
                </span>
                {altura >= 34 ? (
                  <span className="agenda-bloqueio-horario">
                    {horaMinuto(de)} · {horaMinuto(ate)}
                  </span>
                ) : null}
                <CalendarX className="agenda-bloqueio-icone" aria-hidden />
              </span>
            );
            return onAbrirBloqueio && !previa ? (
              <button
                key={b.id}
                type="button"
                className="agenda-timeline-intervalo agenda-timeline-bloqueio agenda-timeline-bloqueio-interativo"
                style={estilo}
                aria-label={`${rotulo}. Toque para ver detalhes.`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onAbrirBloqueio(b);
                }}
              >
                {conteudo}
              </button>
            ) : (
              <div
                key={b.id}
                className="agenda-timeline-intervalo agenda-timeline-bloqueio"
                style={estilo}
                role="img"
                aria-label={rotulo}
              >
                {conteudo}
              </div>
            );
          })}
          {intervalo ? (
            onAbrirIntervalo && interativo ? (
              <button
                type="button"
                className="agenda-timeline-intervalo agenda-timeline-pausa"
                style={{
                  top: `${(intervalo[0] - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(intervalo[0])}px`,
                  height: `${(intervalo[1] - intervalo[0]) * PX_POR_MINUTO}px`,
                }}
                aria-label={`Ajustar intervalo, ${horaMinuto(intervalo[0])} às ${horaMinuto(intervalo[1])}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onAbrirIntervalo();
                }}
              >
                <span>
                  <Clock3 aria-hidden />
                  Intervalo · {horaMinuto(intervalo[0])}–{horaMinuto(intervalo[1])}
                </span>
              </button>
            ) : (
              <div
                className="agenda-timeline-intervalo agenda-timeline-pausa"
                style={{
                  top: `${(intervalo[0] - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(intervalo[0])}px`,
                  height: `${(intervalo[1] - intervalo[0]) * PX_POR_MINUTO}px`,
                }}
                aria-hidden
              >
                {/* Mesmo desenho do intervalo tocável (com o relógio): no dia vizinho o ícone surgia ao assentar. */}
                <span>
                  <Clock3 aria-hidden />
                  Intervalo · {horaMinuto(intervalo[0])}–{horaMinuto(intervalo[1])}
                </span>
              </div>
            )
          ) : null}
          {toqueVazio !== null ? (
            <div
              className="agenda-timeline-toque"
              style={{
                top: `${(toqueVazio - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(toqueVazio)}px`,
              }}
              aria-hidden
            >
              + {horaMinuto(toqueVazio)}
            </div>
          ) : null}
          {marcas.map((minuto) => (
            <div
              key={minuto}
              className={`agenda-timeline-marca ${minuto % 60 === 0 ? "agenda-timeline-hora" : ""}`}
              style={{
                top: `${(minuto - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(minuto)}px`,
              }}
            >
              <span>
                {minuto % 60 !== 0
                  ? ""
                  : diaCompleto
                    ? String(Math.floor(minuto / 60) % 24).padStart(2, "0")
                    : horaMinuto(minuto)}
              </span>
            </div>
          ))}

          {opacidadeDasLinhasDe5(PX_POR_MINUTO) > 0 ? (
            <>
              {Array.from(
                { length: Math.floor((escala.fim - escala.inicio) / PASSO_DO_AJUSTE_MIN) + 1 },
                (_, indice) => escala.inicio + indice * PASSO_DO_AJUSTE_MIN,
              )
                .filter((minuto) => minuto % 60 !== 0)
                .map((minuto) => (
                  <div
                    key={`ajuste-5-${minuto}`}
                    className="agenda-timeline-ajuste-5"
                    style={{
                      top: `${(minuto - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(minuto)}px`,
                      opacity: opacidadeDasLinhasDe5(PX_POR_MINUTO),
                    }}
                    aria-hidden="true"
                  />
                ))}
              {redim
                ? (() => {
                    const item = itens.find((evento) => evento.id === redim.id);
                    if (!item) return null;
                    const fimItem = minutosNoFuso(item.fim, fuso);
                    const delta = Math.round(redim.dy / PX_POR_MINUTO / passo) * passo;
                    const minutoAlvo = Math.max(
                      escala.inicio,
                      Math.min(escala.fim, fimItem + delta),
                    );
                    return (
                      <div
                        className="agenda-timeline-ajuste-alvo"
                        style={{
                          top: `${(minutoAlvo - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(minutoAlvo)}px`,
                        }}
                        aria-hidden="true"
                      />
                    );
                  })()
                : null}
            </>
          ) : null}

          {itens.map((item) => {
            const nome = nomeDaAgenda(item.cliente, discreto);
            const posicao = layout.posicoes.get(item.id);
            const inicio = posicao?.inicio ?? minutosNoFuso(item.inicio, fuso);
            const fim = minutosNoFuso(item.fim, fuso);
            const topo =
              posicao?.topo ?? (inicio - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(inicio);
            const blocoAltura =
              posicao?.altura ?? Math.max(1, (Math.max(inicio + 1, fim) - inicio) * PX_POR_MINUTO);
            const reais = [
              horaReal(item.arrivedAt, fuso) ? `Chegou ${horaReal(item.arrivedAt, fuso)}` : null,
              horaReal(item.startedAt, fuso) ? `Começou ${horaReal(item.startedAt, fuso)}` : null,
              horaReal(item.finishedAt, fuso)
                ? `Terminou ${horaReal(item.finishedAt, fuso)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");
            const passoArrasto =
              arrasto?.id === item.id ? Math.round(arrasto.dy / PX_POR_MINUTO / passo) * passo : 0;
            const passoRedim =
              redim?.id === item.id ? Math.round(redim.dy / PX_POR_MINUTO / passo) * passo : 0;
            // Altura mínima do cartão no Figaro: 28 px.
            const alturaDoBloco = Math.max(
              ALTURA_MINIMA_DO_CARTAO,
              blocoAltura + passoRedim * PX_POR_MINUTO,
            );
            // Figaro (`CardTier`): o que aparece depende da altura do cartão.
            const faixa = faixaDoCartao(alturaDoBloco, PX_POR_MINUTO);
            const faixaDaColuna = posicao?.colunas
              ? {
                  left: `calc(7px + (100% - 11px) * ${posicao.coluna ?? 0} / ${posicao.colunas})`,
                  right: "auto",
                  width: `calc((100% - 11px) / ${posicao.colunas} - 4px)`,
                }
              : { left: "7px", right: "4px" };
            // Fantasma do horário original (Figaro, cartão a 50%), ao encurtar, esticar ou mover.
            const original = edicaoDoCartao?.id === item.id ? edicaoDoCartao.original : undefined;
            const mostrado = {
              inicio: inicio + passoArrasto,
              fim: Math.max(inicio + 1, fim) + passoArrasto + passoRedim,
            };
            const fantasma = original
              ? fantasmaDoHorario(
                  {
                    inicio: minutosNoFuso(original.inicio, fuso),
                    fim: minutosNoFuso(original.fim, fuso),
                  },
                  mostrado,
                )
              : null;
            const forma = fantasma ? formaDoFantasma(fantasma, mostrado) : null;
            const respiro = alinhado ? RESPIRO_DO_CARTAO : 0;
            const naGrade = (min: number) =>
              (min - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(min);
            // Encolheu ou moveu: o original atrás do cartão.
            const estiloDoFantasma =
              fantasma && forma !== "cresceu"
                ? {
                    top: `${naGrade(fantasma.inicio) + respiro}px`,
                    height: `${naGrade(fantasma.fim) - naGrade(fantasma.inicio) - 2 * respiro}px`,
                    ...faixaDaColuna,
                  }
                : null;
            // Contorno em volta de tudo: do original ao encolher, do cartão ao crescer.
            const estiloDoContorno =
              forma === "encolheu"
                ? estiloDoFantasma
                : forma === "cresceu"
                  ? {
                      top: `${topo + respiro}px`,
                      height: `${alturaDoBloco - 2 * respiro}px`,
                      ...faixaDaColuna,
                    }
                  : null;
            // Cresceu: o pedaço acrescentado do próprio cartão a 50% (máscara, como o `DstIn` do Figaro).
            const mascaraDoCartao =
              fantasma && forma === "cresceu"
                ? (() => {
                    const de = naGrade(fantasma.inicio) - naGrade(mostrado.inicio);
                    const ate = naGrade(fantasma.fim) - naGrade(mostrado.inicio) - respiro;
                    const m = `linear-gradient(to bottom, rgba(0,0,0,0.5) ${de}px, #000 ${de}px, #000 ${ate}px, rgba(0,0,0,0.5) ${ate}px)`;
                    return { maskImage: m, WebkitMaskImage: m };
                  })()
                : {};
            return (
              <Fragment key={item.id}>
                {estiloDoFantasma ? (
                  <div
                    className="agenda-timeline-fantasma"
                    style={{
                      ["--cor-categoria" as string]: corDaCategoria(item.categoriaIndice),
                      ...estiloDoFantasma,
                    }}
                    aria-hidden
                  />
                ) : null}
                {arrasto?.id === item.id ? (
                  <div
                    className="agenda-timeline-alvo"
                    style={{
                      top: `${topo + passoArrasto * PX_POR_MINUTO}px`,
                      height: `${blocoAltura}px`,
                    }}
                    aria-hidden
                  >
                    <span>{horaMinuto(inicio + passoArrasto)}</span>
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`${horaMinuto(inicio)}, ${nome}, ${item.servico}, ${ROTULO_DO_GLIFO[glifoDoEstado(item, ehHoje && estaAtrasado(item, agora))]}`}
                  data-sem-gesto-dia={edicaoDoCartao?.id === item.id ? "" : undefined}
                  data-agendamento={previa ? undefined : item.id}
                  className={`agenda-timeline-bloco agenda-faixa-${faixa} agenda-timeline-${item.status} ${edicaoDoCartao?.id && edicaoDoCartao.id !== item.id ? "agenda-timeline-esmaecido" : ""} ${item.confirmadoEm && item.status === "agendado" ? "agenda-timeline-confirmado" : ""} ${ehHoje && minutosNoFuso(item.fim, fuso) < escala.minutoAtual ? "agenda-timeline-passado" : ""} ${item.encaixe ? "agenda-timeline-encaixe" : ""} ${selecionado === item.id ? "agenda-timeline-selecionado" : ""} ${destaques?.has(item.id) ? "agenda-novo" : ""} ${arrasto?.id === item.id ? "agenda-arrastando" : ""}`}
                  style={{
                    ["--cor-categoria" as string]: corDaCategoria(item.categoriaIndice),
                    // No horário real, 1 px de respiro em cima e embaixo: dois horários seguidos
                    // não viram um bloco só.
                    top: `${topo + (alinhado ? RESPIRO_DO_CARTAO : 0)}px`,
                    height: `${alturaDoBloco - (alinhado ? 2 * RESPIRO_DO_CARTAO : 0)}px`,
                    ...(posicao?.colunas
                      ? {
                          left: `calc(7px + (100% - 11px) * ${posicao.coluna ?? 0} / ${posicao.colunas})`,
                          right: "auto",
                          width: `calc((100% - 11px) / ${posicao.colunas} - 4px)`,
                        }
                      : {}),
                    ...(arrasto?.id === item.id
                      ? { transform: `translateY(${arrasto.dy}px) scale(1.02)` }
                      : {}),
                    ...mascaraDoCartao,
                  }}
                  aria-pressed={selecionado === item.id}
                  tabIndex={previa ? -1 : undefined}
                  {...(previa
                    ? {}
                    : {
                        onPointerDown: (e: React.PointerEvent) => inicioGesto(e, item),
                        onPointerMove: moverGesto,
                        onPointerUp: (e: React.PointerEvent) => fimGesto(item, e.clientY),
                        onPointerCancel: () => {
                          pararRolagemAutomatica();
                          const cancelado = gesto.current;
                          if (cancelado) window.clearTimeout(cancelado.timer);
                          gesto.current = null;
                          soltarRolagemDoToque();
                          ultimoPassoDoArrasto.current = null;
                          setArrasto(null);
                        },
                        onContextMenu: (e: React.MouseEvent) => {
                          if (podeMover(item)) e.preventDefault();
                        },
                        onClick: () => {
                          if (ignorarClique.current) {
                            ignorarClique.current = false;
                            return;
                          }
                          onSelecionar(item.id);
                        },
                      })}
                >
                  {/* Como no Figaro: o serviço no título, o ícone do estado no canto e, conforme a
                      altura, o cliente, o horário e os detalhes (a cor da barra é a categoria). */}
                  <span className="agenda-timeline-bloco-topo">
                    <strong className="agenda-timeline-titulo">{item.servico}</strong>
                    {edicaoDoCartao?.id === item.id ? null : (
                      <IconeDoEstado
                        glifo={glifoDoEstado(item, ehHoje && estaAtrasado(item, agora))}
                      />
                    )}
                  </span>
                  {edicaoDoCartao?.id === item.id ? (
                    <span
                      aria-label="Novo horário proposto"
                      className="absolute right-2 top-1.5 z-[1] max-w-[48%] truncate rounded-full bg-ink3 px-2.5 py-0.5 text-xs font-semibold text-paper"
                    >
                      {horaMinuto(inicio)} – {horaMinuto(fim)}
                    </span>
                  ) : null}
                  {mostraCliente(faixa) ? (
                    <span className="agenda-timeline-cliente">
                      {nome}
                      {mostrarProfissional ? ` · ${item.profissional}` : ""}
                    </span>
                  ) : null}
                  {mostraHorario(faixa) ? (
                    <span className="agenda-timeline-horario">
                      <Clock3 aria-hidden className="size-3.5 shrink-0" />
                      <span className="min-w-0 truncate">
                        {horaMinuto(inicio + passoArrasto)} -{" "}
                        {horaMinuto(fim + passoArrasto + passoRedim)}
                      </span>
                    </span>
                  ) : null}
                  {mostraDetalhes(faixa) ? (
                    <>
                      <OrigemDoAgendamento
                        origem={item.origem}
                        assistido={item.assistidoPorCortai}
                        telefoneNaoConfirmado={item.telefoneNaoConfirmado}
                      />
                      {item.encaixe ? <span className="agenda-timeline-fila">Encaixe</span> : null}
                      {item.daListaDeEspera ? (
                        <span className="agenda-timeline-fila">
                          Vaga preenchida pela lista de espera
                        </span>
                      ) : null}
                      {reais ? <span className="agenda-timeline-reais">{reais}</span> : null}
                    </>
                  ) : null}
                </Button>
                {/* Contorno por cima, em volta de tudo: do original ao encolher, do cartão ao crescer. */}
                {estiloDoContorno ? (
                  <div
                    className="agenda-timeline-fantasma-contorno"
                    style={estiloDoContorno}
                    aria-hidden
                  />
                ) : null}
                {!previa && onRedimensionar && podeMover(item) && edicaoDoCartao?.id === item.id ? (
                  <AlcaDeDuracao
                    rotulo={`Esticar a duração de ${nome}`}
                    etiqueta={redim?.id === item.id ? `até ${horaMinuto(fim + passoRedim)}` : null}
                    estilo={{ top: `${topo + alturaDoBloco - 32}px`, ...faixaDaColuna }}
                    pxPorMinuto={PX_POR_MINUTO}
                    passoMin={passo}
                    limites={limitesDaAlca(minutosNoFuso(item.inicio, fuso), fim, passo)}
                    lerRolagem={() =>
                      celularAgora() ? window.scrollY : (rolagemRef.current?.scrollTop ?? 0)
                    }
                    onTravar={travarRolagemDoToque}
                    onSoltar={soltarRolagemDoToque}
                    onArrastar={(dy) => {
                      if (dy === null) {
                        ultimoPassoDaAlca.current = null;
                        setRedim(null);
                        return;
                      }
                      // Tudo o que usa `redim.dy` já arredonda ao passo: só re-renderiza quando ele muda.
                      const passoAtual = Math.round(dy / PX_POR_MINUTO / passo);
                      if (ultimoPassoDaAlca.current === passoAtual) return;
                      ultimoPassoDaAlca.current = passoAtual;
                      setRedim({ id: item.id, dy });
                    }}
                    onConfirmar={(delta) => onRedimensionar(item, delta)}
                  />
                ) : null}
              </Fragment>
            );
          })}

          {ehHoje && posicaoAgora >= 0 && posicaoAgora <= altura ? (
            <div
              ref={linhaAgoraRef}
              className="agenda-linha-agora"
              style={{ transform: `translateY(${posicaoAgora}px)` }}
              aria-label={`Agora, ${horaMinuto(escala.minutoAtual)}`}
            >
              <span>{horaMinuto(escala.minutoAtual)}</span>
            </div>
          ) : null}
          {vizinhos}
        </div>
      </div>
    </div>
  );
}

/** Memorizada: a troca de dia e os gestos da tela só a re-renderizam quando algo dela muda. */
export const AgendaTimeline = memo(AgendaTimelineBase);
