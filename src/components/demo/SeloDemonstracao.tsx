import { useQuery } from "@tanstack/react-query";
import { FlaskConical, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SLUG_DEMONSTRACAO } from "@/lib/demonstracao.functions";
import { getSessao } from "@/lib/sessao.functions";

/** Aviso discreto e permanente de que a barbearia aberta é fictícia. */
export function SeloDemonstracao() {
  const { data } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao(), staleTime: 300000 });
  if (data?.tenantSlug !== SLUG_DEMONSTRACAO) return null;

  return (
    <div className="sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-gold/25 bg-gold/10 px-4 py-2 backdrop-blur-md">
      <FlaskConical size={14} className="text-gold" aria-hidden />
      <p className="truncate text-[11px] font-medium tracking-wide text-paper">
        Modo demonstração · dados fictícios
      </p>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full border border-line2 px-3 py-1 text-[11px] text-mute"
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.assign("/");
        }}
      >
        <LogOut size={12} aria-hidden />
        Sair
      </button>
    </div>
  );
}
