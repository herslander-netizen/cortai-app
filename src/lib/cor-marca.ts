import type { CSSProperties } from "react";

const DOURADOS_LEGADOS = new Set(["#C9A96A", "#D4AF6A", "#C9A227"]);

function rgb(hex: string) {
  const valor = hex.slice(1);
  return [0, 2, 4].map((inicio) => Number.parseInt(valor.slice(inicio, inicio + 2), 16));
}

function hex(rgbValue: number[]) {
  return `#${rgbValue.map((canal) => Math.round(canal).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function luminancia(cor: string) {
  const canais = rgb(cor).map((canal) => {
    const normalizado = canal / 255;
    return normalizado <= 0.04045 ? normalizado / 12.92 : ((normalizado + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (canais[0] ?? 0) + 0.7152 * (canais[1] ?? 0) + 0.0722 * (canais[2] ?? 0);
}

function contraste(a: string, b: string) {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return ((clara ?? 0) + 0.05) / ((escura ?? 0) + 0.05);
}

function misturar(cor: string, destino: string, quantidade: number) {
  const origem = rgb(cor);
  const alvo = rgb(destino);
  return hex(origem.map((canal, indice) => canal + ((alvo[indice] ?? canal) - canal) * quantidade));
}

function ajustarParaFundo(cor: string, fundo: string, destino: string) {
  let ajustada = cor;
  for (let passo = 1; passo <= 10 && contraste(ajustada, fundo) < 4.5; passo += 1) {
    ajustada = misturar(cor, destino, passo / 10);
  }
  return ajustada;
}

function normalizar(cor: string | null | undefined) {
  const valor = cor?.trim().toUpperCase();
  if (!valor || !/^#[0-9A-F]{6}$/.test(valor) || DOURADOS_LEGADOS.has(valor)) return null;
  return valor;
}

export function estiloDaMarca(cor: string | null | undefined): { style?: CSSProperties; personalizada: boolean } {
  const base = normalizar(cor);
  if (!base) return { personalizada: false };
  const texto = contraste(base, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#1B1C1F";
  return {
    personalizada: true,
    style: {
      "--client-primary": base,
      "--client-primary-foreground": texto,
      "--client-accent-dark": ajustarParaFundo(base, "#17181B", "#FFFFFF"),
      "--client-accent-light": ajustarParaFundo(base, "#F5F4F0", "#000000"),
    } as CSSProperties,
  };
}