import type { ServicoSugerido } from "@/lib/ia/assistente";

export type ServicoEditavel = Omit<ServicoSugerido, "retornoDias"> & {
  id?: string;
  profissionalIds?: string[];
  retornoDias?: number | null;
  fotoUrl?: string | null;
};
