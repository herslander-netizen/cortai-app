/**
 * Contingência do atendimento automático (dono, 06/11/2026). Quando nem o Flow Bot nem a Flow IA conseguem responder
 * (ou o áudio não pode ser ouvido), a mensagem diz a verdade com o nome de quem responde pelo negócio ("Ricardo não
 * está conseguindo responder agora"), confirma que ele foi avisado — o aviso vai junto, no sininho — e oferece a agenda.
 */

/** Intervalo mínimo entre duas mensagens de contingência na mesma conversa. */
export const INTERVALO_DA_CONTINGENCIA_MS = 30 * 60_000;

/**
 * "Ricardo" quando há um nome de pessoa; sem nome (ou com cara de usuário de e-mail, como "falecomaalvo"), "a equipe".
 * Só o primeiro nome, com inicial maiúscula, como numa conversa.
 */
export function quemResponde(nome: string | null | undefined): { nome: string; ele: string } {
  const limpo = nome?.trim() ?? "";
  const primeiro = limpo.split(/\s+/)[0] ?? "";
  const pareceUsuario =
    /[\d@_.]/.test(limpo) ||
    (!/\s/.test(limpo) && limpo === limpo.toLowerCase() && limpo.length > 8);
  if (primeiro.length < 2 || pareceUsuario) return { nome: "a equipe", ele: "a equipe" };
  const formatado = primeiro.charAt(0).toLocaleUpperCase("pt-BR") + primeiro.slice(1);
  return { nome: formatado, ele: formatado };
}

/** Sem resposta automática: quem responde foi avisado e a agenda fica à mão. */
export function textoDeContingencia(link: string, responsavel?: string | null): string {
  const r = quemResponde(responsavel);
  const sujeito = r.nome === "a equipe" ? "A equipe" : r.nome;
  return [
    `Oi! ${sujeito} não está conseguindo responder no momento.`,
    `Já avisamos que você quer falar e, assim que possível, ${r.ele === "a equipe" ? "alguém da equipe" : r.ele} entra em contato por aqui.`,
    "",
    `Se preferir, veja um horário disponível na agenda: ${link}`,
  ].join("\n");
}

/**
 * Áudio sem transcrição (serviço fora do ar ou sem configuração): repetir não adianta, então o atendimento segue por
 * texto (dono, 06/11/2026: "no momento não estamos conseguindo ouvir áudio, mas dá pra continuar aqui").
 */
export function textoDeAudioIndisponivel(link: string, responsavel?: string | null): string {
  const r = quemResponde(responsavel);
  return [
    "No momento não consigo ouvir áudios, mas dá para continuar por aqui escrevendo.",
    "",
    "Me diga o *serviço* e o *horário* que prefere, que eu ajusto.",
    "",
    `${r.nome === "a equipe" ? "A equipe já foi avisada" : `${r.nome} já foi avisado`}.`,
    `Ou veja a agenda: ${link}`,
  ].join("\n");
}
