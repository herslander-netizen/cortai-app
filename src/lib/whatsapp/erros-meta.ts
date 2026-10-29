/**
 * Mapa único: código de erro da Meta → o que o Flow faz.
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
  // Evolution: número sem WhatsApp vem como `"exists": false`; equivale ao 131026 da Meta.
  const semWhatsappNoEvolution = /"exists"\s*:\s*false/.test(mensagem) ? "131026" : undefined;
  const codigo =
    semWhatsappNoEvolution ??
    mensagem.match(/"code"\s*:\s*(\d{3,6})/)?.[1] ??
    mensagem.match(/\b(13\d{4})\b/)?.[1];
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

/** Classe do problema, para quem lê o histórico (não para a regra de retry). */
export type ClasseDoErro = "conta_meta" | "sem_modelo" | "temporario" | "outro";

export function classeDoErroMeta(
  codigo: number | null | undefined,
  status?: string | null,
): ClasseDoErro {
  if (codigo === 131042) return "conta_meta";
  if (codigo === 131047 || status === "sem_modelo") return "sem_modelo";
  if (status === "erro") return "temporario";
  return "outro";
}

/** Remove JSON cru, tokens e números longos do motivo antes de mostrar na tela. */
export function sanitizarMotivo(motivo: string | null | undefined): string {
  if (!motivo) return "";
  const msg = motivo.match(/"message"\s*:\s*"([^"]{3,200})"/)?.[1];
  const base = (msg ?? motivo.replace(/\{[\s\S]*\}/g, "")).replace(
    /\b(?:EAA|sk_|Bearer\s)[\w.-]+/g,
    "•••",
  );
  return base
    .replace(/\d{10,}/g, "•••")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export type TomDoEnvio =
  "enviado" | "entregue" | "lida" | "aguardando" | "sem_modelo" | "falhou" | "conta";

export type DiagnosticoDoEnvio = {
  tom: TomDoEnvio;
  rotulo: string;
  titulo: string | null;
  detalhe: string | null;
  /** "conexao" = ir para a aba Conexão; "orientacao" = só texto, sem botão. */
  acao: "conexao" | "orientacao" | null;
  tecnico: string | null;
};

/** Traduz status + código + motivo de um envio em texto humano e ação contextual. */
export function diagnosticoDoEnvio(envio: {
  status: string;
  erroCodigo?: number | null;
  erro?: string | null;
}): DiagnosticoDoEnvio {
  const codigo =
    envio.erroCodigo ??
    lerErroMeta(envio.erro ?? "").codigo ??
    (/janela de 24h/i.test(envio.erro ?? "") ? 131047 : null);
  const tecnico = envio.erro
    ? `${codigo ? `Código ${codigo} · ` : ""}${sanitizarMotivo(envio.erro)}`
    : null;
  const ok = (tom: TomDoEnvio, rotulo: string): DiagnosticoDoEnvio => ({
    tom,
    rotulo,
    titulo: null,
    detalhe: null,
    acao: null,
    tecnico: null,
  });
  if (envio.status === "lida") return ok("lida", "Lida");
  if (envio.status === "entregue") return ok("entregue", "Entregue");
  if (envio.status === "enviado") return ok("enviado", "Enviado");
  if (envio.status === "pendente" || envio.status === "enviando")
    return ok("aguardando", "Aguardando");
  const classe = classeDoErroMeta(codigo, envio.status);
  if (classe === "conta_meta")
    return {
      tom: "conta",
      rotulo: "Conta Meta",
      titulo: "Conta WhatsApp/Meta precisa de atenção",
      detalhe: "Problema de elegibilidade/pagamento da conta oficial.",
      acao: "conexao",
      tecnico,
    };
  if (classe === "sem_modelo")
    return {
      tom: "sem_modelo",
      rotulo: "Sem modelo",
      titulo: "Modelo de mensagem necessário",
      detalhe:
        "Fora da janela de 24h e sem template aprovado. Aprovar template na Meta e depois testar novamente.",
      acao: "orientacao",
      tecnico,
    };
  if (classe === "temporario")
    return {
      tom: "aguardando",
      rotulo: "Nova tentativa",
      titulo: "Não enviado ainda",
      detalhe: "Falha temporária; o Flow tenta de novo automaticamente.",
      acao: null,
      tecnico,
    };
  return {
    tom: "falhou",
    rotulo: "Falhou",
    titulo: "Não enviado",
    detalhe: sanitizarMotivo(envio.erro) || "Motivo não informado.",
    acao: null,
    tecnico,
  };
}
