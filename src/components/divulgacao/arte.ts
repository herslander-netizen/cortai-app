/** Desenha a arte 9:16 (1080x1920) no navegador, com as cores do tema. */
export type DadosArte = {
  titulo: string;
  subtitulo?: string;
  itens?: string[];
  rodape: string;
  foto?: HTMLImageElement | null;
};

const L = 1080;
const A = 1920;

function cor(nome: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const p of texto.split(" ")) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export function desenharArte(canvas: HTMLCanvasElement, d: DadosArte) {
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const escuro = cor("--qr-dark") || "black";
  const claro = cor("--qr-light") || "white";
  const destaque = cor("--gold") || claro;

  ctx.fillStyle = escuro;
  ctx.fillRect(0, 0, L, A);

  if (d.foto) {
    // cobre 9:16 recortando o centro (adapta 16:9 → 9:16)
    const e = Math.max(L / d.foto.width, A / d.foto.height);
    const w = d.foto.width * e;
    const h = d.foto.height * e;
    ctx.drawImage(d.foto, (L - w) / 2, (A - h) / 2, w, h);
    const g = ctx.createLinearGradient(0, A * 0.45, 0, A);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
  }

  // zona segura: evita topo (250px) e base (340px) cobertos pela interface das redes
  let y = d.foto ? A - 340 - (d.itens?.length ?? 0) * 110 - 260 : 520;
  ctx.textBaseline = "top";
  ctx.fillStyle = claro;
  ctx.font = "700 92px system-ui, sans-serif";
  for (const linha of quebrar(ctx, d.titulo, L - 160).slice(0, 4)) {
    ctx.fillText(linha, 80, y);
    y += 108;
  }
  if (d.subtitulo) {
    ctx.fillStyle = destaque;
    ctx.font = "600 58px system-ui, sans-serif";
    ctx.fillText(d.subtitulo, 80, y + 20);
    y += 110;
  }
  if (d.itens?.length) {
    y += 30;
    ctx.font = "600 56px system-ui, sans-serif";
    for (const item of d.itens.slice(0, 8)) {
      ctx.strokeStyle = destaque;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(80, y, 300, 90, 45);
      ctx.stroke();
      ctx.fillStyle = claro;
      ctx.fillText(item, 120, y + 16);
      y += 110;
    }
  }
  ctx.fillStyle = destaque;
  ctx.font = "600 44px system-ui, sans-serif";
  ctx.fillText(d.rodape, 80, A - 300);
}

export function canvasParaArquivo(canvas: HTMLCanvasElement): Promise<File | null> {
  return new Promise((ok) =>
    canvas.toBlob((b) => ok(b ? new File([b], "cortai-divulgacao.png", { type: "image/png" }) : null), "image/png"),
  );
}
