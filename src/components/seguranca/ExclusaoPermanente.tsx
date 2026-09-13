import { useId, useState } from "react";

/**
 * Padrão único de exclusão permanente do Cortaí:
 * confirmação explícita + senha da conta, validada no servidor.
 * A senha vive apenas neste estado local e é descartada ao fechar.
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
  onExcluir: (senha: string) => Promise<void>;
  onSucesso?: () => void;
  className?: string;
}) {
  const campoId = useId();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  function fechar() {
    setAberto(false);
    setSenha("");
    setErro(null);
    setProcessando(false);
  }

  async function confirmar() {
    if (!senha || processando) return;
    setProcessando(true);
    setErro(null);
    try {
      await onExcluir(senha);
      setSenha("");
      fechar();
      onSucesso?.();
    } catch (e) {
      setSenha("");
      setErro(
        e instanceof Error && /senha|conta|identidade|provedor|histórico|arquive|não encontrad/i.test(e.message)
          ? e.message
          : "Não foi possível excluir agora. Tente novamente.",
      );
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
          <div className="w-full max-w-sm rounded-xl border border-line bg-ink3 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
            <p className="text-sm font-semibold text-paper">{titulo}</p>
            <p className="mt-2 text-xs text-mute">{descricao}</p>
            <p className="mt-2 text-xs text-brick">Esta ação é irreversível.</p>

            <label className="mt-4 block text-xs text-mute2" htmlFor={campoId}>
              Digite sua senha para confirmar
            </label>
            <input
              id={campoId}
              type="password"
              autoComplete="current-password"
              value={senha}
              disabled={processando}
              onChange={(e) => setSenha(e.target.value)}
              className="input-premium mt-2 w-full"
            />
            {erro ? <p className="mt-2 text-xs text-brick">{erro}</p> : null}

            <div className="mt-5 flex justify-end gap-4">
              <button type="button" className="btn-tertiary text-xs" onClick={fechar} disabled={processando}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmar()}
                disabled={!senha || processando}
                className="rounded-lg bg-brick px-4 py-2 text-xs font-semibold text-paper disabled:opacity-40"
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
