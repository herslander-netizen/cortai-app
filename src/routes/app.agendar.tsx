import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { brl, dataHoraLonga, diaCurto, hora } from "@/lib/format";
import {
  criarAgendamento,
  getDadosAgendar,
  type DadosAgendar,
  type ResultadoAgendamento,
} from "@/lib/agendamento.functions";

export const Route = createFileRoute("/app/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar horário — Cortaí" },
      {
        name: "description",
        content: "Escolha serviço, barbeiro, dia, horário e forma de pagamento em uma tela só.",
      },
      { property: "og:title", content: "Agendar horário — Cortaí" },
      { property: "og:description", content: "Serviço, barbeiro, horário e pagamento em poucos toques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendarPage,
});

type Forma = "credito" | "pix" | "barbearia" | "fiado";

function Chip({
  label,
  sub,
  selected,
  disabled,
  strike,
  onClick,
}: {
  label: string;
  sub?: string;
  selected?: boolean;
  disabled?: boolean;
  strike?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "rounded-full border px-4 py-2 text-sm transition-colors",
        selected ? "border-gold bg-gold font-semibold text-ink" : "border-line2 bg-ink2 text-paper",
        disabled ? "cursor-not-allowed border-line text-mute2 opacity-60" : "",
        strike ? "line-through" : "",
      ].join(" ")}
    >
      {label}
      {sub ? <span className={`ml-2 text-xs ${selected ? "text-ink" : "text-mute"}`}>{sub}</span> : null}
    </button>
  );
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-6 first:border-t-0 first:pt-0">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-paper">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink3 text-[11px] text-mute">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

const HORA_INICIO = 9;
const HORA_FIM = 19;

function AgendarPage() {
  const [clienteId, setClienteId] = useState<string | undefined>(undefined);
  const dados = useQuery({
    queryKey: ["agendar", clienteId],
    queryFn: () => getDadosAgendar({ data: { clienteId } }),
  });

  if (dados.isLoading || !dados.data) {
    return (
      <Screen title="Agendar" subtitle="Escolha serviço, barbeiro e horário.">
        <p className="text-sm text-mute">Carregando…</p>
      </Screen>
    );
  }

  return <Fluxo dados={dados.data} onTrocarCliente={setClienteId} recarregar={() => dados.refetch()} />;
}

function Fluxo({
  dados,
  onTrocarCliente,
  recarregar,
}: {
  dados: DadosAgendar;
  onTrocarCliente: (id: string) => void;
  recarregar: () => void;
}) {
  const criar = useServerFn(criarAgendamento);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [profId, setProfId] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [inicio, setInicio] = useState<string | null>(null);
  const [forma, setForma] = useState<Forma | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<ResultadoAgendamento | null>(null);

  const servico = dados.servicos.find((s) => s.id === servicoId) ?? null;
  const regra = (tipo: string) => dados.regras.find((r) => r.tipo === tipo && r.ativo);
  const regraFiado = regra("fiado");
  const regraFidelidade = regra("fidelidade");

  const dias = useMemo(() => {
    const out: string[] = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return out;
  }, []);

  const horarios = useMemo(() => {
    if (!dia || !servico || !profId) return [] as { iso: string; ocupado: boolean; passado: boolean }[];
    const out: { iso: string; ocupado: boolean; passado: boolean }[] = [];
    const agora = Date.now();
    for (let h = HORA_INICIO; h < HORA_FIM; h++) {
      for (const m of [0, 30]) {
        const d = new Date(`${dia}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
        const fim = new Date(d.getTime() + servico.duracao_min * 60000);
        const ocupado = dados.ocupados.some(
          (o) =>
            o.profissional_id === profId &&
            new Date(o.inicio).getTime() < fim.getTime() &&
            new Date(o.fim).getTime() > d.getTime(),
        );
        out.push({ iso: d.toISOString(), ocupado, passado: d.getTime() <= agora });
      }
    }
    return out;
  }, [dia, servico, profId, dados.ocupados]);

  const preco = servico?.preco_centavos ?? 0;
  const disponivelFiado = dados.cliente.limite_fiado_centavos + Math.min(dados.carteira.saldo_centavos, 0);
  const estourouFiado = preco > disponivelFiado;
  const fiadoBloqueado = !!regraFiado?.bloqueia_agendamento_no_limite && estourouFiado;

  if (sucesso) {
    return (
      <Screen title="Agendado!" subtitle={dataHoraLonga(sucesso.inicio)}>
        <div className="rounded-lg border border-line bg-ink2 p-5">
          <p className="text-xs uppercase tracking-wider text-mute">Sua carteira</p>
          <p className="mt-2 text-2xl font-bold text-paper">
            {sucesso.saldo_creditos} {sucesso.saldo_creditos === 1 ? "crédito" : "créditos"}
          </p>
          <p className="mt-1 text-sm text-mute">
            {sucesso.forma_pagamento === "credito"
              ? "1 crédito foi debitado agora."
              : sucesso.forma_pagamento === "fiado"
                ? `${brl(sucesso.valor_centavos)} lançado no fiado.`
                : "Nada foi debitado da carteira — pagamento no ato."}
          </p>
          {sucesso.saldo_centavos < 0 ? (
            <p className="mt-1 text-sm text-brick">Fiado em aberto: {brl(Math.abs(sucesso.saldo_centavos))}</p>
          ) : null}
          {sucesso.fidelidade_alvo ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-sm text-paper">
                Fidelidade: {sucesso.fidelidade_progresso} de {sucesso.fidelidade_alvo}
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-ink3">
                <div
                  className="h-1.5 rounded-full bg-gold"
                  style={{
                    width: `${Math.min(100, (sucesso.fidelidade_progresso / sucesso.fidelidade_alvo) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-mute">
                Faltam {Math.max(0, sucesso.fidelidade_alvo - sucesso.fidelidade_progresso)} para o corte grátis.
              </p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="btn-primary mt-6 w-full"
          onClick={() => {
            setSucesso(null);
            setServicoId(null);
            setProfId(null);
            setDia(null);
            setInicio(null);
            setForma(null);
            recarregar();
          }}
        >
          Agendar outro horário
        </button>
      </Screen>
    );
  }

  return (
    <Screen title="Agendar" subtitle={`${dados.tenant.nome} · ${dados.cliente.nome}`}>
      {dados.clientes.length > 1 ? (
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-wider text-mute2">Entrando como</p>
          <div className="flex flex-wrap gap-2">
            {dados.clientes.map((c) => (
              <Chip
                key={c.id}
                label={c.nome}
                selected={c.id === dados.cliente.id}
                onClick={() => onTrocarCliente(c.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <Passo n={1} titulo="Serviço">
        <div className="flex flex-wrap gap-2">
          {dados.servicos.map((s) => (
            <Chip
              key={s.id}
              label={s.nome}
              sub={brl(s.preco_centavos)}
              selected={s.id === servicoId}
              onClick={() => {
                setServicoId(s.id);
                setInicio(null);
                setForma(null);
              }}
            />
          ))}
        </div>
      </Passo>

      <Passo n={2} titulo="Profissional">
        <div className="flex flex-wrap gap-2">
          {dados.profissionais.map((p) => (
            <Chip
              key={p.id}
              label={p.nome}
              selected={p.id === profId}
              onClick={() => {
                setProfId(p.id);
                setInicio(null);
              }}
            />
          ))}
        </div>
      </Passo>

      <Passo n={3} titulo="Dia">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {dias.map((d) => {
            const { dia: sem, num, mes } = diaCurto(d);
            return (
              <Chip
                key={d}
                label={`${sem} ${num}/${mes}`}
                selected={d === dia}
                onClick={() => {
                  setDia(d);
                  setInicio(null);
                }}
              />
            );
          })}
        </div>
      </Passo>

      <Passo n={4} titulo="Horário">
        {!servico || !profId || !dia ? (
          <p className="text-sm text-mute">Escolha serviço, profissional e dia para ver os horários.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {horarios.map((h) => (
                <Chip
                  key={h.iso}
                  label={hora(h.iso)}
                  selected={h.iso === inicio}
                  disabled={h.ocupado || h.passado}
                  strike={h.ocupado}
                  onClick={() => setInicio(h.iso)}
                />
              ))}
            </div>
            {horarios.some((h) => h.ocupado) ? (
              <p className="mt-3 text-xs text-mute">
                Horários riscados já estão ocupados. Se o dia estiver cheio, você pode entrar na fila de espera e ser
                avisado se abrir vaga.
              </p>
            ) : null}
          </>
        )}
      </Passo>

      <Passo n={5} titulo="Forma de pagamento">
        {!servico ? (
          <p className="text-sm text-mute">Escolha um serviço primeiro.</p>
        ) : (
          <ul>
            {regra("mensal") ? (
              <li>
                <LinhaPagamento
                  titulo="Usar 1 crédito"
                  detalhe={
                    dados.carteira.saldo_creditos > 0
                      ? `Sobram ${dados.carteira.saldo_creditos - 1} depois deste`
                      : "Você não tem créditos no momento"
                  }
                  valor="R$ 0,00"
                  valorClasse="text-sage"
                  selecionado={forma === "credito"}
                  desabilitado={dados.carteira.saldo_creditos < 1}
                  onClick={() => setForma("credito")}
                />
              </li>
            ) : null}
            {regra("avulso") ? (
              <>
                <li>
                  <LinhaPagamento
                    titulo="Pagar no Pix"
                    detalhe="Chave enviada no WhatsApp"
                    valor={brl(preco)}
                    selecionado={forma === "pix"}
                    onClick={() => setForma("pix")}
                  />
                </li>
                <li>
                  <LinhaPagamento
                    titulo="Pagar na barbearia"
                    detalhe="Dinheiro ou cartão no balcão"
                    valor={brl(preco)}
                    selecionado={forma === "barbearia"}
                    onClick={() => setForma("barbearia")}
                  />
                </li>
              </>
            ) : null}
            {regraFiado ? (
              <li>
                <LinhaPagamento
                  titulo="Deixar no fiado"
                  detalhe={
                    fiadoBloqueado
                      ? `Limite de fiado atingido (${brl(Math.abs(dados.carteira.saldo_centavos))} em aberto de ${brl(dados.cliente.limite_fiado_centavos)}). Fale com a barbearia para agendar.`
                      : `Ainda cabe ${brl(Math.max(0, disponivelFiado))} no seu limite`
                  }
                  valor={brl(preco)}
                  valorClasse="text-brick"
                  selecionado={forma === "fiado"}
                  desabilitado={fiadoBloqueado}
                  onClick={() => setForma("fiado")}
                />
              </li>
            ) : null}
          </ul>
        )}
      </Passo>

      <Passo n={6} titulo="Confirmação">
        <p className="text-sm text-mute">
          Se cancelar até 4 horas antes, o crédito volta para a sua carteira. Depois disso ele é consumido.
        </p>
        {inicio && servico ? (
          <p className="mt-3 text-sm text-paper">
            {servico.nome} · {dataHoraLonga(inicio)}
          </p>
        ) : null}
        {erro ? <p className="mt-3 text-sm text-brick">{erro}</p> : null}
        <button
          type="button"
          className="btn-primary mt-5 w-full disabled:opacity-40"
          disabled={!servico || !profId || !inicio || !forma || enviando}
          onClick={async () => {
            if (!servico || !profId || !inicio || !forma) return;
            setErro(null);
            setEnviando(true);
            try {
              const res = await criar({
                data: {
                  tenantId: dados.tenant.id,
                  clienteId: dados.cliente.id,
                  profissionalId: profId,
                  servicoId: servico.id,
                  inicio,
                  formaPagamento: forma,
                },
              });
              setSucesso(res);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Não foi possível agendar.");
            } finally {
              setEnviando(false);
            }
          }}
        >
          {enviando ? "Confirmando…" : "Confirmar agendamento"}
        </button>
      </Passo>
    </Screen>
  );
}

function LinhaPagamento({
  titulo,
  detalhe,
  valor,
  valorClasse,
  selecionado,
  desabilitado,
  onClick,
}: {
  titulo: string;
  detalhe: string;
  valor: string;
  valorClasse?: string;
  selecionado?: boolean;
  desabilitado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={desabilitado}
      onClick={onClick}
      aria-pressed={selecionado}
      className={`flex w-full items-start justify-between gap-4 border-b border-line py-4 text-left ${
        desabilitado ? "opacity-50" : ""
      }`}
    >
      <span className="flex items-start gap-3">
        <span
          className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
            selecionado ? "border-gold bg-gold" : "border-line2"
          }`}
        />
        <span>
          <span className={`block text-sm ${selecionado ? "font-semibold text-paper" : "text-paper"}`}>{titulo}</span>
          <span className="mt-0.5 block text-xs text-mute">{detalhe}</span>
        </span>
      </span>
      <span className={`shrink-0 text-sm ${valorClasse ?? "text-paper"}`}>{valor}</span>
    </button>
  );
}
