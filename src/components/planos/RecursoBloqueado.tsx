import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

/** Erro de plano bloqueado vindo do servidor (planos.ts). */
export function ehRecursoBloqueado(erro: unknown) {
  return erro instanceof Error && erro.message.includes("não está incluído no plano");
}

/**
 * Estado elegante para quando o plano da barbearia não inclui o recurso.
 * Nunca quebra a tela: explica em uma frase e oferece o caminho de saída.
 */
export function RecursoBloqueado({ titulo, erro, children }: { titulo: string; erro?: unknown; children?: ReactNode }) {
  const explicacao =
    erro instanceof Error && ehRecursoBloqueado(erro)
      ? erro.message
      : "Este recurso não está incluído no plano atual da sua barbearia.";
  return (
    <section className="surface p-6 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink3 text-gold">
        <Lock size={18} />
      </span>
      <h2 className="mt-4 text-base font-semibold text-paper">{titulo}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-mute">{explicacao}</p>
      <p className="mt-3 text-xs text-mute2">Seus dados continuam salvos. Nada foi apagado.</p>
      {children ?? (
        <Link to="/barbeiro/conta" className="mt-5 inline-block text-xs font-semibold text-gold underline">
          Ver meu plano
        </Link>
      )}
    </section>
  );
}
