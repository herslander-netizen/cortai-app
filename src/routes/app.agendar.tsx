import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { DescobrirBarbearias } from "@/components/cliente/DescobrirBarbearias";
import { brl, dataHoraLonga, diaCurto } from "@/lib/format";
import { useSelecaoAgendamento } from "@/components/agendamento/useSelecaoAgendamento";
import {
  criarAgendamento,
  getDadosAgendar,
  type DadosAgendar,
  type ResultadoAgendamento,
} from "@/lib/agendamento.functions";
import { Carregando } from "@/components/layout/Carregando";
import { TiraHorizontal } from "@/components/ui/tira-horizontal";
import { useContextoCliente } from "@/lib/contexto-cliente";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/agendar")({
  validateSearch: (search: Record<string, unknown>): { b?: string } =>
    typeof search["b"] === "string" && search["b"] ? { b: search["b"] } : {},
  head: () => ({
    meta: [
      { title: "Agendar horário — Cortaí" },
      {
        name: "description",
        content: "Escolha serviço, barbeiro, dia, horário e forma de pagamento em uma tela só.",
      },
      { property: "og:title", content: "Agendar horário — Cortaí" },
      {
        property: "og:description",
        content: "Serviço, barbeiro, horário e pagamento em poucos toques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgendarPage,
});

type Forma = "credito" | "pix" | "balcao" | "fiado";

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
      {sub ? (
        <span className={`ml-2 text-xs ${selected ? "text-ink" : "text-mute"}`}>{sub}</span>
      ) : null}
    </button>
  );
}

function Passo({
  n,
  titulo,
  guia,
  children,
}: {
  n: number;
  titulo: string;
  guia?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-guia={guia} className="border-t border-line py-6 first:border-t-0 first:pt-0">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-paper">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink3 text-xs text-mute">
          {n}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function AgendarPage() {
  const { b } = Route.useSearch();
  const contexto = useContextoCliente(b);
  const dados = useQuery({
    queryKey: ["agendar", contexto],
    queryFn: () => getDadosAgendar({ data: contexto ? { slug: contexto } : {} }),
    retry: false,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (dados.isError) {
    return (
      <Screen title="Agendar" subtitle="Escolha a barbearia para continuar.">
        <DescobrirBarbearias titulo="Onde você quer agendar?" />
      </Screen>
    );
  }

  if (dados.isLoading || !dados.data) {
    return (
      <Screen title="Agendar" subtitle="Escolha serviço, barbeiro e horário.">
        <Carregando />
      </Screen>
    );
  }

  return (
    <Fluxo
      dados={dados.data}
      slug={contexto ?? dados.data.tenant.slug ?? undefined}
      recarregar={() => dados.refetch()}
    />
  );
}

function Fluxo({
  dados,
  slug,
  recarregar,
}: {
  dados: DadosAgendar;
  slug?: string | undefined;
  recarregar: () => void;
}) {
  const criar = useServerFn(criarAgendamento);
  const selecao = useSelecaoAgendamento({
    servicos: dados.servicos,
    profissionais: dados.profissionais,
    horarios: dados.horarios,
    ocupados: dados.ocupados,
    fuso: dados.fuso,
    regras: dados.regrasAgenda,
  });
  const {
    servicoId,
    setServicoId,
    servico,
    profissionalId: profId,
    setProfissionalId: setProfId,
    aptos,
    dias,
    dia,
    setDia,
    porDia,
    agenda,
    inicio,
    setInicio,
    escolhido,
  } = selecao;
  const [forma, setForma] = useState<Forma>("balcao");
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState<{ agendamentoId: string; hora: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<ResultadoAgendamento | null>(null);
  const [copiado, setCopiado] = useState(false);
  const nomeProfissional = (id: string) =>
    dados.profissionais.find((p) => p.id === id)?.nome ?? "profissional";

  const regra = (tipo: string) => dados.regras.find((r) => r.tipo === tipo && r.ativo);
  const regraFiado = regra("fiado");
  const regraMensal = regra("mensal");

  const preco = servico?.preco_centavos ?? 0;
  const disponivelFiado =
    dados.cliente.limite_fiado_centavos + Math.min(dados.carteira.saldo_centavos, 0);
  const estourouFiado = preco > disponivelFiado;
  const fiadoBloqueado = !!regraFiado?.bloqueia_agendamento_no_limite && estourouFiado;

  async function confirmar(substituiId?: string) {
    if (!servico || !escolhido) return;
    setErro(null);
    setConflito(null);
    setEnviando(true);
    try {
      const res = await criar({
        data: {
          ...(slug ? { slug } : {}),
          profissionalId: escolhido.profId,
          servicoId: servico.id,
          inicio: escolhido.iso,
          formaPagamento: forma,
          ...(substituiId ? { substituiId } : {}),
        },
      });
      if ("conflito" in res) setConflito({ agendamentoId: res.agendamentoId, hora: res.hora });
      else setSucesso(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível agendar.";
      setErro(msg);
      if (msg.includes("acabou de ser reservado")) {
        setInicio(null);
        void recarregar();
      }
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <Screen title="Agendado!" subtitle={dataHoraLonga(sucesso.inicio)}>
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-wider text-mute">Seu horário</p>
          <p className="mt-2 text-base font-semibold text-paper">
            {servico?.nome ?? "Serviço"}
            {escolhido ? ` · com ${nomeProfissional(escolhido.profId)}` : ""}
          </p>
          <p className="mt-1 text-sm text-mute">{dataHoraLonga(sucesso.inicio)}</p>
          <p className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="text-mute">{rotuloForma(sucesso.forma_pagamento)}</span>
            <span className="font-semibold text-paper">
              {sucesso.forma_pagamento === "credito" ? "1 crédito" : brl(sucesso.valor_centavos)}
            </span>
          </p>
        </div>

        {sucesso.forma_pagamento === "pix" && dados.pix ? (
          <div className="surface mt-4 p-5">
            <p className="text-sm font-semibold text-paper">Pague pelo Pix</p>
            <p className="mt-1 text-sm text-mute">
              Use a chave abaixo para pagar {brl(sucesso.valor_centavos)} e envie o comprovante para
              a barbearia.
            </p>
            <p className="mt-4 text-xs uppercase tracking-wider text-mute">
              Chave Pix{dados.pix.tipo ? ` · ${dados.pix.tipo}` : ""}
            </p>
            <p className="mt-1 break-all text-base font-semibold text-paper">{dados.pix.chave}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-12 w-full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(dados.pix!.chave);
                  setCopiado(true);
                } catch {
                  setCopiado(false);
                }
              }}
            >
              {copiado ? "Chave copiada" : "Copiar chave Pix"}
            </Button>
            {dados.pix.whatsapp ? (
              <Button asChild variant="text" className="mt-2 h-12 w-full text-sm">
                <a
                  href={`https://wa.me/${dados.pix.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Olá! Paguei ${brl(sucesso.valor_centavos)} no Pix do meu horário de ${dataHoraLonga(sucesso.inicio)}.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar comprovante pelo WhatsApp
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="surface mt-4 p-5">
          <p className="text-xs uppercase tracking-wider text-mute">Sua carteira</p>
          <p className="mt-2 text-2xl font-bold text-paper">
            {sucesso.saldo_creditos} {sucesso.saldo_creditos === 1 ? "crédito" : "créditos"}
          </p>
          <p className="mt-1 text-sm text-mute">
            {sucesso.forma_pagamento === "credito"
              ? "1 crédito foi debitado agora."
              : sucesso.forma_pagamento === "fiado"
                ? `${brl(sucesso.valor_centavos)} lançado no fiado.`
                : sucesso.forma_pagamento === "pix"
                  ? "Nada foi debitado da carteira — o pagamento é pelo Pix."
                  : "Nada foi debitado da carteira — pagamento no ato."}
          </p>
          {sucesso.saldo_centavos < 0 ? (
            <p className="mt-1 text-sm text-brick">
              Fiado em aberto: {brl(Math.abs(sucesso.saldo_centavos))}
            </p>
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
                Faltam {Math.max(0, sucesso.fidelidade_alvo - sucesso.fidelidade_progresso)} para o
                corte grátis.
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-6 space-y-3">
          <Button asChild className="h-14 w-full text-base">
            <Link to="/app/historico" search={slug ? { b: slug } : {}}>
              Ver meus horários
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full"
            onClick={() => {
              setSucesso(null);
              setServicoId(null);
              setProfId("qualquer");
              setDia(null);
              setInicio(null);
              setForma("balcao");
              recarregar();
            }}
          >
            Agendar outro horário
          </Button>
          <Button asChild variant="text" className="h-12 w-full text-sm text-mute">
            <Link to="/app" search={slug ? { b: slug } : {}}>
              Voltar ao início
            </Link>
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Agendar" subtitle={`${dados.tenant.nome} · ${dados.cliente.nome}`}>
      <Passo n={1} titulo="Serviço" guia="agendar-servico">
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
              }}
            />
          ))}
        </div>
      </Passo>

      <Passo n={2} titulo="Profissional" guia="agendar-profissional">
        <div className="flex flex-wrap gap-2">
          {[{ id: "qualquer", nome: "Qualquer profissional" }, ...aptos].map((p) => (
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
        <TiraHorizontal rotulo="Escolha o dia">
          {dias.map((d) => {
            const { dia: sem, num, mes } = diaCurto(d);
            const fechado = Boolean(porDia.get(d)?.fechado);
            return (
              <div key={d} className="shrink-0 snap-start">
                <Chip
                  label={fechado ? `${sem} ${num}/${mes} · Fechado` : `${sem} ${num}/${mes}`}
                  selected={d === dia}
                  disabled={fechado}
                  onClick={() => {
                    setDia(d);
                    setInicio(null);
                  }}
                />
              </div>
            );
          })}
        </TiraHorizontal>
      </Passo>

      <Passo n={4} titulo="Horário" guia="agendar-horario">
        {!servico || !dia ? (
          <p className="text-sm text-mute">Escolha serviço e dia para ver os horários.</p>
        ) : agenda?.fechado ? (
          <p className="text-sm text-mute">A barbearia não abre neste dia. Escolha outro dia.</p>
        ) : agenda?.opcoes.length ? (
          <div className="flex flex-wrap gap-2">
            {agenda.opcoes.map((h) => (
              <Chip
                key={h.iso}
                label={h.label}
                selected={h.iso === inicio}
                onClick={() => setInicio(h.iso)}
              />
            ))}
          </div>
        ) : (
          <div>
            <p className="text-sm text-mute">
              Não há horários livres neste dia. Entre na fila de espera e avisamos se abrir vaga.
            </p>
            <Link
              to="/app/espera"
              search={{ ...(slug ? { b: slug } : {}), servico: servico.id, dia }}
              className="btn-primary mt-3 inline-flex px-5 py-3"
            >
              Entrar na fila
            </Link>
          </div>
        )}
      </Passo>

      <Passo n={5} titulo="Forma de pagamento">
        {!servico ? (
          <p className="text-sm text-mute">Escolha um serviço primeiro.</p>
        ) : (
          <ul>
            <li>
              <LinhaPagamento
                titulo="Pagar na barbearia"
                detalhe="Dinheiro, cartão ou Pix no balcão"
                valor={brl(preco)}
                selecionado={forma === "balcao"}
                onClick={() => setForma("balcao")}
              />
            </li>
            {dados.pixAtivo ? (
              <li>
                <LinhaPagamento
                  titulo="Pagar no Pix"
                  detalhe="Chave enviada no WhatsApp"
                  valor={brl(preco)}
                  selecionado={forma === "pix"}
                  onClick={() => setForma("pix")}
                />
              </li>
            ) : null}
            {regraMensal && dados.carteira.saldo_creditos > 0 ? (
              <li>
                <LinhaPagamento
                  titulo="Usar 1 crédito"
                  detalhe={`Sobram ${dados.carteira.saldo_creditos - 1} depois deste`}
                  valor="R$ 0,00"
                  valorClasse="text-sage"
                  selecionado={forma === "credito"}
                  onClick={() => setForma("credito")}
                />
              </li>
            ) : null}
            {regraFiado ? (
              <li>
                <LinhaPagamento
                  titulo="Deixar no fiado"
                  detalhe={
                    fiadoBloqueado
                      ? `Limite de fiado atingido (${brl(Math.abs(dados.carteira.saldo_centavos))} em aberto de ${brl(dados.cliente.limite_fiado_centavos)}). Fale com a barbearia.`
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

      <Passo n={6} titulo="Confirmação" guia="agendar-confirmar">
        {forma === "credito" ? (
          <p className="text-sm text-mute">
            Se cancelar até 4 horas antes, o crédito volta para a sua carteira. Depois disso ele é
            consumido.
          </p>
        ) : null}
        {escolhido && servico ? (
          <p className="mt-3 text-sm text-paper">
            {servico.nome} · {dataHoraLonga(escolhido.iso)}
          </p>
        ) : null}
        {conflito ? (
          <div className="mt-3 rounded-xl border border-brick/40 px-4 py-3" role="alert">
            <p className="text-sm text-paper">
              Você já tem um horário às {conflito.hora} nesse dia.
            </p>
            <button
              type="button"
              className="mt-3 h-12 w-full rounded-lg border border-line2 text-sm font-semibold text-paper"
              disabled={enviando}
              onClick={() => void confirmar(conflito.agendamentoId)}
            >
              Alterar esse horário
            </button>
          </div>
        ) : null}
        {erro ? <p className="mt-3 text-sm text-brick">{erro}</p> : null}
        <Button
          type="button"
          className="mt-5 h-14 w-full text-base"
          disabled={!servico || !escolhido || enviando}
          onClick={() => void confirmar()}
        >
          {enviando ? "Confirmando…" : "Confirmar agendamento"}
        </Button>
        {!servico ? (
          <p className="mt-2 text-xs text-mute">Escolha um serviço</p>
        ) : !escolhido ? (
          <p className="mt-2 text-xs text-mute">Escolha um horário</p>
        ) : null}
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
          <span
            className={`block text-sm ${selecionado ? "font-semibold text-paper" : "text-paper"}`}
          >
            {titulo}
          </span>
          <span className="mt-0.5 block text-xs text-mute">{detalhe}</span>
        </span>
      </span>
      <span className={`shrink-0 text-sm ${valorClasse ?? "text-paper"}`}>{valor}</span>
    </button>
  );
}
