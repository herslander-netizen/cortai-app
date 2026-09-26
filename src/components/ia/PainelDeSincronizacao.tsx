/**
 * Mostra, com números reais do banco, o que a ALVO IA enxerga da barbearia.
 * Somente leitura: não altera atendimento, agenda nem configuração.
 */
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

import { getSincronizacaoDoCortai, type SincronizacaoDoCortai } from "@/lib/ia.functions";

function Linha({ ok, rotulo, valor }: { ok: boolean; rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="flex items-center gap-2 text-xs text-mute">
        {ok ? (
          <CheckCircle2 size={14} className="shrink-0 text-sage" />
        ) : (
          <AlertTriangle size={14} className="shrink-0 text-gold" />
        )}
        {rotulo}
      </span>
      <span className="text-xs font-semibold text-paper">{valor}</span>
    </div>
  );
}

export function PainelDeSincronizacao() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["cortai-sincronizacao"],
    queryFn: () => getSincronizacaoDoCortai() as Promise<SincronizacaoDoCortai>,
    staleTime: 30_000,
  });

  return (
    <section className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-paper">Sincronização com o Cortaí</h2>
          <p className="mt-1 text-xs text-mute">
            O Cortaí é a fonte oficial dos dados. É exatamente isto que o atendente consegue consultar.
          </p>
        </div>
        <button
          type="button"
          aria-label="Atualizar"
          className="rounded-md border border-line2 p-2 text-mute disabled:opacity-50"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : undefined} />
        </button>
      </div>

      {isLoading ? <p className="mt-4 text-xs text-mute">Carregando…</p> : null}
      {isError ? (
        <p className="mt-4 text-xs text-brick">Não foi possível carregar os números agora.</p>
      ) : null}

      {data ? (
        <div className="mt-4 divide-y divide-line border-t border-line">
          <Linha
            ok={data.cortaiConectado}
            rotulo="Cortaí conectado"
            valor={data.cortaiConectado ? "Chave ativa" : "Sem chave"}
          />
          <Linha ok={data.servicos > 0} rotulo="Serviços sincronizados" valor={String(data.servicos)} />
          <Linha
            ok={data.profissionais > 0}
            rotulo="Profissionais sincronizados"
            valor={String(data.profissionais)}
          />
          <Linha
            ok={data.agendaDisponivel}
            rotulo="Agenda disponível"
            valor={data.agendaDisponivel ? "Horários cadastrados" : "Sem horários"}
          />
          <Linha ok={data.clientes > 0} rotulo="Clientes disponíveis" valor={String(data.clientes)} />
          <Linha ok rotulo="Atendimentos de hoje" valor={String(data.agendamentosHoje)} />
          <Linha ok rotulo="Próximos atendimentos" valor={String(data.proximosAgendamentos)} />
          <Linha
            ok={data.informacoes > 0}
            rotulo="Informações oficiais"
            valor={String(data.informacoes)}
          />
          <Linha
            ok={data.whatsapp.status === "conectado"}
            rotulo="WhatsApp"
            valor={
              data.whatsapp.status === "conectado"
                ? (data.whatsapp.numero ?? "Conectado")
                : "Não conectado"
            }
          />
          <p className="pt-3 text-xs text-mute2">
            Última consulta do atendente:{" "}
            {data.ultimaSincronizacao
              ? new Date(data.ultimaSincronizacao).toLocaleString("pt-BR")
              : "ainda não houve"}
          </p>
        </div>
      ) : null}
    </section>
  );
}
