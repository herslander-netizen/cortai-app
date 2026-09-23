import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, ListOrdered, MessageCircle, TrendingUp } from "lucide-react";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { AgendamentoManual } from "@/components/barbeiro/AgendamentoManual";
import { FechamentoComanda } from "@/components/financeiro/FechamentoComanda";
import { brl, hora } from "@/lib/format";
import { getPainelDeControle } from "@/lib/painel.functions";
import { BannersDaPlataforma, MeuPlano } from "@/components/barbeiro/PainelComercial";
import { HubModulos } from "@/components/barbeiro/HubModulos";
import { Bloco, Erro, Esqueleto, LinhaDeAcao, Metrica, SemPermissao, Vazio } from "@/components/painel/Blocos";

export const Route = createFileRoute("/barbeiro/")({
  head: () => ({
    meta: [
      { title: "Painel de controle — Cortaí" },
      {
        name: "description",
        content: "Como a barbearia está agora, o que precisa de atenção e qual é o próximo movimento.",
      },
      { property: "og:title", content: "Painel de controle — Cortaí" },
      { property: "og:description", content: "Situação do dia, atenção e oportunidades da sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PainelPage,
});

const SAUDACAO = { manha: "Bom dia", tarde: "Boa tarde", noite: "Boa noite" } as const;

function PainelPage() {
  const [fechando, setFechando] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["painel-de-controle"],
    queryFn: () => getPainelDeControle(),
    retry: false,
  });

  const titulo = data ? `${SAUDACAO[data.saudacao.periodo]}${data.saudacao.nome ? `, ${data.saudacao.nome}` : ""}.` : "Início";

  return (
    <Screen title={titulo} subtitle={data ? "Veja como sua barbearia está hoje." : "Sua barbearia, no controle."}>
      {isLoading ? <Esqueleto /> : null}
      {isError ? <Erro onTentar={() => void refetch()} /> : null}

      {data ? (
        <div className="md:grid md:grid-cols-2 md:gap-x-8">
          <div className="md:col-span-2">
            <BannersDaPlataforma />
          </div>

          {/* 1. HOJE */}
          <div className="md:col-span-2">
            <div data-guia="dash-faturamento" className="rounded-xl bg-ink3 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-mute">Faturamento de hoje</p>
                  <p className="mt-2 text-[30px] font-bold leading-none text-paper">
                    {data.hoje.faturamentoCentavos === null ? "—" : brl(data.hoje.faturamentoCentavos)}
                  </p>
                  {data.hoje.faturamentoCentavos === null ? (
                    <p className="mt-2 text-xs text-mute2">Você não tem acesso aos valores da barbearia.</p>
                  ) : null}
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-soft text-gold">
                  <TrendingUp size={19} />
                </span>
              </div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ink3">
                <div
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${Math.max(5, data.hoje.ocupacaoPct ?? 0)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-mute2">
                {data.hoje.ocupacaoPct === null
                  ? "Horários de funcionamento ainda não configurados."
                  : `${data.hoje.ocupacaoPct}% da agenda ocupada · ${data.hoje.atendimentos} de ${data.hoje.atendimentos + (data.hoje.horariosLivres ?? 0)} horários`}
              </p>
            </div>

            <div data-guia="dash-indicadores" className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metrica rotulo="Atendimentos" valor={String(data.hoje.atendimentos)} detalhe="agendados hoje" />
              <Metrica
                rotulo="Ticket médio"
                valor={data.hoje.ticketMedioCentavos === null ? "—" : brl(data.hoje.ticketMedioCentavos)}
                detalhe={data.hoje.ticketMedioCentavos === null ? "sem acesso ou sem valores hoje" : "por atendimento"}
              />
              <Metrica
                rotulo="Horários livres"
                valor={data.hoje.horariosLivres === null ? "—" : String(data.hoje.horariosLivres)}
                detalhe={data.hoje.horariosLivres === null ? "configure os horários" : "oportunidades"}
              />
              <Metrica
                rotulo="Cancelamentos e faltas"
                valor={`${data.hoje.cancelamentos + data.hoje.faltas}`}
                cor={data.hoje.cancelamentos + data.hoje.faltas > 0 ? "text-brick" : undefined}
                detalhe={`${data.hoje.cancelamentos} cancelados · ${data.hoje.faltas} faltas`}
              />
              <Metrica rotulo="Clientes novos" valor={String(data.hoje.clientesNovos)} detalhe="primeira vez hoje" />
              <Metrica
                rotulo="Clientes recorrentes"
                valor={String(data.hoje.clientesRecorrentes)}
                detalhe="já vieram antes"
              />
            </div>
          </div>

          {/* 2. PRECISA DE ATENÇÃO */}
          <div className="md:col-span-1">
            <Bloco titulo="Precisa de atenção" descricao="Só aparece quando existe um motivo real.">
              {data.atencao.length ? (
                <ul>
                  {data.atencao.map((item) => (
                    <LinhaDeAcao
                      key={item.chave}
                      destino={item.destino}
                      titulo={item.titulo}
                      detalhe={item.detalhe}
                      tom={item.nivel === "urgente" ? "urgente" : "atencao"}
                    />
                  ))}
                </ul>
              ) : (
                <Vazio texto="Nada pedindo sua atenção agora. Dia sob controle." />
              )}
            </Bloco>
          </div>

          {/* 3. PRÓXIMOS MOVIMENTOS */}
          <div className="md:col-span-1">
            <Bloco
              titulo="Próximos movimentos"
              descricao="Oportunidades calculadas com os dados da sua barbearia."
              acao={
                <Link to="/barbeiro/crescimento" className="text-xs text-gold">
                  Crescimento
                </Link>
              }
            >
              {data.movimentos.length ? (
                <ul data-guia="dash-oportunidades">
                  {data.movimentos.map((m) => (
                    <LinhaDeAcao
                      key={`${m.tipo}-${m.titulo}`}
                      destino={m.destino}
                      titulo={m.titulo}
                      detalhe={m.descricao}
                      tom={m.prioridade === "alta" ? "urgente" : m.prioridade === "media" ? "atencao" : "neutro"}
                    />
                  ))}
                </ul>
              ) : (
                <Vazio
                  texto={
                    data.base.temClientes
                      ? "Nenhuma oportunidade clara hoje."
                      : "Cadastre clientes e atendimentos para o Cortaí encontrar oportunidades."
                  }
                />
              )}
            </Bloco>
          </div>

          {/* 4. AGENDA */}
          <div className="md:col-span-2">
            <Bloco
              titulo="Agenda de hoje"
              descricao={`${data.agenda.ocupados} ocupados · ${data.agenda.livres === null ? "horários não configurados" : `${data.agenda.livres} livres`} · ${data.agenda.encaixes} encaixes`}
              acao={
                <div className="flex gap-3 text-xs text-gold">
                  <Link to="/barbeiro/agenda" className="inline-flex items-center gap-1">
                    <CalendarRange size={13} /> Ver agenda
                  </Link>
                  <Link to="/barbeiro/fila" className="inline-flex items-center gap-1">
                    <ListOrdered size={13} /> Fila
                  </Link>
                </div>
              }
            >
              {data.agenda.emAtendimento.length ? (
                <div className="mb-3 rounded-xl border border-line bg-ink3 px-5 py-4">
                  <p className="text-xs text-gold">Em atendimento agora</p>
                  {data.agenda.emAtendimento.map((a) => (
                    <div key={a.id} className="mt-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-paper">{a.cliente}</p>
                        <p className="text-xs text-mute">
                          {a.profissional} · até {hora(a.fim)}
                        </p>
                      </div>
                      <button type="button" className="btn-secondary shrink-0" onClick={() => setFechando(a.id)}>
                        Finalizar
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {data.agenda.proximos.length ? (
                <ul>
                  {data.agenda.proximos.map((p) => (
                    <li key={p.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-line py-3">
                      <span className="text-sm font-semibold text-gold">{hora(p.inicio)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-paper">{p.cliente}</span>
                        <span className="block truncate text-xs text-mute2">
                          {p.servico} · {p.profissional}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio
                  texto={
                    data.base.temAgenda
                      ? "Nenhum atendimento restante para hoje."
                      : "Nenhum atendimento marcado para hoje ainda."
                  }
                />
              )}

              <div className="mt-4">
                <AgendamentoManual dia={new Date().toISOString().slice(0, 10)} onCriado={() => void refetch()} />
              </div>
            </Bloco>
          </div>

          {/* 5. INDICADORES SECUNDÁRIOS */}
          <div className="md:col-span-1">
            <Bloco
              titulo="Clientes"
              acao={
                <Link to="/barbeiro/clientes" className="text-xs text-gold">
                  Ver lista
                </Link>
              }
            >
              {data.clientes ? (
                data.clientes.total ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Metrica rotulo="Total" valor={String(data.clientes.total)} />
                    <Metrica rotulo="Novos no mês" valor={String(data.clientes.novosMes)} />
                    <Metrica rotulo="Recorrentes" valor={String(data.clientes.recorrentes)} />
                    <Metrica rotulo="Retorno próximo" valor={String(data.clientes.retornosProximos)} />
                    <Metrica rotulo="Inativos" valor={String(data.clientes.inativos)} />
                    <Metrica
                      rotulo="No Voltaí"
                      valor={String(data.clientes.fidelidade)}
                      detalhe={
                        data.clientes.comSaldo === null ? undefined : `${data.clientes.comSaldo} com saldo ou crédito`
                      }
                    />
                  </div>
                ) : (
                  <Vazio texto="Nenhum cliente cadastrado ainda." />
                )
              ) : (
                <SemPermissao texto="Você não tem acesso à lista de clientes." />
              )}
            </Bloco>
          </div>

          <div className="md:col-span-1">
            <Bloco
              titulo="Financeiro"
              acao={
                <Link to="/barbeiro/caixa" className="text-xs text-gold">
                  Abrir caixa
                </Link>
              }
            >
              {data.financeiro ? (
                <div className="grid grid-cols-2 gap-3">
                  <Metrica rotulo="Entradas" valor={brl(data.financeiro.entradasCentavos)} detalhe="hoje" />
                  <Metrica rotulo="Saídas" valor={brl(data.financeiro.saidasCentavos)} detalhe="hoje" />
                  <Metrica rotulo="Líquido" valor={brl(data.financeiro.liquidoCentavos)} />
                  <Metrica
                    rotulo="A receber"
                    valor={brl(data.financeiro.fiadoAbertoCentavos)}
                    cor={data.financeiro.fiadoAbertoCentavos > 0 ? "text-brick" : undefined}
                    detalhe="fiados em aberto"
                  />
                  <Metrica
                    rotulo="Caixa"
                    valor={data.financeiro.caixaAberto ? "Aberto" : "Fechado"}
                    detalhe={data.financeiro.caixaAberto ? "movimentos do dia" : "abra para registrar"}
                  />
                  {data.financeiro.comissoesPendentesCentavos !== null ? (
                    <Metrica
                      rotulo="Comissões"
                      valor={brl(data.financeiro.comissoesPendentesCentavos)}
                      detalhe="pendentes no mês"
                    />
                  ) : null}
                </div>
              ) : (
                <SemPermissao texto="Você não tem acesso ao caixa e ao financeiro." />
              )}
            </Bloco>
          </div>

          <div className="md:col-span-1">
            <Bloco
              titulo="Profissionais"
              acao={
                <Link to="/barbeiro/profissionais" className="text-xs text-gold">
                  Gerenciar
                </Link>
              }
            >
              {data.profissionais.length ? (
                <ul>
                  {data.profissionais.map((p) => (
                    <li key={p.nome} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-line py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-paper">{p.nome}</span>
                        <span className="block text-xs text-mute2">
                          {p.atendimentos} atendimentos hoje
                          {p.faturamentoCentavos === null ? "" : ` · ${brl(p.faturamentoCentavos)}`}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-paper">
                        {p.ocupacaoPct === null ? "—" : `${p.ocupacaoPct}%`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio texto="Nenhum profissional ativo cadastrado." />
              )}
            </Bloco>
          </div>

          <div className="md:col-span-1">
            <Bloco
              titulo="Atendimento no WhatsApp"
              acao={
                <Link to="/barbeiro/cortai" className="inline-flex items-center gap-1 text-xs text-gold">
                  <MessageCircle size={13} /> Ver atendimento
                </Link>
              }
            >
              {data.atendimento ? (
                <div className="grid grid-cols-3 gap-3">
                  <Metrica rotulo="Com o CortAI" valor={String(data.atendimento.comIa)} />
                  <Metrica
                    rotulo="Aguardando você"
                    valor={String(data.atendimento.aguardandoHumano)}
                    cor={data.atendimento.aguardandoHumano > 0 ? "text-gold" : undefined}
                  />
                  <Metrica rotulo="Encerradas" valor={String(data.atendimento.encerradas)} />
                </div>
              ) : (
                <SemPermissao texto="Você não tem acesso às conversas do WhatsApp." />
              )}
            </Bloco>
          </div>

          <div className="md:col-span-2">
            <HubModulos />
            <MeuPlano />
          </div>
        </div>
      ) : null}

      {fechando ? (
        <FechamentoComanda
          agendamentoId={fechando}
          onFechar={() => setFechando(null)}
          onConcluido={() => {
            setFechando(null);
            void refetch();
          }}
        />
      ) : null}
    </Screen>
  );
}
