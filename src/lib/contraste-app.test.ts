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

const IDENTIDADES = ["moderno", "indigo", "rose", "copper", "classico"] as const;
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


describe("tokens visuais do Figaroo", () => {
  const theme = bloco("@theme inline");
  const escuro = bloco(':root,\n:root[data-identidade="moderno"]');
  const claro = bloco('.light,\n:root[data-identidade="moderno"].light');

  it("registra os tokens recuperados no tema do Tailwind", () => {
    expect(theme).toMatchObject({
      "--font-figaroo-display": '"Poppins", "Manrope", ui-sans-serif, system-ui, sans-serif',
      "--font-figaroo-body": '"Plus Jakarta Sans", "Manrope", ui-sans-serif, system-ui, sans-serif',
      "--font-figaroo-mono": '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      "--color-brand-primary-10": "var(--brand-primary-10)",
      "--color-brand-primary-30": "var(--brand-primary-30)",
      "--color-brand-primary-50": "var(--brand-primary-50)",
      "--color-brand-primary-90": "var(--brand-primary-90)",
      "--color-brand-tertiary-10": "var(--brand-tertiary-10)",
      "--color-brand-tertiary-50": "var(--brand-tertiary-50)",
      "--color-brand-tertiary-90": "var(--brand-tertiary-90)",
      "--color-action-blue": "var(--action-blue)",
      "--color-action-blue-foreground": "var(--action-blue-foreground)",
      "--color-confetti-gold": "var(--confetti-gold)",
      "--color-success": "var(--success)",
      "--color-warning": "var(--warning)",
      "--color-error": "var(--error)",
    });
    // A tipografia atual segue Manrope até validação visual e decisão de marca.
    expect(theme["--font-sans"]).toBe('"Manrope", ui-sans-serif, system-ui, sans-serif');
    expect(theme["--font-display"]).toBe('"Manrope", ui-sans-serif, system-ui, sans-serif');
  });

  it("preserva exatamente a paleta oficial clara e escura", () => {
    expect(escuro).toMatchObject({
      "--brand-primary-10": "#001a40",
      "--brand-primary-30": "#00408f",
      "--brand-primary-50": "#2467bb",
      "--brand-primary-90": "#d5e2ff",
      "--brand-tertiary-10": "#3a0e1a",
      "--brand-tertiary-50": "#ff4d8d",
      "--brand-tertiary-90": "#ffdade",
      "--fundo": "#1b1f1c",
      "--cartao": "#2a2f2c",
      "--painel": "#3e4440",
      "--linha": "#414742",
      "--texto": "#e8eee9",
      "--texto-suave": "#aeb5b0",
      "--success": "#43a047",
      "--warning": "#e08e22",
      "--error": "#f2b8b5",
      "--action-blue": "#4da3ff",
      "--action-blue-foreground": "#ffffff",
      "--confetti-gold": "#ffd700",
    });
    expect(claro).toMatchObject({
      "--brand-tertiary-50": "#d3145d",
      "--action-blue": "#00509d",
      "--fundo": "#f0f7f2",
      "--cartao": "#ffffff",
      "--painel": "#d6e0d9",
      "--linha": "#d6e0d9",
      "--texto": "#191c1a",
      "--texto-suave": "#707973",
      "--success": "#2e7d32",
      "--warning": "#b6730f",
      "--error": "#b3261e",
    });
  });

  it("disponibiliza formas e dimensões sem alterar tokens legados", () => {
    expect(theme).toMatchObject({
      "--radius-card": "var(--shape-card)",
      "--radius-dialog": "var(--shape-dialog)",
      "--radius-pill": "var(--shape-pill)",
      "--radius-chip": "var(--shape-chip)",
      "--spacing-cta": "var(--height-cta)",
      "--spacing-touch-target": "var(--min-touch-target)",
      "--spacing-screen-gutter": "var(--screen-gutter)",
    });
    expect(escuro).toMatchObject({
      "--shape-card": "12px",
      "--shape-dialog": "28px",
      "--shape-pill": "9999px",
      "--shape-chip": "8px",
      "--height-cta": "54px",
      "--min-touch-target": "48px",
      "--screen-gutter": "20px",
    });
    expect(theme["--radius-md"]).toBe("12px");
    expect(theme["--radius-sm"]).toBe("8px");
  });
});


describe("contraste das ações Figaroo", () => {
  const escuro = bloco(':root,\n:root[data-identidade="moderno"]');
  const claro = bloco('.light,\n:root[data-identidade="moderno"].light');

  it("usa texto de alto contraste no botão azul do modo escuro", () => {
    expect(razao(hex(escuro["--action-blue-foreground"]!), hex(escuro["--action-blue"]!)))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("preserva texto branco legível no botão azul do modo claro", () => {
    expect(razao(hex(claro["--action-blue-foreground"]!), hex(claro["--action-blue"]!)))
      .toBeGreaterThanOrEqual(4.5);
  });

  it("mantém contraste mínimo no selo do sino", () => {
    expect(razao(hex(escuro["--sino-badge"]!), hex("#ffffff"))).toBeGreaterThanOrEqual(4.5);
  });
});
