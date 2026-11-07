/**
 * Texto de venda de cada capítulo da página pública, no mesmo molde (dono, 07/11/2026: "muito texto, não está
 * seguindo o padrão"): etiqueta curta, título de até duas linhas, UMA frase curta e exatamente TRÊS tópicos curtos.
 * Os limites estão travados em `textos-dos-capitulos.test.ts`.
 */
export type TextoDoCapitulo = {
  etiqueta: string;
  titulo: string;
  texto: string;
  itens: readonly [string, string, string];
};

export const TEXTOS_DOS_CAPITULOS: Record<string, TextoDoCapitulo> = {
  whatsapp: {
    etiqueta: "WhatsApp",
    titulo: "O cliente marca sozinho, a qualquer hora.",
    texto: "O WhatsApp mostra os horários livres e confirma o agendamento.",
    itens: ["Sem decorar menus", "Confirma com um SIM", "Você é avisado de tudo"],
  },
  lembretes: {
    etiqueta: "Lembretes",
    titulo: "Menos faltas, sem você mandar mensagem.",
    texto: "O lembrete vai no dia anterior e o cliente confirma com um toque.",
    itens: ["Lembrete automático", "Confirmação do cliente", "Aviso para a equipe"],
  },
  fila: {
    etiqueta: "Lista de espera",
    titulo: "Horário que cancela não fica vazio.",
    texto: "A vaga vai para quem espera, uma pessoa por vez, pelo WhatsApp.",
    itens: ["Cliente entra pelo link", "Aceita com um toque", "Equipe só acompanha"],
  },
  agenda: {
    etiqueta: "Agenda",
    titulo: "O cliente escolhe o horário em poucos toques.",
    texto: "Dia, horário e profissional num fluxo simples.",
    itens: ["Horários sempre atualizados", "Sem conflito de horários", "Confirmação na hora"],
  },
  site: {
    etiqueta: "Seu site",
    titulo: "Uma página do seu negócio, pronta para clientes.",
    texto: "Serviços, equipe e preços com a sua cara.",
    itens: ["Tema e cores do seu jeito", "Fotos da equipe e do espaço", "Link para o Instagram"],
  },
  gestao: {
    etiqueta: "Gestão",
    titulo: "Agenda, clientes e caixa em um só lugar.",
    texto: "Desempenho, comanda e histórico de cada cliente.",
    itens: ["Comanda e caixa", "Histórico do cliente", "Números do mês"],
  },
};
