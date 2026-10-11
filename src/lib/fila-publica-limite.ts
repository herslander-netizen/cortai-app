/**
 * Limite por minuto da entrada pública na fila de chegada (por IP e por WhatsApp),
 * nos mesmos contadores persistidos do `webhook-guard`. Mesmos valores de "agendar".
 */
export const LIMITE_ENTRAR_NA_FILA = { ip: 8, telefone: 4 } as const;
export const BALDE_SEM_IP_FILA = "sem-ip";
export const MENSAGEM_LIMITE_FILA =
  "Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.";

type Consumir = (chave: string, limite: number) => Promise<boolean>;

/** Lança quando o IP ou o telefone passou do limite. Nunca registra IP/telefone em log. */
export async function aplicarLimiteDaFila(
  consumir: Consumir,
  ip: string | null,
  telefoneNormalizado: string,
): Promise<void> {
  // Sem IP identificável: balde próprio e 10× mais folgado, igual ao agendamento público.
  const okIp = await consumir(
    `pub:fila|ip:${ip ?? BALDE_SEM_IP_FILA}`,
    ip ? LIMITE_ENTRAR_NA_FILA.ip : LIMITE_ENTRAR_NA_FILA.ip * 10,
  );
  const okTel = await consumir(`pub:fila|tel:${telefoneNormalizado}`, LIMITE_ENTRAR_NA_FILA.telefone);
  if (!okIp || !okTel) throw new Error(MENSAGEM_LIMITE_FILA);
}
