import { z } from "zod";
import type { CSSProperties } from "react";
import { CORES_AGENDAMENTO, contrasteDaMarca, tokensDoAgendamento } from "@/lib/cor-marca";

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
  "figaro-classico",
  "figaro-retro",
  "figaro-rock-n-roll",
  "feminino-rose",
  "feminino-lavanda",
  "feminino-pessego",
  "contraste",
] as const;
export const layoutIds = [
  "cinematografico",
  "logo-central",
  "minimalista",
  "foto-destaque",
  "editorial",
  "figaro-site-completo",
  "figaro-agendamento",
  "figaro-raizes",
  "cortai-chat",
] as const;
export const fonteIds = [
  "inter",
  "poppins",
  "montserrat",
  "oswald",
  "roboto",
  "serif",
  "playfair",
  "outfit",
  "lobster",
  "jakarta",
  "oldstandard",
  "cormorant",
  "dancing",
] as const;
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
  "pacotes",
  "linha_do_tempo",
] as const;

/** Nome de cada seção, como aparece no editor e nas mensagens de publicação. */
export const NOMES_DAS_SECOES: Record<(typeof componenteIds)[number], string> = {
  apresentacao: "Hero Banner",
  servicos: "Serviços",
  profissionais: "Equipe",
  galeria: "Galeria",
  avaliacoes: "Avaliações",
  produtos: "Produtos",
  instagram: "Redes Sociais",
  localizacao: "Localização",
  horarios: "Horários",
  whatsapp: "Contato",
  cta_final: "Chamada final",
  pacotes: "Pacotes e Combos",
  linha_do_tempo: "Linha do Tempo",
};

export const CHAT_ESTILOS = [
  "vidro",
  "classico",
  "suave",
  "minimo",
  "elegante",
  "rustico",
] as const;
export const chatConfigSchema = z.object({
  modo: z.enum(["tradicional", "conversa"]).default("tradicional"),
  nomeRecepcao: z.string().trim().max(40).default("Lisa"),
  avatarUrl: z.string().max(500).nullable().default(null),
  mensagemInicial: z
    .string()
    .trim()
    .max(240)
    .default("Olá! Vou ajudar você a encontrar o melhor horário."),
  textoFinal: z.string().trim().max(240).default("Tudo certo. Seu horário está reservado!"),
  corDestaque: z.enum(["azul", "ciano", "rosa", "areia", "couro"]).default("azul"),
  comemoracao: z.boolean().default(true),
  salvarCalendario: z.boolean().default(true),
  listaEspera: z.boolean().default(true),
  /** Estilo visual do chat (todos com padrão igual ao visual anterior). */
  estilo: z.enum(CHAT_ESTILOS).default("vidro"),
  fundo: z.enum(["capa", "liso", "padrao"]).default("capa"),
  superficie: z.enum(["padrao", "tema", "clara", "escura", "grafite", "rustico"]).default("padrao"),
  cabecalho: z.enum(["barra", "cartao"]).default("barra"),
  avatar: z.enum(["redondo", "quadrado"]).default("redondo"),
  texto: z.enum(["pequeno", "normal", "grande"]).default("normal"),
  chips: z.enum(["pilula", "cartao"]).default("pilula"),
});

/**
 * Ajustes de cada seção da página (editores do Figaro, spec 4 §5). Todos têm padrão que preserva o
 * comportamento anterior, então páginas já salvas continuam iguais.
 */
export const LIMITES_DA_SECAO = {
  tituloDaGaleria: { min: 5, max: 25 },
  subtituloDaGaleria: { min: 5, max: 100 },
  bio: 2000,
} as const;

export const FRASES_DA_LINHA_DO_TEMPO = {
  ontem: "De onde eu vim.",
  hoje: "Uma cadeira. Uma história.",
  amanha: "O próximo capítulo é seu.",
} as const;
export const MAXIMO_DA_FRASE_DO_CAPITULO = 60;

export const secoesConfigSchema = z.object({
  /** Frases dos três capítulos do layout Raízes (Ontem, Hoje, Amanhã). */
  linhaDoTempo: z
    .object({
      ontem: z
        .string()
        .trim()
        .max(MAXIMO_DA_FRASE_DO_CAPITULO)
        .default(FRASES_DA_LINHA_DO_TEMPO.ontem),
      hoje: z
        .string()
        .trim()
        .max(MAXIMO_DA_FRASE_DO_CAPITULO)
        .default(FRASES_DA_LINHA_DO_TEMPO.hoje),
      amanha: z
        .string()
        .trim()
        .max(MAXIMO_DA_FRASE_DO_CAPITULO)
        .default(FRASES_DA_LINHA_DO_TEMPO.amanha),
    })
    .default({}),
  servicos: z.object({ populares: z.boolean().default(true) }).default({}),
  profissionais: z
    .object({
      mostrarFoto: z.boolean().default(true),
      /** Mostra a bio de cada profissional. Ligado por padrão: a página já mostrava a descrição. */
      mostrarDetalhes: z.boolean().default(true),
    })
    .default({}),
  galeria: z
    .object({
      titulo: z.string().trim().max(LIMITES_DA_SECAO.tituloDaGaleria.max).default(""),
      subtitulo: z.string().trim().max(LIMITES_DA_SECAO.subtituloDaGaleria.max).default(""),
    })
    .default({}),
  avaliacoes: z
    .object({
      ordem: z.enum(["data", "nota"]).default("data"),
      mostrarResumo: z.boolean().default(true),
    })
    .default({}),
  localizacao: z
    .object({
      mostrarDetalhes: z.boolean().default(false),
      bio: z.string().trim().max(LIMITES_DA_SECAO.bio).default(""),
    })
    .default({}),
});
export type SecoesConfig = z.infer<typeof secoesConfigSchema>;

/**
 * Seções que o layout exige (`isRequired` do Figaro): ocultá-las bloqueia a publicação. Os layouts do
 * Figaro exigem os serviços; os do Flow seguem livres. O fluxo de agendamento é sempre obrigatório e
 * não tem editor (`booking-flow`), por isso não entra aqui.
 */
export const SECOES_OBRIGATORIAS: Record<LayoutId, readonly (typeof componenteIds)[number][]> = {
  cinematografico: [],
  "logo-central": [],
  minimalista: [],
  "foto-destaque": [],
  editorial: [],
  "figaro-site-completo": ["servicos"],
  "figaro-agendamento": ["servicos"],
  "figaro-raizes": ["servicos"],
  "cortai-chat": [],
};

/** Seções obrigatórias do layout que estão desligadas na configuração. */
export function secoesObrigatoriasAusentes(
  config: Pick<PaginaConfig, "layout" | "componentes">,
): (typeof componenteIds)[number][] {
  return SECOES_OBRIGATORIAS[config.layout].filter((id) => !config.componentes[id]);
}

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
  /** Versão do formato. Ausente = 1; salvar grava 2. */
  versao: z.number().int().min(1).max(99).default(1),
  /** Experiência do link. Ausente = "vitrine" (comportamento anterior). */
  experiencia: z.enum(["direta", "vitrine", "conversa"]).default("vitrine"),
  /** Botão "Agendar" fixo no celular. Ausente = ligado. */
  botaoFixo: z.boolean().default(true),
  /** Ajustes de cada seção (serviços, equipe, galeria, avaliações, localização). */
  secoes: secoesConfigSchema.default({}),
  /** Redes extras (Instagram, Facebook e WhatsApp ficam nos campos do negócio). */
  redes: z
    .object({
      tiktok: z.string().trim().max(200).default(""),
      youtube: z.string().trim().max(300).default(""),
      site: z.string().trim().max(300).default(""),
    })
    .default({}),
});

export type ExperienciaDoLink = "direta" | "vitrine" | "conversa";
export const VERSAO_DA_PAGINA = 2;

export type PaginaConfig = z.infer<typeof paginaConfigSchema>;
export type TemaId = (typeof temaIds)[number];
export type LayoutId = (typeof layoutIds)[number];
export type FonteId = (typeof fonteIds)[number];

export const TEMAS: Record<
  TemaId,
  { nome: string; descricao: string; cores: PaginaConfig["cores"] }
> = {
  cortai: {
    nome: "Flow",
    descricao: "Marinho profundo com coral e azul de ação",
    cores: {
      principal: "#FF7B86",
      secundaria: "#0F2742",
      botao: "#FF7B86",
      fundo: "#07152D",
      texto: "#F2F6FC",
      destaque: "#FF7B86",
    },
  },
  "cortai-creme": {
    nome: "Flow Creme",
    descricao: "Marfim azulado com marinho e coral",
    cores: {
      principal: "#173A6C",
      secundaria: "#F1F5FB",
      botao: "#173A6C",
      fundo: "#EAF0F8",
      texto: "#142A49",
      destaque: "#B52D42",
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
  "figaro-classico": {
    nome: "Clássico",
    descricao: "Visual moderno e minimalista, com tipografia serifada e muito respiro.",
    cores: {
      principal: "#2B2B2A",
      secundaria: "#DFDCD9",
      botao: "#DFDCD9",
      fundo: "#ECEAE8",
      texto: "#1F1E1D",
      destaque: "#8A8683",
    },
  },
  "figaro-retro": {
    nome: "Retrô",
    descricao: "Cores vibrantes e clima nostálgico, com letras que lembram as antigas barbearias.",
    cores: {
      principal: "#2A1F3D",
      secundaria: "#F2D95C",
      botao: "#4553D9",
      fundo: "#F4E38A",
      texto: "#2A1F3D",
      destaque: "#4553D9",
    },
  },
  "figaro-rock-n-roll": {
    nome: "Rock n' Roll",
    descricao: "Visual intenso e cheio de atitude, para quem valoriza o impacto.",
    cores: {
      principal: "#1F1C1D",
      secundaria: "#E1DEDD",
      botao: "#262424",
      fundo: "#E8E5E4",
      texto: "#1F1C1D",
      destaque: "#E8582A",
    },
  },
  "feminino-rose": {
    nome: "Rosé",
    descricao: "Rosa suave com detalhes em ouro rosado, elegante e acolhedor.",
    cores: {
      principal: "#8C3B52",
      secundaria: "#F6D9DE",
      botao: "#B76E79",
      fundo: "#FCEFF1",
      texto: "#4A2130",
      destaque: "#B76E79",
    },
  },
  "feminino-lavanda": {
    nome: "Lavanda",
    descricao: "Lilás delicado e sofisticado, com ar de spa e bem-estar.",
    cores: {
      principal: "#5B3F8F",
      secundaria: "#E6DDF5",
      botao: "#7B5CC4",
      fundo: "#F5F0FB",
      texto: "#33254F",
      destaque: "#9B7FD9",
    },
  },
  contraste: {
    nome: "Contraste",
    descricao:
      "Monocromático e afiado, com uma laranja de sinal que só aparece na hora de agendar.",
    cores: {
      principal: "#FF5A1F",
      secundaria: "#EDEDED",
      botao: "#FF5A1F",
      fundo: "#0B0B0B",
      texto: "#F2F2F0",
      destaque: "#FF5A1F",
    },
  },
  "feminino-pessego": {
    nome: "Pêssego",
    descricao: "Tons de pêssego e coral, leve, solar e cheio de charme.",
    cores: {
      principal: "#B5523B",
      secundaria: "#FFDCCB",
      botao: "#E0745A",
      fundo: "#FFF3EA",
      texto: "#4D2A1F",
      destaque: "#E0745A",
    },
  },
};

export const LAYOUTS: Record<LayoutId, string> = {
  cinematografico: "Cinematográfico",
  "logo-central": "Logo Central",
  minimalista: "Minimalista",
  "foto-destaque": "Foto em Destaque",
  editorial: "Editorial",
  "figaro-site-completo": "Site Completo",
  "figaro-agendamento": "Agendamento",
  "figaro-raizes": "Raízes",
  "cortai-chat": "Chat",
};
export const FONTES: Record<FonteId, string> = {
  inter: "Inter",
  poppins: "Poppins",
  montserrat: "Montserrat",
  oswald: "Oswald",
  roboto: "Roboto",
  serif: "Serif elegante",
  playfair: "Playfair Display",
  outfit: "Outfit",
  lobster: "Lobster",
  jakarta: "Plus Jakarta Sans",
  oldstandard: "Old Standard TT",
  cormorant: "Cormorant Garamond",
  dancing: "Dancing Script",
};

/**
 * Catálogo base recuperado do Figaro (`GET pages/layouts`, spec 4 §4.3): dois layouts e os três temas
 * originais. A tela Layout & Tema amplia essa base com estilos já definidos no Flow. Os IDs antigos
 * continuam válidos nas páginas salvas; o catálogo visual não muda o formato persistido.
 */
export const LAYOUTS_DO_FIGARO = [
  "figaro-site-completo",
  "figaro-agendamento",
  "figaro-raizes",
] as const satisfies readonly LayoutId[];
export const TEMAS_DO_FIGARO = [
  "figaro-classico",
  "figaro-rock-n-roll",
  "figaro-retro",
] as const satisfies readonly TemaId[];

/** Temas de estilo e paleta femininos, do Flow, que usam os mesmos modelos. */
export const TEMAS_FEMININOS = [
  "feminino-rose",
  "feminino-lavanda",
  "feminino-pessego",
] as const satisfies readonly TemaId[];

/** Temas adicionais já definidos no Flow, selecionados para ampliar a biblioteca inicial. */
export const TEMAS_ADICIONAIS_DO_CATALOGO = [
  "cortai",
  "cortai-creme",
  "nude",
  "premium",
  "clean",
  "editorial",
] as const satisfies readonly TemaId[];

/** Tudo o que a tela Layout & Tema oferece: temas Figaro, paletas suaves e estilos adicionais do Flow. */
export const TEMAS_DO_CATALOGO = [
  ...TEMAS_DO_FIGARO,
  ...TEMAS_FEMININOS,
  ...TEMAS_ADICIONAIS_DO_CATALOGO,
] as const;

/** Capas geradas com capturas reais disponíveis em public/temas. */
export const TEMAS_COM_CAPA = [...TEMAS_DO_FIGARO, ...TEMAS_FEMININOS] as const;

/** Layouts da tela Layout & Tema: os dois do Figaro e o Chat, atendimento em conversa do Flow. */
export const LAYOUTS_DO_CATALOGO = [
  ...LAYOUTS_DO_FIGARO,
  "cortai-chat",
] as const satisfies readonly LayoutId[];

/** Temas do layout Raízes: o Contraste, que é só dele, e cinco do catálogo que combinam com a narrativa. */
export const TEMAS_DO_RAIZES = [
  "contraste",
  "premium",
  "editorial",
  "clean",
  "cortai-creme",
  "nude",
] as const satisfies readonly TemaId[];

/** Os outros layouts oferecem os mesmos 12 temas; o Raízes tem a própria lista. */
export function temasDoLayout(layout: LayoutId): readonly TemaId[] {
  return layout === "figaro-raizes" ? TEMAS_DO_RAIZES : TEMAS_DO_CATALOGO;
}

/**
 * Leva a página aberta para dentro do catálogo da tela Layout & Tema, como no fluxo do Figaro.
 * Layouts fora do catálogo passam ao primeiro layout; temas já incluídos são preservados. Qualquer ajuste
 * acontece apenas no estado da tela e só é persistido quando o usuário salva.
 */
export function ajustarAoCatalogo(config: PaginaConfig): PaginaConfig {
  const comLayout = (LAYOUTS_DO_CATALOGO as readonly string[]).includes(config.layout)
    ? config
    : aplicarLayout(config, LAYOUTS_DO_CATALOGO[0]);
  return temasDoLayout(comLayout.layout).includes(comLayout.tema)
    ? comLayout
    : aplicarTema(comLayout, temasDoLayout(comLayout.layout)[0]!);
}

/** `onLayoutSelected` do Figaro: mantém o tema se o novo layout o oferece; senão vai para o primeiro. */
export function trocarLayoutNoCatalogo(config: PaginaConfig, layout: LayoutId): PaginaConfig {
  const comLayout = aplicarLayout(config, layout);
  const temas = temasDoLayout(layout);
  return temas.includes(comLayout.tema) ? comLayout : aplicarTema(comLayout, temas[0]!);
}

/**
 * Troca o layout. O Chat é uma experiência de conversa: ao escolhê-lo o link abre o atendimento em chat; ao
 * sair dele de volta para um site, o link volta à vitrine.
 */
export function aplicarLayout(config: PaginaConfig, layout: LayoutId): PaginaConfig {
  const base = { ...config, layout };
  if (layout === "cortai-chat") {
    return { ...base, experiencia: "conversa", chat: { ...config.chat, modo: "conversa" } };
  }
  // Agendamento é a maneira direta: o link abre já na escolha de serviço, profissional e horário.
  if (layout === "figaro-agendamento") {
    return { ...base, experiencia: "direta", chat: { ...config.chat, modo: "tradicional" } };
  }
  if (config.layout === "cortai-chat" && config.experiencia === "conversa") {
    return { ...base, experiencia: "vitrine", chat: { ...config.chat, modo: "tradicional" } };
  }
  if (config.layout === "figaro-agendamento" && config.experiencia === "direta") {
    return { ...base, experiencia: "vitrine" };
  }
  return base;
}

export const DESCRICAO_DO_LAYOUT: Partial<Record<LayoutId, string>> = {
  "figaro-site-completo": "Layout completo com todas as seções organizadas em rolagem única.",
  "figaro-agendamento":
    "Maneira direta: o cliente abre já na escolha do serviço, do profissional e do horário.",
  "figaro-raizes":
    "Layout que conta a história do negócio: de onde você veio, o trabalho de hoje e o próximo capítulo do cliente.",
  "cortai-chat": "Atendimento em conversa: uma recepção guia o cliente, por botões, até o horário.",
};

/**
 * Seções que cada layout do Figaro oferece (as demais não existem nele). `null` = todas (layouts antigos).
 * Site Completo: Hero, Serviços, Equipe, Galeria, Avaliações, Localização, Contato, Redes e o fluxo de
 * agendamento (9 seções). Agendamento: só Serviços e o fluxo.
 */
export const SECOES_DO_LAYOUT: Record<LayoutId, readonly (typeof componenteIds)[number][] | null> =
  {
    cinematografico: null,
    "logo-central": null,
    minimalista: null,
    "foto-destaque": null,
    editorial: null,
    "figaro-site-completo": [
      "apresentacao",
      "servicos",
      "profissionais",
      "galeria",
      "avaliacoes",
      "localizacao",
      "whatsapp",
      "instagram",
    ],
    "figaro-agendamento": ["servicos"],
    "figaro-raizes": [
      "apresentacao",
      "linha_do_tempo",
      "profissionais",
      "galeria",
      "servicos",
      "avaliacoes",
      "pacotes",
      "localizacao",
      "instagram",
    ],
    "cortai-chat": [],
  };

/** Seções que o layout oferece (todas, nos layouts antigos). */
export function secoesDoLayoutAtual(layout: LayoutId): readonly (typeof componenteIds)[number][] {
  return SECOES_DO_LAYOUT[layout] ?? componenteIds;
}

/** Quantas seções estão ativas, como o Figaro conta: as do layout ligadas mais o fluxo de agendamento. */
export function totalDeSecoesAtivas(config: Pick<PaginaConfig, "layout" | "componentes">): number {
  return secoesDoLayoutAtual(config.layout).filter((id) => config.componentes[id]).length + 1;
}

/**
 * Estrutura da página de cada tema. `classica` é a do Figaro (abertura em tela cheia, acordeão). Os temas
 * femininos mudam a composição: `arco` (foto em arco e serviços em cartões), `cartao` (foto em cartão com
 * painel de vidro, atalhos fixos e carrossel) e `vibrante` (título grande à esquerda, onda e mosaico).
 */
export type EstruturaDaPagina = "classica" | "arco" | "cartao" | "vibrante";
export const ESTRUTURA_DO_TEMA: Partial<Record<TemaId, EstruturaDaPagina>> = {
  "feminino-rose": "arco",
  "feminino-lavanda": "cartao",
  "feminino-pessego": "vibrante",
};
export const estruturaDoTema = (tema: TemaId): EstruturaDaPagina =>
  ESTRUTURA_DO_TEMA[tema] ?? "classica";

/** Fontes de cada tema do Figaro (título e texto), como nas páginas de exemplo. */
export const FONTES_DO_TEMA: Partial<Record<TemaId, { titulo: FonteId; texto: FonteId }>> = {
  "figaro-classico": { titulo: "playfair", texto: "outfit" },
  "figaro-rock-n-roll": { titulo: "oswald", texto: "inter" },
  "figaro-retro": { titulo: "lobster", texto: "montserrat" },
  "feminino-rose": { titulo: "cormorant", texto: "outfit" },
  "feminino-lavanda": { titulo: "playfair", texto: "poppins" },
  "feminino-pessego": { titulo: "dancing", texto: "montserrat" },
  contraste: { titulo: "oswald", texto: "inter" },
};

/** Troca o tema levando paleta e fontes juntas. */
export function aplicarTema(config: PaginaConfig, tema: TemaId): PaginaConfig {
  const fontes = FONTES_DO_TEMA[tema];
  return {
    ...config,
    tema,
    cores: TEMAS[tema].cores,
    ...(fontes ? { fonteTitulo: fontes.titulo, fonteTexto: fontes.texto } : {}),
  };
}

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

function objeto(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Campo a campo: só o campo inválido volta ao padrão; campos desconhecidos são preservados. */
function porCampo(
  shape: Record<string, z.ZodTypeAny>,
  bruto: Record<string, unknown>,
  base: Record<string, unknown>,
) {
  const saida: Record<string, unknown> = { ...bruto };
  for (const [chave, campo] of Object.entries(shape)) {
    const r = campo.safeParse(bruto[chave]);
    saida[chave] = r.success ? r.data : base[chave];
  }
  return saida;
}

export function normalizarPagina(value: unknown, fallback?: Partial<PaginaConfig>): PaginaConfig {
  const bruto = objeto(value);
  const base = configPadrao(fallback) as unknown as Record<string, unknown>;
  const shape = paginaConfigSchema.shape as unknown as Record<string, z.ZodTypeAny>;
  const saida = porCampo(shape, bruto, base);
  saida["cores"] = porCampo(
    paginaConfigSchema.shape.cores.shape as unknown as Record<string, z.ZodTypeAny>,
    objeto(bruto["cores"]),
    objeto(base["cores"]),
  );
  saida["chat"] = porCampo(
    chatConfigSchema.shape as unknown as Record<string, z.ZodTypeAny>,
    objeto(bruto["chat"]),
    objeto(base["chat"]),
  );
  const comps = objeto(bruto["componentes"]);
  const compsBase = objeto(base["componentes"]);
  saida["componentes"] = Object.fromEntries(
    componenteIds.map((id) => [id, typeof comps[id] === "boolean" ? comps[id] : compsBase[id]]),
  );
  // Páginas salvas com o layout Agendamento antes dele ser a maneira direta passam a abrir direto.
  if (saida["layout"] === "figaro-agendamento" && saida["experiencia"] === "vitrine") {
    saida["experiencia"] = "direta";
  }
  return saida as PaginaConfig;
}

const fontes: Record<FonteId, string> = {
  inter: '"Inter", sans-serif',
  poppins: '"Poppins", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  oswald: '"Oswald", sans-serif',
  roboto: '"Roboto", sans-serif',
  serif: '"Libre Baskerville", Georgia, serif',
  playfair: '"Playfair Display", Georgia, serif',
  outfit: '"Outfit", sans-serif',
  lobster: '"Lobster", cursive',
  jakarta: '"Plus Jakarta Sans", sans-serif',
  oldstandard: '"Old Standard TT", Georgia, serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
  dancing: '"Dancing Script", cursive',
};

export function paginaStyle(config: PaginaConfig): CSSProperties {
  const raios = { quadrado: "0px", suave: "8px", moderno: "14px", arredondado: "24px" };
  const espacos = { compacta: "0.8", equilibrada: "1", espacosa: "1.22" };
  return {
    "--brand-primary": config.cores.principal,
    "--brand-secondary": config.cores.secundaria,
    "--brand-button": config.cores.botao,
    "--brand-button-foreground": contrasteDaMarca(config.cores.botao),
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
  const tokens = tokensDoAgendamento(config.cores.secundaria);
  // Superfície do chat (Personalizar Chat): padrão do Flow, cores do tema, clara ou escura.
  const superficies = {
    padrao: null,
    tema: { pagina: config.cores.fundo, texto: config.cores.texto },
    clara: { pagina: "#FFFFFF", texto: "#1B1B1F" },
    escura: { pagina: "#0F1218", texto: "#F1F3F8" },
    // Barbearia rústica: grafite quente e areia, tons neutros e suaves.
    grafite: { pagina: "#2A2B2C", texto: "#ECE6DB" },
    rustico: { pagina: "#EFE8DC", texto: "#3B3027" },
  } as const;
  const sup = superficies[config.chat.superficie];
  const pagina = sup?.pagina ?? CORES_AGENDAMENTO.pagina;
  const texto = sup?.texto ?? CORES_AGENDAMENTO.texto;
  return {
    "--chat-superficie-1": sup
      ? `color-mix(in oklab, ${pagina} 94%, ${texto})`
      : tokens.superficie1,
    "--chat-superficie-2": sup
      ? `color-mix(in oklab, ${pagina} 88%, ${texto})`
      : tokens.superficie2,
    "--chat-texto-auxiliar": sup
      ? `color-mix(in oklab, ${texto} 66%, ${pagina})`
      : tokens.textoAuxiliar,
    "--chat-primary": corPrincipal,
    "--chat-primary-foreground": contrasteDaMarca(corPrincipal),
    "--chat-secondary": config.cores.secundaria,
    "--chat-accent": config.cores.destaque,
    "--chat-page": pagina,
    "--chat-page-text": texto,
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
  playfair: "Playfair+Display:wght@400;500;600;700",
  outfit: "Outfit:wght@300;400;500;600",
  lobster: "Lobster",
  jakarta: "Plus+Jakarta+Sans:wght@400;500;600;700;800",
  oldstandard: "Old+Standard+TT:wght@400;700",
  cormorant: "Cormorant+Garamond:wght@400;500;600;700",
  dancing: "Dancing+Script:wght@500;700",
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
