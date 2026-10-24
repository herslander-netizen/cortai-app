// Gera as ilustrações de exemplo de public/exemplos (uso: node scripts/gerar-fotos-de-exemplo.mjs).
// São ilustrações próprias (formas e degradês), sem foto de terceiros nem direitos autorais.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const saida = "public/exemplos";
mkdirSync(saida, { recursive: true });

const paletas = {
  rosa: ["#F7D9DF", "#E9A9B8", "#B76E79"],
  lavanda: ["#E6DDF5", "#BDA8E6", "#7C5CC4"],
  pessego: ["#FFE1D1", "#F9B18F", "#E27D54"],
  grafite: ["#4A4D55", "#2B2D33", "#17181B"],
  areia: ["#EFE4D6", "#D8C3A5", "#A98467"],
  mar: ["#D6E8F5", "#8DB9E0", "#3D6FA8"],
};

function formas(tipo, [claro, medio, escuro]) {
  switch (tipo) {
    case "tesoura":
      return `<g transform="translate(300 300) rotate(-35)" stroke="${escuro}" stroke-width="22" fill="none" stroke-linecap="round"><circle cx="-70" cy="110" r="46"/><circle cx="70" cy="110" r="46"/><path d="M-50 70 L90 -170"/><path d="M50 70 L-90 -170"/></g>`;
    case "pente":
      return `<g transform="translate(300 300)"><rect x="-190" y="-50" width="380" height="80" rx="28" fill="${escuro}"/>${Array.from({ length: 14 }, (_, i) => `<rect x="${-180 + i * 26}" y="20" width="12" height="120" rx="6" fill="${escuro}"/>`).join("")}</g>`;
    case "esmalte":
      return `<g transform="translate(300 320)"><rect x="-70" y="-30" width="140" height="170" rx="36" fill="${escuro}"/><rect x="-26" y="-130" width="52" height="110" rx="14" fill="${medio}"/><rect x="-18" y="-200" width="36" height="76" rx="12" fill="${escuro}"/></g>`;
    case "espelho":
      return `<g transform="translate(300 280)"><ellipse rx="130" ry="160" fill="${claro}" stroke="${escuro}" stroke-width="22"/><rect x="-16" y="150" width="32" height="150" rx="16" fill="${escuro}"/><path d="M-70 -70 Q-20 -120 40 -90" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round" opacity=".7"/></g>`;
    case "folha":
      return `<g transform="translate(300 300)" fill="${escuro}"><path d="M0 -190 C140 -120 140 90 0 190 C-140 90 -140 -120 0 -190Z"/><path d="M0 -150 L0 170" stroke="${claro}" stroke-width="10" fill="none"/></g>`;
    case "pessoa":
      return `<g transform="translate(300 300)" fill="${escuro}"><circle cy="-60" r="82"/><path d="M-190 260 C-190 110 -110 60 0 60 C110 60 190 110 190 260Z"/></g>`;
    default:
      return `<circle cx="300" cy="300" r="140" fill="${escuro}" opacity=".85"/>`;
  }
}

function svg(w, h, nome, paleta, tipo, angulo = 135) {
  const [c1, c2, c3] = paletas[paleta];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="g" gradientTransform="rotate(${angulo})"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <circle cx="500" cy="90" r="120" fill="${c3}" opacity=".12"/><circle cx="70" cy="540" r="160" fill="${c3}" opacity=".10"/>
  ${formas(tipo, [c1, c2, c3])}</svg>`;
}

const itens = [
  // [arquivo, largura, altura, paleta, forma]
  ["capa", 1600, 900, "rosa", "espelho"],
  ["galeria-1", 900, 900, "rosa", "tesoura"],
  ["galeria-2", 900, 900, "lavanda", "esmalte"],
  ["galeria-3", 900, 900, "pessego", "folha"],
  ["galeria-4", 900, 900, "areia", "pente"],
  ["galeria-5", 900, 900, "mar", "espelho"],
  ["galeria-6", 900, 900, "grafite", "tesoura"],
  ["profissional-1", 480, 480, "rosa", "pessoa"],
  ["profissional-2", 480, 480, "lavanda", "pessoa"],
  ["profissional-3", 480, 480, "areia", "pessoa"],
  ["produto-1", 600, 600, "pessego", "esmalte"],
  ["produto-2", 600, 600, "lavanda", "folha"],
  ["produto-3", 600, 600, "areia", "pente"],
  ["logo", 256, 256, "rosa", "folha"],
];

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const p = await b.newPage();
for (const [arq, w, h, pal, forma] of itens) {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(`<body style="margin:0">${svg(w, h, arq, pal, forma)}</body>`);
  const png = await p.screenshot({ type: "png" });
  const webp = await p.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", 0.82).split(",")[1];
  }, png.toString("base64"));
  writeFileSync(`${saida}/${arq}.webp`, Buffer.from(webp, "base64"));
}
await b.close();
console.log("ok", itens.length);
