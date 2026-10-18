import type { Forma } from "./useAgendamentoManual";

/** Detecta alterações relevantes sem marcar os valores padrão carregados como rascunho. */
export function temAlteracoesAgendamentoManual({
  clienteId,
  novoNome,
  novoTelefone,
  termo,
  servicoId,
  servicoInicial,
  profissionalId,
  profissionalInicialId,
  data,
  diaInicial,
  horaMin,
  horaInicial,
  forma,
}: {
  clienteId: string | null;
  novoNome: string;
  novoTelefone: string;
  termo: string;
  servicoId: string;
  servicoInicial: string;
  profissionalId: string;
  profissionalInicialId: string;
  data: string;
  diaInicial: string;
  horaMin: string;
  horaInicial: string;
  forma: Forma;
}) {
  return Boolean(
    clienteId ||
      novoNome ||
      novoTelefone ||
      termo ||
      (servicoId && servicoId !== servicoInicial) ||
      (profissionalId && profissionalId !== profissionalInicialId) ||
      data !== diaInicial ||
      horaMin !== horaInicial ||
      forma !== "balcao",
  );
}
