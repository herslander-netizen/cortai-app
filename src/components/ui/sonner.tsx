import { Toaster as Sonner } from "sonner";
import { Check, CircleAlert, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Caixa do ícone do aviso: cor suave do Figaro, sem o verde e vermelho sólidos de antes. */
const caixa = (cor: string, Icone: typeof Check) => (
  <span className={`grid size-9 place-items-center rounded-[12px] ${cor}`} aria-hidden>
    <Icone className="size-5" strokeWidth={2.4} />
  </span>
);

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: caixa(
          "bg-[var(--figaro-primary-container)] text-[var(--figaro-on-primary-container)]",
          Check,
        ),
        error: caixa(
          "bg-[var(--figaro-error-container)] text-[var(--figaro-on-error-container)]",
          CircleAlert,
        ),
        info: caixa(
          "bg-[var(--figaro-surface-container-highest)] text-[var(--figaro-on-surface)]",
          Info,
        ),
      }}
      toastOptions={{
        classNames: {
          icon: "!h-9 !w-9 shrink-0 !m-0",
          toast:
            "group toast gap-3 rounded-[20px] border-0 bg-[var(--figaro-surface-container-high)] p-3.5 text-[var(--figaro-on-surface)] shadow-[var(--elevacao-8)] group-[.toaster]:text-[var(--figaro-on-surface)]",
          title: "text-[15px] font-medium leading-5",
          description: "text-[13px] leading-[18px] text-[var(--figaro-on-surface-variant)]",
          actionButton:
            "ml-auto h-9 min-h-0 rounded-full bg-[var(--figaro-primary)] px-4 text-sm font-semibold text-[var(--figaro-on-primary)]",
          cancelButton:
            "rounded-full bg-[var(--figaro-surface-container-highest)] text-[var(--figaro-on-surface)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
