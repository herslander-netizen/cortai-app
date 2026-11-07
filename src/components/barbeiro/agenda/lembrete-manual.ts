import type { AgendaItem } from "@/lib/barbeiro.functions";

import { formatadorDe, hora } from "./tempo";

/** "sexta-feira, 07/11" no fuso do negócio. */
function diaPorExtenso(iso: string, fuso: string) {
  return formatadorDe("pt-BR", fuso, { weekday: "long", day: "2-digit", month: "2-digit" }).format(
    new Date(iso),
  );
}

/** Texto do "Enviar lembrete" da ficha: curto, uma ideia por bloco, termina pedindo a confirmação. */
export function textoDoLembrete(
  item: Pick<AgendaItem, "cliente" | "servico" | "profissional" | "inicio">,
  fuso: string,
): string {
  const nome = (item.cliente ?? "").trim().split(/\s+/)[0];
  const quem = (item.profissional ?? "").split(" ")[0];
  return [
    `Olá${nome ? `, ${nome}` : ""}!`,
    "",
    `Lembrete do seu horário: ${item.servico}${quem ? ` com ${quem}` : ""}.`,
    "",
    `${diaPorExtenso(item.inicio, fuso)} às ${hora(item.inicio, fuso)}.`,
    "",
    "Você confirma?",
  ].join("\n");
}
