import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  aoTocar: () => Promise<unknown> | unknown;
  children: ReactNode;
};

/**
 * Botão de ação demorada: trava o clique duplo, mantém a largura,
 * mostra o carregando só depois de 300ms e confirma com um ✓ por 600ms.
 */
export function BotaoAcao({ aoTocar, children, className = "", disabled, ...resto }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [mostrarCarregando, setMostrarCarregando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const largura = useRef<number | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const vivo = useRef(true);

  useEffect(() => () => { vivo.current = false; }, []);

  async function executar() {
    if (ocupado) return;
    largura.current = ref.current?.offsetWidth ?? null;
    setOcupado(true);
    const atraso = setTimeout(() => vivo.current && setMostrarCarregando(true), 300);
    try {
      await aoTocar();
      if (!vivo.current) return;
      setConcluido(true);
      setTimeout(() => vivo.current && setConcluido(false), 600);
    } finally {
      clearTimeout(atraso);
      if (vivo.current) {
        setOcupado(false);
        setMostrarCarregando(false);
      }
    }
  }

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || ocupado}
      onClick={() => void executar()}
      style={largura.current && ocupado ? { minWidth: largura.current } : undefined}
      className={`inline-flex items-center justify-center gap-2 transition-transform duration-100 active:scale-[0.97] disabled:opacity-70 ${className}`}
      {...resto}
    >
      {mostrarCarregando ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
      {concluido ? <Check size={15} aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
}
