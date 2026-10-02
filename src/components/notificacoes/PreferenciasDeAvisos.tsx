import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getSessao } from "@/lib/sessao.functions";
import { aviso } from "@/lib/avisos";
import { tipoDePushValido } from "@/lib/push/regras";
import { pushAtivoNesteAparelho, precisaInstalarParaPush } from "@/lib/push/aparelho";
import { ativarAvisosDaEquipe, TEXTO_INSTALAR_PRIMEIRO } from "@/lib/push/ativar";
import { useEffect, useState } from "react";

const TIPOS = [
  { chave: "agendamento_novo", rotulo: "Novo agendamento" },
  { chave: "agendamento_cancelado", rotulo: "Cancelamento" },
  { chave: "agendamento_remarcado", rotulo: "Remarcação" },
  { chave: "cliente_chegou", rotulo: "Cliente chegou" },
  { chave: "fila", rotulo: "Cliente entrou na fila" },
  { chave: "fiado", rotulo: "Fiado em aberto" },
  { chave: "pix", rotulo: "Pix recebido" },
] as const;

type Canal = "no_app" | "no_whatsapp" | "no_push";
type Preferencia = { tipo: string; no_app: boolean; no_whatsapp: boolean; no_push: boolean };

/** Padrão quando a pessoa ainda não escolheu nada para aquele aviso. */
const PADRAO: Omit<Preferencia, "tipo"> = { no_app: true, no_whatsapp: false, no_push: true };

const ROTULO_DO_CANAL: Record<Canal, string> = {
  no_app: "No app",
  no_whatsapp: "WhatsApp",
  no_push: "Celular",
};

function canaisDo(tipo: string): Canal[] {
  return tipoDePushValido(tipo) ? ["no_app", "no_push", "no_whatsapp"] : ["no_app", "no_whatsapp"];
}

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
        .select("tipo, no_app, no_whatsapp, no_push")
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
          no_push: linha.no_push,
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
      <AvisosNoCelular tenantId={tenantId} />
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
                {canaisDo(t.chave).map((canal) => {
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

function AvisosNoCelular({ tenantId }: { tenantId: string }) {
  const [ativo, setAtivo] = useState(false);
  const [instalar, setInstalar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => setAtivo(pushAtivoNesteAparelho()), []);
  if (ativo) {
    return (
      <p className="mb-3 flex min-h-11 items-center gap-2 text-sm text-paper">
        <Check className="h-4 w-4 text-gold" aria-hidden /> Avisos no celular ativos neste aparelho
      </p>
    );
  }
  return (
    <div className="mb-3">
      <button
        type="button"
        disabled={ocupado}
        onClick={async () => {
          if (precisaInstalarParaPush()) {
            setInstalar(true);
            return;
          }
          setOcupado(true);
          const r = await ativarAvisosDaEquipe(tenantId);
          setOcupado(false);
          setAtivo(r === "ativo");
        }}
        className="h-12 w-full rounded-lg bg-gold text-sm font-bold text-ink disabled:opacity-60"
      >
        Ativar avisos no celular
      </button>
      {instalar ? (
        <p className="mt-2 rounded-lg border border-line bg-ink px-3 py-3 text-xs leading-relaxed text-mute">
          {TEXTO_INSTALAR_PRIMEIRO}
        </p>
      ) : null}
    </div>
  );
}
