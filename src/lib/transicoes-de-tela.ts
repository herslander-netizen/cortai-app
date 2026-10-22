/**
 * Troca de tela no padrão do Figaro (APK, `core/navigation/NavTransitionsKt`).
 * Especificação: `docs/referencia-figaro/apk/5-navegacao-e-transicoes.md`.
 *
 * - intra: avançar dentro de uma área; desliza 20 % da largura + esmaece, 300 ms.
 * - cruzada: abrir um fluxo à parte; sobe a altura da tela + esmaece, 350 ms; a de trás só esmaece.
 * - gaveta: entrar numa área a partir da Agenda; largura inteira, mola sem quique.
 * - esmaecer: fora da área do negócio, mantém a troca discreta de antes.
 */

import { CURVA, MOLA, TEMPO } from "@/lib/movimento-figaro";

export type TipoDeTransicao = "intra" | "cruzada" | "gaveta" | "esmaecer";
export type Sentido = "avancar" | "voltar";

export type EstadoDaTransicao = {
  tipo: TipoDeTransicao;
  sentido: Sentido;
  menosMovimento: boolean;
};

const AREA = "/barbeiro";
/** Telas-raiz: a Agenda, de onde a gaveta abre as áreas. */
const RAIZES = new Set(["/barbeiro", "/barbeiro/agenda", "/barbeiro/hoje"]);
/** Fluxos à parte, que no Figaro sobem de baixo (onboarding e assinatura). */
const FLUXOS_CRUZADOS = ["/barbeiro/configurar", "/barbeiro/plano"];

const CURVA_FIGARO = CURVA.rapidaParaLenta;
const DURACAO_INTRA = TEMPO.trocaIntra;
const DURACAO_CRUZADA = TEMPO.trocaCruzada;
/** `slideIntoContainer` sem spec: `spring(dampingRatio = 1, stiffness = 1500)`. */
const MOLA_GAVETA = MOLA.padraoCompose;
const DESLIZE_INTRA = "20%";
/** A ordem das camadas muda na hora, sem interpolar. */
const CAMADA_NA_HORA = { zIndex: { duration: 0 } } as const;

function normalizar(caminho: string) {
  const sem = caminho.replace(/\/+$/, "");
  return sem === "" ? "/" : sem;
}

function naArea(caminho: string) {
  return caminho === AREA || caminho.startsWith(`${AREA}/`);
}

function ehFluxoCruzado(caminho: string) {
  return FLUXOS_CRUZADOS.some((f) => caminho === f || caminho.startsWith(`${f}/`));
}

/** 0 = Agenda; 1 = área aberta pela gaveta; 2+ = telas internas. `null` fora da área do negócio. */
export function nivelDaRota(caminho: string): number | null {
  const c = normalizar(caminho);
  if (!naArea(c)) return null;
  if (RAIZES.has(c)) return 0;
  return c.slice(AREA.length).split("/").filter(Boolean).length;
}

export function tipoDaTransicao(de: string, para: string): TipoDeTransicao {
  const a = normalizar(de);
  const b = normalizar(para);
  const nivelA = nivelDaRota(a);
  const nivelB = nivelDaRota(b);
  if (nivelA === null || nivelB === null) return "esmaecer";
  if (ehFluxoCruzado(a) !== ehFluxoCruzado(b)) return "cruzada";
  if ((nivelA === 0 && nivelB === 1) || (nivelA === 1 && nivelB === 0)) return "gaveta";
  return "intra";
}

/**
 * Avançar ou voltar. Na gaveta e no fluxo cruzado o sentido vem da estrutura (abrir ou fechar);
 * nas demais, do índice do histórico (voltar do navegador diminui) e, sem ele, da profundidade.
 */
export function sentidoDaNavegacao(
  de: string,
  para: string,
  indiceAnterior?: number,
  indiceAtual?: number,
): Sentido {
  const a = normalizar(de);
  const b = normalizar(para);
  const tipo = tipoDaTransicao(a, b);
  if (tipo === "cruzada") return ehFluxoCruzado(b) ? "avancar" : "voltar";
  if (tipo === "gaveta") return nivelDaRota(b) === 1 ? "avancar" : "voltar";
  if (indiceAnterior !== undefined && indiceAtual !== undefined && indiceAnterior !== indiceAtual) {
    return indiceAtual < indiceAnterior ? "voltar" : "avancar";
  }
  const nivelA = nivelDaRota(a) ?? 0;
  const nivelB = nivelDaRota(b) ?? 0;
  return nivelB < nivelA ? "voltar" : "avancar";
}

/** Estilos de entrada da tela nova (`initial`). */
export function entradaDaTela({ tipo, sentido, menosMovimento }: EstadoDaTransicao) {
  if (menosMovimento) return { opacity: 0 };
  switch (tipo) {
    case "intra":
      return { opacity: 0, x: sentido === "avancar" ? DESLIZE_INTRA : `-${DESLIZE_INTRA}` };
    case "cruzada":
      return sentido === "avancar" ? { opacity: 0, y: "100vh" } : { opacity: 0 };
    case "gaveta":
      return { x: sentido === "avancar" ? "100%" : "-100%" };
    default:
      return { opacity: 0, y: 3 };
  }
}

/** Estado final da tela nova (`animate`). */
export function telaNoLugar({ tipo, menosMovimento }: EstadoDaTransicao) {
  if (menosMovimento) return { opacity: 1, transition: { duration: 0.15, ease: CURVA_FIGARO } };
  switch (tipo) {
    case "intra":
      return { opacity: 1, x: "0%", transition: { duration: DURACAO_INTRA, ease: CURVA_FIGARO } };
    case "cruzada":
      return {
        opacity: 1,
        y: "0vh",
        transition: { duration: DURACAO_CRUZADA, ease: CURVA_FIGARO },
      };
    case "gaveta":
      return { x: "0%", transition: MOLA_GAVETA };
    default:
      return { opacity: 1, y: 0 };
  }
}

/**
 * Saída da tela anterior (`exit`). Ela fica sobreposta (`popLayout`, posição absoluta); por isso vai
 * para trás da tela nova (`zIndex: -1`), como no Compose, exceto ao fechar um fluxo cruzado, em que é
 * o próprio fluxo que desce por cima.
 */
export function saidaDaTela({ tipo, sentido, menosMovimento }: EstadoDaTransicao) {
  if (menosMovimento) return { opacity: 0, transition: { duration: 0.15, ease: CURVA_FIGARO } };
  switch (tipo) {
    case "intra":
      return {
        opacity: 0,
        zIndex: -1,
        x: sentido === "avancar" ? `-${DESLIZE_INTRA}` : DESLIZE_INTRA,
        transition: { duration: DURACAO_INTRA, ease: CURVA_FIGARO, ...CAMADA_NA_HORA },
      };
    case "cruzada":
      return sentido === "avancar"
        ? {
            opacity: 0,
            zIndex: -1,
            transition: { duration: DURACAO_CRUZADA, ease: CURVA_FIGARO, ...CAMADA_NA_HORA },
          }
        : {
            opacity: 0,
            y: "100vh",
            zIndex: 1,
            transition: { duration: DURACAO_CRUZADA, ease: CURVA_FIGARO, ...CAMADA_NA_HORA },
          };
    case "gaveta":
      return {
        zIndex: -1,
        x: sentido === "avancar" ? "-100%" : "100%",
        transition: { ...MOLA_GAVETA, ...CAMADA_NA_HORA },
      };
    default:
      return { opacity: 0 };
  }
}

/**
 * Cópia visual da tela que está saindo. O `<Outlet />` da tela antiga já desenharia a rota nova,
 * então a saída anima uma cópia estática do DOM, tirada antes da troca. A cópia não tem `id`
 * (para não duplicar alvos de foco e rótulos) e troca iframe, vídeo e canvas por blocos vazios do
 * mesmo tamanho (copiar um iframe o carregaria de novo).
 */
export function copiaDaTela(origem: HTMLElement): HTMLElement {
  const copia = origem.cloneNode(true) as HTMLElement;
  const pesados = "iframe, video, canvas, object, embed";
  const originais = origem.querySelectorAll<HTMLElement>(pesados);
  copia.querySelectorAll<HTMLElement>(pesados).forEach((el, i) => {
    const caixa = originais[i]?.getBoundingClientRect();
    const bloco = document.createElement("div");
    bloco.style.width = `${caixa?.width ?? 0}px`;
    bloco.style.height = `${caixa?.height ?? 0}px`;
    el.replaceWith(bloco);
  });
  copia.removeAttribute("id");
  copia.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  copia.querySelectorAll("[autofocus]").forEach((el) => el.removeAttribute("autofocus"));
  return copia;
}
