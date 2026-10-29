import { useNavigate } from "@tanstack/react-router";
import { UserRoundPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CHAVE_VINCULO } from "@/lib/vinculo";

/**
 * Convite opcional, depois do agendamento confirmado, para criar a conta Flow.
 * Nunca bloqueia nem esconde as ações da confirmação; só aparece sem sessão.
 * A prova (agendamento + telefone) fica guardada para vincular a ficha à conta nova.
 */
export function ConviteDeConta({
  agendamentoId,
  telefone,
}: {
  agendamentoId: string;
  telefone: string;
}) {
  const navigate = useNavigate();
  const [semSessao, setSemSessao] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    let ativo = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (ativo) setSemSessao(!data.session);
    });
    return () => {
      ativo = false;
    };
  }, []);

  if (!semSessao || dispensado) return null;

  function criarConta() {
    try {
      localStorage.setItem(
        CHAVE_VINCULO,
        JSON.stringify({ agendamentoId, telefone: telefone.replace(/\D/g, "") }),
      );
    } catch {
      // Sem armazenamento local a conta é criada igual; só não vincula automaticamente.
    }
    void navigate({ to: "/login", search: { aba: "criar", proximo: "/app" } });
  }

  return (
    <section className="mt-6 rounded-[var(--raio-bloco)] border border-line p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-paper">
        <UserRoundPlus size={16} className="text-gold" aria-hidden />
        Quer facilitar seus próximos agendamentos?
      </p>
      <p className="mt-1 text-xs leading-relaxed text-mute">
        Crie sua conta Flow e tenha agendamentos, comandas, histórico e fidelidade sempre à mão. É
        opcional — seu horário já está garantido.
      </p>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Button variant="outline" onClick={criarConta}>
          Criar minha conta
        </Button>
        <Button variant="ghost" onClick={() => setDispensado(true)}>
          Agora não
        </Button>
      </div>
    </section>
  );
}
