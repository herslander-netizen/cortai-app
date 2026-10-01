/**
 * Mapa único: código de erro da Meta → o que o Cortaí faz.
 * Puro e testado; quem aplica é `falhas-envio.server.ts`.
 */
export type AcaoDoErro = {
  /** Estado final do envio. "erro" = ainda pode tentar de novo. */
  status: "erro" | "falhou" | "sem_modelo";
  /** Esperar antes da próxima tentativa (só quando status = "erro"). */
  esperarMs?: number;
  /** Teto de tentativas para erro temporário. */
  maxTentativas?: number;
  marcarSemWhatsapp?: boolean;
  suprimirMarketing?: boolean;
  alerta?: "tecnico" | "critico";
  /** Avisar o negócio no sininho com o link do wa.me. */
  avisarNegocio: boolean;
};

const MIN = 60_000;

export function acaoDoErroMeta(
  codigo: number | null | undefined,
  httpStatus?: number | null,
): AcaoDoErro {
  switch (codigo) {
    case 131047:
      return { status: "sem_modelo", avisarNegocio: true };
    case 131026:
      return { status: "falhou", marcarSemWhatsapp: true, avisarNegocio: true };
    case 131049:
      return { status: "erro", esperarMs: 24 * 60 * MIN, avisarNegocio: false };
    case 131050:
      return { status: "falhou", suprimirMarketing: true, avisarNegocio: false };
    case 131056:
      return { status: "erro", esperarMs: 15 * MIN, avisarNegocio: false };
    case 130429:
    case 131016:
      return { status: "erro", esperarMs: 10 * MIN, maxTentativas: 3, avisarNegocio: true };
    case 132000:
    case 132001:
    case 132012:
      return { status: "falhou", alerta: "tecnico", avisarNegocio: true };
    case 131042:
      return { status: "falhou", alerta: "critico", avisarNegocio: true };
  }
  if (httpStatus && httpStatus >= 500) {
    return { status: "erro", esperarMs: 10 * MIN, maxTentativas: 3, avisarNegocio: true };
  }
  return { status: "falhou", avisarNegocio: true };
}

/** Lê código e status HTTP de uma mensagem de erro do envio ("... (400): {...}"). */
export function lerErroMeta(mensagem: string): {
  codigo: number | null;
  httpStatus: number | null;
} {
  const codigo =
    mensagem.match(/"code"\s*:\s*(\d{3,6})/)?.[1] ?? mensagem.match(/\b(13\d{4})\b/)?.[1];
  const http = mensagem.match(/\((\d{3})\)/)?.[1];
  return { codigo: codigo ? Number(codigo) : null, httpStatus: http ? Number(http) : null };
}

/** Link pronto para o profissional mandar pelo próprio celular, sem custo. */
export function linkWaMe(telefone: string, texto: string): string {
  return `https://wa.me/${telefone.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

/** Lembrete que perdeu o momento (mais de 2h além do previsto) não sai. */
export function lembretePerdeuOMomento(
  inicioIso: string,
  horasAntes: number,
  agora = new Date(),
): boolean {
  const previsto = new Date(inicioIso).getTime() - horasAntes * 3600_000;
  return agora.getTime() - previsto > 2 * 3600_000;
}
