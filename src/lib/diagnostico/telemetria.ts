/**
 * Telemetria temporária da prévia (tela em branco, 25/10/2026).
 *
 * Só liga em `previa.*` (ou com `localStorage["cortai:diag"] = "1"`, para o ensaio local). Guarda eventos
 * curtos — rota, estado do roteador, eventos de login, erros e se a área da tela ficou vazia — e envia em
 * lotes como uma consulta a um endereço que não existe no Supabase da prévia (`/rest/v1/diag_cortai_tela`).
 * A resposta é 404 e nada é gravado no banco: o conteúdo fica só no registro de acessos do Supabase, que dá
 * para ler depois e reconstruir o que aconteceu no aparelho. Nada de dado pessoal: só nomes de rotas,
 * estados, tempos e mensagens de erro. Sai quando a causa estiver confirmada.
 */

type Evento = Record<string, string | number | boolean | null | undefined>;

const LIMITE_DE_ENVIOS = 120;
/** Caracteres já codificados por pedido: o registro do Supabase corta o endereço perto de 1000. */
const TAMANHO_DO_PEDACO = 600;

let ligada: boolean | null = null;
let fila: Evento[] = [];
let relogio: number | null = null;
let envios = 0;
let sequencia = 0;
const inicio = typeof performance !== "undefined" ? performance.now() : 0;
const sessao = Math.random().toString(36).slice(2, 8);

export function telemetriaLigada(): boolean {
  if (ligada !== null) return ligada;
  if (typeof window === "undefined") return (ligada = false);
  let porChave = false;
  try {
    porChave = window.localStorage.getItem("cortai:diag") === "1";
  } catch {
    porChave = false;
  }
  ligada = window.location.hostname.startsWith("previa.") || porChave;
  return ligada;
}

function destino(): { url: string; chave: string } | null {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const chave = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  return url && chave ? { url: url.replace(/\/+$/, ""), chave } : null;
}

/** Divide o texto já codificado sem cortar um "%XX" ao meio (o leitor junta os pedaços e decodifica uma vez). */
export function pedacosCodificados(codificado: string, tamanho = TAMANHO_DO_PEDACO): string[] {
  const pedacos: string[] = [];
  for (let i = 0; i < codificado.length;) {
    let fim = Math.min(i + tamanho, codificado.length);
    const escape = codificado.lastIndexOf("%", fim - 1);
    if (fim < codificado.length && escape >= i && escape > fim - 3) fim = escape;
    pedacos.push(codificado.slice(i, fim));
    i = fim;
  }
  return pedacos.length ? pedacos : [""];
}

function enviar(lote: Evento[]) {
  const alvo = destino();
  if (!alvo || envios >= LIMITE_DE_ENVIOS) return;
  const pedacos = pedacosCodificados(encodeURIComponent(JSON.stringify(lote)));
  const numero = ++sequencia;
  const versao = encodeURIComponent(typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev");
  pedacos.forEach((parte, i) => {
    if (envios >= LIMITE_DE_ENVIOS) return;
    envios++;
    // A chave vai no endereço (o Supabase aceita `apikey` assim): sem cabeçalho próprio, o navegador não
    // faz a checagem prévia (OPTIONS) e cada lote custa um pedido só.
    const endereco = `${alvo.url}/rest/v1/diag_cortai_tela?apikey=${encodeURIComponent(alvo.chave)}&s=${sessao}&b=${versao}&n=${numero}&p=${i + 1}of${pedacos.length}&d=${parte}`;
    void fetch(endereco, { cache: "no-store", keepalive: true }).catch(() => undefined);
  });
}

export function descarregarTelemetria() {
  if (relogio !== null) {
    window.clearTimeout(relogio);
    relogio = null;
  }
  if (!fila.length) return;
  const lote = fila;
  fila = [];
  enviar(lote);
}

/** Registra um evento. `urgente` envia na hora (tela em branco, erro). */
export function registrar(tipo: string, dados: Evento = {}, urgente = false) {
  if (!telemetriaLigada()) return;
  fila.push({ t: Math.round(performance.now() - inicio), k: tipo, ...dados });
  if (urgente) return descarregarTelemetria();
  if (relogio === null) relogio = window.setTimeout(descarregarTelemetria, 1500);
}

/** Resumo do roteador: estado, rota e o estado de cada trecho da rota. */
export function fotoDoRoteador(router: unknown): Evento {
  try {
    const r = router as {
      state: {
        status: string;
        isLoading: boolean;
        location: { pathname: string };
        resolvedLocation?: { pathname: string };
        matches: Array<{ routeId: string; status: string; invalid?: boolean; error?: unknown }>;
        pendingMatches?: Array<{ routeId: string; status: string }>;
      };
      stores?: { ids?: { get?: () => string[] } };
    };
    const s = r.state;
    const trecho = (m: { routeId: string; status: string; invalid?: boolean; error?: unknown }) =>
      `${m.routeId}:${m.status}${m.invalid ? "*" : ""}${m.error ? "!" : ""}`;
    return {
      st: s.status,
      ld: s.isLoading ? 1 : 0,
      loc: s.location.pathname,
      res: s.resolvedLocation?.pathname ?? null,
      m: s.matches.map(trecho).join(","),
      pm: (s.pendingMatches ?? []).map(trecho).join(","),
      ids: (r.stores?.ids?.get?.() ?? []).join(","),
    };
  } catch (erro) {
    return { falha: erro instanceof Error ? erro.message.slice(0, 80) : "?" };
  }
}

let instalada = false;
/** Ouve erros globais e envia o que sobrou na fila ao esconder a tela. */
export function instalarTelemetria() {
  if (instalada || !telemetriaLigada()) return;
  instalada = true;
  window.addEventListener("error", (e) =>
    registrar(
      "erro",
      {
        msg: String(e.message ?? "").slice(0, 160),
        src: String(e.filename ?? "")
          .split("/")
          .pop(),
      },
      true,
    ),
  );
  window.addEventListener("unhandledrejection", (e) => {
    const motivo = e.reason as { message?: string } | undefined;
    registrar("rejeicao", { msg: String(motivo?.message ?? e.reason ?? "").slice(0, 160) }, true);
  });
  document.addEventListener("visibilitychange", () => {
    registrar("visivel", { v: document.visibilityState });
    if (document.visibilityState === "hidden") descarregarTelemetria();
  });
  registrar("inicio", {
    loc: window.location.pathname,
    tela: `${window.innerWidth}x${window.innerHeight}`,
    pwa: window.matchMedia?.("(display-mode: standalone)").matches ? 1 : 0,
  });
}
