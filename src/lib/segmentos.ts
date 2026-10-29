import type { FamiliaId } from "@/lib/familias-tema";
import {
  BriefcaseBusiness,
  Eye,
  Flower2,
  Scissors,
  Sparkles,
  SprayCan,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

import {
  SERVICOS_SUGERIDOS,
  horariosPadrao,
  type HorarioSugerido,
  type ServicoSugerido,
} from "@/lib/ia/assistente";
import type { Identidade, Modo } from "@/lib/aparencia";
import type { TemaId } from "@/lib/pagina-config";

export const SEGMENTOS = [
  "barbearia",
  "salao",
  "cabeleireiro",
  "esmalteria",
  "sobrancelha_cilios",
  "estetica",
  "outro",
] as const;

export type Segmento = (typeof SEGMENTOS)[number];
export type IconeIA = "bigode" | "pingo";

export type TermosDoSegmento = {
  nome: string;
  comArtigo: string;
  de: string;
  em: string;
  possessivo: string;
  indefinido: string;
  profissional: string;
  profissionais: string;
  statusAtendimento: string;
  fotoAtendimento: string;
};

export type DefinicaoDeSegmento = {
  id: Segmento;
  rotulo: string;
  descricao: string;
  icone: LucideIcon;
  termos: TermosDoSegmento;
  servicosSugeridos: ServicoSugerido[];
  categorias: string[];
  horariosPadrao: HorarioSugerido[];
  identidade: Identidade;
  modoPadrao: Modo;
  temaPagina: TemaId;
  /** Experiência do link aplicada só na criação de um negócio novo. */
  experienciaPadrao: "direta" | "vitrine";
  /** Famílias de tema com selo "Recomendado" no editor. */
  familiasRecomendadas: FamiliaId[];
  iconeIA: IconeIA;
  exemploIA: string;
  /** Atalhos da ficha do cliente gravados ao criar o negócio. */
  chipsFicha: string[];
};

const horarioBeleza = (): HorarioSugerido[] =>
  [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
    diaSemana,
    fechado: diaSemana === 0 || diaSemana === 1,
    abre: "09:00",
    fecha: "19:00",
  }));

const termosFemininos = (nome: string): TermosDoSegmento => ({
  nome,
  comArtigo: `a ${nome}`,
  de: `da ${nome}`,
  em: `na ${nome}`,
  possessivo: `sua ${nome}`,
  indefinido: `uma ${nome}`,
  profissional: "profissional",
  profissionais: "profissionais",
  statusAtendimento: "Em atendimento",
  fotoAtendimento: "Foto do resultado",
});

const termosMasculinos = (nome: string): TermosDoSegmento => ({
  nome,
  comArtigo: `o ${nome}`,
  de: `do ${nome}`,
  em: `no ${nome}`,
  possessivo: `seu ${nome}`,
  indefinido: `um ${nome}`,
  profissional: "profissional",
  profissionais: "profissionais",
  statusAtendimento: "Em atendimento",
  fotoAtendimento: "Foto do resultado",
});

/** Atalhos históricos da ficha de barbearia (default legado da coluna tenants.chips_ficha). */
export const CHIPS_FICHA_BARBEARIA = [
  "Degradê",
  "Máquina 1",
  "Barba marcada",
  "Pouca conversa",
] as const;

const CHIPS_CABELO = [
  "Cabelo liso",
  "Cabelo cacheado",
  "Fórmula da coloração",
  "Sensível a química",
  "Pouca conversa",
];

const BARBEARIA: DefinicaoDeSegmento = {
  id: "barbearia",
  rotulo: "Barbearia",
  descricao: "Cortes, barba e cuidados masculinos",
  icone: Scissors,
  termos: {
    ...termosFemininos("barbearia"),
    profissional: "barbeiro",
    profissionais: "barbeiros",
    statusAtendimento: "Na cadeira",
    fotoAtendimento: "Foto do corte",
  },
  servicosSugeridos: SERVICOS_SUGERIDOS.map((servico) => ({ ...servico })),
  categorias: ["Cabelo", "Barba", "Combo", "Acabamento", "Química"],
  horariosPadrao: horariosPadrao(),
  identidade: "moderno",
  modoPadrao: "escuro",
  temaPagina: "cortai",
  experienciaPadrao: "direta",
  familiasRecomendadas: ["cortai", "urbano", "noturno", "classico", "premium"],
  iconeIA: "bigode",
  exemploIA: "Cadastre corte por 35 reais e barba por 25, os dois levam 30 minutos",
  chipsFicha: [...CHIPS_FICHA_BARBEARIA],
};

const beleza = {
  identidade: "moderno" as const,
  modoPadrao: "claro" as const,
  temaPagina: "rose-creme" as const,
  experienciaPadrao: "vitrine" as const,
  iconeIA: "pingo" as const,
  horariosPadrao: horarioBeleza(),
  exemploIA: "Cadastre manicure por 35 reais em 45 minutos e escova por 50 reais em 45 minutos",
};

export const SEGMENTOS_CONFIG: Record<Segmento, DefinicaoDeSegmento> = {
  barbearia: BARBEARIA,
  salao: {
    ...beleza,
    familiasRecomendadas: ["rose", "nude", "editorial", "clean"],
    chipsFicha: [...CHIPS_CABELO],
    id: "salao",
    rotulo: "Salão de beleza",
    descricao: "Cabelo, unhas e beleza em um só lugar",
    icone: Sparkles,
    termos: termosMasculinos("salão"),
    categorias: ["Unhas", "Cabelo", "Química", "Sobrancelha e cílios", "Estética", "Combo"],
    servicosSugeridos: [
      ["Manicure", "Unhas", 45, 3500, 15],
      ["Pedicure", "Unhas", 50, 4000, 21],
      ["Mãos e pés", "Combo", 90, 7000, 15],
      ["Escova", "Cabelo", 45, 5000, null],
      ["Corte feminino", "Cabelo", 60, 7000, 45],
      ["Hidratação", "Cabelo", 60, 7000, 30],
      ["Coloração", "Química", 120, 15000, 35],
      ["Design de sobrancelha", "Sobrancelha e cílios", 30, 3500, 20],
    ].map(([nome, categoria, duracaoMin, precoCentavos, retornoDias]) => ({
      nome,
      categoria,
      duracaoMin,
      precoCentavos,
      ...(retornoDias ? { retornoDias } : {}),
    })) as ServicoSugerido[],
  },
  cabeleireiro: {
    ...beleza,
    familiasRecomendadas: ["editorial", "rose", "classico", "noturno"],
    chipsFicha: [...CHIPS_CABELO],
    id: "cabeleireiro",
    rotulo: "Cabeleireiro(a)",
    descricao: "Cortes, tratamentos e coloração",
    icone: SprayCan,
    termos: termosMasculinos("studio"),
    categorias: ["Corte", "Tratamento", "Química", "Finalização"],
    servicosSugeridos: [
      ["Corte feminino", "Corte", 60, 7000, 45],
      ["Corte masculino", "Corte", 30, 4000, 30],
      ["Escova", "Finalização", 45, 5000, null],
      ["Hidratação", "Tratamento", 60, 7000, 30],
      ["Coloração", "Química", 120, 15000, 35],
      ["Retoque de raiz", "Química", 90, 10000, 35],
      ["Mechas", "Química", 180, 25000, 90],
      ["Progressiva", "Química", 180, 20000, 90],
    ].map(([nome, categoria, duracaoMin, precoCentavos, retornoDias]) => ({
      nome,
      categoria,
      duracaoMin,
      precoCentavos,
      ...(retornoDias ? { retornoDias } : {}),
    })) as ServicoSugerido[],
  },
  esmalteria: {
    ...beleza,
    familiasRecomendadas: ["rose", "nude", "clean"],
    chipsFicha: [
      ...[
        "Unha quadrada",
        "Unha amendoada",
        "Alergia a esmalte",
        "Cutícula sensível",
        "Pouca conversa",
      ],
    ],
    id: "esmalteria",
    rotulo: "Esmalteria / nail designer",
    descricao: "Unhas, gel e alongamentos",
    icone: Flower2,
    termos: termosFemininos("esmalteria"),
    categorias: ["Mãos", "Pés", "Gel e alongamento", "Combo"],
    servicosSugeridos: [
      ["Manicure", "Mãos", 45, 3500, 15],
      ["Pedicure", "Pés", 50, 4000, 21],
      ["Mãos e pés", "Combo", 90, 7000, 15],
      ["Esmaltação em gel", "Gel e alongamento", 60, 8000, 21],
      ["Alongamento em gel", "Gel e alongamento", 120, 15000, 21],
      ["Manutenção de alongamento", "Gel e alongamento", 90, 10000, 21],
      ["Blindagem", "Gel e alongamento", 60, 7000, 21],
    ].map(([nome, categoria, duracaoMin, precoCentavos, retornoDias]) => ({
      nome,
      categoria,
      duracaoMin,
      precoCentavos,
      ...(retornoDias ? { retornoDias } : {}),
    })) as ServicoSugerido[],
  },
  sobrancelha_cilios: {
    ...beleza,
    familiasRecomendadas: ["nude", "rose", "clean"],
    chipsFicha: [
      ...["Olhos sensíveis", "Alergia a cola", "Curvatura C", "Curvatura D", "Pouca conversa"],
    ],
    id: "sobrancelha_cilios",
    rotulo: "Sobrancelha e cílios",
    descricao: "Design, extensão e cuidados do olhar",
    icone: Eye,
    termos: termosMasculinos("studio"),
    categorias: ["Sobrancelha", "Cílios", "Depilação"],
    servicosSugeridos: [
      ["Design de sobrancelha", "Sobrancelha", 30, 3500, 20],
      ["Design com henna", "Sobrancelha", 45, 5000, 20],
      ["Extensão de cílios", "Cílios", 120, 15000, 18],
      ["Manutenção de cílios", "Cílios", 75, 9000, 18],
      ["Lash lifting", "Cílios", 60, 12000, 45],
      ["Depilação de buço", "Depilação", 15, 2000, 20],
    ].map(([nome, categoria, duracaoMin, precoCentavos, retornoDias]) => ({
      nome,
      categoria,
      duracaoMin,
      precoCentavos,
      ...(retornoDias ? { retornoDias } : {}),
    })) as ServicoSugerido[],
  },
  estetica: {
    ...beleza,
    familiasRecomendadas: ["clean", "nude", "premium"],
    chipsFicha: [...["Pele sensível", "Pele oleosa", "Alergia a cosméticos", "Pouca conversa"]],
    id: "estetica",
    rotulo: "Estética e spa",
    descricao: "Cuidados faciais, corporais e bem-estar",
    icone: WandSparkles,
    termos: termosMasculinos("espaço"),
    categorias: ["Facial", "Corporal", "Depilação", "Maquiagem"],
    servicosSugeridos: [
      ["Limpeza de pele", "Facial", 75, 12000, 30],
      ["Drenagem linfática", "Corporal", 60, 10000, null],
      ["Massagem relaxante", "Corporal", 60, 10000, null],
      ["Depilação", "Depilação", 30, 5000, 30],
      ["Maquiagem", "Maquiagem", 60, 12000, null],
    ].map(([nome, categoria, duracaoMin, precoCentavos, retornoDias]) => ({
      nome,
      categoria,
      duracaoMin,
      precoCentavos,
      ...(retornoDias ? { retornoDias } : {}),
    })) as ServicoSugerido[],
  },
  outro: {
    id: "outro",
    rotulo: "Outro tipo de serviço",
    descricao: "Serviços personalizados, consultorias, aulas, assistência e outros atendimentos por horário",
    icone: BriefcaseBusiness,
    termos: termosMasculinos("espaço"),
    servicosSugeridos: [],
    categorias: ["Serviço"],
    horariosPadrao: horariosPadrao(),
    identidade: "moderno",
    modoPadrao: "escuro",
    temaPagina: "cortai",
    experienciaPadrao: "vitrine",
    familiasRecomendadas: ["cortai", "clean"],
    iconeIA: "pingo",
    exemploIA: "Cadastre o serviço por 50 reais em 45 minutos",
    chipsFicha: ["Pouca conversa"],
  },
};

export const LISTA_DE_SEGMENTOS = SEGMENTOS.map((id) => SEGMENTOS_CONFIG[id]);

/** Normaliza segmentos para uso geral; ausência ou valor inválido nunca presume um segmento específico. */
export function segmentoValido(valor: unknown): Segmento {
  return SEGMENTOS.includes(valor as Segmento) ? (valor as Segmento) : "outro";
}

/** Alias semântico de normalização para consumidores que lidam com apresentação do segmento. */
export function segmentoParaApresentacao(valor: unknown): Segmento {
  return SEGMENTOS.includes(valor as Segmento) ? (valor as Segmento) : "outro";
}

export function termos(segmento: unknown): TermosDoSegmento {
  return SEGMENTOS_CONFIG[segmentoParaApresentacao(segmento)].termos;
}

export function definicaoDoSegmento(segmento: unknown): DefinicaoDeSegmento {
  return SEGMENTOS_CONFIG[segmentoParaApresentacao(segmento)];
}

/** `true` quando os atalhos ainda são exatamente os padrão da barbearia. */
export function chipsSaoPadraoBarbearia(chips: readonly string[] | null | undefined): boolean {
  const a = [...(chips ?? [])].sort().join("|");
  return a === [...CHIPS_FICHA_BARBEARIA].sort().join("|");
}
