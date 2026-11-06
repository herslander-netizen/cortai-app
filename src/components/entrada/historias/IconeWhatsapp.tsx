/**
 * Símbolo de WhatsApp da entrada (dono, 06/11/2026: "tirar o telefone do centro, deixar somente o balãozinho como
 * antes"): só o balão de conversa, no mesmo traço dos ícones do sistema (lucide). Desenho próprio, sem a marca oficial.
 */
export function IconeWhatsapp({
  size = 24,
  strokeWidth = 2,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}
