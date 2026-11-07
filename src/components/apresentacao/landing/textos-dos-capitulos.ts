/**
 * Texto de venda de cada capítulo da página pública, no mesmo molde (dono, 07/11/2026: "muito texto, não está
 * seguindo o padrão"): etiqueta curta, título de até duas linhas e exatamente TRÊS tópicos curtos. Sem frase solta e sem legenda no
 * celular: nada repete o título ou a animação (dono, 07/11: "textos redundantes").
 * Os limites estão travados em `textos-dos-capitulos.test.ts`.
 */
export type TextoDoCapitulo = {
  etiqueta: string;
  titulo: string;
  itens: readonly [string, string, string];
};

export const TEXTOS_DOS_CAPITULOS: Record<string, TextoDoCapitulo> = {
  whatsapp: {
    etiqueta: "WhatsApp",
    titulo: "O cliente marca sozinho, a qualquer hora.",
    itens: ["Sem decorar menus", "Confirma com um SIM", "Você é avisado de tudo"],
  },
  lembretes: {
    etiqueta: "Lembretes",
    titulo: "Menos faltas, sem você mandar mensagem.",
    itens: ["Lembrete automático", "Confirmação do cliente", "Aviso para a equipe"],
  },
  fila: {
    etiqueta: "Lista de espera",
    titulo: "Horário que cancela não fica vazio.",
    itens: ["Cliente entra pelo link", "Aceita com um toque", "Equipe só acompanha"],
  },
  agenda: {
    etiqueta: "Agenda",
    titulo: "O cliente escolhe o horário em poucos toques.",
    itens: ["Horários sempre atualizados", "Sem conflito de horários", "Confirmação na hora"],
  },
  site: {
    etiqueta: "Seu site",
    titulo: "Uma página do seu negócio, pronta para clientes.",
    itens: ["Tema e cores do seu jeito", "Fotos da equipe e do espaço", "Link para o Instagram"],
  },
  gestao: {
    etiqueta: "Gestão",
    titulo: "Agenda, clientes e caixa em um só lugar.",
    itens: ["Comanda e caixa", "Histórico do cliente", "Números do mês"],
  },
};
