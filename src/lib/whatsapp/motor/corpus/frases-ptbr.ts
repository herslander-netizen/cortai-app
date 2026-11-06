/**
 * Corpus de avaliação do entendimento (pt-BR), organizado pela taxonomia universal de intenções do atendimento
 * (estudo de 05/11/2026). Só dados: mede o que o motor entende hoje e trava regressões; não muda comportamento.
 *
 * Estilos: f = formal, i = informal, a = abreviado ("vc", "hj", "qro"), e = erro de digitação,
 * au = transcrito de áudio (sem pontuação, com hesitação), r = regional, em = com emoji, in = pedido indireto,
 * m = duas intenções na mesma frase. Frases fictícias; nenhum dado real de cliente.
 */

export type Grupo =
  | "descoberta"
  | "agendamento"
  | "alteracao"
  | "relacionamento"
  | "pos_atendimento"
  | "disponibilidade"
  | "suporte"
  | "conversa"
  | "avisos";

export type IntencaoFlow =
  | "consultar_servicos"
  | "consultar_precos"
  | "consultar_profissionais"
  | "localizacao"
  | "funcionamento"
  | "nome_do_negocio"
  | "pagamento"
  | "agendar"
  | "consultar_disponibilidade"
  | "encaixe"
  | "lista_de_espera"
  | "remarcar"
  | "cancelar"
  | "atraso"
  | "meus_agendamentos"
  | "repetir_ultimo"
  | "fidelidade"
  | "saldo"
  | "agradecer"
  | "elogiar"
  | "reclamar"
  | "avaliar"
  | "falar_com_atendente"
  | "ajuda"
  | "saudacao"
  | "despedida"
  | "confirmar"
  | "negar"
  | "escolher_opcao"
  | "trocar_estabelecimento"
  | "parar_avisos"
  | "voltar_avisos"
  | "numero_errado";

export type Estilo = "f" | "i" | "a" | "e" | "au" | "r" | "em" | "in" | "m";

/** [frase, estilo] ou [frase, estilo, outras intenções do motor aceitas nesta frase]. */
type Linha = readonly [string, Estilo, (readonly string[])?];

export type FraseDoCorpus = {
  texto: string;
  intencao: IntencaoFlow;
  grupo: Grupo;
  estilo: Estilo;
  /** Intenções do motor também aceitas nesta frase (ambiguidade legítima). */
  aceita?: readonly string[];
  /** Menu de N opções na tela (para "2", "a segunda"...). */
  opcoes?: number;
};

const GRUPO: Record<IntencaoFlow, Grupo> = {
  consultar_servicos: "descoberta",
  consultar_precos: "descoberta",
  consultar_profissionais: "descoberta",
  localizacao: "descoberta",
  funcionamento: "descoberta",
  nome_do_negocio: "descoberta",
  pagamento: "descoberta",
  agendar: "agendamento",
  consultar_disponibilidade: "agendamento",
  encaixe: "disponibilidade",
  lista_de_espera: "disponibilidade",
  remarcar: "alteracao",
  cancelar: "alteracao",
  atraso: "alteracao",
  meus_agendamentos: "alteracao",
  repetir_ultimo: "relacionamento",
  fidelidade: "relacionamento",
  saldo: "relacionamento",
  agradecer: "pos_atendimento",
  elogiar: "pos_atendimento",
  reclamar: "pos_atendimento",
  avaliar: "pos_atendimento",
  falar_com_atendente: "suporte",
  ajuda: "suporte",
  saudacao: "conversa",
  despedida: "conversa",
  confirmar: "conversa",
  negar: "conversa",
  escolher_opcao: "conversa",
  trocar_estabelecimento: "conversa",
  parar_avisos: "avisos",
  voltar_avisos: "avisos",
  numero_errado: "avisos",
};

const FRASES: Record<IntencaoFlow, readonly Linha[]> = {
  agendar: [
    ["Gostaria de agendar um horário.", "f"],
    ["Boa tarde, gostaria de marcar uma limpeza de pele.", "f"],
    ["Quero agendar um corte para sábado.", "f"],
    ["Poderia agendar uma massagem relaxante para mim?", "f"],
    ["quero marcar um horário", "i"],
    ["da pra marcar pra amanhã?", "i"],
    ["bora marcar uma escova", "i"],
    ["tem como marcar pra mim?", "i"],
    ["reserva um horário pra mim", "i"],
    ["consigo marcar pra hoje?", "i"],
    ["agenda pra mim às 15h", "i"],
    ["pode me agendar quinta às 10?", "i"],
    ["quero fazer as unhas amanhã", "i"],
    ["quero fazer o pé sábado", "i"],
    ["quero cortar o cabelo", "i"],
    ["queria cortar amanhã cedo", "i"],
    ["quero um horário pra hoje", "i"],
    ["preciso de um horário urgente", "i"],
    ["marcar depilação", "i"],
    ["quero fazer drenagem linfática", "i"],
    ["quero fazer cílios", "i"],
    ["qro marcar hj", "a"],
    ["marca p mim sexta", "a"],
    ["vc consegue me agendar amanha?", "a"],
    ["q marcar uma sobrancelha", "a"],
    ["quero agenda um orario", "e"],
    ["quero marca uma unha", "e"],
    ["gostaria de agemdar", "e"],
    ["qero marcar corti", "e"],
    ["quero marcar um orário pra amanha", "e"],
    [
      "oi tudo bem eu queria marcar um horário pra fazer a sobrancelha amanhã de tarde se tiver",
      "au",
    ],
    ["é então eu queria ver se dá pra marcar uma massagem pra sexta", "au"],
    ["bom dia é a Maria eu queria agendar uma escova pro sábado de manhã", "au"],
    ["oxe marca uma escova pra mim visse", "r"],
    ["bah quero marcar um corte tchê", "r"],
    ["uai queria marcar uma unha sô", "r"],
    ["quero marcar 💅", "em"],
    ["📅 marcar corte amanhã", "em"],
    ["será que teria como eu fazer uma limpeza de pele essa semana?", "in"],
    ["queria ver um horário com a Ana", "in"],
    ["estava pensando em fazer uma progressiva", "in"],
    ["quero marcar banho e tosa pro meu cachorro", "i"],
    ["preciso agendar uma consulta", "i"],
    ["quero marcar uma avaliação de estética", "i"],
    ["preciso agendar a revisão do carro", "i"],
    ["quero marcar uma aula experimental", "i"],
    ["quero marcar uma limpeza nos dentes", "i"],
  ],
  consultar_disponibilidade: [
    ["tem horário hoje?", "i"],
    ["quais horários vocês têm amanhã?", "i"],
    ["tem vaga sábado?", "i"],
    ["que horas tem livre na sexta?", "i"],
    ["tem alguém livre agora?", "i"],
    ["ainda tem vaga pra hoje?", "i"],
    ["qual o próximo horário livre?", "i"],
    ["quando tem horário com a Ana?", "i"],
    ["a Ana atende amanhã?", "i", ["PROFISSIONAIS"]],
    ["tem horário depois das 18?", "i"],
    ["tem algum horário de manhã?", "i"],
    ["qual dia tem vaga pra progressiva?", "i"],
    ["tem horário pra duas pessoas amanhã?", "i"],
    ["posso passar aí agora?", "i"],
    ["sexta-feira tem horário?", "i"],
    ["e na sexta-feira?", "i"],
    ["Teria disponibilidade na próxima semana?", "f"],
    ["Há horários disponíveis na quinta-feira à tarde?", "f"],
    ["vcs tem horario pra hj a tarde?", "a"],
    ["tem vaga hj pra unha?", "a"],
    ["tem orario amanha?", "e"],
    ["tem horario disponivel sabdo?", "e"],
    ["queria saber se tem horário amanhã de manhã pra fazer a unha", "au"],
    ["tem vaga pra hoje 🙏", "em"],
    ["que dia vocês têm livre essa semana?", "in"],
  ],
  encaixe: [
    ["tem como encaixar hoje?", "i"],
    ["consegue me encaixar ainda hoje?", "i"],
    ["me encaixa em algum horário amanhã", "i"],
    ["rola um encaixe hoje?", "i"],
    ["tem algum buraco na agenda hoje?", "i"],
    ["dá pra me espremer em algum horário?", "in"],
    ["Seria possível um encaixe hoje no fim da tarde?", "f"],
    ["tem encaixe hj?", "a"],
    ["tem um encaixizinho pra mim hoje", "e"],
    ["e se eu for agora vocês conseguem me atender", "au"],
  ],
  lista_de_espera: [
    ["me coloca na fila de espera", "i"],
    ["quero entrar na lista de espera", "i"],
    ["se abrir vaga me chama", "i"],
    ["me avisa se vagar algum horário", "i"],
    ["tem fila hoje?", "i"],
    ["quanto tempo de espera?", "i"],
    ["quantas pessoas na frente?", "i"],
    ["Gostaria de entrar na lista de espera, por favor.", "f"],
    ["me poe na fila", "e"],
    ["se alguém desmarcar me avisa", "in", ["CANCELAR"]],
  ],
  remarcar: [
    ["preciso remarcar", "i"],
    ["quero mudar meu horário", "i"],
    ["dá pra trocar pra sexta?", "i"],
    ["posso passar pra outro dia?", "i"],
    ["não vou conseguir amanhã, pode ser quinta?", "i"],
    ["adia pra semana que vem", "i"],
    ["tem como mudar pra mais tarde?", "i"],
    ["quero trocar o dia", "i"],
    ["pode remarcar pra 16h?", "i"],
    ["muda pra amanhã por favor", "i"],
    ["consegue passar meu horário pra sábado?", "i"],
    ["surgiu um imprevisto, posso marcar outro dia?", "i"],
    ["remarca pra mim", "i"],
    ["Gostaria de remarcar meu atendimento.", "f"],
    ["Seria possível alterar o horário para o fim da tarde?", "f"],
    ["qro mudar o horario", "a"],
    ["rmarcar", "e"],
    ["remarcarr pra sexta", "e"],
    ["oi então eu marquei pra amanhã mas não vou conseguir dá pra mudar pra outro dia", "au"],
    ["preciso adiar meu horário", "in"],
  ],
  cancelar: [
    ["quero cancelar", "i"],
    ["cancela meu horário", "i"],
    ["não vou poder ir", "i"],
    ["desmarca pra mim", "i"],
    ["preciso desmarcar amanhã", "i"],
    ["não vou mais", "i"],
    ["pode cancelar, surgiu um imprevisto", "i"],
    ["tira meu nome da agenda", "i"],
    ["desisti", "i"],
    ["pode cancelar a limpeza de pele de sexta", "i"],
    ["Infelizmente não vou conseguir comparecer.", "f"],
    ["Não poderei comparecer, por favor cancele.", "f"],
    ["Gostaria de cancelar meu agendamento.", "f"],
    ["cancelaa", "e"],
    ["cancelr meu horario", "e"],
    ["descancela meu horario", "e"],
    ["oi é que eu não vou conseguir ir hoje pode cancelar", "au"],
    ["não vou dar conta de ir hoje", "r"],
    ["❌ cancelar", "em"],
    ["quero cancelar e marcar outro dia", "m", ["REMARCAR"]],
  ],
  atraso: [
    ["vou atrasar uns 10 minutos", "i"],
    ["tô atrasada", "i"],
    ["chego em 15 min", "i"],
    ["vou chegar um pouquinho atrasado", "i"],
    ["o trânsito tá parado, vou atrasar", "i"],
    ["tô chegando", "i"],
    ["Peço desculpas, vou me atrasar alguns minutos.", "f"],
    ["vo atrasa um pouco", "e"],
    ["oi to presa no transito vou chegar uns cinco minutinhos depois", "au"],
    ["⏰ atrasada 10 min", "em"],
  ],
  meus_agendamentos: [
    ["que horas é meu horário?", "i"],
    ["quando é meu agendamento?", "i"],
    ["qual meu horário amanhã?", "i"],
    ["eu tenho horário marcado?", "i"],
    ["esqueci o horário que marquei", "i"],
    ["tenho algo marcado essa semana?", "i"],
    ["Poderia confirmar o dia e o horário do meu agendamento?", "f"],
    ["meu horario é q horas?", "a"],
    ["oi queria saber que dia ficou o meu horário", "au"],
    ["que dia eu marquei mesmo?", "in"],
  ],
  repetir_ultimo: [
    ["quero o mesmo de sempre", "i"],
    ["faz igual da última vez", "i"],
    ["quero repetir o que fiz da última vez", "i"],
    ["o de sempre com a Ana", "i"],
    ["mesma coisa do mês passado", "i", ["AGENDAR"]],
    ["marca igual da outra vez", "i", ["AGENDAR"]],
    ["quero repetir a escova", "i", ["AGENDAR"]],
  ],
  fidelidade: [
    ["quantos pontos eu tenho?", "i"],
    ["como funciona o cartão fidelidade?", "i"],
    ["tenho selo?", "i"],
    ["quantos cortes faltam pro grátis?", "in"],
    ["tenho desconto de fidelidade?", "i"],
    ["Quantos selos faltam para o brinde?", "f"],
  ],
  saldo: [
    ["qual meu saldo?", "i"],
    ["quanto eu tenho de crédito?", "i"],
    ["quantas sessões restam no meu pacote?", "i"],
    ["estou devendo algo?", "i"],
    ["quanto devo?", "i"],
    ["meu plano ainda vale?", "i"],
  ],
  consultar_servicos: [
    ["quais serviços vocês fazem?", "i"],
    ["o que vocês fazem?", "i"],
    ["vocês fazem sobrancelha?", "i"],
    ["fazem progressiva?", "i"],
    ["tem depilação a laser?", "i"],
    ["vcs fazem unha em gel?", "a"],
    ["manda o cardápio de serviços", "i"],
    ["qual a lista de serviços?", "i"],
    ["trabalham com cílios?", "i"],
    ["atendem criança?", "i"],
    ["Quais procedimentos vocês oferecem?", "f"],
    ["fazem limpeza de pele?", "i"],
    ["oi queria saber o que vocês fazem aí", "au"],
    ["vcs tem servico de massagem?", "a"],
  ],
  consultar_precos: [
    ["quanto custa o corte?", "i"],
    ["qual o valor da escova?", "i"],
    ["quanto fica a limpeza de pele?", "i"],
    ["qual o preço?", "i"],
    ["quanto é a sobrancelha?", "i"],
    ["quanto tá a unha?", "i"],
    ["me passa a tabela de preços", "i"],
    ["valor da progressiva", "i"],
    ["quanto vocês cobram pela barba?", "i"],
    ["quanto sai uma massagem?", "i"],
    ["tem desconto?", "i"],
    ["quanto fica corte e barba?", "i"],
    ["Poderia me informar os valores?", "f"],
    ["qto custa", "a"],
    ["qnto é a escova", "a"],
    ["quanto custa a hidratassão", "e"],
    ["oi bom dia queria saber o valor do design de sobrancelha", "au"],
    ["💰 preço da unha", "em"],
  ],
  consultar_profissionais: [
    ["quem atende aí?", "i"],
    ["quais profissionais vocês têm?", "i"],
    ["tem manicure?", "i"],
    ["quem faz sobrancelha?", "i"],
    ["posso escolher o profissional?", "i"],
    ["tem esteticista?", "i"],
    ["qual barbeiro tá livre?", "i", ["DISPONIBILIDADE"]],
    ["Quem são os profissionais da equipe?", "f"],
    ["a Ana trabalha hoje?", "in", ["DISPONIBILIDADE"]],
    ["qm atende de sabado", "a", ["DISPONIBILIDADE"]],
  ],
  localizacao: [
    ["qual o endereço?", "i"],
    ["onde fica?", "i"],
    ["onde vocês ficam?", "i"],
    ["manda a localização", "i"],
    ["como chego aí?", "i"],
    ["fica perto do centro?", "i"],
    ["tem estacionamento?", "i"],
    ["qual a rua?", "i"],
    ["me manda no maps", "i"],
    ["vcs ficam em qual bairro?", "a"],
  ],
  funcionamento: [
    ["que horas abre?", "i"],
    ["até que horas vocês ficam abertos?", "i"],
    ["abre domingo?", "i", ["DISPONIBILIDADE"]],
    ["qual o horário de funcionamento?", "i"],
    ["funciona sábado?", "i", ["DISPONIBILIDADE"]],
    ["vocês abrem feriado?", "i"],
    ["que horas fecha hoje?", "i"],
    ["tão abertos agora?", "i"],
    ["hj abre?", "a"],
    ["atendem até que horas?", "i"],
    ["Qual é o horário de atendimento?", "f"],
    ["vcs atendem domingo?", "a", ["DISPONIBILIDADE"]],
  ],
  nome_do_negocio: [
    ["qual o nome do salão?", "i"],
    ["que barbearia é essa?", "i"],
    ["qual estúdio é esse?", "i"],
    ["quem é você?", "i"],
    ["que lugar é esse?", "in"],
  ],
  pagamento: [
    ["aceita pix?", "i"],
    ["aceitam cartão?", "i"],
    ["posso pagar no débito?", "i"],
    ["parcela?", "i"],
    ["qual a chave pix?", "i"],
    ["já fiz o pix", "i"],
    ["mandei o comprovante", "i"],
    ["Quais formas de pagamento vocês aceitam?", "f"],
  ],
  agradecer: [
    ["obrigado", "i"],
    ["obrigada!", "i"],
    ["valeu", "i"],
    ["vlw", "a"],
    ["obg", "a"],
    ["brigadu", "e"],
    ["muito obrigada pela atenção", "f"],
    ["obrigado, até amanhã", "m"],
    ["agradeço", "f"],
    ["show, obrigado", "i"],
  ],
  elogiar: [
    ["amei o atendimento", "i"],
    ["ficou lindo, obrigada!", "i"],
    ["a Ana é ótima", "i"],
    ["adorei o corte", "i"],
    ["serviço impecável", "f"],
    ["vocês são demais 😍", "em"],
  ],
  reclamar: [
    ["quero reclamar", "i"],
    ["péssimo atendimento", "i"],
    ["isso é um absurdo", "i"],
    ["fiquei muito insatisfeita", "i"],
    ["o corte ficou horrível", "i"],
    ["esperei 40 minutos e ninguém me atendeu", "i"],
    ["não gostei do serviço", "i"],
    ["vocês me cobraram errado", "i"],
    ["Gostaria de registrar uma reclamação.", "f"],
    ["que falta de respeito 😡", "em"],
  ],
  avaliar: [
    ["quero avaliar o atendimento", "i"],
    ["dou nota 10", "i"],
    ["como deixo uma avaliação?", "i"],
    ["nota 5 estrelas ⭐⭐⭐⭐⭐", "em"],
    ["Gostaria de deixar minha avaliação.", "f"],
  ],
  falar_com_atendente: [
    ["quero falar com uma pessoa", "i"],
    ["atendente por favor", "i"],
    ["tem alguém aí?", "i"],
    ["me passa pra alguém da equipe", "i"],
    ["quero falar com a dona", "i"],
    ["chama o gerente", "i"],
    ["isso é robô?", "i"],
    ["não quero falar com robô", "i"],
    ["preciso falar com alguém", "i"],
    ["humano", "i"],
    ["Gostaria de falar com um atendente.", "f"],
    ["qro falar c alguem", "a"],
  ],
  ajuda: [
    ["como funciona?", "i"],
    ["o que você faz?", "i"],
    ["me ajuda", "i"],
    ["não entendi", "i"],
    ["quais as opções?", "i"],
    ["menu", "i", ["SERVICOS"]],
    ["o que eu posso fazer por aqui?", "in"],
    ["socorro", "i"],
  ],
  saudacao: [
    ["oi", "i"],
    ["olá", "i"],
    ["bom dia", "i"],
    ["boa tarde!", "i"],
    ["oii", "e"],
    ["oiii", "e"],
    ["olá, tudo bem?", "i"],
    ["e aí", "i"],
    ["opa", "i"],
    ["salve", "i"],
    ["eae", "a"],
    ["bom diaaa", "e"],
    ["boa noite, tudo bem?", "i"],
    ["Bom dia, como vai?", "f"],
    ["oi 😊", "em"],
  ],
  despedida: [
    ["tchau", "i"],
    ["até mais", "i"],
    ["até amanhã!", "i"],
    ["falou", "i"],
    ["até logo", "i"],
    ["bom fim de semana", "i"],
    ["valeu, até sábado", "m"],
    ["Tenha um ótimo dia.", "f"],
  ],
  confirmar: [
    ["sim", "i"],
    ["Sim!", "i"],
    ["isso", "i"],
    ["confirmo", "i"],
    ["confirmado", "i"],
    ["pode ser", "i"],
    ["beleza", "i"],
    ["blz", "a"],
    ["ok", "i"],
    ["okk", "e"],
    ["fechado", "i"],
    ["certo", "i"],
    ["claro", "i"],
    ["pode marcar", "i", ["AGENDAR"]],
    ["pode confirmar", "i"],
    ["estarei lá", "f"],
    ["vou sim", "i"],
    ["confirmo presença", "f"],
    ["👍", "em"],
    ["s", "a"],
    ["ss", "a"],
    ["simm", "e"],
    ["sim, pode", "i"],
    ["isso mesmo", "i"],
    ["perfeito", "i"],
    ["com certeza", "i"],
    ["tá ótimo", "i"],
    ["bora", "i"],
  ],
  negar: [
    ["não", "i"],
    ["nao", "a"],
    ["n", "a"],
    ["não quero", "i"],
    ["negativo", "i"],
    ["deixa pra lá", "i"],
    ["esquece", "i"],
    ["não é isso", "i"],
    ["agora não", "i"],
    ["melhor não", "i"],
    ["nops", "e"],
    ["não, obrigado", "i"],
    ["Não, prefiro outro horário.", "f", ["REMARCAR"]],
    ["nem", "a"],
  ],
  escolher_opcao: [
    ["1", "i"],
    ["2", "i"],
    ["3", "i"],
    ["opção 2", "i"],
    ["a segunda", "i"],
    ["o primeiro", "i"],
    ["quero a 3", "i"],
    ["pode ser o 2", "i"],
    ["2 por favor", "i"],
    ["segunda opção", "i"],
    ["a das 10h", "in", ["DISPONIBILIDADE"]],
  ],
  trocar_estabelecimento: [
    ["quero trocar de salão", "i"],
    ["é outra unidade", "i"],
    ["não é esse salão", "i"],
    ["é de outro lugar", "i"],
  ],
  parar_avisos: [
    ["SAIR", "i"],
    ["parar", "i"],
    ["Parar", "i"],
    ["descadastrar", "i"],
    ["não quero mais receber", "i"],
    ["para de me mandar mensagem", "i"],
    ["sair da lista", "i"],
    ["não quero receber lembrete", "i"],
  ],
  voltar_avisos: [
    ["voltar", "i"],
    ["VOLTAR", "i"],
    ["quero voltar a receber", "i"],
  ],
  numero_errado: [
    ["número errado", "i"],
    ["não sou eu", "i"],
    ["engano", "i"],
    ["não conheço", "i"],
    ["não marquei nada", "i"],
    ["acho que mandaram pro número errado", "i"],
  ],
};

/** Menu com 3 opções na tela para as frases de escolha. */
const OPCOES_DA_ESCOLHA = 3;

export const CORPUS: readonly FraseDoCorpus[] = (
  Object.entries(FRASES) as [IntencaoFlow, readonly Linha[]][]
).flatMap(([intencao, linhas]) =>
  linhas.map(([texto, estilo, aceita]) => ({
    texto,
    intencao,
    grupo: GRUPO[intencao],
    estilo,
    ...(aceita ? { aceita } : {}),
    ...(intencao === "escolher_opcao" ? { opcoes: OPCOES_DA_ESCOLHA } : {}),
  })),
);

/* ------------------------------------------------------------------ Entidades */

export type EntidadeEsperada = {
  texto: string;
  /** AAAA-MM-DD, com "agora" = quinta-feira, 05/11/2026, 15h (America/Sao_Paulo). */
  dia?: string | null;
  /** Faixa em minutos desde 0h; `null` = nenhuma. */
  periodo?: readonly [number, number] | null;
  /** Termo canônico de `ALIASES_DE_SERVICO`. */
  servico?: string | null;
  segmento?: string;
};

export const AGORA_DO_CORPUS = new Date("2026-11-05T15:00:00-03:00");

export const ENTIDADES: readonly EntidadeEsperada[] = [
  { texto: "amanhã", dia: "2026-11-06" },
  { texto: "depois de amanhã", dia: "2026-11-07" },
  { texto: "hoje", dia: "2026-11-05" },
  { texto: "hj", dia: "2026-11-05" },
  { texto: "amnh", dia: "2026-11-06" },
  { texto: "sexta", dia: "2026-11-06" },
  { texto: "sexta-feira", dia: "2026-11-06" },
  { texto: "sexta feira", dia: "2026-11-06" },
  { texto: "sábado", dia: "2026-11-07" },
  { texto: "sáb", dia: "2026-11-07" },
  { texto: "domingo", dia: "2026-11-08" },
  { texto: "segunda-feira", dia: "2026-11-09" },
  { texto: "terça da semana que vem", dia: "2026-11-10" },
  { texto: "sexta da semana que vem", dia: "2026-11-13" },
  { texto: "dia 15", dia: "2026-11-15" },
  { texto: "15/11", dia: "2026-11-15" },
  { texto: "dia 3", dia: "2026-12-03" },
  { texto: "daqui a 2 dias", dia: "2026-11-07" },
  { texto: "de manhã", periodo: [0, 720] },
  { texto: "pela manhã", periodo: [0, 720] },
  { texto: "amanhã cedo", dia: "2026-11-06", periodo: [0, 720] },
  { texto: "às 15h", periodo: [900, 959] },
  { texto: "15h", periodo: [900, 959] },
  { texto: "15:30", periodo: [930, 989] },
  { texto: "10h30", periodo: [630, 689] },
  { texto: "às 9", periodo: [540, 599] },
  { texto: "9h", periodo: [540, 599] },
  { texto: "às 3 da tarde", periodo: [900, 959] },
  { texto: "meio-dia", periodo: [720, 779] },
  { texto: "depois das 18", periodo: [1080, 1440] },
  { texto: "antes das 10", periodo: [0, 600] },
  { texto: "à tarde", periodo: [720, 1080] },
  { texto: "de tarde", periodo: [720, 1080] },
  { texto: "depois do almoço", periodo: [720, 1080] },
  { texto: "à noite", periodo: [1080, 1440] },
  { texto: "depois do trabalho", periodo: [1080, 1440] },
  { texto: "limpeza de pele", servico: "limpeza_de_pele", segmento: "estetica" },
  { texto: "design de sobrancelha", servico: "sobrancelha", segmento: "beleza" },
  { texto: "fazer a unha", servico: "manicure", segmento: "beleza" },
  { texto: "unha em gel", servico: "gel", segmento: "beleza" },
  { texto: "massagem relaxante", servico: "massagem", segmento: "estetica" },
  { texto: "drenagem linfática", servico: "massagem", segmento: "estetica" },
  { texto: "corte e barba", servico: "combo", segmento: "barbearia" },
  { texto: "escova", servico: "escova", segmento: "beleza" },
  { texto: "progressiva", servico: "progressiva", segmento: "beleza" },
  { texto: "cílios", servico: "cilios", segmento: "beleza" },
  { texto: "depilação", servico: "depilacao", segmento: "estetica" },
  { texto: "hidratação", servico: "hidratacao", segmento: "beleza" },
  { texto: "corte", servico: "corte", segmento: "barbearia" },
  { texto: "barba", servico: "barba", segmento: "barbearia" },
];
