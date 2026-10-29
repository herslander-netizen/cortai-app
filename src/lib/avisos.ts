import { toast } from "sonner";

/** Tom do Flow para as mensagens rápidas. */
export const aviso = {
  ok: (texto = "Pronto.") => toast.success(texto),
  erro: (texto = "Não deu certo. Tenta de novo?") => toast.error(texto),
  info: (texto: string) => toast(texto),
};

/**
 * Ação que pode ser desfeita: em vez de perguntar antes, faz e oferece
 * "Desfazer" por 5 segundos.
 */
export function comDesfazer(texto: string, desfazer: () => void | Promise<void>) {
  toast(texto, {
    duration: 5000,
    className: "toast-desfazer",
    action: { label: "Desfazer", onClick: () => void desfazer() },
  });
}

export function avisosGuardados(total: number) {
  toast(`${total} ${total === 1 ? "aviso guardado" : "avisos guardados"} enquanto você atendia`, {
    duration: 6000,
    action: {
      label: "Ver avisos",
      onClick: () => window.dispatchEvent(new Event("cortai:abrir-avisos")),
    },
  });
}
