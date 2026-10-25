import type { PaginaConfig } from "@/lib/pagina-config";
import type { PaginaPublica } from "@/lib/publico.functions";

/**
 * Negócio de exemplo para "Ver Exemplo" e para as capas dos temas (no Figaro vem do servidor).
 * As imagens são fotografias sintéticas fotorrealistas em `public/exemplos`, geradas para esta prévia.
 */
export function paginaDeExemplo(config: PaginaConfig): PaginaPublica {
  const img = (nome: string) => `/exemplos/${nome}.webp`;
  return {
    tenant: {
      id: "exemplo",
      nome: "Studio Exemplo",
      slug: "exemplo",
      descricao: "Cuidado e beleza com atendimento no seu tempo.",
      endereco: "Rua das Flores, 120 · Centro",
      telefone: "(11) 99999-0000",
      whatsapp: "5511999990000",
      instagram: "studioexemplo",
      texto_boas_vindas: null,
      cor_primaria: null,
      cor_secundaria: null,
      cor_accent: null,
      assinatura_visivel: true,
      logo_signed_url: img("logo"),
      capa_signed_url: img("capa"),
      fotos_signed_urls: [1, 2, 3, 4, 5, 6].map((n) => img(`galeria-${n}`)),
      segmento: "salao",
      fuso: "America/Sao_Paulo",
    },
    servicos: [
      { id: "s1", nome: "Corte e finalização", duracao_min: 45, preco_centavos: 9000, categoria: "Cabelo", popularidade: 12 },
      { id: "s2", nome: "Coloração", duracao_min: 90, preco_centavos: 18000, categoria: "Cabelo", popularidade: 6 },
      { id: "s3", nome: "Manicure", duracao_min: 40, preco_centavos: 4500, categoria: "Unhas", popularidade: 9 },
      { id: "s4", nome: "Design de sobrancelhas", duracao_min: 30, preco_centavos: 5000, categoria: "Rosto", popularidade: 4 },
    ],
    profissionais: [
      { id: "p1", nome: "Camila Nunes", avatar_url: img("profissional-1"), descricao: "Cortes e coloração", portfolio: [img("galeria-1"), img("galeria-3")] },
      { id: "p2", nome: "Bruno Alves", avatar_url: img("profissional-2"), descricao: "Cortes e barba", portfolio: [img("galeria-4")] },
      { id: "p3", nome: "Marina Costa", avatar_url: img("profissional-3"), descricao: "Unhas e sobrancelhas", portfolio: [img("galeria-2")] },
    ],
    pacotes: [
      {
        id: "pc1",
        tipo: "pacote",
        nome: "Cuidado mensal",
        descricao: null,
        precoCentavos: 32000,
        validadeDias: 30,
        destaque: true,
        ativo: true,
        itens: [{ servicoId: "s1", nome: "Corte e finalização", quantidade: 4, precoCentavos: 9000 }],
      },
      {
        id: "pc2",
        tipo: "combo",
        nome: "Corte + Sobrancelha",
        descricao: null,
        precoCentavos: 12500,
        validadeDias: null,
        destaque: false,
        ativo: true,
        itens: [
          { servicoId: "s1", nome: "Corte e finalização", quantidade: 1, precoCentavos: 9000 },
          { servicoId: "s4", nome: "Design de sobrancelhas", quantidade: 1, precoCentavos: 5000 },
        ],
      },
    ],
    loja_ativa: true,
    produtos: [
      { id: "pr1", nome: "Esmalte cremoso", categoria: "Unhas", preco_centavos: 2400, foto_url: img("produto-1") },
      { id: "pr2", nome: "Óleo capilar", categoria: "Cabelo", preco_centavos: 5900, foto_url: img("produto-2") },
      { id: "pr3", nome: "Pente de madeira", categoria: "Acessórios", preco_centavos: 3200, foto_url: img("produto-3") },
    ],
    horarios: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
      dia_semana: dia,
      fechado: dia === 0,
      abre: dia === 6 ? "09:00:00" : "08:30:00",
      fecha: dia === 6 ? "15:00:00" : "19:00:00",
    })),
    avaliacoes: { media: 4.9, quantidade: 128 },
    pagina: config,
    agendaOnline: "aberta",
  };
}
