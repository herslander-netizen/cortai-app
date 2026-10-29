import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ESPERA_MS } from "@/lib/movimento-figaro";

/**
 * Padrão único de feedback para ações assíncronas do Flow:
 * bloqueia duplo clique, marca qual ação está em andamento,
 * avisa sucesso e erro de forma consistente.
 *
 * `concluiu(chave)` fica verdadeiro por 700 ms depois que a ação deu certo (estado `Success` do botão principal
 * do Figaro: ✓ + rótulo). Só depois de sucesso real: com erro, o botão volta direto ao normal.
 */
export function useAcao() {
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const [concluida, setConcluida] = useState<string | null>(null);
  const travado = useRef(false);
  const relogio = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (relogio.current) window.clearTimeout(relogio.current);
    },
    [],
  );

  const executar = useCallback(
    async <T>(
      chave: string,
      tarefa: () => Promise<T>,
      opcoes: {
        sucesso?: string;
        erro?: string;
        aoConcluir?: (resultado: T) => void | Promise<void>;
      } = {},
    ): Promise<T | undefined> => {
      if (travado.current) return undefined;
      travado.current = true;
      if (relogio.current) window.clearTimeout(relogio.current);
      setConcluida(null);
      setEmAndamento(chave);
      try {
        const resultado = await tarefa();
        if (opcoes.aoConcluir) await opcoes.aoConcluir(resultado);
        if (opcoes.sucesso) toast.success(opcoes.sucesso);
        setConcluida(chave);
        relogio.current = window.setTimeout(() => {
          relogio.current = null;
          setConcluida(null);
        }, ESPERA_MS.sucessoDoBotao);
        return resultado;
      } catch (e) {
        const mensagem =
          e instanceof Error && e.message
            ? e.message
            : (opcoes.erro ?? "Não foi possível concluir agora. Tente novamente.");
        toast.error(mensagem);
        return undefined;
      } finally {
        travado.current = false;
        setEmAndamento(null);
      }
    },
    [],
  );

  return {
    emAndamento,
    ocupado: emAndamento !== null,
    estaEm: (chave: string) => emAndamento === chave,
    concluiu: (chave: string) => concluida === chave,
    executar,
  };
}
