import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ShieldCheck, Store } from "lucide-react";
import { useState } from "react";

import { esquecerSessao } from "@/lib/guarda";
import { escolherContexto } from "@/lib/sessao.functions";

/**
 * Troca entre o painel do ADM e o painel do negócio na mesma conta (admin da plataforma que
 * também é dono ou equipe de um negócio). O servidor confere o papel e o vínculo.
 */
export function TrocarPainel({ para }: { para: "admin" | "negocio" }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const Icone = para === "admin" ? ShieldCheck : Store;

  async function trocar() {
    setEnviando(true);
    setErro(null);
    try {
      await escolherContexto({ data: { contexto: para } });
      esquecerSessao();
      qc.clear();
      await navigate({ to: para === "admin" ? "/admin" : "/barbeiro", replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível trocar de painel agora.");
      setEnviando(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void trocar()}
        disabled={enviando}
        className="nav-list-item w-full text-left disabled:opacity-60"
      >
        <span className="nav-list-icon">
          <Icone size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-paper">
            {para === "admin" ? "Painel do ADM" : "Painel do negócio"}
          </span>
          <span className="mt-1 block text-xs text-mute">
            {enviando
              ? "Abrindo…"
              : para === "admin"
                ? "Administração da plataforma Cortaí"
                : "Agenda, clientes e caixa dos seus negócios"}
          </span>
        </span>
        <ChevronRight size={17} className="text-mute2" />
      </button>
      {erro ? (
        <p className="mt-2 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
