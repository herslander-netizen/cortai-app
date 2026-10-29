export const MODOS = ["claro", "escuro", "sistema"] as const;
/** Só o tema Padrão (`moderno`), em claro e escuro (dono, 29/10: "deixe apenas o padrão escuro e claro").
 * Rosé, Índigo, Cobre e Clássico saíram do app; valores antigos salvos no banco ou no aparelho caem no Padrão. */
export const IDENTIDADES = ["moderno"] as const;

export type Modo = (typeof MODOS)[number];
export type Identidade = (typeof IDENTIDADES)[number];

export const MODE_KEY = "cortai-modo-v2";
/** Último tema do aplicativo aplicado neste aparelho: o script inicial o lê para não abrir sempre em Padrão. */
export const IDENTIDADE_KEY = "cortai-identidade-v1";
export const APPEARANCE_EVENT = "cortai-aparencia";

export function modoSalvo(): Modo {
  const salvo = window.localStorage.getItem(MODE_KEY);
  return MODOS.includes(salvo as Modo) ? (salvo as Modo) : "escuro";
}

export function modoClaro(modo: Modo) {
  return (
    modo === "claro" ||
    (modo === "sistema" && window.matchMedia("(prefers-color-scheme: light)").matches)
  );
}

export function sincronizarCorDoNavegador() {
  const cor = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--background")
    .trim();
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta && cor) meta.content = cor;
}

export function aplicarModo(modo: Modo, persistir = false) {
  const claro = modoClaro(modo);
  document.documentElement.classList.toggle("light", claro);
  document.documentElement.classList.toggle("dark", !claro);
  if (persistir) window.localStorage.setItem(MODE_KEY, modo);
  sincronizarCorDoNavegador();
  window.dispatchEvent(new CustomEvent(APPEARANCE_EVENT, { detail: { modo } }));
}

export function aplicarIdentidade(identidade: Identidade) {
  document.documentElement.dataset["identidade"] = identidade;
  try {
    window.localStorage.setItem(IDENTIDADE_KEY, identidade);
  } catch {
    // Sem armazenamento (janela privada): o tema vale na sessão e o próximo abrir volta ao Padrão.
  }
  sincronizarCorDoNavegador();
}

export function identidadeValida(_valor?: unknown): Identidade {
  return "moderno";
}
