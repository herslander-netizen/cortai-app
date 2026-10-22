/**
 * Ícone `CheckCircle` do Material (preenchido) que o Figaro mostra no botão em sucesso
 * (`ButtonState.Success`, `Icons.Default.CheckCircle`, 20 dp). O visto fica vazado no círculo.
 */
export function IconeCheckCircle({
  tamanho = 20,
  ...props
}: React.ComponentProps<"svg"> & { tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={tamanho}
      height={tamanho}
      style={{ width: tamanho, height: tamanho }}
      {...props}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}
