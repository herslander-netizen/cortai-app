/**
 * Textos do agendamento na conversa do WhatsApp (sem IA). Curto, estilo WhatsApp, uma pergunta por vez e sempre com
 * dia da semana e data (docs/conversa-padrao.md §1 e §3). Tudo no fuso do negócio.
 */

export type Opcao = { valor: string; rotulo: string; extra?: string | null };

/** "sábado, 08/11" no fuso do negócio. */
export function diaPorExtenso(iso: string, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

/** "15:00" no fuso do negócio. */
export function horaDe(iso: string, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/** "sábado, 08/11, às 15:00". */
export function quandoPorExtenso(iso: string, fuso: string): string {
  return `${diaPorExtenso(iso, fuso)}, às ${horaDe(iso, fuso)}`;
}

/** Minutos desde a meia-noite, no fuso do negócio. */
export function minutosNoFuso(iso: string, fuso: string): number {
  const [h, m] = horaDe(iso, fuso).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function reais(centavos: number | null | undefined): string {
  const valor = (Number(centavos) || 0) / 100;
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

/** Pergunta com opções numeradas (a Evolution não tem botões confiáveis; números funcionam em todo canal). */
export function menu(pergunta: string, opcoes: readonly Opcao[], rodape?: string): string {
  // Mesmo padrão do envio (`paraWhatsApp`): número em negrito sem recuo e uma linha em branco depois da pergunta.
  const linhas = opcoes.map((o, i) => `*${i + 1})* ${o.rotulo}`);
  return [pergunta, "", ...linhas, ...(rodape ? ["", rodape] : [])].join("\n");
}

export const TEXTOS = {
  qualServico: "Qual serviço você quer?",
  comQuem: "Com quem você prefere?",
  tantoFaz: "Tanto faz",
  qualNome: "Para concluir, qual é o seu nome?",
  nomeInvalido: "Não entendi o nome. Pode me dizer só o seu nome?",
  outroDia: "Se preferir outro dia ou horário, é só me dizer (ex.: amanhã à tarde).",
  // Escolhas destacadas em caixa alta e negrito (dono, 06/11/2026: "Sim ou não em caixa alta").
  responderSimOuNao: "Responda *SIM* para confirmar ou *NÃO* para mudar.",
  continuando: "Oi! Vamos continuar de onde paramos.",
  perdeuHorario: "Sem problema, acontece! Vamos marcar um novo horário.",
  desistiu: "Tudo bem, não marquei nada. Se precisar, é só chamar.",
  mantido: "Tudo bem, mantive seu horário.",
  naoMarcou: "Sem problema, não marquei. Me diga outro dia ou horário, ou *menu* para recomeçar.",
  naoEntendiHorario: "Não entendi. Responda com o número do horário ou me diga outro dia.",
  // Áudio que não deu para entender no meio do atendimento (dono, 06/11/2026): segue pelo texto, sem travar.
  audioNaoEntendido:
    "Não consegui entender direito esse áudio. Pode escrever o número da opção, ou mandar o áudio de novo?",
  audioSigaPorTexto:
    "No momento não estamos conseguindo ouvir bem os áudios, mas dá para continuar por aqui escrevendo. Basta dizer o que você quer e o horário que prefere, que a gente vai ajustando. Assim que for possível ouvir seu áudio, a conversa continua por voz também.",
  naoEntendiOpcao: "Não entendi. Responda com o número de uma das opções.",
  ocupado: "Esse horário acabou de ser ocupado. Veja os que ainda estão livres:",
  semHorarioAgendado:
    "Não encontrei horário marcado neste número. Quer agendar? É só me dizer *agendar*.",
  semServicos:
    "Ainda não há serviços disponíveis para agendar por aqui. A equipe te responde por aqui.",
  falhaGravar:
    "Não consegui concluir agora. Tente de novo em instantes ou fale com a equipe por aqui.",
} as const;

export function semHorarioNoDia(dia: string, fuso: string): string {
  return `Não tenho horário livre ${diaPorExtenso(`${dia}T15:00:00Z`, fuso)}.`;
}

export function semHorarioProximo(dias: number, link: string | null): string {
  return `Não encontrei horário livre nos próximos ${dias} dias.${link ? ` Você também pode ver pelo link: ${link}` : ""}`;
}
