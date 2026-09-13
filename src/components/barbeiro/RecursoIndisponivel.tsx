import { Link } from "@tanstack/react-router";
import { PowerOff } from "lucide-react";

/** Tela curta e amigável quando o recurso está desligado para a barbearia. */
export function RecursoIndisponivel({ titulo, podeGerenciar }: { titulo: string; podeGerenciar?: boolean }) {
  return (
    <section className="rounded-xl border border-line bg-ink2 p-6 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink3 text-mute">
        <PowerOff size={18} />
      </span>
      <h2 className="mt-4 text-base font-semibold text-paper">{titulo} está desligado</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-mute">Seus dados continuam salvos. Ao reativar, tudo volta como estava.</p>
      <Link to={podeGerenciar ? "/barbeiro/recursos" : "/barbeiro"} className="mt-5 inline-block text-xs font-semibold text-gold underline">
        {podeGerenciar ? "Gerenciar recursos" : "Voltar para a visão geral"}
      </Link>
    </section>
  );
}
