import { useId, useState } from "react";

/**
 * Padrão único de exclusão permanente do Cortaí: mostra o que será apagado e
 * só libera o botão depois da confirmação explícita. Permissões valem no servidor.
 */
export function ExclusaoPermanente({
  rotulo = "Excluir permanentemente",
  titulo,
  descricao,
  onExcluir,
  onSucesso,
  className = "text-xs text-brick underline",
}: {
  rotulo?: string;
  titulo: string;
  descricao: string;
  onExcluir: () => Promise<string | null | void>;
  onSucesso?: (aviso: string | null) => void;
  className?: string;
}) {
  const campoId = useId();
  const [aberto, setAberto] = useState(false);
  const [entendo, setEntendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  function fechar() {
    setAberto(false);
    setEntendo(false);
    setErro(null);
    setProcessando(false);
  }

  async function confirmar() {
    if (!entendo || processando) return;
    setProcessando(true);
    setErro(null);
    try {
      const aviso = await onExcluir();
      fechar();
      onSucesso?.(aviso ?? null);
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível excluir agora. Tente novamente.");
      setProcessando(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setAberto(true)}>
        {rotulo}
      </button>

      {aberto ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
        >
          <div className="max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-xl border border-line bg-ink3 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
            <p className="text-sm font-semibold text-paper">{titulo}</p>
            <p className="mt-2 text-xs text-mute">{descricao}</p>
            <p className="mt-2 text-xs text-brick">Esta ação é irreversível.</p>

            <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-xs text-paper" htmlFor={campoId}>
              <input
                id={campoId}
                type="checkbox"
                checked={entendo}
                disabled={processando}
                onChange={(e) => setEntendo(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brick)]"
              />
              Entendo que isso apaga tudo e não tem volta
            </label>
            {erro ? <p className="mt-2 text-xs text-brick">{erro}</p> : null}

            <div className="mt-5 flex justify-end gap-4">
              <button type="button" className="btn-tertiary text-xs" onClick={fechar} disabled={processando}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmar()}
                disabled={!entendo || processando}
                className="min-h-11 rounded-lg bg-brick px-4 py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-40"
              >
                {processando ? "Excluindo…" : "Excluir permanentemente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
