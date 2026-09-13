import { z } from "zod";

/**
 * Modelo de conteúdo da Home pública do CortAI.
 *
 * O conteúdo atual da Home vive aqui como valor padrão. O editor do admin
 * grava um objeto com a mesma forma; se nada estiver publicado, a Home usa
 * exatamente este padrão — ou seja, nunca fica em branco.
 */

export const TIPOS_DE_SECAO = [
  { valor: "beneficios", rotulo: "Benefícios" },
  { valor: "produto", rotulo: "Produto / celular" },
  { valor: "recursos", rotulo: "Módulos do CortAI" },
  { valor: "voltai", rotulo: "Voltaí / fidelidade" },
  { valor: "telas", rotulo: "Agenda, Clientes, Financeiro" },
  { valor: "rotina", rotulo: "Rotina da barbearia" },
  { valor: "texto_imagem", rotulo: "Texto + imagem" },
  { valor: "loja", rotulo: "Loja" },
  { valor: "cta", rotulo: "Chamada final" },
  { valor: "parceiros", rotulo: "Parceiros" },
  { valor: "rodape", rotulo: "Rodapé" },
] as const;

export type TipoSecao = (typeof TIPOS_DE_SECAO)[number]["valor"];

/** Seções que não podem ser excluídas (estruturais da Home). */
export const SECOES_FIXAS: TipoSecao[] = ["rodape"];

const destino = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || v.startsWith("/") || v.startsWith("#"), "Use um endereço interno, começando com / ou #");

const item = z.object({
  titulo: z.string().trim().max(120).default(""),
  texto: z.string().trim().max(400).default(""),
  icone: z.string().trim().max(40).optional(),
});

export const esquemaSecao = z.object({
  id: z.string().min(1).max(60),
  tipo: z.enum(TIPOS_DE_SECAO.map((t) => t.valor) as [TipoSecao, ...TipoSecao[]]),
  nome: z.string().trim().min(1).max(80),
  ativo: z.boolean(),
  tema: z.enum(["escuro", "claro"]).optional(),
  etiqueta: z.string().trim().max(120).optional(),
  titulo: z.string().trim().max(200).optional(),
  texto: z.string().trim().max(1200).optional(),
  imagem: z.string().trim().max(500).optional(),
  imagemPosicao: z.string().trim().max(40).optional(),
  ctaTexto: z.string().trim().max(60).optional(),
  ctaDestino: destino.optional(),
  cta2Texto: z.string().trim().max(60).optional(),
  cta2Destino: destino.optional(),
  itens: z.array(item).max(12).optional(),
});

export const esquemaHero = z.object({
  ativo: z.boolean(),
  etiqueta: z.string().trim().max(120),
  mostrarSelo: z.boolean(),
  titulo: z.string().trim().min(1).max(160),
  texto: z.string().trim().max(400),
  ctaTexto: z.string().trim().max(60),
  ctaDestino: destino,
  cta2Texto: z.string().trim().max(60),
  cta2Destino: destino,
  imagem: z.string().trim().max(500),
  imagemPosicao: z.enum(["esquerda", "centro", "direita", "rosto"]),
  overlay: z.number().int().min(0).max(95),
  alinhamento: z.enum(["esquerda", "centro"]),
});

export const esquemaAparencia = z.object({
  preset: z.enum(["premium", "cinematico", "clean", "editorial"]),
  corDestaque: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  estiloBotao: z.enum(["solido", "contorno"]),
  raioPx: z.number().int().min(0).max(24),
  bordas: z.enum(["sutil", "media", "forte"]),
  larguraPx: z.number().int().min(1040).max(1600),
  espacamento: z.enum(["compacto", "padrao", "amplo"]),
  tipografia: z.enum(["Montserrat", "Work Sans", "Sora"]),
});

export const esquemaSeo = z.object({
  titulo: z.string().trim().min(1).max(70),
  descricao: z.string().trim().max(180),
  imagem: z.string().trim().max(500),
  canonica: z.string().trim().max(200),
});

export const esquemaHome = z.object({
  versao: z.literal(1).default(1),
  hero: esquemaHero,
  secoes: z.array(esquemaSecao).min(1).max(24),
  aparencia: esquemaAparencia,
  seo: esquemaSeo,
});

export type SecaoHome = z.infer<typeof esquemaSecao>;
export type HeroHome = z.infer<typeof esquemaHero>;
export type AparenciaHome = z.infer<typeof esquemaAparencia>;
export type ConfigHome = z.infer<typeof esquemaHome>;

/** Presets visuais: mudam só a apresentação, nunca o conteúdo. */
export const PRESETS: Record<AparenciaHome["preset"], Omit<AparenciaHome, "preset" | "corDestaque">> = {
  premium: { estiloBotao: "solido", raioPx: 10, bordas: "sutil", larguraPx: 1280, espacamento: "padrao", tipografia: "Montserrat" },
  cinematico: { estiloBotao: "solido", raioPx: 4, bordas: "sutil", larguraPx: 1440, espacamento: "amplo", tipografia: "Sora" },
  clean: { estiloBotao: "contorno", raioPx: 14, bordas: "media", larguraPx: 1120, espacamento: "compacto", tipografia: "Work Sans" },
  editorial: { estiloBotao: "contorno", raioPx: 2, bordas: "forte", larguraPx: 1280, espacamento: "amplo", tipografia: "Sora" },
};

export const ROTULO_PRESET: Record<AparenciaHome["preset"], string> = {
  premium: "CortAI Premium",
  cinematico: "Cinemático",
  clean: "Clean",
  editorial: "Editorial",
};

export const ESPACAMENTO_PX: Record<AparenciaHome["espacamento"], number> = { compacto: 64, padrao: 80, amplo: 104 };

export const HOME_PADRAO: ConfigHome = {
  versao: 1,
  hero: {
    ativo: true,
    etiqueta: "Gestão completa para barbearias",
    mostrarSelo: true,
    titulo: "Sua barbearia, no controle.",
    texto: "Agenda, clientes, caixa, loja e fidelidade em um só lugar — com a sua marca na frente.",
    ctaTexto: "Conhecer o CortAI",
    ctaDestino: "#conhecer",
    cta2Texto: "Ver como funciona",
    cta2Destino: "#como-funciona",
    imagem: "",
    imagemPosicao: "rosto",
    overlay: 55,
    alinhamento: "esquerda",
  },
  secoes: [
    {
      id: "beneficios",
      tipo: "beneficios",
      nome: "Faixa de benefícios",
      ativo: true,
      itens: [
        { titulo: "Agenda", texto: "Horários organizados", icone: "agenda" },
        { titulo: "Clientes", texto: "Histórico e recorrência", icone: "clientes" },
        { titulo: "Financeiro", texto: "Caixa sob controle", icone: "financeiro" },
        { titulo: "Fidelidade", texto: "Clientes que voltam", icone: "fidelidade" },
        { titulo: "Sua marca", texto: "Sempre na frente", icone: "loja" },
      ],
    },
    {
      id: "produto",
      tipo: "produto",
      nome: "Gestão completa (celular)",
      ativo: true,
      tema: "claro",
      etiqueta: "Um sistema. Toda a operação.",
      titulo: "Gestão completa para o seu negócio",
      texto: "Da agenda ao relacionamento com seus clientes, o CortAI organiza a rotina sem tirar o foco do que importa: o atendimento.",
      ctaTexto: "Começar agora",
      ctaDestino: "/comecar",
      itens: [
        { titulo: "Simples no celular", texto: "" },
        { titulo: "Visão clara do negócio", texto: "" },
      ],
    },
    {
      id: "recursos",
      tipo: "recursos",
      nome: "Módulos do CortAI",
      ativo: true,
      tema: "escuro",
      etiqueta: "Tudo que sua barbearia precisa",
      titulo: "Do primeiro horário ao fechamento do caixa.",
      texto: "O CortAI reúne a rotina da cadeira e a visão do negócio. Fila é parte da Agenda. Voltaí é a fidelidade. Tudo na mesma plataforma.",
      itens: [
        { titulo: "Sua agenda no controle.", texto: "Horários por profissional, encaixes, bloqueios e fila no mesmo lugar.", icone: "agenda" },
        { titulo: "Conheça quem senta na sua cadeira.", texto: "Histórico, frequência e preferências para atender melhor a cada visita.", icone: "clientes" },
        { titulo: "Saiba quanto sua barbearia está fazendo.", texto: "Acompanhe o faturamento, o que entrou e o que ainda falta receber.", icone: "financeiro" },
        { titulo: "Venda mais. Não deixe produto faltar.", texto: "Controle o estoque interno e escolha o que aparece na loja pública.", icone: "loja" },
        { titulo: "Seu cliente corta. Ganha. Volta.", texto: "Fidelidade configurável para premiar quem sempre escolhe sua barbearia.", icone: "fidelidade" },
        { titulo: "Cada profissional no ritmo certo.", texto: "Organize profissionais, serviços e horários sem embolar a operação.", icone: "equipe" },
        { titulo: "Chame o cliente na hora certa.", texto: "Use mensagens prontas para conversar com quem está na hora de voltar.", icone: "whatsapp" },
        { titulo: "Veja o que acontece no seu negócio.", texto: "Ocupação, crescimento e indicadores para decidir com mais segurança.", icone: "relatorios" },
      ],
    },
    {
      id: "voltai",
      tipo: "voltai",
      nome: "Voltaí",
      ativo: true,
      tema: "claro",
      etiqueta: "Voltaí",
      titulo: "Seu cliente corta. Ganha. Volta.",
      texto: "Uma fidelidade simples de entender e fácil de acompanhar. Você define a regra, o CortAI mostra o progresso e o cliente tem mais um motivo para voltar.",
      imagem: "",
      itens: [
        { titulo: "Corta", texto: "" },
        { titulo: "Ganha", texto: "" },
        { titulo: "Volta", texto: "" },
      ],
    },
    {
      id: "telas",
      tipo: "telas",
      nome: "Por dentro do CortAI",
      ativo: true,
      tema: "escuro",
      etiqueta: "Por dentro do CortAI",
      titulo: "O controle que você usa de verdade.",
      texto: "Visualizações baseadas nos módulos que já existem na área de gestão do CortAI.",
    },
    {
      id: "rotina",
      tipo: "rotina",
      nome: "Rotina da barbearia",
      ativo: true,
      tema: "escuro",
      etiqueta: "Feito para a rotina da barbearia",
      titulo: "Profissional sem ficar complicado.",
      imagem: "",
      itens: [
        { titulo: "No celular", texto: "" },
        { titulo: "Rápido de usar", texto: "" },
        { titulo: "Sem complicação", texto: "" },
        { titulo: "Sua marca na frente", texto: "" },
        { titulo: "Feito para o barbeiro", texto: "" },
      ],
    },
    {
      id: "cta",
      tipo: "cta",
      nome: "Chamada final",
      ativo: true,
      tema: "escuro",
      titulo: "Pronto para colocar sua barbearia no CortAI?",
      texto: "Organize a rotina, acompanhe o negócio e mantenha sua marca na frente.",
      imagem: "",
      ctaTexto: "Começar agora",
      ctaDestino: "/comecar",
      cta2Texto: "Encontrar uma barbearia",
      cta2Destino: "/barbearias",
    },
    { id: "parceiros", tipo: "parceiros", nome: "Nossos parceiros", ativo: true },
    { id: "rodape", tipo: "rodape", nome: "Rodapé", ativo: true },
  ],
  aparencia: {
    preset: "premium",
    corDestaque: "#C9A227",
    estiloBotao: "solido",
    raioPx: 10,
    bordas: "sutil",
    larguraPx: 1280,
    espacamento: "padrao",
    tipografia: "Montserrat",
  },
  seo: {
    titulo: "CortAI — sua barbearia, no controle",
    descricao: "Agenda, clientes, caixa, loja, estoque e fidelidade para sua barbearia crescer com controle.",
    imagem: "",
    canonica: "",
  },
};

/** Normaliza o que veio do banco: campos ausentes caem no padrão. */
export function normalizarHome(bruto: unknown): ConfigHome {
  if (!bruto || typeof bruto !== "object" || Object.keys(bruto as object).length === 0) return HOME_PADRAO;
  const parsed = esquemaHome.safeParse(bruto);
  if (parsed.success) return parsed.data;
  const dados = bruto as Partial<ConfigHome>;
  return {
    versao: 1,
    hero: { ...HOME_PADRAO.hero, ...(dados.hero ?? {}) },
    secoes: Array.isArray(dados.secoes) && dados.secoes.length ? (dados.secoes as SecaoHome[]) : HOME_PADRAO.secoes,
    aparencia: { ...HOME_PADRAO.aparencia, ...(dados.aparencia ?? {}) },
    seo: { ...HOME_PADRAO.seo, ...(dados.seo ?? {}) },
  };
}

/** Resumo legível das diferenças entre rascunho e publicado. */
export function resumirMudancas(publicado: ConfigHome, rascunho: ConfigHome): string[] {
  const mudancas: string[] = [];
  if (JSON.stringify(publicado.hero) !== JSON.stringify(rascunho.hero)) mudancas.push("Topo da página (Hero)");
  if (JSON.stringify(publicado.aparencia) !== JSON.stringify(rascunho.aparencia)) mudancas.push("Aparência");
  if (JSON.stringify(publicado.seo) !== JSON.stringify(rascunho.seo)) mudancas.push("SEO e compartilhamento");
  const antes = new Map(publicado.secoes.map((s) => [s.id, s]));
  const depois = new Map(rascunho.secoes.map((s) => [s.id, s]));
  for (const [id, secao] of depois) {
    const anterior = antes.get(id);
    if (!anterior) mudancas.push(`Nova seção: ${secao.nome}`);
    else if (JSON.stringify(anterior) !== JSON.stringify(secao)) mudancas.push(`Seção alterada: ${secao.nome}`);
  }
  for (const [id, secao] of antes) if (!depois.has(id)) mudancas.push(`Seção removida: ${secao.nome}`);
  if (publicado.secoes.map((s) => s.id).join() !== rascunho.secoes.map((s) => s.id).join() && !mudancas.some((m) => m.startsWith("Nova") || m.startsWith("Seção removida"))) {
    mudancas.push("Ordem das seções");
  }
  return mudancas;
}
