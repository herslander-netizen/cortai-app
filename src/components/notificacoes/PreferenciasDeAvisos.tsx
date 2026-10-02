import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

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

type Canal = "no_app" | "no_whatsapp";
type Preferencia = { tipo: string; no_app: boolean; no_whatsapp: boolean };

/** Padrão quando a pessoa ainda não escolheu nada para aquele aviso. */
const PADRAO: Omit<Preferencia, "tipo"> = { no_app: true, no_whatsapp: false };

const ROTULO_DO_CANAL: Record<Canal, string> = { no_app: "No app", no_whatsapp: "WhatsApp" };

export function PreferenciasDeAvisos() {
  const queryClient = useQueryClient();
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300000,
  });
  const tenantId = sessao?.tenantId ?? null;
  const userId = sessao?.userId ?? null;
  const chaveDaLista = ["preferencias-avisos", tenantId, userId] as const;

  const { data: prefs, isLoading } = useQuery({
    queryKey: chaveDaLista,
    enabled: !!tenantId && !!userId,
    queryFn: async (): Promise<Preferencia[]> => {
      const { data, error } = await supabase
        .from("notificacoes_preferencias")
        .select("tipo, no_app, no_whatsapp")
        .eq("tenant_id", tenantId!)
        .eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as Preferencia[];
    },
  });

  const linhaDe = (lista: Preferencia[] | undefined, tipo: string): Preferencia => {
    const achado = (lista ?? []).find((x) => x.tipo === tipo);
    return achado ?? { tipo, ...PADRAO };
  };

  // Cada canal é independente: gravamos os dois valores sempre juntos.
  const salvar = useMutation({
    mutationFn: async (linha: Preferencia) => {
      const { error } = await supabase.from("notificacoes_preferencias").upsert(
        {
          tenant_id: tenantId!,
          user_id: userId!,
          tipo: linha.tipo,
          no_app: linha.no_app,
          no_whatsapp: linha.no_whatsapp,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "tenant_id,user_id,tipo" },
      );
      if (error) throw new Error(error.message);
    },
    onMutate: async (linha) => {
      await queryClient.cancelQueries({ queryKey: chaveDaLista });
      const anterior = queryClient.getQueryData<Preferencia[]>(chaveDaLista);
      queryClient.setQueryData<Preferencia[]>(chaveDaLista, (atual) => {
        const lista = (atual ?? []).filter((x) => x.tipo !== linha.tipo);
        return [...lista, linha];
      });
      return { anterior };
    },
    onError: (_erro, _linha, contexto) => {
      queryClient.setQueryData(chaveDaLista, contexto?.anterior);
      aviso.erro("Não deu certo salvar essa preferência. Tenta de novo?");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaveDaLista });
    },
  });

  if (!tenantId || !userId) return null;

  const alternar = (tipo: string, canal: Canal) => {
    const atual = linhaDe(prefs, tipo);
    salvar.mutate({ ...atual, tipo, [canal]: !atual[canal] });
  };

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xs font-semibold uppercase text-mute2">Avisos</h2>
      <p className="mb-3 text-xs text-mute">
        Escolha onde quer receber cada aviso. Você pode ativar mais de um canal.
      </p>
      <ul className="divide-y divide-line border-y border-line">
        {TIPOS.map((t) => {
          const linha = linhaDe(prefs, t.chave);
          return (
            <li
              key={t.chave}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-paper">{t.rotulo}</span>
              <span className="flex gap-2">
                {(["no_app", "no_whatsapp"] as Canal[]).map((canal) => {
                  const ativo = linha[canal];
                  return (
                    <button
                      key={canal}
                      type="button"
                      role="checkbox"
                      aria-checked={ativo}
                      aria-label={`${ROTULO_DO_CANAL[canal]} — ${t.rotulo}`}
                      disabled={isLoading}
                      onClick={() => alternar(t.chave, canal)}
                      className={`flex items-center gap-1.5 min-h-11 rounded-full border px-3.5 text-xs transition-transform duration-100 active:scale-[0.97] disabled:opacity-50 ${
                        ativo ? "border-gold/45 bg-gold-soft text-gold" : "border-line text-mute"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border ${
                          ativo
                            ? "border-gold bg-gold/20 text-gold"
                            : "border-line2 text-transparent"
                        }`}
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      {ROTULO_DO_CANAL[canal]}
                    </button>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
