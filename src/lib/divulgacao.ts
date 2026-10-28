/** Regras puras do estúdio de divulgação: formatos, legendas e hashtags por rede. */

export type Rede = "reels" | "stories" | "tiktok";
export type Modelo = "foto" | "servico" | "horarios" | "promocao";

export const REDES: Record<Rede, { nome: string; limite: string; pico: string }> = {
  reels: { nome: "Instagram Reels", limite: "até 90 s", pico: "11h–13h e 19h–21h" },
  stories: { nome: "Instagram Stories", limite: "até 15 s", pico: "8h–9h e 20h–22h" },
  tiktok: { nome: "TikTok", limite: "até 10 min", pico: "12h–14h e 19h–23h" },
};

const BASE: Record<string, string[]> = {
  barbearia: ["barbearia", "barber", "cortemasculino", "barba", "degrade"],
  salao: ["salaodebeleza", "cabelo", "hair", "beleza", "cabeloperfeito"],
  cabeleireiro: ["cabeleireiro", "cabelo", "coloracao", "tratamentocapilar"],
  esmalteria: ["esmalteria", "unhas", "manicure", "nailart", "unhasdecoradas"],
  sobrancelha_cilios: ["sobrancelhas", "cilios", "lashdesigner", "designdeolhar"],
  estetica: ["estetica", "bemestar", "autocuidado", "cuidadosfaciais"],
  outro: ["servicos", "atendimento", "agendamento"],
};

function limpa(t: string) {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export function hashtags(rede: Rede, segmento: string | null, cidade?: string): string[] {
  const base = BASE[segmento ?? ""] ?? ["servicos", "atendimento", "agendamento"];
  const local = cidade ? [limpa(cidade), `${base[0]}${limpa(cidade)}`] : [];
  const extra = rede === "tiktok" ? ["fyp", "transformacao"] : rede === "reels" ? ["reels", "antesedepois"] : [];
  const quantos = rede === "stories" ? 3 : rede === "tiktok" ? 5 : 8;
  return [...new Set([...base, ...local, ...extra])].slice(0, quantos).map((h) => `#${h}`);
}

export function linkRastreado(origem: string, slug: string, rede: Rede) {
  return `${origem}/b/${slug}?origem=social_${rede}`;
}

export function legenda(o: {
  rede: Rede;
  texto: string;
  link: string;
  segmento: string | null;
  cidade?: string;
}): string {
  const cta =
    o.rede === "stories"
      ? `Agende pelo link: ${o.link}`
      : o.rede === "tiktok"
        ? `Link na bio para agendar 📅`
        : `📅 Agende agora: ${o.link}`;
  return [o.texto.trim(), cta, hashtags(o.rede, o.segmento, o.cidade).join(" ")]
    .filter(Boolean)
    .join("\n\n");
}

export function textoPadrao(modelo: Modelo, nome: string, servico?: string, preco?: string) {
  if (modelo === "servico" && servico) return `${servico}${preco ? ` por ${preco}` : ""} aqui em ${nome}.`;
  if (modelo === "horarios") return `Ainda temos horários hoje em ${nome}. Garanta o seu!`;
  if (modelo === "promocao") return `Promoção do dia em ${nome}. Só hoje!`;
  return `Mais um atendimento feito com carinho em ${nome}.`;
}
