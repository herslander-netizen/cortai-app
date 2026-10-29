import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/card";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import { EscolhaDePlano } from "@/components/planos/EscolhaDePlano";
import { profissionaisDoPlano, situacaoDoPaywall } from "@/lib/escolha-de-plano";
import { aviso } from "@/lib/avisos";
import { escolherPlanoDaBarbearia, getPlanosDaBarbearia } from "@/lib/planos.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/format";
import { ROTULO_STATUS, type Ciclo, type Forma } from "@/lib/cobranca";
import {
  contratarPlano,
  getMinhaCobranca,
  salvarMeusDadosDeCobranca,
} from "@/lib/cobranca.functions";

export const Route = createFileRoute("/barbeiro/plano")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Minha assinatura — Flow" },
      {
        name: "description",
        content: "Escolha o plano e veja exatamente o que está liberado para o seu negócio.",
      },
      { property: "og:title", content: "Plano do negócio — Flow" },
      {
        property: "og:description",
        content: "O plano decide o que aparece no painel do seu negócio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlanoPage,
});

function PlanoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const escolher = useServerFn(escolherPlanoDaBarbearia);
  const contratar = useServerFn(contratarPlano);
  const salvarCadastro = useServerFn(salvarMeusDadosDeCobranca);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [planoEscolhido, setPlanoEscolhido] = useState<string | null>(null);
  const [profissionais, setProfissionais] = useState<number | null>(null);
  const [ciclo, setCiclo] = useState<Ciclo>("mensal");
  const [forma, setForma] = useState<Forma>("pix");
  const [editandoCadastro, setEditandoCadastro] = useState(false);
  const [cadastro, setCadastro] = useState({ nome: "", cpfCnpj: "", email: "", telefone: "" });

  const planos = useQuery({
    queryKey: ["planos-da-barbearia"],
    queryFn: () => getPlanosDaBarbearia(),
    staleTime: 300_000,
  });
  const { data, isLoading } = planos;
  const cobranca = useQuery({
    queryKey: ["minha-cobranca"],
    queryFn: () => getMinhaCobranca(),
    staleTime: 30_000,
  });

  async function selecionar(chave: string) {
    if (!data?.podeTrocar || chave === data.atual) return;
    setSalvando(chave);
    try {
      const r = await escolher({ data: { chave } });
      aviso.ok(`Plano ${r.plano} aplicado. Seus dados continuam como estavam.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["planos-da-barbearia"] }),
        queryClient.invalidateQueries({ queryKey: ["capacidades"] }),
        queryClient.invalidateQueries({ queryKey: ["implantacao"] }),
      ]);
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não consegui trocar o plano agora.");
    } finally {
      setSalvando(null);
    }
  }

  async function confirmarContratacao() {
    if (!planoEscolhido) return;
    setSalvando(planoEscolhido);
    try {
      const r = await contratar({ data: { plano: planoEscolhido, ciclo, forma } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["minha-cobranca"] }),
        queryClient.invalidateQueries({ queryKey: ["planos-da-barbearia"] }),
        queryClient.invalidateQueries({ queryKey: ["capacidades"] }),
      ]);
      setPlanoEscolhido(null);
      if (r.link) window.open(r.link, "_blank", "noopener,noreferrer");
      aviso.ok(
        r.status === "teste"
          ? "Seu período de teste começou."
          : "Cobrança criada. Conclua o pagamento.",
      );
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não foi possível iniciar a assinatura.");
    } finally {
      setSalvando(null);
    }
  }

  async function salvarDados() {
    setSalvando("cadastro");
    try {
      await salvarCadastro({ data: cadastro });
      await queryClient.invalidateQueries({ queryKey: ["minha-cobranca"] });
      setEditandoCadastro(false);
      aviso.ok("Dados de cobrança salvos.");
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não foi possível salvar os dados.");
    } finally {
      setSalvando(null);
    }
  }

  const assinatura = cobranca.data?.assinatura;
  const faturaAberta = cobranca.data?.faturaAberta;
  const planoAtual = data?.planos.find(
    (plano) => plano.chave === (assinatura?.plano ?? data.atual),
  );
  const precisaRegularizar =
    assinatura && ["aguardando_pagamento", "pendente", "suspensa"].includes(assinatura.status);

  return (
    <Screen title="Minha assinatura" voltarPara="/barbeiro/conta">
      {isLoading || cobranca.isLoading || !data || !cobranca.data ? (
        <EsqueletoLista
          linhas={3}
          onTentarDeNovo={() => {
            void planos.refetch();
            void cobranca.refetch();
          }}
        />
      ) : (
        <div className="space-y-8">
          <EscolhaDePlano
            planos={data.planos}
            profissionais={profissionais ?? profissionaisDoPlano(data.planos, assinatura?.plano ?? data.atual)}
            aoMudarProfissionais={setProfissionais}
            situacao={situacaoDoPaywall({
              status: assinatura?.status ?? null,
              teste: data.capacidades.teste,
            })}
            desabilitado={!data.podeTrocar}
            ocupado={salvando !== null && salvando !== "cadastro"}
            rotuloDoBotao={(plano) =>
              plano.chave === assinatura?.plano && assinatura.status === "ativa"
                ? "Gerenciar assinatura"
                : assinatura?.status === "cancelada" || assinatura?.status === "suspensa"
                  ? "Reativar Assinatura"
                  : plano.precoMensalCentavos === 0
                    ? `Continuar no ${plano.nome}`
                    : `Assinar · ${brl(plano.precoMensalCentavos)}/mês`
            }
            aoContinuar={(plano) =>
              cobranca.data.configurada
                ? setPlanoEscolhido(plano.chave)
                : void selecionar(plano.chave)
            }
          />

          {planoEscolhido && cobranca.data.configurada ? (
            <section className="surface p-5" aria-labelledby="confirmar-plano">
              <h2 id="confirmar-plano" className="font-bold text-paper">
                Confirmar assinatura
              </h2>
              <OpcoesConectadas
                rotulo="Ciclo da assinatura"
                className="mt-4"
                valor={ciclo}
                opcoes={[
                  { valor: "mensal", texto: "Mensal" },
                  { valor: "anual", texto: "Anual" },
                ]}
                onChange={setCiclo}
              />
              <OpcoesConectadas
                rotulo="Forma de pagamento"
                className="mt-2"
                valor={forma}
                opcoes={[
                  { valor: "pix", texto: "Pix" },
                  { valor: "boleto", texto: "Boleto" },
                  { valor: "cartao", texto: "Cartão" },
                ]}
                onChange={setForma}
              />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={!cobranca.data.cadastro || salvando !== null}
                  onClick={() => void confirmarContratacao()}
                >
                  <CreditCard />{" "}
                  {salvando === planoEscolhido ? "Preparando…" : "Continuar para pagamento"}
                </Button>
                <Button variant="ghost" onClick={() => setPlanoEscolhido(null)}>
                  Voltar
                </Button>
              </div>
              {!cobranca.data.cadastro ? (
                <p className="mt-2 text-sm text-brick">
                  Cadastre os dados de cobrança antes de continuar.
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="surface space-y-4 p-5" aria-labelledby="assinatura-atual">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-mute">Assinatura atual</p>
                <h2 id="assinatura-atual" className="mt-1 text-xl font-extrabold text-paper">
                  {planoAtual?.nome ?? assinatura?.plano ?? "Sem plano pago"}
                </h2>
              </div>
              {assinatura ? (
                <Badge
                  variant={
                    assinatura.status === "ativa" ||
                    assinatura.status === "teste" ||
                    assinatura.status === "cortesia"
                      ? "success"
                      : assinatura.status === "cancelada" || assinatura.status === "suspensa"
                        ? "destructive"
                        : "outline"
                  }
                >
                  <ShieldCheck aria-hidden className="size-4" /> {ROTULO_STATUS[assinatura.status]}
                </Badge>
              ) : null}
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-mute">Valor</dt>
                <dd className="money-value mt-1 font-bold text-paper">
                  {brl(assinatura?.valorCentavos ?? planoAtual?.precoMensalCentavos ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-mute">Ciclo</dt>
                <dd className="mt-1 font-bold capitalize text-paper">
                  {assinatura?.ciclo ?? "mensal"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-mute">Próxima cobrança</dt>
                <dd className="mt-1 font-bold text-paper">
                  {assinatura?.proximoVencimento
                    ? new Date(`${assinatura.proximoVencimento}T12:00:00Z`).toLocaleDateString(
                        "pt-BR",
                        { timeZone: "UTC" },
                      )
                    : "Não informada"}
                </dd>
              </div>
            </dl>
            {precisaRegularizar && faturaAberta?.link ? (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href={faturaAberta.link} target="_blank" rel="noreferrer">
                  <ExternalLink /> REGULARIZAR PAGAMENTO
                </a>
              </Button>
            ) : assinatura?.status === "ativa" ? (
              <Button variant="outline" onClick={() => setPlanoEscolhido(assinatura.plano)}>
                <CreditCard /> Gerenciar assinatura
              </Button>
            ) : assinatura?.status === "cancelada" ? (
              <Button onClick={() => setPlanoEscolhido(data.atual)}>
                <CheckCircle2 /> Reativar assinatura
              </Button>
            ) : null}
            {!cobranca.data.configurada ? (
              <p className="text-sm text-mute">
                A cobrança online ainda não está configurada. Os planos continuam visíveis, mas
                nenhuma cobrança será simulada.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="dados-cobranca">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="dados-cobranca" className="font-bold text-paper">
                  Dados de cobrança
                </h2>
                <p className="mt-1 text-sm text-mute">Usados somente na assinatura do Flow.</p>
              </div>
              <Button variant="outline" onClick={() => setEditandoCadastro((valor) => !valor)}>
                {cobranca.data.cadastro ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
            {cobranca.data.cadastro && !editandoCadastro ? (
              <Card density="default" className="mt-3 text-sm text-mute">
                <strong className="text-paper">{cobranca.data.cadastro.nome}</strong> ·{" "}
                {cobranca.data.cadastro.documento} · {cobranca.data.cadastro.email}
              </Card>
            ) : null}
            {editandoCadastro || !cobranca.data.cadastro ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="field-label">
                  Nome ou razão social
                  <input
                    className="field-control mt-1"
                    value={cadastro.nome}
                    autoComplete="name"
                    onChange={(e) => setCadastro((v) => ({ ...v, nome: e.target.value }))}
                  />
                </label>
                <label className="field-label">
                  CPF ou CNPJ
                  <input
                    className="field-control mt-1"
                    value={cadastro.cpfCnpj}
                    inputMode="numeric"
                    onChange={(e) => setCadastro((v) => ({ ...v, cpfCnpj: e.target.value }))}
                  />
                </label>
                <label className="field-label">
                  E-mail
                  <input
                    className="field-control mt-1"
                    type="email"
                    value={cadastro.email}
                    autoComplete="email"
                    onChange={(e) => setCadastro((v) => ({ ...v, email: e.target.value }))}
                  />
                </label>
                <label className="field-label">
                  Telefone
                  <input
                    className="field-control mt-1"
                    inputMode="tel"
                    autoComplete="tel"
                    value={cadastro.telefone}
                    onChange={(e) => setCadastro((v) => ({ ...v, telefone: e.target.value }))}
                  />
                </label>
                <Button
                  className="sm:col-span-2"
                  size="lg"
                  disabled={salvando === "cadastro"}
                  onClick={() => void salvarDados()}
                >
                  {salvando === "cadastro" ? "Salvando…" : "Salvar dados de cobrança"}
                </Button>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="historico-cobrancas">
            <h2 id="historico-cobrancas" className="flex items-center gap-2 font-bold text-paper">
              <ReceiptText className="size-4" /> Histórico de cobranças
            </h2>
            {cobranca.data.historico.length ? (
              <ul className="mt-3 space-y-2">
                {cobranca.data.historico.map((fatura) => (
                  <li key={fatura.id}>
                    <Card density="default" className="flex min-h-16 items-center justify-between gap-3">
                    <span>
                      <strong className="block text-sm text-paper">
                        {brl(fatura.valorCentavos)}
                      </strong>
                      <small className="text-mute">
                        <CalendarClock className="mr-1 inline size-3" />
                        {fatura.vencimento
                          ? new Date(`${fatura.vencimento}T12:00:00Z`).toLocaleDateString("pt-BR", {
                              timeZone: "UTC",
                            })
                          : "Sem vencimento"}{" "}
                        · {fatura.forma ?? "Forma não informada"}
                      </small>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant={fatura.pagoEm ? "success" : "outline"}>
                        {fatura.pagoEm ? "Pago" : fatura.status}
                      </Badge>
                      {fatura.link && !fatura.pagoEm ? (
                        <Button asChild variant="icon" size="icon" aria-label="Abrir cobrança">
                          <a href={fatura.link} target="_blank" rel="noreferrer">
                            <ExternalLink />
                          </a>
                        </Button>
                      ) : null}
                    </span>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3"><EmptyState text="Nenhuma cobrança registrada ainda." /></div>
            )}
          </section>
          {!data.podeTrocar ? (
            <p className="text-xs text-mute2">
              Só quem pode alterar os dados do negócio troca o plano. Fale com o responsável.
            </p>
          ) : null}
          <p className="text-xs text-mute2">
            Trocar de plano não apaga clientes, agendamentos ou serviços.
          </p>
        </div>
      )}
    </Screen>
  );
}
