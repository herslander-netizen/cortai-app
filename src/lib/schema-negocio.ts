/** JSON-LD schema.org da página pública do negócio. */
import { urlPublica } from "@/lib/origem-publica";

export type DadosSchemaNegocio = {
  slug: string;
  nome: string;
  descricao: string | null;
  segmento: string | null;
  endereco: string | null;
  telefone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  imagem: string | null;
  logo: string | null;
  horarios: { dia_semana: number; fechado: boolean; abre: string; fecha: string }[];
  precos: number[];
};

const TIPOS: Record<string, string> = {
  barbearia: "HairSalon",
  cabeleireiro: "HairSalon",
  salao: "BeautySalon",
  sobrancelha_cilios: "BeautySalon",
  esmalteria: "NailSalon",
  estetica: "DaySpa",
};

export function tipoSchemaDoSegmento(segmento: string | null | undefined) {
  return (segmento && TIPOS[segmento]) || "HealthAndBeautyBusiness";
}

const DIAS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function telefoneE164(valor: string | null) {
  let d = (valor ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (!d.startsWith("55") || d.length < 12) d = `55${d}`;
  return d.length >= 12 ? `+${d}` : null;
}

function reais(centavos: number) {
  const v = centavos / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",");
}

export function faixaDePreco(precos: number[]) {
  const validos = precos.filter((p) => Number.isFinite(p) && p > 0);
  if (!validos.length) return null;
  const min = Math.min(...validos);
  const max = Math.max(...validos);
  return min === max ? `R$ ${reais(min)}` : `R$ ${reais(min)}–${reais(max)}`;
}

export function montarSchemaNegocio(d: DadosSchemaNegocio) {
  const url = urlPublica(`/b/${d.slug}`);
  const instagram = d.instagram?.replace(/^@/, "").trim();
  const horas = d.horarios
    .filter((h) => !h.fechado && DIAS[h.dia_semana])
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DIAS[h.dia_semana]}`,
      opens: h.abre.slice(0, 5),
      closes: h.fecha.slice(0, 5),
    }));
  const campos: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": tipoSchemaDoSegmento(d.segmento),
    name: d.nome,
    description: d.descricao || undefined,
    url,
    image: d.imagem || undefined,
    logo: d.logo || undefined,
    telephone: telefoneE164(d.whatsapp) ?? telefoneE164(d.telefone) ?? undefined,
    address: d.endereco
      ? { "@type": "PostalAddress", streetAddress: d.endereco, addressCountry: "BR" }
      : undefined,
    openingHoursSpecification: horas.length ? horas : undefined,
    sameAs: instagram ? [`https://instagram.com/${instagram}`] : undefined,
    priceRange: faixaDePreco(d.precos) ?? undefined,
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: urlPublica(`/agendar/${d.slug}`),
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
    },
  };
  return Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined));
}
