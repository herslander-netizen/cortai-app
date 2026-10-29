/**
 * Contraste das superfícies do app (menu lateral e Agenda) lido direto de
 * src/styles.css, resolvendo var() e color-mix(in oklab) com funções puras.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

function bloco(seletor: string) {
  const i = css.indexOf(`${seletor} {`);
  if (i < 0) throw new Error(`bloco ${seletor} não encontrado`);
  const fim = css.indexOf("\n}", i);
  const vars: Record<string, string> = {};
  for (const m of css.slice(i, fim).matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[m[1]!] = m[2]!.trim();
  return vars;
}

type Rgb = [number, number, number];
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function hex(h: string): Rgb {
  const v = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255) as Rgb;
}
function oklab([r, g, b]: Rgb): Rgb {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function rgb([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, gam(c)))) as Rgb;
}
type Cor = { rgb: Rgb; alfa: number };
const luminancia = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function razao(a: Rgb, b: Rgb) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}
const sobre = (c: Cor, fundo: Rgb): Rgb =>
  c.rgb.map((v, i) => v * c.alfa + fundo[i]! * (1 - c.alfa)) as Rgb;

function resolver(valor: string, vars: Record<string, string>): Cor {
  const v = valor.trim();
  if (v.startsWith("#")) return { rgb: hex(v), alfa: 1 };
  if (v === "transparent") return { rgb: [0, 0, 0], alfa: 0 };
  if (v === "black") return { rgb: [0, 0, 0], alfa: 1 };
  if (v === "white") return { rgb: [1, 1, 1], alfa: 1 };
  const ref = v.match(/^var\((--[\w-]+)\)$/);
  if (ref) return resolver(vars[ref[1]!]!, vars);
  const mix = v.match(/^color-mix\(in oklab, (.+) (\d+)%, (.+)\)$/);
  if (mix) {
    const a = resolver(mix[1]!, vars);
    const b = resolver(mix[3]!, vars);
    const p = Number(mix[2]) / 100;
    const alfa = a.alfa * p + b.alfa * (1 - p);
    if (alfa === 0) return { rgb: [0, 0, 0], alfa: 0 };
    const [la, lb] = [oklab(a.rgb), oklab(b.rgb)];
    const mist = la.map((x, i) => (x * a.alfa * p + lb[i]! * b.alfa * (1 - p)) / alfa) as Rgb;
    return { rgb: rgb(mist), alfa };
  }
  throw new Error(`valor não suportado: ${v}`);
}

const IDENTIDADES = ["moderno"] as const;
const raiz = bloco(':root,\n:root[data-identidade="moderno"]');
const claro = bloco('.light,\n:root[data-identidade="moderno"].light');

function tokens(identidade: (typeof IDENTIDADES)[number], tema: "escuro" | "claro") {
  const vars = {
    ...raiz,
    ...(identidade === "moderno" ? {} : bloco(`:root[data-identidade="${identidade}"]`)),
    ...(tema === "claro" ? claro : {}),
  };
  const opaco = (nome: string, fundo?: Rgb) => {
    const c = resolver(`var(${nome})`, vars);
    return fundo ? sobre(c, fundo) : c.rgb;
  };
  const ink = opaco("--ink");
  const menu = opaco("--drawer-surface");
  const cartaoMenu = opaco("--drawer-card", menu);
  return {
    ink,
    ink2: opaco("--ink2", ink),
    ink3: opaco("--ink3", ink),
    menu,
    cartaoMenu,
    icone: opaco("--menu-icone", cartaoMenu),
    paper: opaco("--paper"),
    mute: opaco("--mute"),
    mute2: opaco("--mute2"),
    hora: opaco("--line2", ink),
    meia: opaco("--line", ink),
  };
}

const deltaL = (a: Rgb, b: Rgb) => Math.abs(oklab(a)[0] - oklab(b)[0]);

describe.each(IDENTIDADES)("identidade %s", (identidade) => {
  describe.each(["escuro", "claro"] as const)("tema %s", (tema) => {
    const t = tokens(identidade, tema);
    // Claro 3.0: paleta suave definida pelo dono; a borda (--linha) completa a separação.
    const minimoL = tema === "escuro" ? 0.06 : 0.03; // paleta aprovada pelo dono; a borda completa a separação

    it("cartão se separa do fundo (app e menu)", () => {
      expect(deltaL(t.ink2, t.ink)).toBeGreaterThanOrEqual(minimoL);
      expect(deltaL(t.cartaoMenu, t.menu)).toBeGreaterThanOrEqual(minimoL);
    });
    it("ícone do menu legível sobre o cartão", () => {
      expect(razao(t.icone, t.cartaoMenu)).toBeGreaterThanOrEqual(
        identidade === "moderno" ? 4.5 : 3,
      );
    });
    it("título de grupo ≥ 4,5:1 sobre o fundo do menu", () => {
      expect(razao(t.icone, t.menu)).toBeGreaterThanOrEqual(4.5);
    });
    it("mute e mute2 ≥ 4,5:1", () => {
      for (const f of [t.ink, t.ink2, t.ink3]) expect(razao(t.mute, f)).toBeGreaterThanOrEqual(4.5);
      for (const f of [t.ink, t.ink2]) expect(razao(t.mute2, f)).toBeGreaterThanOrEqual(4.5);
    });
    it("linhas da timeline: hora ≥ 1,6:1, meia hora mais fraca e ≥ 1,2:1", () => {
      expect(razao(t.hora, t.ink)).toBeGreaterThanOrEqual(1.6);
      expect(razao(t.meia, t.ink)).toBeGreaterThanOrEqual(1.2);
      expect(razao(t.meia, t.ink)).toBeLessThan(razao(t.hora, t.ink));
    });
    it("texto principal ≥ 7:1 sobre o cartão", () => {
      expect(razao(t.paper, t.ink2)).toBeGreaterThanOrEqual(7);
    });
  });
});


describe("tokens recuperados do Figaroo", () => {
  const theme = bloco("@theme inline");
  const escuro = bloco(':root,\n:root[data-identidade="moderno"]');
  const claro = bloco('.light,\n:root[data-identidade="moderno"].light');

  it("expõe a escala tonal e os tokens semânticos no tema Tailwind", () => {
    expect(theme).toMatchObject({
      "--color-figaroo-primary-10": "var(--figaroo-primary-10)",
      "--color-figaroo-primary-30": "var(--figaroo-primary-30)",
      "--color-figaroo-primary-50": "var(--figaroo-primary-50)",
      "--color-figaroo-primary-90": "var(--figaroo-primary-90)",
      "--color-figaroo-tertiary-muted-10": "var(--figaroo-tertiary-muted-10)",
      "--color-figaroo-brand-pink": "var(--figaroo-brand-pink)",
      "--color-figaroo-tertiary-muted-90": "var(--figaroo-tertiary-muted-90)",
      "--color-figaroo-action-blue": "var(--figaroo-action-blue)",
      "--color-figaroo-success": "var(--figaroo-success)",
      "--color-figaroo-warning": "var(--figaroo-warning)",
      "--color-figaroo-error": "var(--figaroo-error)",
      "--color-figaroo-confetti-gold": "var(--figaroo-confetti-gold)",
      "--color-figaroo-status-success-bg": "var(--figaroo-status-success-bg)",
      "--color-figaroo-status-attention-bg": "var(--figaroo-status-attention-bg)",
      "--color-figaroo-status-error-bg": "var(--figaroo-status-error-bg)",
      "--color-figaroo-status-info-bg": "var(--figaroo-status-info-bg)",
      "--color-figaroo-status-brand-bg": "var(--figaroo-status-brand-bg)",
      "--color-figaroo-status-neutral-bg": "var(--figaroo-status-neutral-bg)",
      "--radius-figaroo-card": "var(--figaroo-radius-card)",
      "--radius-figaroo-dialog": "var(--figaroo-radius-dialog)",
      "--radius-figaroo-pill": "var(--figaroo-radius-pill)",
      "--radius-figaroo-chip": "var(--figaroo-radius-chip)",
      "--spacing-figaroo-20": "var(--figaroo-spacing-20)",
      "--spacing-figaroo-cta": "var(--figaroo-cta-height)",
      "--spacing-figaroo-touch-target": "var(--figaroo-touch-target)",
      "--font-figaroo-title": '"Poppins", "Manrope", ui-sans-serif, system-ui, sans-serif',
      "--font-figaroo-body": '"Plus Jakarta Sans", "Manrope", ui-sans-serif, system-ui, sans-serif',
      "--font-figaroo-mono": '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      "--font-size-figaroo-min": "var(--figaroo-font-size-min)",
      "--font-size-figaroo-max": "var(--figaroo-font-size-max)",
    });
  });

  it("registra a paleta oficial escura e clara", () => {
    expect(escuro).toMatchObject({
      "--figaroo-primary-10": "#001a40",
      "--figaroo-primary-30": "#00408f",
      "--figaroo-primary-50": "#2467bb",
      "--figaroo-primary-90": "#d5e2ff",
      "--figaroo-tertiary-muted-10": "#3a0e1a",
      "--figaroo-brand-pink": "#ff4d8d",
      "--figaroo-tertiary-muted-90": "#ffdade",
      "--figaroo-action-blue": "#4da3ff",
      "--figaroo-action-blue-foreground": "#001a40",
      "--figaroo-success": "#43a047",
      "--figaroo-warning": "#e08e22",
      "--figaroo-error": "#f2b8b5",
      "--figaroo-confetti-gold": "#ffd700",
      "--figaroo-background": "#1b1f1c",
      "--figaroo-card": "#2a2f2c",
      "--figaroo-panel": "#3e4440",
      "--figaroo-border": "#414742",
      "--figaroo-text": "#e8eee9",
      "--figaroo-text-muted": "#aeb5b0",
    });
    expect(claro).toMatchObject({
      "--figaroo-brand-pink": "#d3145d",
      "--figaroo-action-blue": "#00509d",
      "--figaroo-action-blue-foreground": "#ffffff",
      "--figaroo-success": "#2e7d32",
      "--figaroo-warning": "#b6730f",
      "--figaroo-error": "#b3261e",
      "--figaroo-background": "#f0f7f2",
      "--figaroo-card": "#ffffff",
      "--figaroo-panel": "#d6e0d9",
      "--figaroo-border": "#d6e0d9",
      "--figaroo-text": "#191c1a",
      "--figaroo-text-muted": "#707973",
    });
  });

  it("preserva as cores oficiais do Cortaí sem temas alternativos de aplicativo", () => {
    expect(escuro).toMatchObject({
      "--identity-accent": "#00b7f4",
      "--identity-primary": "#087cf0",
      "--identity-secondary": "#ff1670",
      "--fundo": "#1a1f1b",
      "--cartao": "#2a2f2b",
      "--agenda-acao": "#01408f",
    });
    expect(theme["--font-sans"]).toBe('"Manrope", ui-sans-serif, system-ui, sans-serif');
    expect(theme["--font-display"]).toBe('"Manrope", ui-sans-serif, system-ui, sans-serif');
  });

  it("registra formas, medidas e espaçamento sem ativar mudanças visuais globais", () => {
    expect(escuro).toMatchObject({
      "--figaroo-radius-4": "4px",
      "--figaroo-radius-8": "8px",
      "--figaroo-radius-12": "12px",
      "--figaroo-radius-16": "16px",
      "--figaroo-radius-28": "28px",
      "--figaroo-radius-card": "12px",
      "--figaroo-radius-dialog": "28px",
      "--figaroo-radius-pill": "9999px",
      "--figaroo-radius-chip": "8px",
      "--figaroo-cta-height": "56px",
      "--figaroo-touch-target": "48px",
      "--figaroo-screen-gutter": "20px",
      "--figaroo-topbar-height": "64px",
      "--figaroo-bottom-bar-height": "80px",
      "--figaroo-time-pill-height": "32px",
      "--figaroo-agenda-row-min-height": "56px",
      "--figaroo-press-scale": "0.98",
      "--figaroo-font-size-min": "11px",
      "--figaroo-font-size-max": "57px",
      "--figaroo-spacing-2": "2px",
      "--figaroo-spacing-64": "64px",
    });
  });

  it("mantém contraste AA nos botões de ação da paleta Figaroo", () => {
    expect(
      razao(hex(escuro["--figaroo-action-blue-foreground"]!), hex(escuro["--figaroo-action-blue"]!)),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      razao(hex(claro["--figaroo-action-blue-foreground"]!), hex(claro["--figaroo-action-blue"]!)),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
