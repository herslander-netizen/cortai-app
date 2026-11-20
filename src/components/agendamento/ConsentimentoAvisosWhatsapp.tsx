/**
 * Consentimento separado da reserva: nunca obrigatório e nunca pré-selecionado.
 * Não se confunde com a permissão da equipe ou com a ativação da IA do negócio.
 */
export function ConsentimentoAvisosWhatsapp({
  aceito,
  aoAlterar,
}: {
  aceito: boolean;
  aoAlterar: (aceito: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-left">
      <input
        type="checkbox"
        name="receberAvisosWhatsapp"
        checked={aceito}
        onChange={(evento) => aoAlterar(evento.currentTarget.checked)}
        className="mt-1 size-5 shrink-0 accent-gold"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-paper">
          Quero receber avisos pelo WhatsApp
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-mute">
          Confirmação, lembretes, alterações e avisos após meu atendimento. É opcional:
          posso agendar sem receber mensagens e cancelar os avisos enviando SAIR.
        </span>
      </span>
    </label>
  );
}
