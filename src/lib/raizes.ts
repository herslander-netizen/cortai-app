import type { PaginaConfig } from "@/lib/pagina-config";

/** Luminância relativa (0 a 1) de uma cor `#RRGGBB`. */
export function luminancia(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

/**
 * Raízes alterna capítulos escuros e claros. A cor escura é a mais escura entre fundo e texto do tema; a
 * clara, a outra. Assim o Contraste (fundo preto) e os temas claros (fundo creme) usam a mesma estrutura.
 */
export function coresDoRaizes(cores: PaginaConfig["cores"]): {
  escuro: string;
  claro: string;
  acento: string;
} {
  const [escuro, claro] =
    luminancia(cores.fundo) <= luminancia(cores.texto)
      ? [cores.fundo, cores.texto]
      : [cores.texto, cores.fundo];
  return { escuro, claro, acento: cores.botao };
}

type Horario = { dia_semana: number; fechado: boolean; abre: string; fecha: string };

const DIAS_CURTOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const hm = (t: string) => {
  const [h = "0", m = "00"] = t.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
};

/** Junta dias seguidos com o mesmo horário: "Terça a sábado — 9h – 20h", "Domingo e segunda — Fechado". */
export function horariosAgrupados(horarios: Horario[]): { dias: string; horario: string }[] {
  const porDia = new Map(horarios.map((h) => [h.dia_semana, h]));
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  const texto = (d: number) => {
    const h = porDia.get(d);
    return !h || h.fechado ? "Fechado" : `${hm(h.abre)} – ${hm(h.fecha)}`;
  };
  const grupos: { dias: number[]; horario: string }[] = [];
  for (const d of ordem) {
    const t = texto(d);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.horario === t) ultimo.dias.push(d);
    else grupos.push({ dias: [d], horario: t });
  }
  // Todos os dias fechados ficam num grupo só, em ordem de semana (domingo, segunda...).
  const diasFechados = grupos
    .filter((g) => g.horario === "Fechado")
    .flatMap((g) => g.dias)
    .sort((x, y) => x - y);
  const abertos = grupos.filter((g) => g.horario !== "Fechado");
  const fechados = diasFechados.length ? [{ dias: diasFechados, horario: "Fechado" }] : [];
  const nome = (g: { dias: number[] }) => {
    const ds = g.dias;
    const n = (d: number) => DIAS_CURTOS[d]!;
    if (ds.length === 1) return n(ds[0]!);
    if (ds.length === 2) return `${n(ds[0]!)} e ${n(ds[1]!).toLowerCase()}`;
    return `${n(ds[0]!)} a ${n(ds[ds.length - 1]!).toLowerCase()}`;
  };
  return [...abertos, ...fechados].map((g) => ({ dias: nome(g), horario: g.horario }));
}

/** "Rafael Souza" → "Rafael": o nome curto que vai no botão ("Agendar com Rafael"). */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Mapas: link de busca pelo endereço (sem coordenadas guardadas, a busca resolve). */
export function linkDoMapa(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

/** Nome para o botão: "Barbearia do Rafa" → "Rafa"; "Studio Exemplo" → "Studio". */
export function nomeParaBotao(nome: string): string {
  const depoisDoDe = nome.trim().match(/\b(?:do|da|de)\s+(\S+)$/i);
  return depoisDoDe?.[1] ?? primeiroNome(nome);
}
