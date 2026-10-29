import type { TemaId } from "@/lib/pagina-config";

/**
 * Famílias de tema mostradas no editor. Cada família agrupa um ou mais dos
 * 13 temas existentes (o id gravado continua sendo o do tema).
 */
export const familiaIds = [
  "cortai",
  "rose",
  "nude",
  "premium",
  "urbano",
  "classico",
  "clean",
  "noturno",
  "editorial",
  "figaro-classico",
  "figaro-retro",
  "figaro-rock",
  "feminino-rose",
  "feminino-lavanda",
  "feminino-pessego",
  "contraste",
] as const;
export type FamiliaId = (typeof familiaIds)[number];

export type FamiliaDeTema = {
  id: FamiliaId;
  nome: string;
  descricao: string;
  variantes: { tema: TemaId; rotulo: string }[];
};

export const FAMILIAS_DE_TEMA: FamiliaDeTema[] = [
  {
    id: "cortai",
    nome: "Flow",
    descricao: "A identidade da marca, em versão escura ou clara.",
    variantes: [
      { tema: "cortai", rotulo: "Escuro" },
      { tema: "cortai-creme", rotulo: "Creme" },
    ],
  },
  {
    id: "rose",
    nome: "Rosé",
    descricao: "Tons quentes e acolhedores.",
    variantes: [
      { tema: "rose", rotulo: "Escuro" },
      { tema: "rose-creme", rotulo: "Creme" },
    ],
  },
  {
    id: "nude",
    nome: "Nude",
    descricao: "Leve e suave, em tons de pele.",
    variantes: [{ tema: "nude", rotulo: "Nude" }],
  },
  {
    id: "premium",
    nome: "Premium",
    descricao: "Sofisticado, com detalhes dourados.",
    variantes: [{ tema: "premium", rotulo: "Premium" }],
  },
  {
    id: "urbano",
    nome: "Urbano",
    descricao: "Moderno e marcante.",
    variantes: [
      { tema: "urbano", rotulo: "Urbano" },
      { tema: "street", rotulo: "Street" },
    ],
  },
  {
    id: "classico",
    nome: "Clássico",
    descricao: "Tradicional e elegante.",
    variantes: [{ tema: "classico", rotulo: "Clássico" }],
  },
  {
    id: "clean",
    nome: "Clean",
    descricao: "Claro, limpo e direto.",
    variantes: [{ tema: "clean", rotulo: "Clean" }],
  },
  {
    id: "noturno",
    nome: "Noturno",
    descricao: "Escuro e intenso.",
    variantes: [
      { tema: "dark", rotulo: "Dark" },
      { tema: "industrial", rotulo: "Industrial" },
    ],
  },
  {
    id: "editorial",
    nome: "Editorial",
    descricao: "Visual de revista, com foco nas fotos.",
    variantes: [{ tema: "editorial", rotulo: "Editorial" }],
  },
  {
    id: "figaro-classico",
    nome: "Clássico · Figaro",
    descricao: "A opção Clássico identificada na referência Figaro.",
    variantes: [{ tema: "figaro-classico", rotulo: "Figaro" }],
  },
  {
    id: "figaro-retro",
    nome: "Retro · Figaro",
    descricao: "A opção Retro identificada na referência Figaro.",
    variantes: [{ tema: "figaro-retro", rotulo: "Figaro" }],
  },
  {
    id: "figaro-rock",
    nome: "Rock n' Roll · Figaro",
    descricao: "A opção Rock n' Roll identificada na referência Figaro.",
    variantes: [{ tema: "figaro-rock-n-roll", rotulo: "Figaro" }],
  },
  {
    id: "feminino-rose",
    nome: "Rosé",
    descricao: "Rosa suave com detalhes em ouro rosado.",
    variantes: [{ tema: "feminino-rose", rotulo: "Flow" }],
  },
  {
    id: "feminino-lavanda",
    nome: "Lavanda",
    descricao: "Lilás delicado e sofisticado.",
    variantes: [{ tema: "feminino-lavanda", rotulo: "Flow" }],
  },
  {
    id: "feminino-pessego",
    nome: "Pêssego",
    descricao: "Tons de pêssego e coral.",
    variantes: [{ tema: "feminino-pessego", rotulo: "Flow" }],
  },
  {
    id: "contraste",
    nome: "Contraste",
    descricao: "Preto e branco com uma única cor de sinal, do layout Raízes.",
    variantes: [{ tema: "contraste", rotulo: "Contraste" }],
  },
];

export function familiaDoTema(tema: TemaId): FamiliaDeTema {
  return (
    FAMILIAS_DE_TEMA.find((f) => f.variantes.some((v) => v.tema === tema)) ?? FAMILIAS_DE_TEMA[0]!
  );
}
