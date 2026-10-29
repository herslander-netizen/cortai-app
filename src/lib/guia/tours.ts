export type PassoGuia = {
  /** valor do atributo data-guia no elemento destacado */
  alvo: string;
  titulo: string;
  texto: string;
};

export type Guia = {
  id: string;
  /** rota exata em que o guia roda */
  rota: string;
  nome: string;
  passos: PassoGuia[];
};

export const GUIAS: Guia[] = [
  {
    id: "cliente-agendar",
    rota: "/app/agendar",
    nome: "Agendar horário",
    passos: [
      {
        alvo: "agendar-servico",
        titulo: "Escolha o serviço",
        texto: "Comece pelo que você quer fazer. O preço e a duração já aparecem aqui.",
      },
      {
        alvo: "agendar-profissional",
        titulo: "Profissional e dia",
        texto: "Escolha com quem quer ser atendido e o dia. Os horários abrem logo abaixo.",
      },
      {
        alvo: "agendar-horario",
        titulo: "Horário livre",
        texto: "Horários riscados já estão ocupados. Toque em um horário livre para reservar.",
      },
      {
        alvo: "agendar-confirmar",
        titulo: "Confirme e pronto",
        texto:
          "Revise o resumo, escolha como vai pagar e confirme. Você recebe tudo no seu histórico.",
      },
    ],
  },
  {
    id: "cliente-historico",
    rota: "/app/historico",
    nome: "Meus horários",
    passos: [
      {
        alvo: "historico-proximo",
        titulo: "Seu próximo atendimento",
        texto: "O atendimento mais próximo fica sempre no topo, com dia, hora e profissional.",
      },
      {
        alvo: "historico-acoes",
        titulo: "Remarcar ou cancelar",
        texto: "Cancelando até 4 horas antes, o crédito volta para a sua carteira.",
      },
    ],
  },
  {
    id: "gestao-dashboard",
    rota: "/barbeiro",
    nome: "Dashboard",
    passos: [
      {
        alvo: "dash-faturamento",
        titulo: "O dia em um olhar",
        texto: "Faturamento de hoje e quanto da sua agenda já está ocupada.",
      },
      {
        alvo: "dash-indicadores",
        titulo: "Indicadores",
        texto: "Atendimentos, horários livres, valores a receber e clientes ativos.",
      },
      {
        alvo: "dash-oportunidades",
        titulo: "Oportunidades de hoje",
        texto:
          "Aqui o Flow diz o que fazer agora, não só o que aconteceu. Toque em um item para agir.",
      },
      {
        alvo: "dash-primeiros-passos",
        titulo: "Primeiros passos",
        texto:
          "Este cartão mostra o que falta para seu negócio ficar pronto. Ele guarda o progresso.",
      },
      {
        alvo: "dash-assistente",
        titulo: "Perguntar ao Flow",
        texto:
          "Escreva como você fala: cadastre serviços, ajuste horários ou pergunte onde fica cada coisa.",
      },
      {
        alvo: "dash-acoes-rapidas",
        titulo: "Ações rápidas",
        texto:
          "A tesoura dourada abre as ações do dia: colocar cliente na fila, chamar o próximo e agendar.",
      },
    ],
  },
  {
    id: "gestao-agenda",
    rota: "/barbeiro/agenda",
    nome: "Agenda",
    passos: [
      {
        alvo: "agenda-lista",
        titulo: "Hora a hora",
        texto: "Cada faixa é um horário do dia. Os ocupados mostram cliente, serviço e pagamento.",
      },
      {
        alvo: "agenda-vazio",
        titulo: "Horário vago",
        texto: "Em horários livres você pode oferecer a vaga para quem está na lista de espera.",
      },
      {
        alvo: "agenda-repetir",
        titulo: "Repetir agendamento",
        texto:
          "Transforme um bom cliente em rotina: repita o mesmo horário por semana, quinzena ou mês.",
      },
    ],
  },
  {
    id: "gestao-clientes",
    rota: "/barbeiro/clientes",
    nome: "Clientes",
    passos: [
      {
        alvo: "clientes-retorno",
        titulo: "Clientes para trazer de volta",
        texto:
          "Essas pessoas já costumam voltar neste período, mas estão atrasadas. Você pode chamar pelo WhatsApp.",
      },
      {
        alvo: "clientes-lista",
        titulo: "Frequência de cada um",
        texto: "Última visita, intervalo médio, gasto e preferências ficam visíveis na lista.",
      },
    ],
  },
  {
    id: "gestao-crescimento",
    rota: "/barbeiro/crescimento",
    nome: "Crescimento",
    passos: [
      {
        alvo: "crescimento-metricas",
        titulo: "Seus números reais",
        texto: "Novos clientes, quem já é recorrente, agendamentos pelo link e ocupação.",
      },
      {
        alvo: "crescimento-acoes",
        titulo: "Ações de hoje",
        texto: "Cada linha leva direto para a tela onde você resolve aquilo.",
      },
      {
        alvo: "crescimento-compartilhar",
        titulo: "Divulgue sua página",
        texto: "Copie o link, mande no WhatsApp ou mostre o QR Code no balcão.",
      },
    ],
  },
  {
    id: "gestao-produtos",
    rota: "/barbeiro/produtos",
    nome: "Produtos",
    passos: [
      {
        alvo: "produtos-novo",
        titulo: "Cadastrar produto",
        texto: "Nome, foto, categoria, custo, preço e quantidade em estoque.",
      },
      {
        alvo: "produtos-lista",
        titulo: "Estoque sempre à vista",
        texto: "Quando a quantidade fica abaixo do mínimo, o produto é sinalizado.",
      },
      {
        alvo: "produtos-venda",
        titulo: "Venda rápida",
        texto: "Uma venda baixa o estoque e entra no financeiro automaticamente.",
      },
    ],
  },
  {
    id: "gestao-financeiro",
    rota: "/barbeiro/financeiro",
    nome: "Financeiro",
    passos: [
      {
        alvo: "financeiro-total",
        titulo: "Receita do mês",
        texto: "O total já soma tudo que entrou pelos atendimentos e vendas.",
      },
      {
        alvo: "financeiro-categorias",
        titulo: "Serviços, Produtos e Outros",
        texto: "Veja de onde vem o dinheiro separado por origem.",
      },
      {
        alvo: "financeiro-movimentos",
        titulo: "Movimentações",
        texto: "O extrato recente, do mais novo para o mais antigo.",
      },
    ],
  },
  {
    id: "gestao-mais",
    rota: "/barbeiro/mais",
    nome: "Mais",
    passos: [
      {
        alvo: "mais-lista",
        titulo: "Recursos avançados",
        texto:
          "Crescimento, indicações, avaliações, produtos, fidelidade e sua página pública ficam aqui.",
      },
    ],
  },
];

export function guiaDaRota(pathname: string): Guia | undefined {
  const limpo = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return GUIAS.find((g) => g.rota === limpo);
}
