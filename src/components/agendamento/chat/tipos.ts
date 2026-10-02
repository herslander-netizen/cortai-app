export type Opcao = { iso: string; label: string; profId: string };

export type ServicoSelecionavel = {
  id: string;
  nome: string;
  duracao_min: number;
  preco_centavos: number;
  profissional_ids?: string[] | null;
  foto_url?: string | null;
};

/** Mesma seleção de `useSelecaoAgendamento`: a conversa só preenche e corrige. */
export type Selecao = {
  servicoId: string | null;
  setServicoId: (id: string | null) => void;
  servico: ServicoSelecionavel | null;
  profissionalId: string;
  setProfissionalId: (id: string) => void;
  aptos: { id: string; nome: string; avatar_url?: string | null }[];
  dias: string[];
  dia: string | null;
  setDia: (dia: string | null) => void;
  porDia: Map<string, { fechado: boolean; opcoes: Opcao[] }>;
  agenda: { fechado: boolean; opcoes: Opcao[] } | undefined;
  inicio: string | null;
  setInicio: (inicio: string | null) => void;
  escolhido: Opcao | null;
};

export type Etapa = "servico" | "profissional" | "dia" | "horario" | "dados";

export type Chip = { rotulo: string; acao?: () => void; href?: string };

export type MensagemExtra = {
  id: number;
  autor: "cliente" | "recepcao";
  texto: string;
  chips?: Chip[];
};

export type HorarioFuturo = {
  dia: string;
  hora: string;
  onVer: () => void;
  onRemarcar: () => void;
  onCancelar: () => void;
  cancelando: boolean;
};
