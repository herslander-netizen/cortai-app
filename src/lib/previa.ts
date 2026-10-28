import { urlPublica } from "@/lib/origem-publica";

/** Metatags da prévia do link de uma barbearia (WhatsApp, Instagram, buscadores). */
export type PreviaDaBarbearia =
  { nome: string; descricao: string | null; imagem: string | null } | null | undefined;

export function headDaBarbearia(
  slug: string,
  previa: PreviaDaBarbearia,
  caminho: string,
  acao = "Agendamento online",
) {
  const nome = previa?.nome ?? slug;
  const titulo = `${nome} | Cortaí`;
  const descricao =
    previa?.descricao?.slice(0, 160) ||
    `${acao} com ${nome}: escolha serviços, profissionais e horários em poucos toques.`;
  const url = urlPublica(caminho);
  const imagem = previa?.imagem?.startsWith("https://") ? previa.imagem : null;
  const altImagem = `Imagem de ${nome}`;
  return {
    meta: [
      { title: titulo },
      { name: "description", content: descricao },
      { property: "og:site_name", content: "Cortaí" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:title", content: titulo },
      { property: "og:description", content: descricao },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: imagem ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: titulo },
      { name: "twitter:description", content: descricao },
      ...(imagem
        ? [
            { property: "og:image", content: imagem },
            { property: "og:image:alt", content: altImagem },
            { name: "twitter:image", content: imagem },
            { name: "twitter:image:alt", content: altImagem },
          ]
        : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** Mensagem curta e neutra para divulgar o link público do negócio. */
export function textoDeCompartilhamento(nome: string) {
  const estabelecimento = nome.trim() || "este estabelecimento";
  return `Agende seu horário com ${estabelecimento} pelo Cortaí. Confira os serviços e horários disponíveis.`;
}

/** Telefone com máscara (00) 00000-0000 ou (00) 0000-0000. */
export function mascaraTelefone(valor: string) {
  let d = valor.replace(/\D/g, "");
  // Número salvo com DDI 55 (12–13 dígitos) volta para o formato nacional.
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function ics(texto: string) {
  return texto.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
}

function carimbo(iso: string) {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Arquivo .ics válido (UTC, UID, DTSTAMP, LOCATION, CRLF). */
export function gerarIcs(p: {
  id: string;
  inicio: string;
  fim: string;
  titulo: string;
  local: string | null;
  descricao?: string;
}) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cortai//Agendamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${p.id}@cortai.dev`,
    `DTSTAMP:${carimbo(new Date().toISOString())}`,
    `DTSTART:${carimbo(p.inicio)}`,
    `DTEND:${carimbo(p.fim)}`,
    `SUMMARY:${ics(p.titulo)}`,
    ...(p.local ? [`LOCATION:${ics(p.local)}`] : []),
    ...(p.descricao ? [`DESCRIPTION:${ics(p.descricao)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
