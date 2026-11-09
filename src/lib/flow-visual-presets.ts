import { aplicarTema, type PaginaConfig, type TemaId } from "@/lib/pagina-config";
import { type Segmento, SEGMENTOS } from "@/lib/segmentos";
import { visualRecomendado } from "@/lib/flow-visual-library";

export type PresetVisualFlow = {
  nome: string;
  tema: TemaId;
  estilo: "cinematografico" | "editorial" | "minimalista" | "delicado";
  composicaoGaleria: "grade" | "mosaico" | "editorial";
  movimento: "discreto" | "suave";
  fraseExemplo: string;
};

const presets: Record<Segmento, PresetVisualFlow> = {
  barbearia: {nome:"Barbearia Premium",tema:"premium",estilo:"cinematografico",composicaoGaleria:"mosaico",movimento:"discreto",fraseExemplo:"Seu estilo, no seu tempo."},
  salao: {nome:"Salão Elegance",tema:"feminino-rose",estilo:"delicado",composicaoGaleria:"grade",movimento:"suave",fraseExemplo:"Um momento só seu."},
  cabeleireiro: {nome:"Cabelo Editorial",tema:"editorial",estilo:"editorial",composicaoGaleria:"mosaico",movimento:"suave",fraseExemplo:"Seu cabelo, sua expressão."},
  esmalteria: {nome:"Nail Studio",tema:"nude",estilo:"minimalista",composicaoGaleria:"grade",movimento:"suave",fraseExemplo:"Beleza em cada detalhe."},
  sobrancelha_cilios: {nome:"Olhar Delicado",tema:"feminino-lavanda",estilo:"delicado",composicaoGaleria:"editorial",movimento:"discreto",fraseExemplo:"Cuidado em cada olhar."},
  estetica: {nome:"Estética Clean",tema:"clean",estilo:"minimalista",composicaoGaleria:"grade",movimento:"discreto",fraseExemplo:"Bem-estar em primeiro lugar."},
  outro: {nome:"Flow Essencial",tema:"cortai-creme",estilo:"editorial",composicaoGaleria:"grade",movimento:"discreto",fraseExemplo:"Um atendimento pensado para você."},
};

export const PRESETS_VISUAIS_FLOW: Readonly<Record<Segmento, PresetVisualFlow>> = presets;
export function presetDoSegmento(segmento: Segmento): PresetVisualFlow { return presets[segmento]; }

/** Não altera dados nem aplica tema: prévia pura, sempre sujeita a confirmação do usuário. */
export function preverPresetVisual(config: PaginaConfig, segmento: Segmento): PaginaConfig {
  return aplicarTema(config, presetDoSegmento(segmento).tema);
}

/** Nunca migrar uma página antiga nem substituir foto, tema ou rascunho manual. */
export function permitirPresetNovo(jaPersonalizado: boolean, temRascunho: boolean, publicado: boolean): boolean {
  return !jaPersonalizado && !temRascunho && !publicado;
}

/** Arquivo do negócio sempre prevalece; biblioteca só é sugestão para a capa ausente. */
export function capaPublicaRecomendada(segmento: Segmento, capaDoNegocio: string | null): string | null {
  return capaDoNegocio || visualRecomendado(segmento, "hero")?.src || null;
}

export function segmentosCobertosPorPreset(): Segmento[] { return SEGMENTOS.filter(s => Boolean(presets[s])); }
