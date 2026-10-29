import { z } from "zod";

import { esquemaApresentacao } from "@/lib/apresentacao-conteudo";

/**
 * Modelo de conteúdo da Home pública do Flow.
 *
 * O conteúdo atual da Home vive aqui como valor padrão. O editor do admin
 * grava um objeto com a mesma forma; se nada estiver publicado, a Home usa
 * exatamente este padrão — ou seja, nunca fica em branco.
 */

export const TIPOS_DE_SECAO = [
  { valor: "pilares", rotulo: "Quatro pilares" },
  { valor: "beneficios", rotulo: "Benefícios" },
  { valor: "produto", rotulo: "Produto / celular" },
  { valor: "modulo", rotulo: "Módulo (texto + tela)" },
  { valor: "identidade", rotulo: "Identidade do negócio" },
  { valor: "experiencia", rotulo: "Experiência do cliente" },
  { valor: "crescimento", rotulo: "Crescimento e oportunidades" },
  { valor: "recursos", rotulo: "Módulos do Flow" },
  { valor: "voltai", rotulo: "Voltaí / fidelidade" },
  { valor: "telas", rotulo: "Agenda, Clientes, Financeiro" },
  { valor: "rotina", rotulo: "Rotina do negócio" },
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
  .refine(
    (v) => v === "" || v.startsWith("/") || v.startsWith("#"),
    "Use um endereço interno, começando com / ou #",
  );

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
  tipografia: z.enum(["Manrope", "Montserrat", "Work Sans", "Sora"]),
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
  /** Conteúdo da Home pública oficial (/apresentacao). */
  apresentacao: esquemaApresentacao.optional(),
});

export type SecaoHome = z.infer<typeof esquemaSecao>;
export type HeroHome = z.infer<typeof esquemaHero>;
export type AparenciaHome = z.infer<typeof esquemaAparencia>;
export type ConfigHome = z.infer<typeof esquemaHome>;

/** Presets visuais: mudam só a apresentação, nunca o conteúdo. */
export const PRESETS: Record<
  AparenciaHome["preset"],
  Omit<AparenciaHome, "preset" | "corDestaque">
> = {
  premium: {
    estiloBotao: "solido",
    raioPx: 14,
    bordas: "sutil",
    larguraPx: 1280,
    espacamento: "padrao",
    tipografia: "Manrope",
  },
  cinematico: {
    estiloBotao: "solido",
    raioPx: 12,
    bordas: "sutil",
    larguraPx: 1440,
    espacamento: "amplo",
    tipografia: "Manrope",
  },
  clean: {
    estiloBotao: "contorno",
    raioPx: 16,
    bordas: "media",
    larguraPx: 1120,
    espacamento: "compacto",
    tipografia: "Work Sans",
  },
  editorial: {
    estiloBotao: "contorno",
    raioPx: 12,
    bordas: "forte",
    larguraPx: 1280,
    espacamento: "amplo",
    tipografia: "Manrope",
  },
};

export const ROTULO_PRESET: Record<AparenciaHome["preset"], string> = {
  premium: "Flow Premium",
  cinematico: "Cinemático",
  clean: "Clean",
  editorial: "Editorial",
};

export const ESPACAMENTO_PX: Record<AparenciaHome["espacamento"], number> = {
  compacto: 64,
  padrao: 80,
  amplo: 104,
};

export const HOME_PADRAO: ConfigHome = {
  versao: 1,
  hero: {
    ativo: true,
    etiqueta: "Gestão e tecnologia para negócios de serviços",
    mostrarSelo: true,
    titulo: "Seu negócio. Do seu jeito. Sob seu controle.",
    texto: "Tudo o que seu negócio de serviços precisa para operar melhor, em um só lugar.",
    ctaTexto: "Começar agora",
    ctaDestino: "/comecar",
    cta2Texto: "Conhecer o Flow",
    cta2Destino: "#conhecer",
    imagem: "",
    imagemPosicao: "rosto",
    overlay: 58,
    alinhamento: "esquerda",
  },
  secoes: [
    {
      id: "pilares",
      tipo: "pilares",
      nome: "Quatro pilares",
      ativo: true,
      etiqueta: "O Flow não é só uma agenda",
      titulo: "É o lugar onde seu negócio acontece.",
      texto:
        "Quatro frentes que sustentam o dia a dia do seu negócio — todas dentro da mesma plataforma.",
      itens: [
        {
          titulo: "Operar",
          texto: "Sua operação organizada: agenda, equipe, caixa, vendas, estoque e atendimento.",
          icone: "agenda",
        },
        {
          titulo: "Aparecer",
          texto:
            "Sua marca presente: página pública, serviços, profissionais e agendamento online.",
          icone: "marca",
        },
        {
          titulo: "Fazer voltar",
          texto: "Clientes que voltam: histórico, Voltaí, carteira, frequência e relacionamento.",
          icone: "fidelidade",
        },
        {
          titulo: "Crescer",
          texto: "Mais controle para crescer: ocupação, oportunidades, indicadores e retorno.",
          icone: "relatorios",
        },
      ],
    },
    {
      id: "produto",
      tipo: "produto",
      nome: "Gestão no celular",
      ativo: true,
      tema: "claro",
      etiqueta: "Um lugar. Toda a operação.",
      titulo: "Tudo o que acontece no seu atendimento, organizado no celular.",
      texto:
        "Da primeira tarefa do dia ao fechamento do caixa, o Flow acompanha a rotina sem tirar o foco do atendimento.",
      ctaTexto: "Começar agora",
      ctaDestino: "/comecar",
      itens: [
        { titulo: "Simples no celular", texto: "" },
        { titulo: "Visão clara do negócio", texto: "" },
        { titulo: "Feito para a rotina do seu negócio", texto: "" },
      ],
    },
    {
      id: "agenda",
      tipo: "modulo",
      nome: "Agenda",
      ativo: true,
      etiqueta: "Operar",
      titulo: "Uma agenda que entende sua operação.",
      texto:
        "Cada profissional com seus horários, encaixes e bloqueios. A fila de espera e o agendamento online fazem parte da mesma agenda.",
      imagem: "agenda",
      itens: [
        { titulo: "Agenda por profissional", texto: "" },
        { titulo: "Horários e disponibilidade", texto: "" },
        { titulo: "Fila de espera", texto: "" },
        { titulo: "Encaixes e bloqueios", texto: "" },
        { titulo: "Agendamento online", texto: "" },
        { titulo: "Agendamento manual", texto: "" },
      ],
    },
    {
      id: "clientes",
      tipo: "modulo",
      nome: "Clientes",
      ativo: true,
      tema: "claro",
      etiqueta: "Fazer voltar",
      titulo: "Conheça melhor cada cliente.",
      texto:
        "Cliente não é cadastro. É histórico, frequência, preferência e relacionamento — tudo à mão antes do próximo atendimento.",
      imagem: "clientes",
      imagemPosicao: "esquerda",
      itens: [
        { titulo: "Histórico de atendimentos", texto: "" },
        { titulo: "Frequência e retorno", texto: "" },
        { titulo: "Ficha e preferências", texto: "" },
        { titulo: "Carteira e crédito", texto: "" },
        { titulo: "Voltaí e fidelidade", texto: "" },
      ],
    },
    {
      id: "financeiro",
      tipo: "modulo",
      nome: "Financeiro",
      ativo: true,
      etiqueta: "Operar",
      titulo: "Do atendimento ao dinheiro.",
      texto:
        "A comanda fecha, o caixa registra e você enxerga o que entrou, o que ficou pendente e quanto cada profissional tem a receber.",
      imagem: "caixa",
      itens: [
        { titulo: "Caixa e comandas", texto: "" },
        { titulo: "Vendas de produtos", texto: "" },
        { titulo: "Fiado e quitação", texto: "" },
        { titulo: "Carteira do cliente", texto: "" },
        { titulo: "Comissões", texto: "" },
        { titulo: "Recebimentos e pendências", texto: "" },
      ],
    },
    {
      id: "equipe",
      tipo: "modulo",
      nome: "Equipe",
      ativo: true,
      tema: "claro",
      etiqueta: "Operar",
      titulo: "Cada profissional no seu ritmo. Tudo no mesmo lugar.",
      texto:
        "Profissionais com agenda, serviços e disponibilidade próprios. Cada pessoa da equipe enxerga só o que faz parte do trabalho dela.",
      imagem: "voltai",
      imagemPosicao: "esquerda",
      itens: [
        { titulo: "Profissionais e serviços", texto: "" },
        { titulo: "Agenda e disponibilidade", texto: "" },
        { titulo: "Comissão por profissional", texto: "" },
        { titulo: "Permissões por papel", texto: "" },
      ],
    },
    {
      id: "identidade",
      tipo: "identidade",
      nome: "Identidade do negócio",
      ativo: true,
      etiqueta: "Aparecer",
      titulo: "Sua marca também faz parte do negócio.",
      texto:
        "Cada negócio tem sua página pública, com nome, logo, serviços, profissionais e identidade própria.",
      imagem: "",
      itens: [
        { titulo: "Urbano", texto: "Direto, forte e de bairro." },
        { titulo: "Premium", texto: "Sóbrio, caprichado e reservado." },
        { titulo: "Clássico", texto: "Tradição com uma apresentação atemporal." },
        { titulo: "Clean", texto: "Simples, claro e sem ruído." },
        { titulo: "Street", texto: "Jovem, solto e com atitude." },
        { titulo: "Retrô", texto: "Madeira, metal e memória." },
      ],
    },
    {
      id: "voltai",
      tipo: "voltai",
      nome: "Voltaí",
      ativo: true,
      tema: "claro",
      etiqueta: "Voltaí",
      titulo: "Seu cliente vem. Ganha. Volta.",
      texto:
        "Uma fidelidade simples de entender e fácil de acompanhar. Você define a regra, o Flow mostra o progresso e o cliente tem mais um motivo para voltar.",
      imagem: "",
      itens: [
        { titulo: "Vem", texto: "" },
        { titulo: "Ganha", texto: "" },
        { titulo: "Volta", texto: "" },
      ],
    },
    {
      id: "experiencia",
      tipo: "experiencia",
      nome: "Experiência do cliente",
      ativo: true,
      etiqueta: "Página pública",
      titulo: "Do primeiro toque à confirmação.",
      texto:
        "Seu cliente entra na página do seu negócio, escolhe serviço, profissional, dia e horário — e recebe a confirmação.",
      itens: [
        { titulo: "Seu negócio", texto: "A página é da sua marca." },
        { titulo: "Serviço", texto: "Preço e duração reais." },
        { titulo: "Profissional", texto: "Quem está disponível." },
        { titulo: "Data", texto: "Só os dias que você abre." },
        { titulo: "Horário", texto: "Só o que está livre." },
        { titulo: "Confirmação", texto: "O agendamento cai na sua agenda." },
      ],
    },
    {
      id: "crescimento",
      tipo: "crescimento",
      nome: "Crescimento",
      ativo: true,
      tema: "claro",
      etiqueta: "Crescer",
      titulo: "Não basta administrar. É preciso enxergar a próxima oportunidade.",
      texto:
        "O Início do Flow mostra como o dia está indo e o próximo movimento, com base no que já acontece no seu negócio.",
      itens: [
        { titulo: "Horário vazio hoje", texto: "Ofereça para quem está na fila." },
        { titulo: "Cliente na hora de voltar", texto: "Frequência indica o retorno." },
        { titulo: "Cancelamento recente", texto: "Recupere o horário aberto." },
        { titulo: "Ocupação da agenda", texto: "Veja o rendimento dos horários." },
        { titulo: "Fiado em aberto", texto: "Saiba o que ainda falta receber." },
        { titulo: "Indicadores do dia", texto: "Faturamento, atendimentos e ticket." },
      ],
    },
    {
      id: "cta",
      tipo: "cta",
      nome: "Chamada final",
      ativo: true,
      tema: "escuro",
      titulo: "Pronto para colocar seu negócio no controle?",
      texto: "Seu negócio no ritmo certo.",
      imagem: "",
      ctaTexto: "Conhecer o Flow",
      ctaDestino: "/comecar",
      cta2Texto: "Encontrar um negócio",
      cta2Destino: "/barbearias",
    },
    { id: "parceiros", tipo: "parceiros", nome: "Nossos parceiros", ativo: true },
    { id: "rodape", tipo: "rodape", nome: "Rodapé", ativo: true },
  ],
  aparencia: {
    preset: "premium",
    corDestaque: "#1653A1",
    estiloBotao: "solido",
    raioPx: 14,
    bordas: "sutil",
    larguraPx: 1280,
    espacamento: "amplo",
    tipografia: "Manrope",
  },
  seo: {
    titulo: "Flow — Gestão para negócios de serviços",
    descricao:
      "Agenda, clientes, equipe, vendas, caixa e presença digital para negócios que atendem por serviço.",
    imagem: "",
    canonica: "https://cortai.dev",
  },
};

/** Normaliza o que veio do banco: campos ausentes caem no padrão. */
export function normalizarHome(bruto: unknown): ConfigHome {
  if (!bruto || typeof bruto !== "object" || Object.keys(bruto as object).length === 0)
    return HOME_PADRAO;
  const parsed = esquemaHome.safeParse(bruto);
  if (parsed.success) return parsed.data;
  const dados = bruto as Partial<ConfigHome>;
  return {
    versao: 1,
    hero: { ...HOME_PADRAO.hero, ...(dados.hero ?? {}) },
    secoes:
      Array.isArray(dados.secoes) && dados.secoes.length
        ? (dados.secoes as SecaoHome[])
        : HOME_PADRAO.secoes,
    aparencia: { ...HOME_PADRAO.aparencia, ...(dados.aparencia ?? {}) },
    seo: { ...HOME_PADRAO.seo, ...(dados.seo ?? {}) },
    apresentacao: esquemaApresentacao.safeParse(dados.apresentacao).success
      ? dados.apresentacao
      : undefined,
  };
}

/** Resumo legível das diferenças entre rascunho e publicado. */
export function resumirMudancas(publicado: ConfigHome, rascunho: ConfigHome): string[] {
  const mudancas: string[] = [];
  if (JSON.stringify(publicado.hero) !== JSON.stringify(rascunho.hero))
    mudancas.push("Topo da página (Hero)");
  if (JSON.stringify(publicado.aparencia) !== JSON.stringify(rascunho.aparencia))
    mudancas.push("Aparência");
  if (JSON.stringify(publicado.seo) !== JSON.stringify(rascunho.seo))
    mudancas.push("SEO e compartilhamento");
  const antes = new Map(publicado.secoes.map((s) => [s.id, s]));
  const depois = new Map(rascunho.secoes.map((s) => [s.id, s]));
  for (const [id, secao] of depois) {
    const anterior = antes.get(id);
    if (!anterior) mudancas.push(`Nova seção: ${secao.nome}`);
    else if (JSON.stringify(anterior) !== JSON.stringify(secao))
      mudancas.push(`Seção alterada: ${secao.nome}`);
  }
  for (const [id, secao] of antes)
    if (!depois.has(id)) mudancas.push(`Seção removida: ${secao.nome}`);
  if (
    publicado.secoes.map((s) => s.id).join() !== rascunho.secoes.map((s) => s.id).join() &&
    !mudancas.some((m) => m.startsWith("Nova") || m.startsWith("Seção removida"))
  ) {
    mudancas.push("Ordem das seções");
  }
  return mudancas;
}
