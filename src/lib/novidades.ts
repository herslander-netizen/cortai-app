/** Fonte única das novidades da versão atual. Ao mudar a versão, suba também public/versao.json. */
export const VERSAO_DAS_NOVIDADES = "3.0.0";
export const TITULO_DAS_NOVIDADES = "Novidades do Flow 3.0";
export const CHAVE_NOVIDADES_VISTA = "cortai:novidades-vista";

export const NOVIDADES: readonly string[] = [
  "Agenda nova: semana e mês no topo, com pontinho nos dias que têm atendimento.",
  "Linha do tempo completa, de 00h às 23h, com o fora do expediente listrado.",
  'Botão "+" com ações que saltam na tela, "Agendar horário" em destaque, e botões maiores.',
  'Notificações em tela cheia, com abas "Não lidas" e "Todas".',
  "Visual mais limpo e leve, com novo fundo no modo claro e escuro.",
  "Agenda sem rodapé, com dica de uso que aparece só uma vez.",
  "Menu lateral com o desempenho da sua página (visitas, agendamentos e conversão) e convite para ativar notificações.",
  "Para barbearias, salões e outros negócios de beleza: o Flow se adapta ao seu tipo de negócio.",
  "Telas de cadastro e perfil do cliente redesenhadas, com textos revisados.",
];

export function lerNovidadesVista(): string | null {
  try {
    return window.localStorage.getItem(CHAVE_NOVIDADES_VISTA);
  } catch {
    return null;
  }
}

export function marcarNovidadesVista() {
  try {
    window.localStorage.setItem(CHAVE_NOVIDADES_VISTA, VERSAO_DAS_NOVIDADES);
  } catch {
    /* sem armazenamento: só não registra */
  }
}
