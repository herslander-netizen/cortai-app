import { OrigemDoAgendamento } from "@/components/barbeiro/agenda/OrigemDoAgendamento";
import { Check, Clock3 } from "lucide-react";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type React from "react";

import { StatusBadge } from "@/components/ui/badge";
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
import { passoDoGesto } from "@/lib/remarcacao-regras";
import { criarToqueLongoVazio } from "@/components/barbeiro/agenda/toque-longo-vazio";
import { prefereMenosMovimento } from "@/lib/motion";

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
  /** Bloqueios ativos no dia; só informação visual, sem alterar disponibilidade. */
  bloqueios?: { profissional_id: string | null; inicio: string; fim: string }[];
  horarios: HorarioFuncionamento[];
  selecionado: string | null;
  onSelecionar: (id: string) => void;
  /** Mantido por compatibilidade; a timeline mostra só estados especiais. */
  renderStatus?: (status: string) => ReactNode;
  onMover?: (item: AgendaItem, deltaMin: number) => void;
  /** Esticar ou encurtar a duração pela alça da base do cartão (variação em minutos). */
  onRedimensionar?: (item: AgendaItem, deltaMin: number) => void;
  /** Segurar o cartão sem arrastar (toque): entra no modo de editar horário. */
  onEditar?: (item: AgendaItem) => void;
  /** Passo do negócio, em minutos: define o passo fino do arrasto (veja `passoDoGesto`). */
  passoMin?: number;
  /** Cartão em edição: mostra o intervalo novo ou o motivo de não poder salvar. */
  edicaoDoCartao?: { id: string } | undefined;
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
};

const PX_POR_MINUTO = 2.25;
const MARGEM_AGORA_MIN = 90;
const ALTURA_MINIMA_BLOCO = 72;
const ESPACO_ENTRE_BLOCOS = 6;

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

export function AgendaTimeline({
  dia,
  fuso,
  agora: agoraProp,
  itens,
  bloqueios = [],
  horarios,
  selecionado,
  onSelecionar,
  onMover,
  onRedimensionar,
  onEditar,
  passoMin,
  edicaoDoCartao,
  onHorarioVazio,
  destaques,
  itensEscala,
  alinhado,
  mostrarProfissional = false,
  discreto = false,
  previa = false,
  diaCompleto = false,
}: AgendaTimelineProps) {
  const relogio = useAgora();
  const agora = agoraProp ?? relogio;
  const [toqueVazio, setToqueVazio] = useState<number | null>(null);
  const rolagemRef = useRef<HTMLDivElement>(null);
  const linhaAgoraRef = useRef<HTMLDivElement>(null);
  const posicionouRef = useRef<string | null>(null);
  const [agoraVisivel, setAgoraVisivel] = useState(true);
  const [arrasto, setArrasto] = useState<{ id: string; dy: number } | null>(null);
  const [redim, setRedim] = useState<{ id: string; dy: number } | null>(null);
  const passo = passoDoGesto(passoMin);
  const gesto = useRef<{
    id: string;
    y0: number;
    x0: number;
    ativo: boolean;
    timer?: number;
    arrastou: boolean;
    longo?: boolean;
    rolagem0: number;
    dy: number;
  } | null>(null);
  const bloqueio = useRef<ReturnType<typeof criarBloqueioDeRolagem> | null>(null);
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
    const ultimo = diaCompleto ? escala.fim - 30 : escala.fim;
    for (let minuto = escala.inicio; minuto <= ultimo; minuto += 30) resultado.push(minuto);
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
        return { item, inicio, fim: Math.max(inicio + 30, minutosNoFuso(item.fim, fuso)) };
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
          const altura = alinhado
            ? Math.max(44, (evento.fim - evento.inicio) * PX_POR_MINUTO - 4)
            : Math.max(ALTURA_MINIMA_BLOCO, (evento.fim - evento.inicio) * PX_POR_MINUTO - 4);
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
            const altura = Math.max(44, (evento.fim - evento.inicio) * PX_POR_MINUTO - 4);
            resultado.set(evento.item.id, { inicio: evento.inicio, fim: evento.fim, topo, altura });
            cursor = topo + altura + ESPACO_ENTRE_BLOCOS;
            return;
          }
          const altura = Math.max(
            ALTURA_MINIMA_BLOCO,
            (evento.fim - evento.inicio) * PX_POR_MINUTO - 4,
          );
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
  }, [alinhado, escala.inicio, fuso, itens]);

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
      linha.scrollIntoView({
        block: "center",
        behavior: comportamento === "smooth" && prefereMenosMovimento() ? "auto" : comportamento,
      });
      return;
    }
    area.scrollTo({
      top: Math.max(0, linha.offsetTop - area.clientHeight * 0.42),
      behavior: comportamento,
    });
  }

  useEffect(() => {
    if (previa || !ehHoje || posicionouRef.current === dia) return;
    const quadro = window.requestAnimationFrame(() => {
      voltarParaAgora("auto");
      posicionouRef.current = dia;
    });
    return () => window.cancelAnimationFrame(quadro);
  }, [dia, ehHoje, altura, previa]);

  // Dia completo fora de hoje: começa na abertura do expediente, não à meia-noite.
  useEffect(() => {
    if (previa || ehHoje || !diaCompleto || posicionouRef.current === dia) return;
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
    window.addEventListener("resize", montar);
    return () => {
      window.removeEventListener("resize", montar);
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
    const g = {
      id: item.id,
      y0: e.clientY,
      x0: e.clientX,
      ativo: e.pointerType === "mouse",
      arrastou: false,
      rolagem0: celularAgora() ? window.scrollY : (rolagemRef.current?.scrollTop ?? 0),
      dy: 0,
    } as NonNullable<typeof gesto.current>;
    const alvo = e.currentTarget as HTMLElement;
    const pid = e.pointerId;
    if (e.pointerType !== "mouse") {
      g.timer = window.setTimeout(() => {
        if (gesto.current !== g) return;
        try {
          alvo.setPointerCapture(pid);
        } catch {
          // Sem captura o fim do toque pode não chegar: cancela o arrasto.
          gesto.current = null;
          return;
        }
        g.ativo = true;
        g.longo = true;
        travarRolagemDoToque();
        setArrasto({ id: item.id, dy: 0 });
        navigator.vibrate?.(10);
      }, 280);
    }
    gesto.current = g;
  }
  function moverGesto(e: React.PointerEvent) {
    const g = gesto.current;
    if (!g) return;
    const celular = celularAgora();
    const area = rolagemRef.current;
    const borda = 48;
    if (g.ativo && celular) {
      // No celular quem rola é a página: bordas da área livre e window.scrollBy.
      const r = areaLivre();
      if (e.clientY < r.top + borda)
        window.scrollBy(0, -Math.ceil((r.top + borda - e.clientY) / 4));
      else if (e.clientY > r.bottom - borda)
        window.scrollBy(0, Math.ceil((e.clientY - (r.bottom - borda)) / 4));
    } else if (g.ativo && area) {
      const r = area.getBoundingClientRect();
      if (e.clientY < r.top + borda) area.scrollTop -= Math.ceil((r.top + borda - e.clientY) / 4);
      else if (e.clientY > r.bottom - borda)
        area.scrollTop += Math.ceil((e.clientY - (r.bottom - borda)) / 4);
    }
    const rolagemAtual = celular ? window.scrollY : (area?.scrollTop ?? 0);
    const dy = e.clientY - g.y0 + (rolagemAtual - g.rolagem0);
    if (!g.ativo) {
      if (Math.abs(e.clientY - g.y0) > 10 || Math.abs(e.clientX - g.x0) > 10) {
        window.clearTimeout(g.timer);
        gesto.current = null;
      }
      return;
    }
    if (!g.arrastou && Math.abs(dy) < 5) return;
    if (!g.arrastou) {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* */
      }
    }
    g.arrastou = true;
    e.preventDefault();
    g.dy = dy;
    setArrasto({ id: g.id, dy });
  }
  function fimGesto(item: AgendaItem) {
    const g = gesto.current;
    gesto.current = null;
    soltarRolagemDoToque();
    if (!g) return;
    window.clearTimeout(g.timer);
    const dy = g.id === item.id ? g.dy : 0;
    setArrasto(null);
    if (!g.arrastou) {
      // Toque longo sem arrastar: abre o modo de edição (como no modelo), sem abrir a ficha.
      if (g.longo && onEditar) {
        ignorarClique.current = true;
        onEditar(item);
      }
      return;
    }
    ignorarClique.current = true;
    const delta = Math.round(dy / PX_POR_MINUTO / passo) * passo;
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
  const intervalo = intervaloDoDia(horarios, dia);
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
  const alinharNoCelular = previa && diaCompleto;
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
    const topoDesejado = ehHoje
      ? window.innerHeight / 2 - posicaoAgora
      : 120 - abreEm * PX_POR_MINUTO;
    area.style.transform = `translate3d(${esquerdaReal - esquerdaNoPalco}px,${topoDesejado - grade.top}px,0)`;
  }, [alinharNoCelular, ehHoje, posicaoAgora, abreEm, altura, itens.length]);

  return (
    <div
      ref={envolturaRef}
      className={`agenda-timeline-wrap${previa ? " agenda-timeline-previa" : ""}`}
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
        className="agenda-timeline-scroll"
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
                transform: alinharNoCelular ? undefined : `translateY(${-deslocamentoPrevia}px)`,
              }
            : undefined
        }
      >
        <div
          className="agenda-timeline"
          id={previa ? undefined : "agenda-timeline-grade"}
          tabIndex={previa ? undefined : -1}
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
          {intervalo ? (
            <div
              className="agenda-timeline-intervalo"
              style={{
                top: `${(intervalo[0] - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(intervalo[0])}px`,
                height: `${(intervalo[1] - intervalo[0]) * PX_POR_MINUTO}px`,
              }}
              aria-hidden
            >
              <span>Intervalo</span>
            </div>
          ) : null}
          {bloqueios.map((bloqueio, indice) => {
            const inicioReal = minutosNoFuso(bloqueio.inicio, fuso);
            const fimReal = minutosNoFuso(bloqueio.fim, fuso);
            const inicio = Math.max(escala.inicio, inicioReal);
            const fim = Math.min(escala.fim, fimReal);
            if (fim <= inicio) return null;
            const topo = (inicio - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(inicio);
            const altura =
              (fim - inicio) * PX_POR_MINUTO + deslocamentoAte(fim) - deslocamentoAte(inicio);
            return (
              <div
                key={`${bloqueio.profissional_id ?? "equipe"}-${bloqueio.inicio}-${bloqueio.fim}-${indice}`}
                className="agenda-timeline-bloqueio"
                style={{ top: `${topo}px`, height: `${altura}px` }}
                role="note"
                aria-label={`Horário bloqueado de ${horaMinuto(inicio)} a ${horaMinuto(fim)}`}
              >
                <span>Bloqueado · {horaMinuto(inicio)}–{horaMinuto(fim)}</span>
              </div>
            );
          })}
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

          {itens.map((item) => {
            const nome = nomeDaAgenda(item.cliente, discreto);
            const posicao = layout.posicoes.get(item.id);
            const inicio = posicao?.inicio ?? minutosNoFuso(item.inicio, fuso);
            const fim = minutosNoFuso(item.fim, fuso);
            const topo =
              posicao?.topo ?? (inicio - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(inicio);
            const blocoAltura =
              posicao?.altura ??
              Math.max(
                ALTURA_MINIMA_BLOCO,
                (Math.max(inicio + 1, fim) - inicio) * PX_POR_MINUTO - 4,
              );
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
            const alturaDoBloco = Math.max(
              ALTURA_MINIMA_BLOCO,
              blocoAltura + passoRedim * PX_POR_MINUTO,
            );
            // Cartão curto (até 30 min): só a linha principal e o serviço, com altura fixa.
            const compacto = fim - inicio <= 30;
            const faixaDaColuna = posicao?.colunas
              ? {
                  left: `calc(7px + (100% - 11px) * ${posicao.coluna ?? 0} / ${posicao.colunas})`,
                  right: "auto",
                  width: `calc((100% - 11px) / ${posicao.colunas} - 4px)`,
                }
              : { left: "7px", right: "4px" };
            return (
              <Fragment key={item.id}>
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
                  aria-label={`${horaMinuto(inicio)}, ${nome}, ${item.servico}, ${item.status.replace("_", " ")}`}
                  data-sem-gesto-dia={edicaoDoCartao?.id === item.id ? "" : undefined}
                  className={`agenda-timeline-bloco agenda-timeline-${item.status} ${item.confirmadoEm && item.status === "agendado" ? "agenda-timeline-confirmado" : ""} ${ehHoje && minutosNoFuso(item.fim, fuso) < escala.minutoAtual ? "agenda-timeline-passado" : ""} ${item.encaixe ? "agenda-timeline-encaixe" : ""} ${selecionado === item.id ? "agenda-timeline-selecionado" : ""} ${destaques?.has(item.id) ? "agenda-novo" : ""} ${arrasto?.id === item.id ? "agenda-arrastando" : ""}`}
                  style={{
                    top: `${topo}px`,
                    ...(compacto
                      ? { height: `${alturaDoBloco}px` }
                      : { minHeight: `${alturaDoBloco}px` }),
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
                  }}
                  aria-pressed={selecionado === item.id}
                  tabIndex={previa ? -1 : undefined}
                  {...(previa
                    ? {}
                    : {
                        onPointerDown: (e: React.PointerEvent) => inicioGesto(e, item),
                        onPointerMove: moverGesto,
                        onPointerUp: () => fimGesto(item),
                        onPointerCancel: () => {
                          if (gesto.current) window.clearTimeout(gesto.current.timer);
                          gesto.current = null;
                          soltarRolagemDoToque();
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
                  <span className="agenda-timeline-bloco-topo">
                    <strong className="col-span-2">
                      {horaMinuto(
                        arrasto?.id === item.id
                          ? inicio + Math.round(arrasto.dy / PX_POR_MINUTO / passo) * passo
                          : inicio,
                      )}{" "}
                      · {nome}
                    </strong>
                  </span>
                  {edicaoDoCartao?.id === item.id ? (
                    <span
                      aria-label="Novo horário proposto"
                      className="absolute right-2 top-1.5 z-[1] max-w-[48%] truncate rounded-full bg-ink3 px-2.5 py-0.5 text-xs font-semibold text-paper"
                    >
                      {horaMinuto(inicio)} – {horaMinuto(fim)}
                    </span>
                  ) : null}
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="agenda-timeline-servico min-w-0 flex-1">{item.servico}</span>
                    {mostrarProfissional ? (
                      <span className="agenda-timeline-prof shrink-0 truncate text-xs text-mute max-w-[45%]">
                        {item.profissional}
                      </span>
                    ) : null}
                    <span className="flex shrink-0 gap-1">
                      {/* Etiqueta com o nome do estado em todo cartão: a cor ajuda, mas não é a única pista. */}
                      {item.confirmadoEm && item.status === "agendado" ? (
                        <StatusBadge status="confirmado" label="Confirmou" />
                      ) : (
                        <StatusBadge
                          status={
                            item.encaixe && item.status === "agendado" ? "encaixe" : item.status
                          }
                        />
                      )}
                      {ehHoje && estaAtrasado(item, agora) ? (
                        <StatusBadge status="atrasado" />
                      ) : null}
                      {item.encaixe && (item.status !== "agendado" || item.confirmadoEm) ? (
                        <StatusBadge status="encaixe" />
                      ) : null}
                    </span>
                  </span>
                  {compacto ? null : (
                    <OrigemDoAgendamento origem={item.origem} assistido={item.assistidoPorCortai} />
                  )}
                  {item.daListaDeEspera && !compacto ? (
                    <span className="agenda-timeline-fila">
                      Vaga preenchida pela lista de espera
                    </span>
                  ) : null}
                  {reais && !compacto ? (
                    <span className="agenda-timeline-reais">{reais}</span>
                  ) : null}
                </Button>
                {!previa && onRedimensionar && podeMover(item) && edicaoDoCartao?.id === item.id ? (
                  <AlcaDeDuracao
                    rotulo={`Esticar a duração de ${nome}`}
                    etiqueta={redim?.id === item.id ? `até ${horaMinuto(fim + passoRedim)}` : null}
                    estilo={{ top: `${topo + alturaDoBloco - 32}px`, ...faixaDaColuna }}
                    pxPorMinuto={PX_POR_MINUTO}
                    passoMin={passo}
                    lerRolagem={() =>
                      celularAgora() ? window.scrollY : (rolagemRef.current?.scrollTop ?? 0)
                    }
                    onTravar={travarRolagemDoToque}
                    onSoltar={soltarRolagemDoToque}
                    onArrastar={(dy) => setRedim(dy === null ? null : { id: item.id, dy })}
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
        </div>
      </div>
    </div>
  );
}
