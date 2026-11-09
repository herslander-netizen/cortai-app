/**
 * Coordenação leve dos especialistas do Flow Core.
 * Escolhe um foco por turno, SEM executar ferramentas ou chamar outro modelo.
 * O catálogo oficial e acaoPermitida continuam sendo a única autoridade.
 */
import { ESPECIALISTAS_FLOW, ferramentasDoEspecialista, type IdEspecialistaFlow } from "./especialistas";

export type ContextoDoEspecialista = {
  mensagem: string;
  canal: "painel" | "whatsapp" | "site";
  papel?: "cliente" | "profissional" | "dono" | null;
  ferramentasAutorizadas: readonly string[];
};

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Roteador determinístico e econômico. Não recebe acesso ao banco, usuário ou
 * tenant; a autorização real permanece no catálogo oficial do cérebro.
 */
export function escolherEspecialista(ctx: ContextoDoEspecialista): IdEspecialistaFlow {
  const texto = normalizar(ctx.mensagem);
  const equipe = ctx.canal === "painel" ||
    (ctx.canal === "whatsapp" && (ctx.papel === "profissional" || ctx.papel === "dono"));

  if (!equipe) {
    return /\b(agenda|agendar|agendamento|horario|horarios|marcar|remarcar|cancelar|disponibilidade)\b/.test(texto)
      ? "agenda"
      : "atendimento";
  }
  if (/\b(como|onde|tutorial|ajuda|configurar|configuro|usar|funciona|acessar|tela|menu)\b/.test(texto))
    return "conhecimento";
  if (/\b(caixa|faturamento|receita|lucro|dinheiro|indicadores?|relatorios?|desempenho|crescimento)\b/.test(texto))
    return "insights";
  if (/\b(fila|espera|atraso|atrasado|chegada|chegou|operacao)\b/.test(texto))
    return "operacoes";
  if (/\b(agenda|agendar|agendamentos?|horarios?|marcar|remarcar|cancelar|disponibilidade|encaixe)\b/.test(texto))
    return "agenda";
  if (/\b(crm|clientes?|cadastro|fidelidade|historico|recorrencia|retencao)\b/.test(texto))
    return "crm";
  return "atendimento";
}

/**
 * Instrução consultiva anexada ao prompt JÁ existente, sem alterar a lista
 * efetiva de ferramentas. Uma mensagem pode usar mais de um domínio.
 */
export function instrucaoDoEspecialista(ctx: ContextoDoEspecialista): string {
  const id = escolherEspecialista(ctx);
  const perfil = ESPECIALISTAS_FLOW.find((item) => item.id === id);
  if (!perfil) return "";
  const preferidas = ferramentasDoEspecialista(id, ctx.ferramentasAutorizadas);
  return [
    "Coordenacao interna Flow Core (sem agente externo, sem execucao autonoma):",
    `Foco deste turno: ${perfil.nome}. ${perfil.objetivo}`,
    preferidas.length ? `Consultas pertinentes JA AUTORIZADAS: ${preferidas.join(", ")}.` :
      "Nao existem consultas especializadas autorizadas para este foco.",
    "O foco nao concede privilegios nem limita as outras ferramentas autorizadas pelo servidor.",
    "Siga as validacoes, a conferencia, a confirmacao e a auditoria do cerebro oficial.",
    "Nunca anuncie a escolha do especialista como acao concluida."
  ].join("\n");
}
