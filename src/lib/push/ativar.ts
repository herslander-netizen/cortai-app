import { aviso } from "@/lib/avisos";
import { ativarPushDaEquipe, type ResultadoDoPush } from "./aparelho";

const MENSAGEM: Record<Exclude<ResultadoDoPush, "ativo" | "instalar_primeiro">, string> = {
  bloqueado: "Os avisos estão bloqueados nas configurações do navegador.",
  recusado: "Tudo bem. Você pode ativar depois em Ajustes.",
  so_no_app: "Avisos ativados enquanto o Flow estiver aberto.",
  falhou: "Não deu para ativar agora. Tente de novo em Ajustes.",
};

/** Mesmo toque de "Ativar avisos" para equipe (push) e cliente (só navegador). */
export async function ativarAvisosDaEquipe(tenantId: string) {
  const r = await ativarPushDaEquipe(tenantId);
  if (r === "ativo") aviso.ok("Avisos no celular ativados.");
  else if (r !== "instalar_primeiro") aviso.info(MENSAGEM[r]);
  return r;
}

export const TEXTO_INSTALAR_PRIMEIRO =
  "No iPhone, instale o Flow primeiro: toque em Compartilhar e depois em Adicionar à Tela de Início. Depois abra pelo ícone e ative os avisos.";
