import { Link } from "@tanstack/react-router";
import { Banknote, BarChart3, Megaphone, Package, Scissors, Star, Store, UserSquare2, UsersRound } from "lucide-react";

/** Atalhos para os módulos que a barbearia mais abre no dia a dia. */
const modulos = [
  { to: "/barbeiro/caixa", label: "Caixa", icon: Banknote },
  { to: "/barbeiro/produtos", label: "Loja", icon: Store },
  { to: "/barbeiro/servicos", label: "Serviços", icon: Scissors },
  { to: "/barbeiro/profissionais", label: "Profissionais", icon: UserSquare2 },
  { to: "/barbeiro/financeiro", label: "Relatórios", icon: BarChart3 },
  { to: "/barbeiro/fidelidade", label: "Voltaí", icon: Star },
  { to: "/barbeiro/indicacoes", label: "Marketing", icon: Megaphone },
  { to: "/barbeiro/equipe", label: "Equipe", icon: UsersRound },
  { to: "/barbeiro/fila", label: "Fila", icon: Package },
] as const;

export function HubModulos() {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-paper">Seus módulos</h2>
      <ul className="grid grid-cols-3 gap-3">
        {modulos.map((m) => {
          const Icon = m.icon;
          return (
            <li key={m.to}>
              <Link
                to={m.to}
                className="flex h-full flex-col items-center gap-2 rounded-xl border border-line bg-ink2 px-2 py-4 text-center transition-colors hover:border-gold/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink3 text-gold">
                  <Icon size={18} />
                </span>
                <span className="text-[11px] leading-tight text-paper">{m.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
