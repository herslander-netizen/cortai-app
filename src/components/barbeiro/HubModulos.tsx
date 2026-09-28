import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { modulosDeNavegacao } from "@/lib/navegacao-barbeiro";
import { getSessao } from "@/lib/sessao.functions";

export function HubModulos() {
  const { data: sessao } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao(), staleTime: 300000 });
  const modulos = modulosDeNavegacao(sessao?.segmento ?? "barbearia").filter((modulo) => sessao?.permissoes.includes(modulo.permissao)).slice(0, 4);
  if (!modulos.length) return null;
  return (
    <section className="mt-8">
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><div><h2 className="text-sm font-semibold text-paper">Atalhos da sua função</h2><p className="mt-1 text-xs text-mute">Acesso rápido ao que você usa no dia a dia.</p></div><Link to="/barbeiro/mais" className="text-xs font-semibold text-gold">Ver tudo</Link></div>
      <ul className="divide-y divide-line border-y border-line">
        {modulos.map((m) => {
          const Icon = m.icon;
          return (
            <li key={m.to}>
              <Link
                to={m.to}
                className="nav-list-item"
              >
                <span className="nav-list-icon">
                  <Icon size={18} />
                </span>
                <span className="min-w-0"><span className="block text-sm font-semibold text-paper">{m.label}</span><span className="mt-1 block truncate text-xs text-mute">{m.detail}</span></span>
                <ChevronRight size={16} className="text-mute2" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
