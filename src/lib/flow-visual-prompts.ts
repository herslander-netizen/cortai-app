import { SEGMENTOS, type Segmento } from "@/lib/segmentos";
import type { TipoDeImagemFlow } from "@/lib/flow-visual-library";

export type EspecificacaoDeImagemFlow = {
  id: string;
  segmento: Segmento;
  tipo: TipoDeImagemFlow;
  indice: number;
  nomeArquivo: string;
  proporcao: "16:9" | "4:5" | "1:1";
  prompt: string;
  negativo: string;
  /** Nenhuma especificação é uma imagem real. */
  storagePath: null;
};

const CENAS: Record<Segmento, { local: string; detalhes: string }> = {
  barbearia: {
    local: "premium modern barbershop interior",
    detalhes: "barber station, leather chair, quality haircut tools, warm graphite tones",
  },
  salao: {
    local: "contemporary premium beauty salon",
    detalhes: "hair styling stations, natural daylight, nude rose neutral tones, elegant mirrors",
  },
  cabeleireiro: {
    local: "editorial hair studio",
    detalhes: "professional hair care station, soft cinematic lighting, sculptural mirrors",
  },
  esmalteria: {
    local: "refined nail design studio",
    detalhes: "manicure station, polished nails, clean tools, soft peach details",
  },
  sobrancelha_cilios: {
    local: "eyebrow and eyelash care studio",
    detalhes: "beautiful soft lighting, fine precision tools, natural skin texture, calming tones",
  },
  estetica: {
    local: "minimalist facial skincare and spa studio",
    detalhes: "treatment bed, folded towels, botanical textures, ivory and sage palette",
  },
  outro: {
    local: "premium contemporary service studio",
    detalhes: "versatile appointment space, clean desk, comfortable seating, warm minimal details",
  },
};

const CENAS_POR_SLOT: readonly {
  tipo: TipoDeImagemFlow; proporcao: EspecificacaoDeImagemFlow["proporcao"]; enquadramento: string;
}[] = [
  {tipo:"hero",proporcao:"16:9",enquadramento:"wide establishing shot, central negative space for an overlaid title"},
  {tipo:"hero",proporcao:"16:9",enquadramento:"wide atmospheric alternate angle, subject on the right, left negative space for CTA"},
  {tipo:"galeria",proporcao:"4:5",enquadramento:"editorial close-up of equipment and materials"},
  {tipo:"galeria",proporcao:"4:5",enquadramento:"interior detail with layered foreground and depth"},
  {tipo:"galeria",proporcao:"4:5",enquadramento:"natural interaction from behind, no identifiable faces"},
  {tipo:"galeria",proporcao:"4:5",enquadramento:"wide view of the carefully arranged service area"},
  {tipo:"galeria",proporcao:"4:5",enquadramento:"texture, light and craftsmanship detail"},
  {tipo:"galeria",proporcao:"4:5",enquadramento:"different interior perspective and negative space"},
  {tipo:"servico",proporcao:"1:1",enquadramento:"professional service details, hands and tools, no person identifiable"},
  {tipo:"servico",proporcao:"1:1",enquadramento:"materials and treatment product flat lay, no packaging label"},
  {tipo:"servico",proporcao:"1:1",enquadramento:"precision professional activity cropped tightly, no faces"},
  {tipo:"apoio",proporcao:"4:5",enquadramento:"soft side light on materials and atmosphere"},
  {tipo:"apoio",proporcao:"4:5",enquadramento:"simple architectural composition with refined finishing"},
  {tipo:"fundo",proporcao:"16:9",enquadramento:"subtle defocused background texture with lots of negative space"},
];

const NEGATIVO = "No brands, no logos, no captions, no letters, no typography, no watermarks, no identifiable people, no misleading before-and-after results, no medical claims.";

export function especificacoesDeImagemDoSegmento(segmento: Segmento): EspecificacaoDeImagemFlow[] {
  const cena = CENAS[segmento];
  return CENAS_POR_SLOT.map(({tipo, proporcao, enquadramento}, i) => ({
    id: "flow-" + segmento + "-" + String(i+1).padStart(2,"0"),
    segmento,
    tipo,
    indice: i+1,
    nomeArquivo: "flow-" + segmento + "-" + String(i+1).padStart(2,"0") + ".webp",
    proporcao,
    prompt: "Original professional editorial photography for a service business. " +
      cena.local + "; " + cena.detalhes + ". " + enquadramento +
      ". Photorealistic, tasteful composition, realistic lighting, natural detail, premium mobile-first website photography. " +
      "No text rendered inside the image. Distinct composition from all other slots.",
    negativo: NEGATIVO,
    storagePath: null,
  }));
}

export function todasEspecificacoesVisuais(): EspecificacaoDeImagemFlow[] {
  return SEGMENTOS.flatMap(especificacoesDeImagemDoSegmento);
}
