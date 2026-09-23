import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getSessao } from "@/lib/sessao.functions";
import { aviso } from "@/lib/avisos";

const TIPOS = [
  { chave: "agendamento_novo", rotulo: "Novo agendamento" },
  { chave: "agendamento_cancelado", rotulo: "Cancelamento" },
  { chave: "agendamento_remarcado", rotulo: "Remarcação" },
  { chave: "fila", rotulo: "Cliente entrou na fila" },
  { chave: "fiado", rotulo: "Fiado em aberto" },
  { chave: "pix", rotulo: "Pix recebido" },
] as const;

type Preferencia = { tipo: string; no_app: boolean; no_whatsapp: boolean };

export function PreferenciasDeAvisos() {
  const queryClient = useQueryClient();
  const { data: sessao } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao(), staleTime: 300000 });
  const tenantId = sessao?.tenantId ?? null;
  const userId = sessao?.userId ?? null;

  const { data: prefs } = useQuery({
    queryKey: ["preferencias-avisos", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Preferencia[]> => {
      const { data, error } = await supabase
        .from("notificacoes_preferencias")
        .select("tipo, no_app, no_whatsapp")
        .eq("tenant_id", tenantId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as Preferencia[];
    },
  });

  if (!tenantId || !userId) return null;

  function valor(tipo: string, canal: "no_app" | "no_whatsapp") {
    const p = (prefs ?? []).find((x) => x.tipo === tipo);
    if (!p) return canal === "no_app";
    return p[canal];
  }

  async function alternar(tipo: string, canal: "no_app" | "no_whatsapp") {
    const atual = valor(tipo, canal);
    const linha = {
      tenant_id: tenantId!,
      user_id: userId!,
      tipo,
      no_app: canal === "no_app" ? !atual : valor(tipo, "no_app"),
      no_whatsapp: canal === "no_whatsapp" ? !atual : valor(tipo, "no_whatsapp"),
      atualizado_em: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("notificacoes_preferencias")
      .upsert(linha, { onConflict: "tenant_id,user_id,tipo" });
    if (error) {
      aviso.erro("Não deu certo salvar essa preferência. Tenta de novo?");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["preferencias-avisos", tenantId] });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Avisos</h2>
      <p className="mb-3 text-xs text-mute">Escolha onde quer receber cada aviso.</p>
      <ul className="divide-y divide-line border-y border-line">
        {TIPOS.map((t) => (
          <li key={t.chave} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
            <span className="min-w-0 truncate text-sm text-paper">{t.rotulo}</span>
            <span className="flex gap-2">
              {(["no_app", "no_whatsapp"] as const).map((canal) => {
                const ativo = valor(t.chave, canal);
                return (
                  <button
                    key={canal}
                    type="button"
                    onClick={() => void alternar(t.chave, canal)}
                    aria-pressed={ativo}
                    className={`rounded-full border px-3 py-1.5 text-[11px] transition-transform duration-100 active:scale-[0.97] ${
                      ativo ? "border-gold/45 bg-gold-soft text-gold" : "border-line text-mute"
                    }`}
                  >
                    {canal === "no_app" ? "No app" : "WhatsApp"}
                  </button>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
