import { mesmoTelefone } from "@/lib/telefone";

/**
 * A lista de espera pode receber um número novo, mas esse número não herda
 * comprovação de titularidade nem opt-in do contato anterior.
 *
 * O ledger de consentimento por telefone/finalidade e os bloqueios de SAIR
 * continuam intactos. Nenhum consentimento é concedido automaticamente.
 */
export function alteracoesContatoDaFila(
  existente: { nome: string; telefone: string | null },
  informado: { nome: string; telefone: string },
) {
  const nome = informado.nome.trim();
  const telefone = informado.telefone.trim();
  const alteracoes: {
    nome?: string;
    telefone?: string;
    whatsapp_confirmado_em?: null;
    opt_in_whatsapp?: false;
    opt_in_em?: null;
    sem_whatsapp_em?: null;
  } = {};

  if (nome !== existente.nome) alteracoes.nome = nome;
  const telefoneAlterado = !mesmoTelefone(existente.telefone, telefone);
  if (telefoneAlterado) {
    alteracoes.telefone = telefone;
    alteracoes.whatsapp_confirmado_em = null;
    alteracoes.opt_in_whatsapp = false;
    alteracoes.opt_in_em = null;
    // "Sem WhatsApp" era uma constatação sobre o número anterior.
    alteracoes.sem_whatsapp_em = null;
    // Não limpar whatsapp_parado_em/whatsapp_parado_motivo:
    // a revogação do cliente exige reconsentimento explícito.
  }
  return { alteracoes, telefoneAlterado };
}
