import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  RotateCcw,
  XCircle,
  AlertTriangle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getSessao } from "@/lib/sessao.functions";

type Envio = {
  id: string;
  tipo: string;
  status: string;
  resposta: string | null;
  enviado_em: string | null;
  criado_em: string;
  clientes: { nome: string } | null;
};

const TIPO: Record<string, string> = {
  lembrete_24h: "Lembrete da véspera",
  lembrete_2h: "Você é o próximo",
  confirmacao_agendamento: "Confirmação",
  cancelamento: "Cancelamento",
  retorno: "Retorno",
};

function situacao(e: Envio) {
  if (e.resposta === "confirmado" || e.resposta === "cheguei")
    return {
      rotulo: e.resposta === "cheguei" ? "Chegou" : "Confirmou",
      Icone: CheckCircle2,
      cor: "text-sage",
    };
  if (e.resposta === "cancelado") return { rotulo: "Cancelou", Icone: XCircle, cor: "text-brick" };
  if (e.resposta === "remarcar")
    return { rotulo: "Quer remarcar", Icone: RotateCcw, cor: "text-gold" };
  if (e.status === "erro")
    return { rotulo: "Não enviado", Icone: AlertTriangle, cor: "text-brick" };
  if (e.status === "enviado")
    return { rotulo: "Enviado, sem resposta", Icone: MessageCircle, cor: "text-mute" };
  return { rotulo: "Na fila", Icone: Clock, cor: "text-mute2" };
}

/** Status dos avisos do WhatsApp enviados aos clientes (gestão). */
export function PainelDeLembretes() {
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300000,
  });
  const tenantId = sessao?.tenantId ?? null;
  const { data, isLoading } = useQuery({
    queryKey: ["painel-lembretes", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Envio[]> => {
      const { data, error } = await supabase
        .from("envios_de_whatsapp")
        .select("id, tipo, status, resposta, enviado_em, criado_em, clientes(nome)")
        .eq("tenant_id", tenantId!)
        .order("criado_em", { ascending: false })
        .limit(30);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Envio[];
    },
  });

  const lista = data ?? [];
  const respondidos = lista.filter((e) => e.resposta).length;

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-xs font-semibold uppercase text-mute2">Avisos enviados</h2>
      <p className="mb-3 text-xs text-mute">
        {isLoading
          ? "Carregando os avisos…"
          : lista.length
            ? `${respondidos} de ${lista.length} responderam`
            : "Os lembretes aparecem aqui quando saírem."}
      </p>
      {isLoading ? (
        <EsqueletoLista linhas={3} />
      ) : (
        <ul className="divide-y divide-line/70">
          {lista.map((e) => {
            const s = situacao(e);
            const quando = new Date(e.enviado_em ?? e.criado_em).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li
                key={e.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-paper">
                    {e.clientes?.nome ?? "Cliente"}
                  </span>
                  <span className="block text-xs text-mute2">
                    {TIPO[e.tipo] ?? e.tipo} · {quando}
                  </span>
                </span>
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${s.cor}`}>
                  <s.Icone size={14} strokeWidth={1.75} aria-hidden />
                  {s.rotulo}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
