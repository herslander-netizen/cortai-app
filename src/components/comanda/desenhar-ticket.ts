/** Desenha a mesma comanda da tela em imagem (JPG), para baixar ou enviar no WhatsApp. */
import { brl } from "@/lib/format";
import {
  barrasDoCodigo,
  codigoLegivel,
  rotuloDaForma,
  ROTULO_DO_ESTADO,
  telefoneDoTicket,
  type DadosDoTicket,
  type ItemDoTicket,
} from "@/lib/comanda-ticket";

const E = 2; // escala (360 px de layout → 720 px de imagem)
const W = 360;
const MARGEM = 28; // fundo escuro em volta do papel
const PAD = 24;

function cor(nome: string, reserva: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || reserva;
}

function carregar(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((ok) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const p of texto.split(" ")) {
    const t = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(t).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = t;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export async function desenharTicket(
  d: DadosDoTicket,
  simboloUrl: string,
  logotipoUrl?: string,
): Promise<HTMLCanvasElement> {
  const C: Cores = {
    fundo: cor("--ticket-fundo", "#0f0f14"),
    papel: cor("--ticket-papel", "#fffdf9"),
    texto: cor("--ticket-texto", "#16151f"),
    mute: cor("--ticket-mute", "#5b5870"),
    suave: cor("--ticket-suave", "#f3f2f8"),
    linha: cor("--ticket-linha", "#d9d6e6"),
    total: cor("--ticket-total", "#eef3fe"),
    navy: cor("--ticket-navy", "#16151f"),
    rosa: cor("--ticket-rosa", "#9c425a"),
    pix: cor("--ticket-pix", "#32bcad"),
    pago: cor("--ticket-pago", "#15803d"),
    pendente: cor("--ticket-pendente", "#c2610c"),
    cancelado: cor("--ticket-cancelado", "#dc2626"),
  };
  const [logo, simbolo, logotipo] = await Promise.all([
    carregar(d.negocio.logoUrl),
    carregar(simboloUrl),
    logotipoUrl ? carregar(logotipoUrl) : Promise.resolve(null),
  ]);
  const fonte = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

  // Duas passadas: a primeira só mede a altura.
  const medir = document.createElement("canvas").getContext("2d")!;
  const altura = desenhar(medir, d, C, logo, simbolo, fonte, true, logotipo);
  const canvas = document.createElement("canvas");
  canvas.width = (W + MARGEM * 2) * E;
  canvas.height = (altura + MARGEM * 2) * E;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(E, E);
  ctx.fillStyle = C.fundo;
  ctx.fillRect(0, 0, W + MARGEM * 2, altura + MARGEM * 2);
  ctx.translate(MARGEM, MARGEM);
  // papel com furos
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = C.papel;
  ctx.fillRect(0, 0, W, altura);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  for (let x = 9; x < W; x += 18) {
    ctx.beginPath();
    ctx.arc(x, 0, 6, 0, Math.PI * 2);
    ctx.arc(x, altura, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = 11; y < altura; y += 22) {
    ctx.beginPath();
    ctx.arc(0, y, 4, 0, Math.PI * 2);
    ctx.arc(W, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // repinta o fundo nos furos (destination-out deixou transparente)
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = C.fundo;
  ctx.fillRect(-MARGEM, -MARGEM, W + MARGEM * 2, altura + MARGEM * 2);
  ctx.restore();
  desenhar(ctx, d, C, logo, simbolo, fonte, false, logotipo);
  return canvas;
}

type Cores = {
  fundo: string;
  papel: string;
  texto: string;
  mute: string;
  suave: string;
  linha: string;
  total: string;
  navy: string;
  rosa: string;
  pix: string;
  pago: string;
  pendente: string;
  cancelado: string;
};

function desenhar(
  ctx: CanvasRenderingContext2D,
  d: DadosDoTicket,
  C: Cores,
  logo: HTMLImageElement | null,
  simbolo: HTMLImageElement | null,
  fonte: string,
  soMedir: boolean,
  marca: HTMLImageElement | null = null,
): number {
  const f = (peso: number, px: number) => `${peso} ${px}px ${fonte}`;
  const larg = W - PAD * 2;
  let y = 36;
  ctx.textBaseline = "top";
  const texto = (
    t: string,
    x: number,
    yy: number,
    font: string,
    c: string,
    align: CanvasTextAlign = "left",
  ) => {
    if (soMedir) return;
    ctx.font = font;
    ctx.fillStyle = c;
    ctx.textAlign = align;
    ctx.fillText(t, x, yy);
  };
  const caixa = (x: number, yy: number, w: number, h: number, r: number, c: string) => {
    if (soMedir) return;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.roundRect(x, yy, w, h, r);
    ctx.fill();
  };
  const tracejado = () => {
    y += 16;
    if (!soMedir) {
      ctx.strokeStyle = C.linha;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(W - PAD, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    y += 18;
  };
  const rotulo = (t: string, x: number, yy: number, align: CanvasTextAlign = "left") =>
    texto(t.split("").join(String.fromCharCode(8202)), x, yy, f(600, 11), C.mute, align);

  // cabeçalho
  if (logo) {
    if (!soMedir) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(W / 2 - 32, y, 64, 64, 16);
      ctx.clip();
      const e = Math.max(64 / logo.width, 64 / logo.height);
      ctx.drawImage(
        logo,
        W / 2 - (logo.width * e) / 2,
        y + 32 - (logo.height * e) / 2,
        logo.width * e,
        logo.height * e,
      );
      ctx.restore();
    }
    y += 72;
  }
  if (d.negocio.nome) {
    ctx.font = f(700, logo ? 18 : 22);
    for (const l of quebrar(ctx, d.negocio.nome, larg).slice(0, 2)) {
      texto(l, W / 2, y, f(700, logo ? 18 : 22), C.navy, "center");
      y += logo ? 22 : 27;
    }
  }
  if (!logo && !d.negocio.nome) {
    // Marca Flow: o lettering é desenho (manual §03), nunca texto comum.
    if (marca && !soMedir) ctx.drawImage(marca, W / 2 - 69, y, 138, 40);
    y += 44;
  }
  y += 10;
  texto("C  O  M  A  N  D  A", W / 2, y, f(600, 13), C.mute, "center");
  y += 16;
  tracejado();

  // data e horário
  const icone = (tipo: "data" | "hora" | "pessoa", cx: number, cy: number) => {
    if (soMedir) return;
    ctx.save();
    ctx.strokeStyle = C.navy;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (tipo === "data") {
      ctx.roundRect(cx - 7, cy - 6, 14, 13, 2);
      ctx.moveTo(cx - 7, cy - 1);
      ctx.lineTo(cx + 7, cy - 1);
      ctx.moveTo(cx - 3, cy - 9);
      ctx.lineTo(cx - 3, cy - 5);
      ctx.moveTo(cx + 3, cy - 9);
      ctx.lineTo(cx + 3, cy - 5);
    } else if (tipo === "hora") {
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + 3, cy + 2);
    } else {
      ctx.arc(cx, cy - 3, 3.5, 0, Math.PI * 2);
      ctx.moveTo(cx + 6, cy + 7);
      ctx.arc(cx, cy + 7, 6, 0, Math.PI, true);
    }
    ctx.stroke();
    ctx.restore();
  };
  const col = (x: number, r: string, v: string, tipo: "data" | "hora") => {
    caixa(x, y, 36, 36, 18, C.suave);
    icone(tipo, x + 18, y + 18);
    rotulo(r, x + 46, y + 2);
    texto(v, x + 46, y + 17, f(600, 15), C.texto);
  };
  col(PAD, "DATA", d.data, "data");
  col(PAD + larg / 2 + 6, "HORÁRIO", d.horario, "hora");
  y += 52;

  // cliente
  const tel = telefoneDoTicket(d.cliente.telefone);
  ctx.font = f(600, 15);
  const nomes = quebrar(ctx, d.cliente.nome, larg - 70).slice(0, 2);
  const hCli = 24 + 16 + nomes.length * 19 + (tel ? 18 : 0);
  caixa(PAD, y, larg, hCli, 12, C.suave);
  caixa(PAD + 12, y + hCli / 2 - 18, 36, 36, 18, C.papel);
  icone("pessoa", PAD + 30, y + hCli / 2);
  let yc = y + 12;
  rotulo("CLIENTE", PAD + 60, yc);
  yc += 16;
  for (const n of nomes) {
    texto(n, PAD + 60, yc, f(600, 15), C.texto);
    yc += 19;
  }
  if (tel) texto(tel, PAD + 60, yc, f(400, 13), C.mute);
  y += hCli;

  const lista = (titulo: string, itens: ItemDoTicket[]) => {
    if (!itens.length) return;
    y += 16;
    rotulo(titulo, PAD, y);
    y += 20;
    for (const i of itens) {
      ctx.font = f(400, 15);
      const valor = brl(i.totalCentavos);
      const ls = quebrar(ctx, i.descricao, larg - 36 - 90);
      texto(`${i.quantidade}x`, PAD, y, f(400, 15), C.mute);
      ls.forEach((l, k) => texto(l, PAD + 36, y + k * 19, f(400, 15), C.texto));
      texto(valor, W - PAD, y, f(600, 15), C.texto, "right");
      y += ls.length * 19 + 6;
    }
  };
  lista("SERVIÇO(S)", d.servicos);
  lista("PRODUTO(S)", d.produtos);

  tracejado();
  texto("SUBTOTAL", PAD, y, f(400, 14), C.mute);
  texto(brl(d.subtotalCentavos), W - PAD, y, f(400, 14), C.texto, "right");
  y += 20;
  if (d.descontoCentavos > 0) {
    texto("DESCONTO", PAD, y, f(400, 14), C.rosa);
    texto(`- ${brl(d.descontoCentavos)}`, W - PAD, y, f(400, 14), C.rosa, "right");
    y += 20;
  }
  y += 6;
  caixa(PAD, y, larg, 82, 12, C.total);
  rotulo("TOTAL", W / 2, y + 12, "center");
  texto(brl(d.totalCentavos), W / 2, y + 30, f(800, 34), C.navy, "center");
  y += 98;

  // pagamento
  rotulo("PAGAMENTO", PAD, y);
  y += 20;
  if (!soMedir) {
    ctx.strokeStyle = C.linha;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(PAD, y, larg, 52, 12);
    ctx.stroke();
  }
  const pix = d.forma === "pix";
  if (pix && !soMedir) {
    ctx.save();
    ctx.translate(PAD + 22, y + 26);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = C.pix;
    ctx.beginPath();
    ctx.roundRect(-8, -8, 16, 16, 3);
    ctx.fill();
    ctx.fillStyle = C.papel;
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
  texto(rotuloDaForma(d.forma), PAD + (pix ? 44 : 14), y + 17, f(600, 15), C.texto);
  y += 68;

  // status
  rotulo("STATUS", PAD, y + 6);
  const corEstado = C[d.estado]!;
  const rot = `${d.estado === "pago" ? "✓ " : ""}${ROTULO_DO_ESTADO[d.estado]}`;
  ctx.font = f(600, 13);
  const wb = ctx.measureText(rot).width + 24;
  if (!soMedir) {
    ctx.globalAlpha = 0.13;
    caixa(W - PAD - wb, y, wb, 26, 13, corEstado);
    ctx.globalAlpha = 1;
  }
  texto(rot, W - PAD - wb / 2, y + 6, f(600, 13), corEstado, "center");
  y += 42;

  // código
  caixa(PAD, y, larg, 60, 12, C.suave);
  rotulo("CÓDIGO DA COMANDA", PAD + 14, y + 12);
  texto(`#${d.codigo}`, PAD + 14, y + 29, f(700, 17), C.texto);
  y += 76;

  // barras
  const barras = barrasDoCodigo(d.codigo);
  const total = barras.reduce((s, b) => s + (b.larga ? 3 : 1.2), 0);
  let x = W / 2 - total / 2;
  for (const b of barras) {
    const w = b.larga ? 3 : 1.2;
    if (b.barra && !soMedir) {
      ctx.fillStyle = C.texto;
      ctx.fillRect(x, y, w, 56);
    }
    x += w;
  }
  y += 62;
  texto(codigoLegivel(d.codigo).split("").join(" "), W / 2, y, f(400, 12), C.texto, "center");
  y += 18;

  tracejado();
  texto("Obrigado pela preferência!", W / 2, y, f(600, 15), C.texto, "center");
  y += 22;
  texto("By Alvo Digital • Flow", W / 2, y, f(400, 11), C.mute, "center");
  y += 18;
  if (simbolo && !soMedir) ctx.drawImage(simbolo, W - PAD - 24, y - 20, 24, 24);
  return y + 30;
}

/** JPG (pedido do dono): abre em qualquer WhatsApp e pesa menos. O fundo do ticket é opaco, sem áreas pretas. */
export function canvasParaJpg(canvas: HTMLCanvasElement, nome: string): Promise<File | null> {
  return new Promise((ok) =>
    canvas.toBlob(
      (b) => ok(b ? new File([b], nome, { type: "image/jpeg" }) : null),
      "image/jpeg",
      0.92,
    ),
  );
}
