import type { PaginaConfig } from "@/lib/pagina-config";

type ChatConfig = PaginaConfig["chat"];

/** Os campos de estilo do chat (todos opcionais em um preset: o resto fica como está). */
export type ValoresDeEstilo = Pick<
  ChatConfig,
  "estilo" | "fundo" | "superficie" | "cabecalho" | "avatar" | "texto" | "chips"
> &
  Partial<Pick<ChatConfig, "corDestaque">>;

export type EstiloDoChat = {
  id: string;
  nome: string;
  descricao: string;
  valores: ValoresDeEstilo;
};

/** Estilos prontos do Chat: cada um combina forma dos balões, fundo, cabeçalho e botões. */
export const ESTILOS_DO_CHAT: readonly EstiloDoChat[] = [
  {
    id: "cortai",
    nome: "Flow",
    descricao: "Balões de vidro sobre a foto do negócio, o visual de sempre.",
    valores: {
      estilo: "vidro",
      fundo: "capa",
      superficie: "padrao",
      cabecalho: "barra",
      avatar: "redondo",
      texto: "normal",
      chips: "pilula",
    },
  },
  {
    id: "conversa",
    nome: "Conversa",
    descricao: "Balões sólidos, como nos aplicativos de mensagem, em fundo limpo.",
    valores: {
      estilo: "classico",
      fundo: "liso",
      superficie: "clara",
      cabecalho: "barra",
      avatar: "redondo",
      texto: "normal",
      chips: "pilula",
    },
  },
  {
    id: "suave",
    nome: "Suave",
    descricao: "Cantos bem arredondados e tons pastel da paleta do tema.",
    valores: {
      estilo: "suave",
      fundo: "padrao",
      superficie: "tema",
      cabecalho: "cartao",
      avatar: "redondo",
      texto: "normal",
      chips: "pilula",
    },
  },
  {
    id: "minimal",
    nome: "Minimal",
    descricao: "Sem balões: só texto, com um filete na cor de destaque.",
    valores: {
      estilo: "minimo",
      fundo: "liso",
      superficie: "clara",
      cabecalho: "barra",
      avatar: "quadrado",
      texto: "normal",
      chips: "cartao",
    },
  },
  {
    id: "elegante",
    nome: "Elegante",
    descricao: "Filetes finos, títulos serifados e botões em cartão.",
    valores: {
      estilo: "elegante",
      fundo: "liso",
      superficie: "tema",
      cabecalho: "cartao",
      avatar: "quadrado",
      texto: "normal",
      chips: "cartao",
    },
  },
  {
    id: "noturno",
    nome: "Noturno",
    descricao: "Fundo escuro com balões sólidos, bom para pouca luz.",
    valores: {
      estilo: "classico",
      fundo: "padrao",
      superficie: "escura",
      cabecalho: "barra",
      avatar: "redondo",
      texto: "normal",
      chips: "pilula",
    },
  },
  {
    id: "grafite",
    nome: "Grafite",
    descricao: "Grafite quente com balões sólidos e destaque em areia, sóbrio e suave.",
    valores: {
      estilo: "rustico",
      fundo: "liso",
      superficie: "grafite",
      cabecalho: "barra",
      avatar: "redondo",
      texto: "normal",
      chips: "pilula",
      corDestaque: "areia",
    },
  },
  {
    id: "rustico",
    nome: "Rústico",
    descricao: "Barbearia de couro e madeira: areia clara, marrom suave e serifa discreta.",
    valores: {
      estilo: "rustico",
      fundo: "liso",
      superficie: "rustico",
      cabecalho: "cartao",
      avatar: "quadrado",
      texto: "normal",
      chips: "cartao",
      corDestaque: "couro",
    },
  },
];

const CAMPOS: (keyof ValoresDeEstilo)[] = [
  "estilo",
  "fundo",
  "superficie",
  "cabecalho",
  "avatar",
  "texto",
  "chips",
  "corDestaque",
];

/** Aplica um estilo pronto, sem mexer em recepção, mensagens nem cor de destaque. */
export function aplicarEstiloDoChat(config: PaginaConfig, id: string): PaginaConfig {
  const estilo = ESTILOS_DO_CHAT.find((e) => e.id === id);
  return estilo ? { ...config, chat: { ...config.chat, ...estilo.valores } } : config;
}

/** Id do estilo pronto que bate com os ajustes atuais, ou `null` se foi personalizado. */
export function estiloAtualDoChat(chat: ChatConfig): string | null {
  return ESTILOS_DO_CHAT.find((e) => CAMPOS.every((c) => e.valores[c] === undefined || chat[c] === e.valores[c]))?.id ?? null;
}
