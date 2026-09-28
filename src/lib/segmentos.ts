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

import { SERVICOS_SUGERIDOS, horariosPadrao, type HorarioSugerido, type ServicoSugerido } from "@/lib/ia/assistente";
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
  iconeIA: IconeIA;
  exemploIA: string;
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
  iconeIA: "bigode",
  exemploIA: "Cadastre corte por 35 reais e barba por 25, os dois levam 30 minutos",
};

const beleza = {
  identidade: "rose" as const,
  modoPadrao: "claro" as const,
  temaPagina: "rose-creme" as const,
  iconeIA: "pingo" as const,
  horariosPadrao: horarioBeleza(),
  exemploIA: "Cadastre manicure por 35 reais em 45 minutos e escova por 50 reais em 45 minutos",
};

export const SEGMENTOS_CONFIG: Record<Segmento, DefinicaoDeSegmento> = {
  barbearia: BARBEARIA,
  salao: {
    ...beleza, id: "salao", rotulo: "Salão de beleza", descricao: "Cabelo, unhas e beleza em um só lugar", icone: Sparkles,
    termos: termosMasculinos("salão"),
    categorias: ["Unhas", "Cabelo", "Química", "Sobrancelha e cílios", "Estética", "Combo"],
    servicosSugeridos: [
      ["Manicure", "Unhas", 45, 3500], ["Pedicure", "Unhas", 50, 4000], ["Mãos e pés", "Combo", 90, 7000],
      ["Escova", "Cabelo", 45, 5000], ["Corte feminino", "Cabelo", 60, 7000], ["Hidratação", "Cabelo", 60, 7000],
      ["Coloração", "Química", 120, 15000], ["Design de sobrancelha", "Sobrancelha e cílios", 30, 3500],
    ].map(([nome, categoria, duracaoMin, precoCentavos]) => ({ nome, categoria, duracaoMin, precoCentavos })) as ServicoSugerido[],
  },
  cabeleireiro: {
    ...beleza, id: "cabeleireiro", rotulo: "Cabeleireiro(a)", descricao: "Cortes, tratamentos e coloração", icone: SprayCan,
    termos: termosMasculinos("studio"), categorias: ["Corte", "Tratamento", "Química", "Finalização"],
    servicosSugeridos: [
      ["Corte feminino", "Corte", 60, 7000], ["Corte masculino", "Corte", 30, 4000], ["Escova", "Finalização", 45, 5000],
      ["Hidratação", "Tratamento", 60, 7000], ["Coloração", "Química", 120, 15000], ["Retoque de raiz", "Química", 90, 10000],
      ["Mechas", "Química", 180, 25000], ["Progressiva", "Química", 180, 20000],
    ].map(([nome, categoria, duracaoMin, precoCentavos]) => ({ nome, categoria, duracaoMin, precoCentavos })) as ServicoSugerido[],
  },
  esmalteria: {
    ...beleza, id: "esmalteria", rotulo: "Esmalteria / nail designer", descricao: "Unhas, gel e alongamentos", icone: Flower2,
    termos: termosFemininos("esmalteria"), categorias: ["Mãos", "Pés", "Gel e alongamento", "Combo"],
    servicosSugeridos: [
      ["Manicure", "Mãos", 45, 3500], ["Pedicure", "Pés", 50, 4000], ["Mãos e pés", "Combo", 90, 7000],
      ["Esmaltação em gel", "Gel e alongamento", 60, 8000], ["Alongamento em gel", "Gel e alongamento", 120, 15000],
      ["Manutenção de alongamento", "Gel e alongamento", 90, 10000], ["Blindagem", "Gel e alongamento", 60, 7000],
    ].map(([nome, categoria, duracaoMin, precoCentavos]) => ({ nome, categoria, duracaoMin, precoCentavos })) as ServicoSugerido[],
  },
  sobrancelha_cilios: {
    ...beleza, id: "sobrancelha_cilios", rotulo: "Sobrancelha e cílios", descricao: "Design, extensão e cuidados do olhar", icone: Eye,
    termos: termosMasculinos("studio"), categorias: ["Sobrancelha", "Cílios", "Depilação"],
    servicosSugeridos: [
      ["Design de sobrancelha", "Sobrancelha", 30, 3500], ["Design com henna", "Sobrancelha", 45, 5000],
      ["Extensão de cílios", "Cílios", 120, 15000], ["Manutenção de cílios", "Cílios", 75, 9000],
      ["Lash lifting", "Cílios", 60, 12000], ["Depilação de buço", "Depilação", 15, 2000],
    ].map(([nome, categoria, duracaoMin, precoCentavos]) => ({ nome, categoria, duracaoMin, precoCentavos })) as ServicoSugerido[],
  },
  estetica: {
    ...beleza, id: "estetica", rotulo: "Estética e spa", descricao: "Cuidados faciais, corporais e bem-estar", icone: WandSparkles,
    termos: termosMasculinos("espaço"), categorias: ["Facial", "Corporal", "Depilação", "Maquiagem"],
    servicosSugeridos: [
      ["Limpeza de pele", "Facial", 75, 12000], ["Drenagem linfática", "Corporal", 60, 10000],
      ["Massagem relaxante", "Corporal", 60, 10000], ["Depilação", "Depilação", 30, 5000], ["Maquiagem", "Maquiagem", 60, 12000],
    ].map(([nome, categoria, duracaoMin, precoCentavos]) => ({ nome, categoria, duracaoMin, precoCentavos })) as ServicoSugerido[],
  },
  outro: {
    id: "outro", rotulo: "Outro", descricao: "Outro negócio com atendimento por horário", icone: BriefcaseBusiness,
    termos: termosMasculinos("espaço"), servicosSugeridos: [], categorias: ["Serviço"], horariosPadrao: horariosPadrao(),
    identidade: "moderno", modoPadrao: "escuro", temaPagina: "cortai", iconeIA: "pingo",
    exemploIA: "Cadastre o serviço por 50 reais em 45 minutos",
  },
};

export const LISTA_DE_SEGMENTOS = SEGMENTOS.map((id) => SEGMENTOS_CONFIG[id]);

export function segmentoValido(valor: unknown): Segmento {
  return SEGMENTOS.includes(valor as Segmento) ? (valor as Segmento) : "barbearia";
}

export function termos(segmento: unknown): TermosDoSegmento {
  return SEGMENTOS_CONFIG[segmentoValido(segmento)].termos;
}

export function definicaoDoSegmento(segmento: unknown): DefinicaoDeSegmento {
  return SEGMENTOS_CONFIG[segmentoValido(segmento)];
}
