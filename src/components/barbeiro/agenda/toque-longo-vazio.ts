export const DURACAO_TOQUE_LONGO_VAZIO = 450;
export const LIMITE_MOVIMENTO_TOQUE_VAZIO = 8;

type Inicio = { pointerId: number; x: number; y: number };

type Opcoes = {
  aoConfirmar: () => void;
  aoCancelar?: () => void;
  agendar?: typeof setTimeout;
  cancelarAgendamento?: typeof clearTimeout;
};

/** Gesto puro de toque longo, sem captura nem bloqueio dos eventos nativos. */
export function criarToqueLongoVazio({
  aoConfirmar,
  aoCancelar,
  agendar = setTimeout,
  cancelarAgendamento = clearTimeout,
}: Opcoes) {
  let inicio: Inicio | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function limpar(avisar: boolean) {
    if (timer !== null) cancelarAgendamento(timer);
    const existia = inicio !== null;
    timer = null;
    inicio = null;
    if (avisar && existia) aoCancelar?.();
  }

  function comecar(proximo: Inicio) {
    if (inicio) limpar(true);
    inicio = proximo;
    timer = agendar(() => {
      if (!inicio) return;
      timer = null;
      inicio = null;
      aoConfirmar();
    }, DURACAO_TOQUE_LONGO_VAZIO);
  }

  function mover(pointerId: number, x: number, y: number) {
    if (!inicio || inicio.pointerId !== pointerId) return;
    if (Math.hypot(x - inicio.x, y - inicio.y) > LIMITE_MOVIMENTO_TOQUE_VAZIO) limpar(true);
  }

  function terminar(pointerId: number) {
    if (inicio?.pointerId === pointerId) limpar(true);
  }

  function novoPonteiro(pointerId: number) {
    if (inicio && inicio.pointerId !== pointerId) limpar(true);
  }

  return {
    comecar,
    mover,
    terminar,
    novoPonteiro,
    cancelar: () => limpar(true),
    ativo: () => inicio !== null,
  };
}