import { recarregarTelaVazia } from "@/lib/pwa/recuperar-chunk";
import { fotoDoRoteador, registrar, telemetriaLigada } from "./telemetria";

/**
 * Vigia da tela vazia (área do negócio). Se a área de conteúdo ficar sem nada desenhado, com o roteador
 * parado e a tela visível, primeiro pede às rotas que carreguem de novo; se continuar vazia, recarrega a
 * página com aviso (no máximo uma vez a cada 30 s). Uma tela de verdade sempre desenha algo — cabeçalho,
 * esqueleto de carregamento ou erro —, então "vazia" aqui é só o defeito, nunca um estado normal.
 */
export const ESPERA_PARA_RECARREGAR_ROTAS_MS = 1000;
export const ESPERA_PARA_RECARREGAR_PAGINA_MS = 2500;

export type EstadoDoVigia = {
  vazioDesde: number | null;
  recarregouRotas: boolean;
  desistiu: boolean;
};
export type AcaoDoVigia = "nada" | "recarregar-rotas" | "recarregar-pagina";

export const VIGIA_INICIAL: EstadoDoVigia = {
  vazioDesde: null,
  recarregouRotas: false,
  desistiu: false,
};

export function decidirVigia(
  estado: EstadoDoVigia,
  agora: number,
  { vazia, ocioso, visivel }: { vazia: boolean; ocioso: boolean; visivel: boolean },
): { acao: AcaoDoVigia; estado: EstadoDoVigia } {
  if (!vazia || !ocioso || !visivel) return { acao: "nada", estado: VIGIA_INICIAL };
  if (estado.desistiu) return { acao: "nada", estado };
  if (estado.vazioDesde === null) return { acao: "nada", estado: { ...estado, vazioDesde: agora } };
  const passou = agora - estado.vazioDesde;
  if (!estado.recarregouRotas && passou >= ESPERA_PARA_RECARREGAR_ROTAS_MS)
    return { acao: "recarregar-rotas", estado: { ...estado, recarregouRotas: true } };
  if (estado.recarregouRotas && passou >= ESPERA_PARA_RECARREGAR_PAGINA_MS)
    return { acao: "recarregar-pagina", estado: { ...estado, desistiu: true } };
  return { acao: "nada", estado };
}

/** A área de conteúdo não tem nenhum elemento com altura: nem tela, nem esqueleto, nem erro. */
export function areaVazia(area: Element): boolean {
  return !Array.from(area.children).some((filho) => filho.getBoundingClientRect().height > 0);
}

type Roteador = {
  state: { status: string; isLoading: boolean; location: { pathname: string } };
  invalidate: () => Promise<void>;
};

let instalado = false;
export function vigiarTela(router: Roteador) {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  let estado = VIGIA_INICIAL;
  let estavaVazia = false;
  // Só na prévia: cada mudança no estado das rotas, em passos de 100 ms (as trocas rápidas aparecem).
  if (telemetriaLigada()) {
    let anterior = "";
    window.setInterval(() => {
      const foto = fotoDoRoteador(router);
      const chave = `${foto["st"]}|${foto["ld"]}|${foto["loc"]}|${foto["m"]}|${foto["pm"]}|${foto["ids"]}`;
      if (chave === anterior) return;
      anterior = chave;
      registrar("roteador", foto);
    }, 100);
  }
  window.setInterval(() => {
    const area = document.querySelector(".equipe-conteudo");
    if (!area) {
      estado = VIGIA_INICIAL;
      return;
    }
    const vazia = areaVazia(area);
    if (vazia !== estavaVazia) {
      estavaVazia = vazia;
      registrar("tela", { vazia: vazia ? 1 : 0, ...fotoDoRoteador(router) }, vazia);
    }
    const resultado = decidirVigia(estado, Date.now(), {
      vazia,
      ocioso: router.state.status === "idle" && !router.state.isLoading,
      visivel: document.visibilityState === "visible",
    });
    estado = resultado.estado;
    if (resultado.acao === "recarregar-rotas") {
      registrar("vigia-rotas", fotoDoRoteador(router), true);
      void router.invalidate();
    } else if (resultado.acao === "recarregar-pagina") {
      registrar("vigia-pagina", fotoDoRoteador(router), true);
      recarregarTelaVazia();
    }
  }, 500);
}
