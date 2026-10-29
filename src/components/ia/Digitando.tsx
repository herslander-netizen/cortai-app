/**
 * Indicador de que a Flow IA está processando a resposta: três pontos discretos.
 * Existe somente enquanto há processamento real — nunca como enfeite.
 */
export function Digitando({ rotulo = "Flow IA" }: { rotulo?: string }) {
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <span className="text-xs text-mute2">{rotulo}</span>
      <span className="cortai-digitando" aria-label="Flow IA está pensando">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
