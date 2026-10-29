/**
 * Contraste das superfícies do app (menu lateral e Agenda) lido direto de
 * src/styles.css, resolvendo var() e color-mix(in oklab) com funções puras.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
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

// Temas do aplicativo fora do Padrão: as ações da Agenda seguem a cor do tema e o texto sobre elas é legível.
describe.each(IDENTIDADES.filter((i) => i !== "moderno"))(
  "ações da Agenda no tema %s",
  (identidade) => {
    const escuro = bloco(':root[data-identidade]:not([data-identidade="moderno"])');
    const claroDoTema = bloco(':root.light[data-identidade]:not([data-identidade="moderno"])');
    const base = bloco(`:root[data-identidade="${identidade}"]`);
    it.each([
      ["escuro", { ...base, ...escuro }],
      ["claro", { ...base, ...escuro, ...claroDoTema }],
    ] as const)("texto sobre a ação e sobre o dia escolhido ≥ 4,5:1 (%s)", (_modo, vars) => {
      const par = (fundo: string, texto: string) =>
        razao(resolver(`var(${fundo})`, vars).rgb, resolver(`var(${texto})`, vars).rgb);
      expect(par("--agenda-acao", "--agenda-acao-texto")).toBeGreaterThanOrEqual(4.5);
      expect(par("--agenda-escolhido", "--agenda-escolhido-texto")).toBeGreaterThanOrEqual(4.5);
    });
  },
);

describe("azul do Figaro só no tema Padrão", () => {
  it("o destaque forçado na área do negócio não vale para os outros temas", () => {
    const forcados = css.match(/^:root[^\n{]*body:has\(\.management-shell\)[^\n{]*\{/gm) ?? [];
    expect(forcados.length).toBeGreaterThanOrEqual(3);
    for (const seletor of forcados) {
      expect(seletor).toContain('[data-identidade="moderno"]');
    }
    // Nenhuma regra solta de `body:has(.management-shell) { --primary: … }` sem filtro de tema.
    expect(css).not.toMatch(/^:root body:has\(\.management-shell\) \{/m);
  });
});

// Tema Cobre (paleta do Claude): neutros próprios nos dois modos, lidos do bloco `html:root[...]`.
describe.each(
  (["copper", "rose", "indigo", "classico"] as const).flatMap((tema) =>
    (["escuro", "claro"] as const).map((modo) => [tema, modo] as const),
  ),
)("Paleta própria do tema %s, %s", (tema, modo) => {
  const identidade = bloco(`:root[data-identidade="${tema}"]`);
  const neutros =
    modo === "escuro"
      ? bloco(`html:root[data-identidade="${tema}"]`)
      : bloco(`html:root[data-identidade="${tema}"].light`);
  const vars = { ...identidade, ...neutros };
  const cor = (nome: string) => resolver(`var(${nome})`, vars).rgb;
  const par = (a: string, b: string) => razao(cor(a), cor(b));
  const superficies = [
    "--figaro-background",
    "--figaro-surface-container-low",
    "--figaro-surface-container-lowest",
    "--figaro-surface-container-high",
  ];

  it("texto principal ≥ 7:1 e secundário ≥ 4,5:1 sobre todas as superfícies", () => {
    for (const s of superficies) {
      expect(par("--figaro-on-surface", s)).toBeGreaterThanOrEqual(7);
      expect(par("--figaro-on-surface-variant", s)).toBeGreaterThanOrEqual(4.5);
    }
    // O cinza de apoio (hint) vale nos fundos de leitura; no cartão mais alto do escuro basta 4,5.
    for (const s of [
      "--figaro-background",
      "--figaro-surface-container-low",
      "--figaro-surface-container-lowest",
    ])
      expect(par("--figaro-hint", s)).toBeGreaterThanOrEqual(4.5);
  });

  it("laranja de destaque e cinza secundário legíveis sobre o fundo e o cartão", () => {
    for (const s of ["--figaro-background", "--figaro-surface-container-low"]) {
      expect(par("--figaro-primary", s)).toBeGreaterThanOrEqual(4.5);
      expect(par("--figaro-secondary", s)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("texto sobre o laranja (botão, ação, contêiner) ≥ 4,5:1", () => {
    expect(par("--figaro-on-primary", "--figaro-primary")).toBeGreaterThanOrEqual(4.5);
    expect(par("--figaro-on-action-blue", "--figaro-action-blue")).toBeGreaterThanOrEqual(4.5);
    expect(
      par("--figaro-on-primary-container", "--figaro-primary-container"),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      par("--figaro-on-secondary-container", "--figaro-secondary-container"),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      par("--figaro-on-tertiary-container", "--figaro-tertiary-container"),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("cartão se separa do fundo e a borda aparece", () => {
    const fundo = cor("--figaro-background");
    const cartao = cor(
      modo === "escuro" ? "--figaro-surface-container-low" : "--figaro-surface-container-lowest",
    );
    expect(deltaL(cartao, fundo)).toBeGreaterThanOrEqual(0.03);
    expect(razao(cor("--figaro-outline"), fundo)).toBeGreaterThanOrEqual(3);
  });
});

it("Cobre: texto branco sobre o laranja dos botões ≥ 4,5:1", () => {
  const v = bloco(':root[data-identidade="copper"]');
  expect(razao([1, 1, 1], resolver("var(--identity-primary)", v).rgb)).toBeGreaterThanOrEqual(4.5);
  expect(razao([1, 1, 1], resolver("var(--identity-accent-light)", v).rgb)).toBeGreaterThanOrEqual(
    4.5,
  );
});

describe("botões e + da Agenda fora do Padrão", () => {
  it("usam a cor de ação do tema, não o primário misturado com preto", () => {
    expect(css).toMatch(
      /:root:not\(\[data-identidade="moderno"\]\)\[data-identidade\] body:has\(\.management-shell\) \{\s*--botao-fundo: var\(--agenda-acao\);\s*--botao-texto: var\(--agenda-acao-texto\);/,
    );
    expect(css).toMatch(
      /\.agenda-acao-fixa \.agenda-fab-toggle \{\s*background: var\(--agenda-acao\);/,
    );
  });
});

it("Cobre: paleta oficial da marca Claude (preto, marfim, cinza, laranja)", () => {
  const escuro = bloco('html:root[data-identidade="copper"]');
  expect(escuro["--figaro-background"]).toBe("#141413");
  expect(escuro["--figaro-primary"]).toBe("#d97757");
  expect(escuro["--figaro-secondary"]).toBe("#b0aea5");
  expect(escuro["--figaro-on-surface"]).toBe("#faf9f5");
});

describe("sombras dos botões no padrão do Figaro", () => {
  it("usam as elevações do Material 3 (3 dp na barra, 6 dp no +), sem brilho colorido", () => {
    for (const nivel of ["--elevacao-2", "--elevacao-3", "--elevacao-6", "--elevacao-8"])
      expect(css).toContain(`${nivel}: `);
    expect(css).toMatch(/\.agenda-botao-agora-principal \{[^}]*box-shadow: var\(--elevacao-3\)/);
    expect(css).toMatch(
      /\.agenda-acao-fixa \.agenda-fab-toggle \{\s*box-shadow: var\(--elevacao-6\)/,
    );
    // O brilho de 24 px na cor do tema e as sombras tingidas de marinho saíram.
    expect(css).not.toMatch(/0 8px 24px color-mix\(in oklab, var\(--(?:primary|agenda-acao)\) 30%/);
    expect(css).not.toContain("--agenda-sombra-botao");
  });

  it("o + da Agenda não anula a sombra no estilo da tela", () => {
    const fonte = readFileSync(
      resolve(__dirname, "../components/barbeiro/agenda/BotaoAgoraPrincipal.tsx"),
      "utf8",
    );
    expect(fonte).not.toMatch(/boxShadow:\s*"none"/);
  });
});

describe("sombras em tudo no padrão do Figaro", () => {
  const raiz = resolve(__dirname, "..");
  const fontes: string[] = [];
  const varrer = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      const caminho = resolve(dir, nome);
      if (statSync(caminho).isDirectory()) varrer(caminho);
      else if (/\.tsx$/.test(nome) && !/\.test\./.test(nome)) fontes.push(caminho);
    }
  };
  varrer(resolve(raiz, "components"));
  varrer(resolve(raiz, "routes"));

  it("nenhum componente usa as sombras padrão do Tailwind (shadow-sm/md/lg/xl)", () => {
    const achados = fontes.filter((f) =>
      /\bshadow-(sm|md|lg|xl|2xl)\b(?![/\w-])/.test(readFileSync(f, "utf8")),
    );
    expect(achados.map((f) => f.replace(raiz, ""))).toEqual([]);
  });

  it("cartões, diálogos e folhas ficam sem sombra (0 dp); menus e avisos usam as elevações", () => {
    const ler = (arq: string) => readFileSync(resolve(raiz, arq), "utf8");
    for (const arq of [
      "components/ui/card.tsx",
      "components/ui/dialog.tsx",
      "components/ui/sheet.tsx",
    ])
      expect(ler(arq)).toContain("shadow-none");
    expect(ler("components/ui/dropdown-menu.tsx")).toContain("shadow-[var(--elevacao-3)]");
    expect(ler("components/ui/sonner.tsx")).toContain("shadow-[var(--elevacao-8)]");
  });

  it("os cartões da Agenda não têm sombra", () => {
    expect(css).toMatch(/--agenda-cartao-sombra: none;/);
    expect(css).not.toMatch(/--agenda-cartao-sombra: 0/);
  });
});

it("Clássico claro: botões pretos com letras douradas legíveis (barbearia)", () => {
  const v = bloco('html:root.light[data-identidade="classico"][data-identidade]');
  expect(v["--agenda-acao"]).toBe("#1a1812");
  expect(
    razao(resolver("var(--agenda-acao)", v).rgb, resolver("var(--agenda-acao-texto)", v).rgb),
  ).toBeGreaterThanOrEqual(7);
  expect(
    razao(
      resolver("var(--agenda-escolhido)", v).rgb,
      resolver("var(--agenda-escolhido-texto)", v).rgb,
    ),
  ).toBeGreaterThanOrEqual(7);
});

it("Rosé e Clássico têm identidades opostas: delicado e claro no Rosé, preto e dourado no Clássico", () => {
  const rose = bloco('html:root[data-identidade="rose"]');
  const classico = bloco('html:root[data-identidade="classico"]');
  expect(razao(resolver("var(--figaro-background)", classico).rgb, [0, 0, 0])).toBeLessThan(1.3); // quase preto
  expect(
    razao(
      resolver("var(--figaro-primary)", classico).rgb,
      resolver("var(--figaro-background)", classico).rgb,
    ),
  ).toBeGreaterThanOrEqual(7); // dourado vivo
  // O rosé não é rosa dominante: o fundo é quase neutro (pouca diferença entre vermelho e azul).
  const [r, , b] = resolver("var(--figaro-background)", rose).rgb;
  expect((r - b) * 255).toBeLessThan(16);
});

it("Rosé claro: botões blush com letra vinho, delicados e legíveis", () => {
  const v = bloco('html:root.light[data-identidade="rose"][data-identidade]');
  expect(
    razao(resolver("var(--agenda-acao)", v).rgb, resolver("var(--agenda-acao-texto)", v).rgb),
  ).toBeGreaterThanOrEqual(7);
  expect(
    razao(
      resolver("var(--agenda-escolhido)", v).rgb,
      resolver("var(--agenda-escolhido-texto)", v).rgb,
    ),
  ).toBeGreaterThanOrEqual(7);
});

describe("tipografia do Figaro na área do negócio", () => {
  it("usa Plus Jakarta Sans no texto e Poppins nos títulos grandes, só dentro da área do negócio", () => {
    expect(css).toMatch(
      /body:has\(\.management-shell\) \{\s*--font-sans: "Plus Jakarta Sans"[^;]*;\s*--font-display: "Poppins"/,
    );
    expect(css).toMatch(
      /body:has\(\.management-shell\) h2,\s*body:has\(\.management-shell\) h3 \{\s*font-family: var\(--font-sans\)/,
    );
    // Páginas públicas e chat continuam na Manrope.
    expect(css).toMatch(/--font-sans: "Manrope"/);
  });

  it("as fontes são carregadas no documento", () => {
    const raiz = readFileSync(resolve(__dirname, "../routes/__root.tsx"), "utf8");
    expect(raiz).toContain("family=Plus+Jakarta+Sans");
    expect(raiz).toContain("family=Poppins");
  });
});

describe("cartão de atendimento da Agenda (cor do Figaro)", () => {
  it("não deixa um token duplicado sobrescrever a superfície clara da Agenda", () => {
    const seletor = ".light,\n:root.light,\n:root[data-identidade].light {";
    const inicio = css.lastIndexOf(seletor);
    expect(inicio).toBeGreaterThanOrEqual(0);
    const fim = css.indexOf("\n}", inicio);
    const temaClaroAgenda = css.slice(inicio, fim);
    expect(temaClaroAgenda).toContain("--agenda-cartao: var(--figaro-surface-container-lowest);");
    expect(temaClaroAgenda).not.toContain("--agenda-cartao: var(--figaro-surface-container-low);");
  });

  it("usa surfaceContainerLowest (#141816 no escuro, #fff no claro) na timeline e na lista", () => {
    expect(css).toMatch(/--figaro-surface-container-lowest: #141816;/);
    expect(css).toMatch(/--figaro-surface-container-lowest: #ffffff;/);
    expect(css).toMatch(/--agenda-cartao-evento: var\(--figaro-surface-container-lowest\);/);
    expect(css).toMatch(
      /\.agenda-timeline-bloco \{[^}]*background: var\(--agenda-cartao-evento, var\(--agenda-cartao\)\);/,
    );
    expect(css).toMatch(
      /\.agenda-lista-cartao\.agenda-lista-cartao \{[^}]*background: var\(--agenda-cartao-evento, var\(--agenda-cartao\)\);/,
    );
  });
});


describe("identidade oficial Flow: marinho + coral", () => {
  const escuro = raiz;
  const claroVars = { ...raiz, ...claro };

  it("mantém a identidade Flow distinta da marca Figaro", () => {
    expect(escuro["--identity-deep"]).toBe("#07152d");
    expect(escuro["--identity-accent"]).toBe("#ff7b86");
    expect(escuro["--identity-primary"]).toBe("#27569a");
    expect(claroVars["--identity-accent-light"]).toBe("#b52d42");
    expect(escuro["--fundo"]).toBe("#07152d");
    expect(escuro["--cartao"]).toBe("#0f2742");
    expect(claroVars["--fundo"]).toBe("#eaf0f8");
    expect(claroVars["--cartao"]).toBe("#ffffff");
  });

  it("o coral da marca mantém contraste nos dois modos", () => {
    expect(
      razao(resolver("var(--identity-accent)", escuro).rgb, resolver("var(--ink)", escuro).rgb),
    ).toBeGreaterThanOrEqual(3);
    expect(
      razao(
        resolver("var(--identity-accent-light)", claroVars).rgb,
        resolver("var(--ink2)", claroVars).rgb,
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
