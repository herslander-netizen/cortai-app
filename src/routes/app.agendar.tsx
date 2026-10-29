import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { DescobrirBarbearias } from "@/components/cliente/DescobrirBarbearias";
import { brl, dataHoraLonga, diaCurto } from "@/lib/format";
import { useSelecaoAgendamento } from "@/components/agendamento/useSelecaoAgendamento";
import { HorariosOcupados } from "@/components/agendamento/HorariosOcupados";
import {
  criarAgendamento,
  getDadosAgendar,
  type DadosAgendar,
  type ResultadoAgendamento,
} from "@/lib/agendamento.functions";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { TiraHorizontal } from "@/components/ui/tira-horizontal";
import { useContextoCliente } from "@/lib/contexto-cliente";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { rotuloForma } from "@/lib/pagamento";

export const Route = createFileRoute("/app/agendar")({
  validateSearch: (search: Record<string, unknown>): { b?: string } =>
    typeof search["b"] === "string" && search["b"] ? { b: search["b"] } : {},
  head: () => ({
    meta: [
      { title: "Agendar horário — Flow" },
      {
        name: "description",
        content: "Escolha serviço, profissional, dia, horário e forma de pagamento em uma tela só.",
      },
      { property: "og:title", content: "Agendar horário — Flow" },
      {
        property: "og:description",
        content: "Serviço, profissional, horário e pagamento em poucos toques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgendarPage,
});

type Forma = "credito" | "pix" | "balcao" | "fiado" | "saldo";

function OpcaoDeEscolha({
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
    <Chip
      selecionado={Boolean(selected)}
      disabled={Boolean(disabled)}
      onClick={onClick}
      className={strike ? "line-through" : ""}
    >
      {label}
      {sub ? <span className="text-xs opacity-70">{sub}</span> : null}
    </Chip>
  );
}

function Passo({
  n,
  titulo,
  guia,
  className,
  children,
}: {
  n: number;
  titulo: string;
  guia?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-guia={guia}
      className={`py-4 first:pt-0 ${className ?? ""}`}
    >
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-paper">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--figaro-surface-container-high,var(--ink3))] text-xs text-mute">
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
      <Screen title="Agendar" subtitle="Escolha o negócio para continuar.">
        <DescobrirBarbearias titulo="Onde você quer agendar?" />
      </Screen>
    );
  }

  if (dados.isLoading || !dados.data) {
    return (
      <Screen title="Agendar" subtitle="Escolha serviço, profissional e horário.">
        <EsqueletoFormulario campos={5} onTentarDeNovo={() => void dados.refetch()} />
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
    quantidadeDias: dados.regrasAgenda.janelaDias,
    passoMin: dados.regrasAgenda.passoMin,
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
          <p className="mt-3 flex items-center justify-between pt-3 text-sm">
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
              o negócio.
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
                : sucesso.forma_pagamento === "saldo"
                  ? `${brl(sucesso.valor_centavos)} foi debitado do saldo da sua carteira agora.`
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
            <div className="mt-5 pt-4">
              <p className="text-sm text-paper">
                Fidelidade: {sucesso.fidelidade_progresso} de {sucesso.fidelidade_alvo}
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--figaro-surface-container-high,var(--ink3))]">
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
              setCopiado(false);
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
            <OpcaoDeEscolha
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
            <OpcaoDeEscolha
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
                <OpcaoDeEscolha
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
          <p className="text-sm text-mute">O local não abre neste dia. Escolha outro dia.</p>
        ) : agenda?.opcoes.length ? (
          <div className="flex flex-wrap gap-2">
            {agenda.opcoes.map((h) => (
              <OpcaoDeEscolha
                key={h.iso}
                label={h.label}
                selected={h.iso === inicio}
                onClick={() => setInicio(h.iso)}
              />
            ))}
          </div>
        ) : null}
        {servico && dia && !agenda?.fechado ? (
          <HorariosOcupados
            ocupados={selecao.ocupadosDoDia}
            dia={dia}
            servicoId={servico.id}
            slug={slug}
            listaDeEspera
          />
        ) : null}
        {!servico || !dia || agenda?.fechado || agenda?.opcoes.length ? null : (
          <div>
            <p className="text-sm text-mute">
              Agenda cheia? Entre na lista de espera e avisaremos quando surgir uma vaga.
            </p>
            <Button asChild variant="primary" className="mt-3 min-h-12">
              <Link
                to="/app/espera"
                search={{ ...(slug ? { b: slug } : {}), servico: servico.id, dia }}
              >
                Entrar na lista de espera
              </Link>
            </Button>
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
                titulo="Pagar no local"
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
            {dados.carteira.saldo_centavos >= preco && preco > 0 ? (
              <li>
                <LinhaPagamento
                  titulo="Usar saldo da carteira"
                  detalhe={`Sobram ${brl(dados.carteira.saldo_centavos - preco)} depois deste`}
                  valor={brl(preco)}
                  valorClasse="text-sage"
                  selecionado={forma === "saldo"}
                  onClick={() => setForma("saldo")}
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
                      ? `Limite de fiado atingido (${brl(Math.abs(dados.carteira.saldo_centavos))} em aberto de ${brl(dados.cliente.limite_fiado_centavos)}). Fale com a equipe.`
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

      <Passo
        n={6}
        titulo="Confirmação"
        guia="agendar-confirmar"
        className="pb-[calc(6rem+env(safe-area-inset-bottom))]"
      >
        {forma === "credito" ? (
          <p className="text-sm text-mute">
            Se cancelar até 4 horas antes, o crédito volta para a sua carteira. Depois disso ele é
            consumido.
          </p>
        ) : null}
        {escolhido && servico ? (
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex items-start justify-between gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3">
              <dt className="text-mute">Serviço</dt>
              <dd className="text-right text-paper">
                {servico.nome} · {servico.duracao_min} min
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3">
              <dt className="text-mute">Profissional</dt>
              <dd className="text-right text-paper">{nomeProfissional(escolhido.profId)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3">
              <dt className="text-mute">Quando</dt>
              <dd className="text-right text-paper">{dataHoraLonga(escolhido.iso)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3">
              <dt className="text-mute">Pagamento</dt>
              <dd className="text-right text-paper">
                {rotuloForma(forma)} ·{" "}
                <span className="font-semibold">
                  {forma === "credito" ? "1 crédito" : brl(preco)}
                </span>
              </dd>
            </div>
          </dl>
        ) : null}
        {conflito ? (
          <div className="mt-3 rounded-[12px] border border-brick/40 bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3" role="alert">
            <p className="text-sm text-paper">
              Você já tem um horário às {conflito.hora} nesse dia.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-12 w-full"
              disabled={enviando}
              onClick={() => void confirmar(conflito.agendamentoId)}
            >
              Alterar esse horário
            </Button>
          </div>
        ) : null}
        {erro ? (
          <p className="mt-3 text-sm text-brick" role="alert">
            {erro}
          </p>
        ) : null}
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
    <Button
      type="button"
      variant="ghost"
      disabled={desabilitado}
      onClick={onClick}
      aria-pressed={selecionado}
      className={`min-h-16 w-full justify-between gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3 text-left ${
        desabilitado ? "opacity-50" : ""
      }`}
    >
      <span className="flex items-start gap-3">
        <span
          className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
            selecionado ? "border-[var(--figaro-primary,var(--primary))] bg-[var(--figaro-primary,var(--primary))]" : "border-line2"
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
    </Button>
  );
}
