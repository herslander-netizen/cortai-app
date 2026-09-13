import type { ChaveDePermissao } from "@/lib/permissoes";
import type { Sessao } from "@/lib/sessao.functions";

export function temPermissao(sessao: Sessao | null | undefined, permissao?: ChaveDePermissao) {
  if (!permissao) return true;
  return Boolean(sessao?.permissoes.includes(permissao));
}

export function rotuloDoPapel(papel: string | null | undefined) {
  if (papel === "dono") return "Proprietário";
  if (papel === "gerente") return "Admin/Gerente";
  if (papel === "barbeiro") return "Profissional/Barbeiro";
  if (papel === "recepcao") return "Recepção/Atendimento";
  return "Equipe da barbearia";
}