export const MODOS = ["claro", "escuro", "sistema"] as const;
export const IDENTIDADES = ["moderno", "rose", "indigo", "copper", "classico"] as const;

export type Modo = (typeof MODOS)[number];
export type Identidade = (typeof IDENTIDADES)[number];

export const MODE_KEY = "cortai-modo-v2";
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

/** Mantém a identidade fixa da marca Cortaí; valores antigos são ignorados. */
export function aplicarIdentidade(_identidade: Identidade) {
  document.documentElement.dataset["identidade"] = "moderno";
  sincronizarCorDoNavegador();
}

export function identidadeValida(valor: unknown): Identidade {
  return IDENTIDADES.includes(valor as Identidade) ? (valor as Identidade) : "moderno";
}
