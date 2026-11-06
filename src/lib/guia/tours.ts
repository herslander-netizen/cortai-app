export type PassoGuia = {
  /**
   * Valor do atributo data-guia no elemento destacado, ou `css:<seletor>` para apontar um elemento que já existe sem
   * marcá-lo (a Agenda é protegida: o guia não muda nada nela). Sem elemento na tela, a dica aparece no centro.
   */
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

/** Agenda (tela inicial do painel). Aponta elementos que já existem, sem marcar nada na Agenda. */
const PASSOS_DA_AGENDA: PassoGuia[] = [
  {
    alvo: 'css:[aria-label="Abrir navegação"]',
    titulo: "Menu do negócio",
    texto:
      "Sua Página, desempenho da semana, clientes, financeiro, equipe, WhatsApp e ajustes ficam aqui.",
  },
  {
    alvo: 'css:[aria-label="Agora e visualização da agenda"]',
    titulo: "Agora e visualização",
    texto:
      "Volte para o horário de agora, troque entre lista e linha do tempo e escolha de quem ver a agenda.",
  },
  {
    alvo: "css:.agenda-fab-toggle",
    titulo: "Novo atendimento",
    texto: "No + você agenda um cliente, faz um encaixe ou bloqueia um horário.",
  },
  {
    alvo: "css:.agenda-lista-periodo",
    titulo: "Toque no atendimento",
    texto:
      "Abre a ficha: confirmar, remarcar, cobrar e ver a comanda na mesma tela. Cancelados ficam escondidos.",
  },
  {
    alvo: "css:.sino-de-avisos",
    titulo: "Avisos",
    texto:
      "Novos agendamentos, confirmações, cancelamentos e vagas da lista de espera chegam no sininho.",
  },
];

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
        texto: "Remarque ou cancele por aqui, dentro do prazo que o negócio definiu.",
      },
    ],
  },
  {
    id: "gestao-agenda",
    rota: "/barbeiro",
    nome: "Agenda",
    passos: PASSOS_DA_AGENDA,
  },
  {
    id: "gestao-agenda-rota",
    rota: "/barbeiro/agenda",
    nome: "Agenda",
    passos: PASSOS_DA_AGENDA,
  },
  {
    id: "gestao-espera",
    rota: "/barbeiro/fila",
    nome: "Lista de espera",
    passos: [
      {
        alvo: "espera-interruptor",
        titulo: "Recuperar vagas sozinho",
        texto:
          "Ligado, a vaga que abrir é oferecida pelo WhatsApp a quem está esperando e combina com ela.",
      },
      {
        alvo: "espera-regras",
        titulo: "Regras da lista",
        texto:
          "Escolha o prazo para responder, a antecedência mínima e se vale qualquer profissional.",
      },
      {
        alvo: "espera-resumo",
        titulo: "Quem está esperando",
        texto:
          "As pessoas ficam agrupadas pelo dia pedido. No ⋯ de cada uma: agendar, editar, mudar a ordem ou tirar.",
      },
    ],
  },
  {
    id: "gestao-horarios",
    rota: "/barbeiro/horarios",
    nome: "Horários",
    passos: [
      {
        alvo: "horarios-editor",
        titulo: "Semana de atendimento",
        texto:
          "Cada dia tem o interruptor de aberto. Toque no horário para ajustar no relógio; o intervalo entra e sai com um toque.",
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
          "Dados do negócio, equipe, horários, WhatsApp, sua página, plano e ajuda ficam reunidos aqui.",
      },
    ],
  },
];

/** Seletor do elemento de um passo: `css:` usa o seletor como está; o resto é `data-guia`. */
export function seletorDoPasso(alvo: string): string {
  return alvo.startsWith("css:") ? alvo.slice(4) : `[data-guia="${alvo}"]`;
}

export function guiaDaRota(pathname: string): Guia | undefined {
  const limpo = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return GUIAS.find((g) => g.rota === limpo);
}
