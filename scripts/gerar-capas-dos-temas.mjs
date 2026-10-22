// Gera public/temas/<tema>.webp (16:9, 780×439): composição de uma página de exemplo nas cores reais de cada tema.
// Uso: node scripts/gerar-capas-dos-temas.mjs   (precisa de public/exemplos; cores espelham TEMAS em src/lib/pagina-config.ts)
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const TEMAS = {
  "figaro-classico": { nome: "Clássico", principal: "#2B2B2A", secundaria: "#DFDCD9", botao: "#DFDCD9", fundo: "#ECEAE8", texto: "#1F1E1D", destaque: "#8A8683", serifa: true, foto: "galeria-6", botaoTexto: "#1F1E1D" },
  "figaro-rock-n-roll": { nome: "Rock n' Roll", principal: "#1F1C1D", secundaria: "#E1DEDD", botao: "#262424", fundo: "#E8E5E4", texto: "#1F1C1D", destaque: "#E8582A", foto: "galeria-6", botaoTexto: "#FFFFFF", escuro: true },
  "figaro-retro": { nome: "Retrô", principal: "#2A1F3D", secundaria: "#F2D95C", botao: "#4553D9", fundo: "#F4E38A", texto: "#2A1F3D", destaque: "#4553D9", foto: "galeria-4", botaoTexto: "#FFFFFF", serifa: true },
  "feminino-rose": { nome: "Rosé", principal: "#8C3B52", secundaria: "#F6D9DE", botao: "#B76E79", fundo: "#FCEFF1", texto: "#4A2130", destaque: "#B76E79", foto: "galeria-1", botaoTexto: "#FFFFFF", serifa: true },
  "feminino-lavanda": { nome: "Lavanda", principal: "#5B3F8F", secundaria: "#E6DDF5", botao: "#7B5CC4", fundo: "#F5F0FB", texto: "#33254F", destaque: "#9B7FD9", foto: "galeria-2", botaoTexto: "#FFFFFF", serifa: true },
  "feminino-pessego": { nome: "Pêssego", principal: "#B5523B", secundaria: "#FFDCCB", botao: "#E0745A", fundo: "#FFF3EA", texto: "#4D2A1F", destaque: "#E0745A", foto: "galeria-3", botaoTexto: "#FFFFFF", serifa: true },
};

const foto = (n) => `data:image/webp;base64,${readFileSync(`public/exemplos/${n}.webp`).toString("base64")}`;

function html(t) {
  const fonte = t.serifa ? "Georgia, 'Times New Roman', serif" : "'Helvetica Neue', Arial, sans-serif";
  return `<body style="margin:0;width:780px;height:439px;overflow:hidden;background:${t.fundo};font-family:${fonte};color:${t.texto};position:relative">
  <div style="position:absolute;left:36px;top:30px;display:flex;align-items:center;gap:12px">
    <span style="width:34px;height:34px;border-radius:50%;background:${t.principal}"></span>
    <b style="font-size:24px">Studio Exemplo</b>
  </div>
  <div style="position:absolute;right:36px;top:36px;display:flex;flex-direction:column;gap:6px">
    ${[0, 1, 2].map(() => `<i style="display:block;width:30px;height:3px;border-radius:2px;background:${t.texto}"></i>`).join("")}
  </div>
  <div style="position:absolute;left:36px;top:128px;width:360px">
    <div style="font-size:50px;line-height:1.05;font-weight:700">Beleza com carinho.</div>
    <div style="margin-top:14px;font-size:20px;line-height:1.35;opacity:.75;font-family:'Helvetica Neue',Arial,sans-serif">Atendimento no seu tempo, do jeito que você gosta.</div>
    <div style="margin-top:26px;display:inline-block;padding:15px 30px;border-radius:999px;background:${t.botao};color:${t.botaoTexto};font:700 20px 'Helvetica Neue',Arial,sans-serif">Agendar horário</div>
  </div>
  <div style="position:absolute;right:36px;top:112px;width:280px;height:290px">
    <div style="position:absolute;inset:14px -14px -14px 14px;border-radius:28px;background:${t.destaque};opacity:.9"></div>
    <img src="${foto(t.foto)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:28px;${t.escuro ? "filter:grayscale(1) contrast(1.1)" : ""}">
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:10px;background:${t.destaque}"></div>
</body>`;
}

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const p = await nav.newPage({ viewport: { width: 780, height: 439 } });
for (const [id, t] of Object.entries(TEMAS)) {
  await p.setContent(html(t));
  const png = await p.screenshot({ type: "png" });
  const webp = await p.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = 780; c.height = 439;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", 0.88).split(",")[1];
  }, png.toString("base64"));
  writeFileSync(`public/temas/${id}.webp`, Buffer.from(webp, "base64"));
  console.log(id);
}
await nav.close();
