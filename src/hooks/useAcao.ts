import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Padrão único de feedback para ações assíncronas do Cortaí:
 * bloqueia duplo clique, marca qual ação está em andamento,
 * avisa sucesso e erro de forma consistente.
 */
export function useAcao() {
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const travado = useRef(false);

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
      setEmAndamento(chave);
      try {
        const resultado = await tarefa();
        if (opcoes.aoConcluir) await opcoes.aoConcluir(resultado);
        if (opcoes.sucesso) toast.success(opcoes.sucesso);
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
    executar,
  };
}
