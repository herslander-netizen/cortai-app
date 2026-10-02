import { z } from "zod";
import type { CSSProperties } from "react";
import { CORES_AGENDAMENTO, contrasteDaMarca } from "@/lib/cor-marca";

export const temaIds = [
  "cortai",
  "cortai-creme",
  "rose",
  "rose-creme",
  "nude",
  "premium",
  "urbano",
  "classico",
  "clean",
  "dark",
  "industrial",
  "street",
  "editorial",
] as const;
export const layoutIds = [
  "cinematografico",
  "logo-central",
  "minimalista",
  "foto-destaque",
  "editorial",
] as const;
export const fonteIds = ["inter", "poppins", "montserrat", "oswald", "roboto", "serif"] as const;
export const componenteIds = [
  "apresentacao",
  "servicos",
  "profissionais",
  "galeria",
  "avaliacoes",
  "produtos",
  "instagram",
  "localizacao",
  "horarios",
  "whatsapp",
  "cta_final",
] as const;

export const chatConfigSchema = z.object({
  modo: z.enum(["tradicional", "conversa"]).default("tradicional"),
  nomeRecepcao: z.string().trim().max(40).default("Recepção"),
  avatarUrl: z.string().max(500).nullable().default(null),
  mensagemInicial: z
    .string()
    .trim()
    .max(240)
    .default("Olá! Vou ajudar você a encontrar o melhor horário."),
  textoFinal: z.string().trim().max(240).default("Tudo certo. Seu horário está reservado!"),
  corDestaque: z.enum(["azul", "ciano", "rosa"]).default("azul"),
  comemoracao: z.boolean().default(true),
  salvarCalendario: z.boolean().default(true),
  listaEspera: z.boolean().default(true),
});

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
export const paginaConfigSchema = z.object({
  tema: z.enum(temaIds),
  layout: z.enum(layoutIds),
  cores: z.object({
    principal: hex,
    secundaria: hex,
    botao: hex,
    fundo: hex,
    texto: hex,
    destaque: hex,
  }),
  fonteTitulo: z.enum(fonteIds),
  fonteTexto: z.enum(fonteIds),
  bordas: z.enum(["quadrado", "suave", "moderno", "arredondado"]),
  densidade: z.enum(["compacta", "equilibrada", "espacosa"]),
  botoes: z.enum(["solido", "contorno", "minimalista"]),
  frase: z.string().trim().max(120),
  sobre: z.string().trim().max(1200),
  cta: z.string().trim().min(2).max(24),
  componentes: z.record(z.enum(componenteIds), z.boolean()),
  chat: chatConfigSchema.default({}),
  /** Fila de chegada (clientes sem horário). Configurações antigas sem o campo = ligada. */
  filaDeChegada: z.boolean().default(true),
});

export type PaginaConfig = z.infer<typeof paginaConfigSchema>;
export type TemaId = (typeof temaIds)[number];
export type LayoutId = (typeof layoutIds)[number];
export type FonteId = (typeof fonteIds)[number];

export const TEMAS: Record<
  TemaId,
  { nome: string; descricao: string; cores: PaginaConfig["cores"] }
> = {
  cortai: {
    nome: "Cortaí",
    descricao: "Grafite com azul e rosa",
    cores: {
      principal: "#88ADE0",
      secundaria: "#1F2024",
      botao: "#88ADE0",
      fundo: "#17181B",
      texto: "#EEECE7",
      destaque: "#DC8BAA",
    },
  },
  "cortai-creme": {
    nome: "Cortaí Creme",
    descricao: "Creme com azul e rosa",
    cores: {
      principal: "#1653A1",
      secundaria: "#ECEAE4",
      botao: "#1653A1",
      fundo: "#F5F4F0",
      texto: "#1B1C1F",
      destaque: "#C41F61",
    },
  },
  rose: {
    nome: "Rosé",
    descricao: "Grafite com rosa e azul",
    cores: {
      principal: "#F05F96",
      secundaria: "#231E22",
      botao: "#F05F96",
      fundo: "#17181B",
      texto: "#EEECE7",
      destaque: "#88ADE0",
    },
  },
  "rose-creme": {
    nome: "Rosé Creme",
    descricao: "Creme rosado com rosa e azul",
    cores: {
      principal: "#C41F61",
      secundaria: "#F1E4E6",
      botao: "#C41F61",
      fundo: "#F8F2F0",
      texto: "#1B1C1F",
      destaque: "#1653A1",
    },
  },
  nude: {
    nome: "Nude",
    descricao: "Bege e terracota, delicado",
    cores: {
      principal: "#8C4F42",
      secundaria: "#EADBD0",
      botao: "#8C4F42",
      fundo: "#F6F0EA",
      texto: "#2B2220",
      destaque: "#7A5A4F",
    },
  },
  premium: {
    nome: "Premium",
    descricao: "Sofisticado e fotográfico",
    cores: {
      principal: "#C9A96A",
      secundaria: "#27231C",
      botao: "#C9A96A",
      fundo: "#111110",
      texto: "#F7F6F2",
      destaque: "#E7D1A4",
    },
  },
  urbano: {
    nome: "Urbano",
    descricao: "Forte e contemporâneo",
    cores: {
      principal: "#C9A96A",
      secundaria: "#262624",
      botao: "#C9A96A",
      fundo: "#121212",
      texto: "#F7F6F2",
      destaque: "#C9A96A",
    },
  },
  classico: {
    nome: "Clássico",
    descricao: "Tradição e elegância",
    cores: {
      principal: "#26483B",
      secundaria: "#71543C",
      botao: "#B38B57",
      fundo: "#F3EBDD",
      texto: "#1E3029",
      destaque: "#8A6747",
    },
  },
  clean: {
    nome: "Clean",
    descricao: "Claro, direto e objetivo",
    cores: {
      principal: "#181817",
      secundaria: "#E9E6DF",
      botao: "#181817",
      fundo: "#FCFBF8",
      texto: "#181817",
      destaque: "#72706B",
    },
  },
  dark: {
    nome: "Dark",
    descricao: "Alto contraste cinematográfico",
    cores: {
      principal: "#D9DDD8",
      secundaria: "#252827",
      botao: "#9BB5A2",
      fundo: "#0D0F0E",
      texto: "#F4F5F3",
      destaque: "#9BB5A2",
    },
  },
  industrial: {
    nome: "Industrial",
    descricao: "Grafite, metal e precisão",
    cores: {
      principal: "#C4C7C5",
      secundaria: "#303231",
      botao: "#B58B5A",
      fundo: "#171918",
      texto: "#F1F1EF",
      destaque: "#B58B5A",
    },
  },
  street: {
    nome: "Street",
    descricao: "Jovem, gráfico e vibrante",
    cores: {
      principal: "#F2F2EF",
      secundaria: "#222222",
      botao: "#E85D3F",
      fundo: "#0F0F0F",
      texto: "#FAFAF7",
      destaque: "#E85D3F",
    },
  },
  editorial: {
    nome: "Editorial",
    descricao: "Espaço e composição de revista",
    cores: {
      principal: "#25231F",
      secundaria: "#D7CDBC",
      botao: "#7B3127",
      fundo: "#F4F0E8",
      texto: "#25231F",
      destaque: "#7B3127",
    },
  },
};

export const LAYOUTS: Record<LayoutId, string> = {
  cinematografico: "Cinematográfico",
  "logo-central": "Logo Central",
  minimalista: "Minimalista",
  "foto-destaque": "Foto em Destaque",
  editorial: "Editorial",
};
export const FONTES: Record<FonteId, string> = {
  inter: "Inter",
  poppins: "Poppins",
  montserrat: "Montserrat",
  oswald: "Oswald",
  roboto: "Roboto",
  serif: "Serif elegante",
};

export function configPadrao(overrides?: Partial<PaginaConfig>): PaginaConfig {
  return paginaConfigSchema.parse({
    tema: "cortai",
    layout: "cinematografico",
    cores: TEMAS.cortai.cores,
    fonteTitulo: "montserrat",
    fonteTexto: "inter",
    bordas: "moderno",
    densidade: "equilibrada",
    botoes: "solido",
    frase: "Cuidado, estilo e horário reservado para você.",
    sobre: "",
    cta: "Agendar horário",
    componentes: Object.fromEntries(componenteIds.map((id) => [id, true])),
    chat: {},
    ...overrides,
  });
}

export function normalizarPagina(value: unknown, fallback?: Partial<PaginaConfig>) {
  const bruto = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const parsed = paginaConfigSchema.safeParse({ ...bruto, chat: bruto["chat"] ?? {} });
  return parsed.success ? parsed.data : configPadrao(fallback);
}

const fontes: Record<FonteId, string> = {
  inter: '"Inter", sans-serif',
  poppins: '"Poppins", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  oswald: '"Oswald", sans-serif',
  roboto: '"Roboto", sans-serif',
  serif: '"Libre Baskerville", Georgia, serif',
};

export function paginaStyle(config: PaginaConfig): CSSProperties {
  const raios = { quadrado: "0px", suave: "8px", moderno: "14px", arredondado: "24px" };
  const espacos = { compacta: "0.8", equilibrada: "1", espacosa: "1.22" };
  return {
    "--brand-primary": config.cores.principal,
    "--brand-secondary": config.cores.secundaria,
    "--brand-button": config.cores.botao,
    "--brand-background": config.cores.fundo,
    "--brand-text": config.cores.texto,
    "--brand-accent": config.cores.destaque,
    "--brand-radius": raios[config.bordas],
    "--brand-density": espacos[config.densidade],
    "--brand-heading": fontes[config.fonteTitulo],
    "--brand-body": fontes[config.fonteTexto],
  } as CSSProperties;
}

/** Tokens da identidade publicada usados pelo agendamento, sem duplicar a configuração da marca. */
export function agendamentoStyle(config: PaginaConfig): CSSProperties {
  const corPrincipal = CORES_AGENDAMENTO.destaques[config.chat.corDestaque] ?? config.cores.botao;
  return {
    "--chat-primary": corPrincipal,
    "--chat-primary-foreground": contrasteDaMarca(corPrincipal),
    "--chat-secondary": config.cores.secundaria,
    "--chat-accent": config.cores.destaque,
    "--chat-page": CORES_AGENDAMENTO.pagina,
    "--chat-page-text": CORES_AGENDAMENTO.texto,
    "--chat-heading": fontes[config.fonteTitulo],
    "--chat-body": fontes[config.fonteTexto],
  } as CSSProperties;
}

const familiasGoogle: Record<FonteId, string> = {
  inter: "Inter:wght@400;500;600;700;800",
  poppins: "Poppins:wght@400;500;600;700;800",
  montserrat: "Montserrat:wght@400;500;600;700;800",
  oswald: "Oswald:wght@400;500;600;700",
  roboto: "Roboto:wght@400;500;700;900",
  serif: "Libre+Baskerville:wght@400;700",
};

/** URL única do Google Fonts com as fontes escolhidas pela marca (antes nunca eram carregadas). */
export function urlDasFontes(config: Pick<PaginaConfig, "fonteTitulo" | "fonteTexto">) {
  const ids = [...new Set([config.fonteTitulo, config.fonteTexto])];
  return `https://fonts.googleapis.com/css2?${ids.map((id) => `family=${familiasGoogle[id]}`).join("&")}&display=swap`;
}

/** Lê a fila de chegada de um container salvo ({ pagina }); ausente = ligada. */
export function filaDeChegadaDoContainer(container: unknown): boolean {
  const pagina =
    container && typeof container === "object"
      ? (container as Record<string, unknown>)["pagina"]
      : undefined;
  if (!pagina || typeof pagina !== "object") return true;
  const valor = (pagina as Record<string, unknown>)["filaDeChegada"];
  return typeof valor === "boolean" ? valor : true;
}

/** O editor de página não controla a fila: preserva o valor já salvo. */
export function preservarFilaDeChegada<T extends { filaDeChegada?: boolean }>(
  pagina: T,
  containerSalvo: unknown,
): T {
  return { ...pagina, filaDeChegada: filaDeChegadaDoContainer(containerSalvo) };
}
