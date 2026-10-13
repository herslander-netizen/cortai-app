import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { aviso } from "@/lib/avisos";

type Pref = {
  whatsapp_ativo: boolean;
  push_ativo: boolean;
  frequencia: "padrao" | "frequente" | "minima";
  silencio_inicio: string | null;
  silencio_fim: string | null;
};
const PADRAO: Pref = {
  whatsapp_ativo: true,
  push_ativo: true,
  frequencia: "padrao",
  silencio_inicio: null,
  silencio_fim: null,
};

const FREQ: { v: Pref["frequencia"]; r: string }[] = [
  { v: "padrao", r: "Véspera e 2h antes" },
  { v: "minima", r: "Só 2h antes" },
];

/** Preferências de lembrete do cliente; vale para todas as barbearias em que ele é cliente. */
export function PreferenciasDoCliente() {
  const qc = useQueryClient();
  const chave = ["preferencias-cliente-avisos"];
  const { data } = useQuery({
    queryKey: chave,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, tenant_id")
        .eq("user_id", u.user.id);
      if (!clientes?.length) return null;
      const { data: prefs } = await supabase
        .from("preferencias_do_cliente_avisos")
        .select("whatsapp_ativo, push_ativo, frequencia, silencio_inicio, silencio_fim")
        .in(
          "cliente_id",
          clientes.map((c) => c.id),
        )
        .limit(1);
      return { clientes, pref: (prefs?.[0] as Pref | undefined) ?? PADRAO };
    },
  });

  const salvar = useMutation({
    mutationFn: async (p: Pref) => {
      const linhas = (data?.clientes ?? []).map((c) => ({
        cliente_id: c.id,
        tenant_id: c.tenant_id,
        ...p,
      }));
      const { error } = await supabase
        .from("preferencias_do_cliente_avisos")
        .upsert(linhas, { onConflict: "cliente_id" });
      if (error) throw new Error(error.message);
    },
    onMutate: (p) => {
      const anterior = qc.getQueryData(chave);
      qc.setQueryData(chave, (a: typeof data) => (a ? { ...a, pref: p } : a));
      return { anterior };
    },
    onError: (_e, _p, ctx) => {
      qc.setQueryData(chave, ctx?.anterior);
      aviso.erro("Não deu certo salvar. Tenta de novo?");
    },
  });

  if (!data) return null;
  const p = data.pref;
  const mudar = (parcial: Partial<Pref>) => salvar.mutate({ ...p, ...parcial });
  const chip = (ativo: boolean) =>
    `h-auto min-h-12 rounded-full border px-4 text-sm ${ativo ? "border-gold/45 bg-gold-soft text-paper" : "border-line text-mute"}`;

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Lembretes do horário</h2>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          role="switch"
          aria-checked={p.whatsapp_ativo}
          className={chip(p.whatsapp_ativo)}
          onClick={() => mudar({ whatsapp_ativo: !p.whatsapp_ativo })}
        >
          WhatsApp
        </Button>
        <Button
          type="button"
          variant="ghost"
          role="switch"
          aria-checked={p.push_ativo}
          className={chip(p.push_ativo)}
          onClick={() => mudar({ push_ativo: !p.push_ativo })}
        >
          No celular
        </Button>
      </div>
      <p className="mb-2 mt-4 text-xs text-mute">Quando avisar</p>
      <div className="flex flex-wrap gap-2">
        {FREQ.map((f) => (
          <Button
            key={f.v}
            type="button"
            variant="ghost"
            aria-pressed={p.frequencia === f.v}
            className={chip(p.frequencia === f.v)}
            onClick={() => mudar({ frequencia: f.v })}
          >
            {f.r}
          </Button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-xs text-mute">Não me avisar entre</p>
      <div className="flex items-center gap-2 text-sm text-paper">
        <input
          type="time"
          aria-label="Início do silêncio"
          value={p.silencio_inicio?.slice(0, 5) ?? ""}
          onChange={(e) => mudar({ silencio_inicio: e.target.value || null })}
          className="field-control w-auto"
        />
        <span className="text-mute">e</span>
        <input
          type="time"
          aria-label="Fim do silêncio"
          value={p.silencio_fim?.slice(0, 5) ?? ""}
          onChange={(e) => mudar({ silencio_fim: e.target.value || null })}
          className="field-control w-auto"
        />
      </div>
    </section>
  );
}
