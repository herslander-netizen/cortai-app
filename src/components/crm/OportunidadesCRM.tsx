import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCw, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import { getOportunidadesCRM } from "@/lib/crm/oportunidades.functions";

export function OportunidadesCRM() {
  const consulta = useQuery({
    queryKey: ["crm-oportunidades-v1"],
    queryFn: () => getOportunidadesCRM(),
    retry: false,
  });
  const dados = consulta.data;

  return (
    <section className="mt-5 rounded-[28px] bg-[var(--figaro-surface-container)] p-4 md:p-5"
      aria-labelledby="crm-oportunidades-titulo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <UsersRound size={20} aria-hidden className="mt-0.5 shrink-0 text-[var(--figaro-primary)]" />
          <div>
            <h2 id="crm-oportunidades-titulo" className="text-base font-semibold text-paper">
              Oportunidades de retorno
            </h2>
            <p className="mt-1 text-xs leading-5 text-mute">
              Baseadas em visitas concluídas e prazos dos serviços.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void consulta.refetch()}
          aria-label="Atualizar oportunidades">
          <RefreshCw size={16} aria-hidden /> Atualizar
        </Button>
      </div>

      {consulta.isLoading ? (
        <div role="status" className="mt-5 rounded-[12px] bg-[var(--figaro-surface-container-high)] p-4 text-sm text-mute">
          Consultando histórico de atendimentos…
        </div>
      ) : null}
      {consulta.isError ? (
        <Aviso tom="acao" className="mt-4">
          Não foi possível consultar oportunidades. Confira a permissão de relatórios e de clientes.
        </Aviso>
      ) : null}
      {dados ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Resumo de oportunidades">
            {([
              { rotulo: "Em retorno", valor: dados.emRetorno },
              { rotulo: "Inativos", valor: dados.inativos },
              { rotulo: "Já agendados", valor: dados.comHorarioFuturo },
            ] as const).map((m) => (
              <div key={m.rotulo} className="min-w-0 rounded-[12px] bg-[var(--figaro-surface-container-high)] p-3">
                <p className="break-words text-[11px] leading-4 text-mute">{m.rotulo}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-paper">
                  {m.valor.toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
          {dados.oportunidades.length === 0 ? (
            <p className="mt-4 rounded-[12px] bg-[var(--figaro-surface-container-high)] px-4 py-5 text-sm text-mute">
              Nenhum cliente com retorno pendente neste momento.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-paper">Clientes para acompanhar</h3>
              {dados.oportunidades.map((item) => (
                <Link key={item.clienteId} to="/barbeiro/clientes/$id"
                  params={{ id: item.clienteId }}
                  className="flex min-h-16 items-center justify-between gap-3 rounded-[12px] bg-[var(--figaro-surface-container-high)] px-3 py-3 transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-paper">{item.nome}</div>
                    <div className="mt-1 truncate text-xs text-mute">
                      {item.servico ?? "Atendimento"} · {item.atrasoDias === 0 ? "Retorno previsto para hoje" :
                        item.atrasoDias + (item.atrasoDias === 1 ? " dia" : " dias") + " após o retorno previsto"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] font-medium text-mute">
                      {item.situacao === "inativo" ? "Inativo" : "Em retorno"}
                    </span>
                    <ArrowUpRight size={18} aria-hidden className="text-[var(--figaro-primary)]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
          {dados.total > dados.oportunidades.length ? (
            <p className="mt-3 text-xs text-mute">
              Exibindo {dados.oportunidades.length} de {dados.total} clientes. Veja as fichas na área Clientes.
            </p>
          ) : null}
          <p className="mt-4 text-xs leading-5 text-mute">
            Prazos sugeridos, não confirmação de interesse. Nenhuma mensagem é enviada automaticamente.
            Clientes com atendimento futuro ativo ficam fora das oportunidades.
          </p>
        </>
      ) : null}
    </section>
  );
}
