/**
 * Estado único de instalação do Cortaí.
 * O navegador dispara `beforeinstallprompt` cedo, muitas vezes antes de
 * qualquer tela montar — por isso o listener vive no módulo, e as telas
 * apenas assinam o estado.
 */
export type PromptDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CHAVE_DISPENSA = "cortai:instalacao-adiada";
const CHAVE_INSTALADO = "cortai:instalacao-feita";
/** Depois de "Agora não" só voltamos a convidar daqui a duas semanas. */
const DIAS_DE_ESPERA = 14;

type Estado = {
  prompt: PromptDeInstalacao | null;
  instalado: boolean;
};

let estado: Estado = { prompt: null, instalado: false };
const ouvintes = new Set<() => void>();
let iniciado = false;

function avisar() {
  estado = { ...estado };
  for (const ouvinte of ouvintes) ouvinte();
}

export function modoStandalone() {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const ios = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(standalone || ios);
}

export function ehIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function ehAndroid() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function ehMobile() {
  return ehIOS() || ehAndroid();
}

export function dentroDeIframe() {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function ler(chave: string) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* preferência local é opcional: nunca pode atrapalhar o uso do app */
  }
}

export function jaInstalouAntes() {
  return ler(CHAVE_INSTALADO) === "sim" || modoStandalone();
}

export function conviteAdiado() {
  const ate = Number(ler(CHAVE_DISPENSA) ?? 0);
  return Number.isFinite(ate) && ate > Date.now();
}

export function adiarConvite() {
  gravar(CHAVE_DISPENSA, String(Date.now() + DIAS_DE_ESPERA * 24 * 60 * 60 * 1000));
  avisar();
}

export function marcarInstalado() {
  gravar(CHAVE_INSTALADO, "sim");
  estado.prompt = null;
  estado.instalado = true;
  avisar();
}

export function iniciarEscutaDeInstalacao() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    estado.prompt = evento as PromptDeInstalacao;
    avisar();
  });
  window.addEventListener("appinstalled", () => marcarInstalado());
}

export function assinarInstalacao(ouvinte: () => void) {
  iniciarEscutaDeInstalacao();
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function lerInstalacao() {
  return estado;
}

/** Abre o prompt nativo; devolve true quando o usuário aceitou instalar. */
export async function instalarAgora() {
  const atual = estado.prompt;
  if (!atual) return false;
  try {
    await atual.prompt();
    const escolha = await atual.userChoice;
    estado.prompt = null;
    if (escolha.outcome === "accepted") {
      marcarInstalado();
      return true;
    }
    adiarConvite();
    return false;
  } catch {
    estado.prompt = null;
    avisar();
    return false;
  }
}
