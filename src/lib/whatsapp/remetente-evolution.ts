/**
 * Quem mandou a mensagem, no webhook da Evolution. O WhatsApp passou a identificar parte dos contatos por um código
 * anônimo (`…@lid`) no lugar do número; a Evolution manda o número junto, em `remoteJidAlt` ou `senderPn`. Sem
 * isso, a mensagem de um cliente real era descartada como se fosse de grupo.
 */
export type Remetente =
  | { tipo: "contato"; telefone: string }
  | { tipo: "ignorar"; motivo: "grupo" | "lid_sem_numero" | "sem_remetente" };

const PESSOA = "@s.whatsapp.net";

function numeroDe(jid: unknown): string | null {
  if (typeof jid !== "string" || !jid.endsWith(PESSOA)) return null;
  const numero = jid.slice(0, -PESSOA.length).split(":")[0] ?? "";
  return /^\d{8,15}$/.test(numero) ? numero : null;
}

export function remetenteDaEvolution(dados: Record<string, unknown>): Remetente {
  const chave = (dados["key"] as Record<string, unknown>) ?? {};
  const jid = String(chave["remoteJid"] ?? "");
  if (!jid) return { tipo: "ignorar", motivo: "sem_remetente" };
  const direto = numeroDe(jid);
  if (direto) return { tipo: "contato", telefone: direto };
  if (jid.endsWith("@lid")) {
    const alternativo =
      numeroDe(chave["remoteJidAlt"]) ?? numeroDe(chave["senderPn"]) ?? numeroDe(dados["senderPn"]);
    return alternativo
      ? { tipo: "contato", telefone: alternativo }
      : { tipo: "ignorar", motivo: "lid_sem_numero" };
  }
  // Grupos (@g.us), transmissões (@broadcast) e canais (@newsletter) não são atendidos.
  return { tipo: "ignorar", motivo: "grupo" };
}
