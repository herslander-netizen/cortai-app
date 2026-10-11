/**
 * Comando de voz do painel (só servidor): valida o áudio recebido do navegador e o transcreve
 * com a chave que vive APENAS aqui. O áudio nunca é gravado nem logado — fica na memória desta
 * chamada. Depois da transcrição, o texto segue o mesmo caminho do chat digitado (`pensarCortai`).
 */
const TIPOS_ACEITOS = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
] as const;

/** ~60 s de áudio Opus cabem em bem menos que isso; o teto protege custo e memória. */
export const TAMANHO_MAXIMO_DO_AUDIO = 4 * 1024 * 1024;
export const DURACAO_MAXIMA_S = 90;
export const LIMITE_POR_HORA = 60;

export type ValidacaoDoAudio =
  | { ok: true; bytes: number; tipo: string }
  | { ok: false; motivo: "invalido" | "grande_demais" | "tipo_nao_aceito" };

/** Valida tipo e tamanho SEM decodificar o áudio inteiro. */
export function validarAudio(base64: string, mimeType: string): ValidacaoDoAudio {
  const tipo = (mimeType.split(";")[0] ?? "").trim().toLowerCase();
  if (!(TIPOS_ACEITOS as readonly string[]).includes(tipo))
    return { ok: false, motivo: "tipo_nao_aceito" };
  const limpo = base64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  if (!limpo || !/^[A-Za-z0-9+/]+={0,2}$/.test(limpo)) return { ok: false, motivo: "invalido" };
  const bytes =
    Math.floor((limpo.length * 3) / 4) - (limpo.endsWith("==") ? 2 : limpo.endsWith("=") ? 1 : 0);
  if (bytes < 800) return { ok: false, motivo: "invalido" };
  if (bytes > TAMANHO_MAXIMO_DO_AUDIO) return { ok: false, motivo: "grande_demais" };
  return { ok: true, bytes, tipo };
}

export type ResultadoDaVoz =
  | { texto: string }
  | {
      texto: null;
      motivo:
        | "invalido"
        | "grande_demais"
        | "tipo_nao_aceito"
        | "indisponivel"
        | "nao_entendi"
        | "limite";
    };

/** Uso por pessoa/hora em `acoes_de_ia_log` (sem tabela nova). Falha de leitura não bloqueia a equipe. */
export async function limiteDeVozAtingido(tenantId: string, userId: string): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("acoes_de_ia_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("acao", "voz.transcricao")
      .eq("intencao", userId.slice(0, 120))
      .gte("criado_em", new Date(Date.now() - 60 * 60_000).toISOString());
    return (count ?? 0) >= LIMITE_POR_HORA;
  } catch {
    return false;
  }
}

async function registrarUso(tenantId: string, userId: string, sucesso: boolean) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("acoes_de_ia_log").insert({
      tenant_id: tenantId,
      acao: "voz.transcricao",
      intencao: userId.slice(0, 120),
      entrada: {} as never,
      sucesso,
    });
  } catch {
    /* contagem nunca derruba o comando */
  }
}

export async function transcreverComandoDeVoz(entrada: {
  tenantId: string;
  userId: string;
  audioBase64: string;
  mimeType: string;
  duracaoS?: number | undefined;
}): Promise<ResultadoDaVoz> {
  const v = validarAudio(entrada.audioBase64, entrada.mimeType);
  if (!v.ok) return { texto: null, motivo: v.motivo };
  if (await limiteDeVozAtingido(entrada.tenantId, entrada.userId))
    return { texto: null, motivo: "limite" };

  const { transcricaoConfigurada, transcreverAudioBase64 } =
    await import("@/lib/whatsapp/transcricao.server");
  if (!transcricaoConfigurada()) return { texto: null, motivo: "indisponivel" };

  const texto = await transcreverAudioBase64(entrada.audioBase64, {
    mimetype: v.tipo,
    duracaoS: Math.min(entrada.duracaoS ?? DURACAO_MAXIMA_S, DURACAO_MAXIMA_S),
  });
  await registrarUso(entrada.tenantId, entrada.userId, Boolean(texto));
  // Comando absurdamente longo = ruído ou abuso; o chat limita a 1500 de qualquer forma.
  return texto ? { texto: texto.slice(0, 1500) } : { texto: null, motivo: "nao_entendi" };
}
