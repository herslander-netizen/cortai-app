import { createFileRoute, Link } from "@tanstack/react-router";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import { EsqueletoFormulario, EsqueletoLista } from "@/components/layout/Esqueleto";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Switch } from "@/components/ui/switch";
import { useAcao } from "@/hooks/useAcao";
import { brl } from "@/lib/format";
import { getAdminTenants } from "@/lib/admin.functions";
import {
  encerrarCondicao,
  definirPlanoDoTenant,
  getVisaoComercialDoTenant,
  listarBanners,
  listarCupons,
  listarPlanos,
  removerBanner,
  salvarBanner,
  salvarCondicao,
  salvarCupom,
  salvarPlano,
  type BannerAdmin,
  type CupomAdmin,
} from "@/lib/monetizacao.functions";
import { dataCurta, type Plano } from "@/lib/monetizacao";

export const Route = createFileRoute("/admin/monetizacao")({
  head: () => ({
    meta: [
      { title: "Monetização — Cortaí" },
      {
        name: "description",
        content: "Planos, preços, condições por negócio, cupons e campanhas do Cortaí.",
      },
      { property: "og:title", content: "Monetização — Cortaí" },
      {
        property: "og:description",
        content: "Administre preços, condições especiais, cupons e banners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MonetizacaoPage,
});

const ABAS = ["Planos e preços", "Por negócio", "Cupons", "Campanhas"] as const;

const hoje = () => new Date().toISOString().slice(0, 10);
const emReais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");
const emCentavos = (texto: string) =>
  Math.round(Number(texto.replace(/\./g, "").replace(",", ".") || 0) * 100);

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      {children}
    </label>
  );
}

const input = "field-control mt-1";

function MonetizacaoPage() {
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Planos e preços");
  return (
    <AdminScreen
      title="Monetização"
      subtitle="Planos, condições especiais, cupons e campanhas. O preço padrão nunca muda quando você fecha uma condição especial com um negócio."
    >
      <nav
        className="sem-barra mb-6 flex gap-2 overflow-x-auto pb-1"
        aria-label="Seções de monetização"
      >
        {ABAS.map((a) => (
          <Chip key={a} selecionado={aba === a} onClick={() => setAba(a)} className="whitespace-nowrap">
            {a}
          </Chip>
        ))}
      </nav>
      <Link
        to="/admin/recursos"
        className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3 text-sm text-paper"
      >
        <span>
          <span className="block font-semibold">Recursos e limites dos planos</span>
          <span className="mt-1 block text-xs text-mute">
            Defina o que cada plano libera, sem alterar preços.
          </span>
        </span>
        <span className="text-sm font-medium text-[var(--figaro-primary,var(--primary))]">Abrir</span>
      </Link>
      {aba === "Planos e preços" ? <AbaPlanos /> : null}
      {aba === "Por negócio" ? <AbaBarbearia /> : null}
      {aba === "Cupons" ? <AbaCupons /> : null}
      {aba === "Campanhas" ? <AbaBanners /> : null}
    </AdminScreen>
  );
}

/* ---------------------------- PLANOS E PREÇOS ---------------------------- */

function AbaPlanos() {
  const query = useQuery({
    queryKey: ["admin-planos"],
    queryFn: () => listarPlanos(),
    retry: false,
  });
  const salvar = useServerFn(salvarPlano);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");

  if (query.isError) return <AdminNotice error={query.error} />;
  if (!query.data) return <EsqueletoLista linhas={3} onTentarDeNovo={() => void query.refetch()} />;

  const novo: Plano = {
    id: "",
    chave: "",
    nome: "",
    descricao: "",
    precoMensalCentavos: 0,
    precoAnualCentavos: 0,
    diasTeste: 0,
    limiteProfissionais: null,
    limiteClientes: null,
    limiteAgendamentosMes: null,
    limiteUnidades: null,
    ordem: query.data.length + 1,
    ativo: true,
  };

  return (
    <div>
      {status ? (
        <Aviso className="mb-4" tom="sucesso">
          {status}
        </Aviso>
      ) : null}
      {erro ? (
        <Aviso className="mb-4" tom="atencao">
          {erro}
        </Aviso>
      ) : null}

      <ul className="space-y-2">
        {query.data.map((p) => (
          <li key={p.id} className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-paper">
                  {p.nome} {p.ativo ? null : <span className="text-xs text-mute2">(inativo)</span>}
                </p>
                <p className="mt-1 text-xs text-mute">
                  {brl(p.precoMensalCentavos)}/mês · {brl(p.precoAnualCentavos)}/ano · {p.diasTeste}{" "}
                  dias de teste
                </p>
                <p className="mt-1 text-xs text-mute2">
                  Limites: {p.limiteProfissionais ?? "sem limite"} profissionais ·{" "}
                  {p.limiteClientes ?? "sem limite"} clientes ·{" "}
                  {p.limiteAgendamentosMes ?? "sem limite"} agendamentos/mês
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="px-3 text-xs"
                onClick={() => setEditando(p)}
              >
                Editar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        className="mt-4 text-xs"
        onClick={() => setEditando(novo)}
      >
        Novo plano
      </Button>

      {editando ? (
        <FormularioPlano
          plano={editando}
          onCancelar={() => setEditando(null)}
          onSalvar={async (dados) => {
            setStatus("");
            setErro("");
            try {
              await salvar({ data: dados });
              setEditando(null);
              await query.refetch();
              setStatus(
                "Plano salvo. Os negócios com condição especial continuam com o preço deles.",
              );
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Não deu para salvar.");
            }
          }}
        />
      ) : null}
    </div>
  );
}

function FormularioPlano({
  plano,
  onSalvar,
  onCancelar,
}: {
  plano: Plano;
  onSalvar: (dados: any) => Promise<void>;
  onCancelar: () => void;
}) {
  const acao = useAcao();
  const [f, setF] = useState({
    chave: plano.chave,
    nome: plano.nome,
    descricao: plano.descricao ?? "",
    mensal: emReais(plano.precoMensalCentavos),
    anual: emReais(plano.precoAnualCentavos),
    diasTeste: String(plano.diasTeste),
    profissionais: plano.limiteProfissionais == null ? "" : String(plano.limiteProfissionais),
    clientes: plano.limiteClientes == null ? "" : String(plano.limiteClientes),
    agendamentos: plano.limiteAgendamentosMes == null ? "" : String(plano.limiteAgendamentosMes),
    unidades: plano.limiteUnidades == null ? "" : String(plano.limiteUnidades),
    ordem: String(plano.ordem),
    ativo: plano.ativo,
  });
  const numeroOuNulo = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v)));

  return (
    <form
      className="mt-5 space-y-3 surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void acao.executar("plano", () =>
          onSalvar({
            ...(plano.id ? { id: plano.id } : {}),
            chave: f.chave.trim().toLowerCase(),
            nome: f.nome.trim(),
            descricao: f.descricao.trim() || null,
            precoMensalCentavos: emCentavos(f.mensal),
            precoAnualCentavos: emCentavos(f.anual),
            diasTeste: Number(f.diasTeste || 0),
            limiteProfissionais: numeroOuNulo(f.profissionais),
            limiteClientes: numeroOuNulo(f.clientes),
            limiteAgendamentosMes: numeroOuNulo(f.agendamentos),
            limiteUnidades: numeroOuNulo(f.unidades),
            ordem: Number(f.ordem || 0),
            ativo: f.ativo,
          }),
        );
      }}
    >
      <p className="text-sm font-semibold text-paper">
        {plano.id ? `Editar ${plano.nome}` : "Novo plano"}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nome">
          <input
            className={input}
            value={f.nome}
            onChange={(e) => setF({ ...f, nome: e.target.value })}
            required
          />
        </Campo>
        <Campo label="Chave (interna)">
          <input
            className={input}
            value={f.chave}
            onChange={(e) => setF({ ...f, chave: e.target.value })}
            required
            disabled={Boolean(plano.id)}
          />
        </Campo>
        <Campo label="Preço mensal (R$)">
          <input
            className={input}
            inputMode="decimal"
            value={f.mensal}
            onChange={(e) => setF({ ...f, mensal: e.target.value })}
          />
        </Campo>
        <Campo label="Preço anual (R$)">
          <input
            className={input}
            inputMode="decimal"
            value={f.anual}
            onChange={(e) => setF({ ...f, anual: e.target.value })}
          />
        </Campo>
        <Campo label="Dias de teste grátis">
          <input
            className={input}
            inputMode="numeric"
            value={f.diasTeste}
            onChange={(e) => setF({ ...f, diasTeste: e.target.value })}
          />
        </Campo>
        <Campo label="Ordem">
          <input
            className={input}
            inputMode="numeric"
            value={f.ordem}
            onChange={(e) => setF({ ...f, ordem: e.target.value })}
          />
        </Campo>
        <Campo label="Limite de profissionais (vazio = sem limite)">
          <input
            className={input}
            inputMode="numeric"
            value={f.profissionais}
            onChange={(e) => setF({ ...f, profissionais: e.target.value })}
          />
        </Campo>
        <Campo label="Limite de clientes">
          <input
            className={input}
            inputMode="numeric"
            value={f.clientes}
            onChange={(e) => setF({ ...f, clientes: e.target.value })}
          />
        </Campo>
        <Campo label="Agendamentos por mês">
          <input
            className={input}
            inputMode="numeric"
            value={f.agendamentos}
            onChange={(e) => setF({ ...f, agendamentos: e.target.value })}
          />
        </Campo>
        <Campo label="Unidades">
          <input
            className={input}
            inputMode="numeric"
            value={f.unidades}
            onChange={(e) => setF({ ...f, unidades: e.target.value })}
          />
        </Campo>
      </div>
      <Campo label="Descrição">
        <textarea
          className={input}
          rows={2}
          value={f.descricao}
          onChange={(e) => setF({ ...f, descricao: e.target.value })}
        />
      </Campo>
      <div className="flex items-center gap-3">
        <Switch
          checked={f.ativo}
          onCheckedChange={(v) => setF({ ...f, ativo: v })}
          aria-label="Plano ativo"
        />
        <span className="text-xs text-mute">Plano disponível para contratação</span>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" className="px-5 text-sm" disabled={acao.ocupado}>
          {acao.estaEm("plano") ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" variant="outline" className="px-5 text-sm" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/* ----------------------------- POR BARBEARIA ----------------------------- */

function AbaBarbearia() {
  const [confirmar, dialogo] = useConfirmar();
  const tenants = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => getAdminTenants(),
    retry: false,
  });
  const planos = useQuery({
    queryKey: ["admin-planos"],
    queryFn: () => listarPlanos(),
    retry: false,
  });
  const [tenantId, setTenantId] = useState("");
  const visao = useQuery({
    queryKey: ["visao-comercial", tenantId],
    queryFn: () => getVisaoComercialDoTenant({ data: { tenantId } }),
    enabled: Boolean(tenantId),
    retry: false,
  });
  const salvar = useServerFn(salvarCondicao);
  const encerrar = useServerFn(encerrarCondicao);
  const definirPlano = useServerFn(definirPlanoDoTenant);
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({
    plano: "",
    preco: "",
    percentual: "0",
    fixo: "0",
    ciclo: "mensal",
    inicio: hoje(),
    fim: "",
    motivo: "",
  });
  const acao = useAcao();

  if (tenants.isError) return <AdminNotice error={tenants.error} />;

  return (
    <div>
      {dialogo}
      <Campo label="Barbearia">
        <select
          className={input}
          value={tenantId}
          onChange={(e) => {
            setTenantId(e.target.value);
            setStatus("");
            setErro("");
          }}
        >
          <option value="">Escolha um negócio</option>
          {(tenants.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </Campo>

      {status ? (
        <Aviso className="mt-4" tom="sucesso">
          {status}
        </Aviso>
      ) : null}
      {erro ? (
        <Aviso className="mt-4" tom="atencao">
          {erro}
        </Aviso>
      ) : null}

      {tenantId && visao.isError ? (
        <div className="mt-4">
          <AdminNotice error={visao.error} />
        </div>
      ) : null}
      {tenantId && !visao.data && !visao.isError ? (
        <EsqueletoFormulario campos={3} onTentarDeNovo={() => void visao.refetch()} />
      ) : null}

      {visao.data ? (
        <>
          <div className="mt-6 surface px-4 py-4">
            <p className="text-sm font-semibold text-paper">{visao.data.tenantNome}</p>
            <p className="mt-1 text-xs text-mute">
              Plano {visao.data.planoChave} · {visao.data.ciclo} · situação {visao.data.status}
              {visao.data.testeAte ? ` · teste até ${dataCurta(visao.data.testeAte)}` : ""}
            </p>
            <p className="mt-2 text-xs text-mute2">
              Preço padrão {brl(visao.data.precoPadraoCentavos)} · cobrando{" "}
              <span className="text-gold">{brl(visao.data.precoEfetivoCentavos)}</span>
            </p>
            <p className="mt-2 text-xs text-mute2">
              Uso: {visao.data.uso.profissionais}/{visao.data.limites.profissionais ?? "∞"}{" "}
              profissionais · {visao.data.uso.clientes}/{visao.data.limites.clientes ?? "∞"}{" "}
              clientes · {visao.data.uso.agendamentosMes}/
              {visao.data.limites.agendamentos_mes ?? "∞"} agendamentos no mês
            </p>
            {visao.data.cuponsAplicados.length ? (
              <p className="mt-2 text-xs text-mute2">
                Cupons usados: {visao.data.cuponsAplicados.map((c) => c.codigo).join(", ")}
              </p>
            ) : null}
          </div>

          <MudarPlano
            planos={planos.data ?? []}
            atual={visao.data}
            onSalvar={async (dados) => {
              setErro("");
              try {
                await definirPlano({ data: { tenantId, ...dados } });
                await visao.refetch();
                setStatus("Plano do negócio atualizado.");
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Não deu para atualizar.");
              }
            }}
          />

          <h3 className="mb-2 mt-8 text-sm font-semibold text-paper">Condições especiais</h3>
          <ul className="space-y-2">
            {visao.data.condicoes.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-4 surface px-4 py-3">
                <div>
                  <p className="text-xs text-paper">
                    {c.planoChave} ·{" "}
                    {c.precoPersonalizadoCentavos != null
                      ? brl(c.precoPersonalizadoCentavos)
                      : `${c.descontoPercentual}% + ${brl(c.descontoCentavos)}`}
                  </p>
                  <p className="mt-1 text-xs text-mute2">
                    {dataCurta(c.inicio)} até {c.fim ? dataCurta(c.fim) : "sem prazo"} ·{" "}
                    {c.ativo ? "ativa" : "encerrada"}
                    {c.motivo ? ` · ${c.motivo}` : ""}
                  </p>
                </div>
                {c.ativo ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 text-xs"
                    disabled={acao.ocupado}
                    onClick={async () => {
                      if (
                        !(await confirmar({
                          titulo: "Encerrar esta condição especial?",
                          descricao: "O negócio volta ao preço padrão.",
                          confirmar: "Encerrar",
                          destrutivo: true,
                        }))
                      )
                        return;
                      void acao.executar(
                        `encerrar-${c.id}`,
                        () => encerrar({ data: { id: c.id } }),
                        {
                          sucesso: "Condição encerrada. O negócio volta ao preço padrão.",
                          aoConcluir: async () => {
                            await visao.refetch();
                          },
                        },
                      );
                    }}
                  >
                    {acao.estaEm(`encerrar-${c.id}`) ? "Encerrando…" : "Encerrar"}
                  </Button>
                ) : null}
              </li>
            ))}
            {visao.data.condicoes.length === 0 ? (
              <li className="text-xs text-mute">
                Nenhuma condição especial. O negócio paga o preço padrão.
              </li>
            ) : null}
          </ul>

          <form
            className="mt-5 space-y-3 surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setErro("");
              setStatus("");
              void acao.executar(
                "condicao",
                () =>
                  salvar({
                    data: {
                      tenantId,
                      planoChave: form.plano || visao.data!.planoChave,
                      precoPersonalizadoCentavos: form.preco.trim() ? emCentavos(form.preco) : null,
                      descontoPercentual: Number(form.percentual || 0),
                      descontoCentavos: emCentavos(form.fixo),
                      ciclo: form.ciclo as "mensal" | "anual",
                      inicio: form.inicio,
                      fim: form.fim || null,
                      motivo: form.motivo.trim() || null,
                      limites: {},
                      recursos: [],
                      ativo: true,
                    },
                  }),
                {
                  sucesso:
                    "Condição criada só para este negócio. O preço padrão do plano não mudou.",
                  aoConcluir: async () => {
                    setForm({ ...form, preco: "", percentual: "0", fixo: "0", motivo: "" });
                    await visao.refetch();
                  },
                },
              );
            }}
          >
            <p className="text-sm font-semibold text-paper">Nova condição especial</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Plano">
                <select
                  className={input}
                  value={form.plano || visao.data.planoChave}
                  onChange={(e) => setForm({ ...form, plano: e.target.value })}
                >
                  {(planos.data ?? []).map((p) => (
                    <option key={p.chave} value={p.chave}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Ciclo">
                <select
                  className={input}
                  value={form.ciclo}
                  onChange={(e) => setForm({ ...form, ciclo: e.target.value })}
                >
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
              </Campo>
              <Campo label="Preço fechado (R$, opcional)">
                <input
                  className={input}
                  inputMode="decimal"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                />
              </Campo>
              <Campo label="Desconto (%)">
                <input
                  className={input}
                  inputMode="numeric"
                  value={form.percentual}
                  onChange={(e) => setForm({ ...form, percentual: e.target.value })}
                />
              </Campo>
              <Campo label="Desconto fixo (R$)">
                <input
                  className={input}
                  inputMode="decimal"
                  value={form.fixo}
                  onChange={(e) => setForm({ ...form, fixo: e.target.value })}
                />
              </Campo>
              <Campo label="Início">
                <input
                  className={input}
                  type="date"
                  value={form.inicio}
                  onChange={(e) => setForm({ ...form, inicio: e.target.value })}
                />
              </Campo>
              <Campo label="Fim (opcional)">
                <input
                  className={input}
                  type="date"
                  value={form.fim}
                  onChange={(e) => setForm({ ...form, fim: e.target.value })}
                />
              </Campo>
              <Campo label="Motivo interno">
                <input
                  className={input}
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                />
              </Campo>
            </div>
            <Button
              type="submit"
              variant="primary"
              className="px-5 text-sm"
              disabled={acao.ocupado}
            >
              {acao.estaEm("condicao") ? "Aplicando…" : "Aplicar condição"}
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );
}

function MudarPlano({
  planos,
  atual,
  onSalvar,
}: {
  planos: Plano[];
  atual: { planoChave: string; ciclo: string; status: string };
  onSalvar: (dados: {
    planoChave: string;
    ciclo: "mensal" | "anual";
    status: "teste" | "ativa" | "vencida" | "cancelada";
    diasDeTeste: number | null;
  }) => Promise<void>;
}) {
  const [f, setF] = useState({
    plano: atual.planoChave,
    ciclo: atual.ciclo,
    status: atual.status,
    dias: "14",
  });
  const acao = useAcao();
  return (
    <form
      className="mt-4 grid gap-3 surface p-4 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        void acao.executar("plano", () =>
          onSalvar({
            planoChave: f.plano,
            ciclo: f.ciclo as "mensal" | "anual",
            status: f.status as "teste" | "ativa" | "vencida" | "cancelada",
            diasDeTeste: f.status === "teste" ? Number(f.dias || 0) : null,
          }),
        );
      }}
    >
      <Campo label="Plano">
        <select
          className={input}
          value={f.plano}
          onChange={(e) => setF({ ...f, plano: e.target.value })}
        >
          {planos.map((p) => (
            <option key={p.chave} value={p.chave}>
              {p.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Ciclo">
        <select
          className={input}
          value={f.ciclo}
          onChange={(e) => setF({ ...f, ciclo: e.target.value })}
        >
          <option value="mensal">Mensal</option>
          <option value="anual">Anual</option>
        </select>
      </Campo>
      <Campo label="Situação">
        <select
          className={input}
          value={f.status}
          onChange={(e) => setF({ ...f, status: e.target.value })}
        >
          <option value="ativa">Ativa</option>
          <option value="teste">Teste grátis</option>
          <option value="vencida">Vencida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </Campo>
      {f.status === "teste" ? (
        <Campo label="Dias de teste">
          <input
            className={input}
            inputMode="numeric"
            value={f.dias}
            onChange={(e) => setF({ ...f, dias: e.target.value })}
          />
        </Campo>
      ) : (
        <div />
      )}
      <div className="sm:col-span-4">
        <Button type="submit" variant="primary" className="px-5 text-sm" disabled={acao.ocupado}>
          {acao.estaEm("plano") ? "Atualizando…" : "Atualizar plano do negócio"}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------- CUPONS -------------------------------- */

function AbaCupons() {
  const query = useQuery({
    queryKey: ["admin-cupons"],
    queryFn: () => listarCupons(),
    retry: false,
  });
  const planos = useQuery({
    queryKey: ["admin-planos"],
    queryFn: () => listarPlanos(),
    retry: false,
  });
  const salvar = useServerFn(salvarCupom);
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [f, setF] = useState({
    codigo: "",
    descricao: "",
    tipo: "percentual",
    valor: "10",
    inicio: hoje(),
    fim: "",
    usosMax: "",
    publico: "todos",
    planos: [] as string[],
  });

  if (query.isError) return <AdminNotice error={query.error} />;

  const alternar = async (c: CupomAdmin, ativo: boolean) => {
    await salvar({
      data: {
        id: c.id,
        codigo: c.codigo,
        descricao: c.descricao,
        tipo: c.tipo,
        valor: c.valor,
        inicio: c.inicio,
        fim: c.fim,
        usosMax: c.usosMax,
        publico: c.publico,
        planos: c.planos,
        ativo,
      },
    });
    await query.refetch();
  };

  return (
    <div>
      {status ? (
        <Aviso className="mb-4" tom="sucesso">
          {status}
        </Aviso>
      ) : null}
      {erro ? (
        <Aviso className="mb-4" tom="atencao">
          {erro}
        </Aviso>
      ) : null}

      <ul className="space-y-2">
        {(query.data ?? []).map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-4 surface px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-paper">{c.codigo}</p>
              <p className="mt-1 text-xs text-mute">
                {c.tipo === "percentual"
                  ? `${c.valor}% de desconto`
                  : `${brl(c.valor)} de desconto`}{" "}
                ·{" "}
                {c.publico === "todos"
                  ? "todos os negócios"
                  : c.publico === "novos"
                    ? "negócios novos"
                    : "negócios já clientes"}
              </p>
              <p className="mt-1 text-xs text-mute2">
                {dataCurta(c.inicio)} até {c.fim ? dataCurta(c.fim) : "sem prazo"} · {c.usos}
                {c.usosMax ? `/${c.usosMax}` : ""} usos
                {c.planos.length ? ` · planos: ${c.planos.join(", ")}` : ""}
              </p>
            </div>
            <Switch
              checked={c.ativo}
              aria-label={`Cupom ${c.codigo} ativo`}
              onCheckedChange={(v) => void alternar(c, v)}
            />
          </li>
        ))}
        {query.data && query.data.length === 0 ? (
          <li className="text-xs text-mute">Nenhum cupom criado ainda.</li>
        ) : null}
      </ul>

      <form
        className="mt-6 space-y-3 surface p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setStatus("");
          setErro("");
          try {
            await salvar({
              data: {
                codigo: f.codigo.trim(),
                descricao: f.descricao.trim() || null,
                tipo: f.tipo as "percentual" | "fixo",
                valor: f.tipo === "percentual" ? Number(f.valor || 0) : emCentavos(f.valor),
                inicio: f.inicio,
                fim: f.fim || null,
                usosMax: f.usosMax.trim() ? Number(f.usosMax) : null,
                publico: f.publico as "todos" | "novos" | "existentes",
                planos: f.planos,
                ativo: true,
              },
            });
            setF({ ...f, codigo: "", descricao: "" });
            await query.refetch();
            setStatus("Cupom criado.");
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Não deu para salvar o cupom.");
          }
        }}
      >
        <p className="text-sm font-semibold text-paper">Novo cupom</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Código">
            <input
              className={input}
              value={f.codigo}
              onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase() })}
              required
            />
          </Campo>
          <Campo label="Tipo">
            <select
              className={input}
              value={f.tipo}
              onChange={(e) => setF({ ...f, tipo: e.target.value })}
            >
              <option value="percentual">Percentual (%)</option>
              <option value="fixo">Valor fixo (R$)</option>
            </select>
          </Campo>
          <Campo label={f.tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}>
            <input
              className={input}
              inputMode="decimal"
              value={f.valor}
              onChange={(e) => setF({ ...f, valor: e.target.value })}
            />
          </Campo>
          <Campo label="Limite de usos (opcional)">
            <input
              className={input}
              inputMode="numeric"
              value={f.usosMax}
              onChange={(e) => setF({ ...f, usosMax: e.target.value })}
            />
          </Campo>
          <Campo label="Início">
            <input
              className={input}
              type="date"
              value={f.inicio}
              onChange={(e) => setF({ ...f, inicio: e.target.value })}
            />
          </Campo>
          <Campo label="Fim (opcional)">
            <input
              className={input}
              type="date"
              value={f.fim}
              onChange={(e) => setF({ ...f, fim: e.target.value })}
            />
          </Campo>
          <Campo label="Para quem">
            <select
              className={input}
              value={f.publico}
              onChange={(e) => setF({ ...f, publico: e.target.value })}
            >
              <option value="todos">Todos os negócios</option>
              <option value="novos">Só negócios novos</option>
              <option value="existentes">Só negócios já clientes</option>
            </select>
          </Campo>
          <Campo label="Planos (vazio = todos)">
            <select
              className={input}
              multiple
              value={f.planos}
              onChange={(e) =>
                setF({ ...f, planos: Array.from(e.target.selectedOptions).map((o) => o.value) })
              }
            >
              {(planos.data ?? []).map((p) => (
                <option key={p.chave} value={p.chave}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo label="Descrição">
          <input
            className={input}
            value={f.descricao}
            onChange={(e) => setF({ ...f, descricao: e.target.value })}
          />
        </Campo>
        <Button type="submit" variant="primary" className="px-5 text-sm">
          Criar cupom
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------- CAMPANHAS ------------------------------- */

function AbaBanners() {
  const [confirmar, dialogo] = useConfirmar();
  const query = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => listarBanners(),
    retry: false,
  });
  const tenants = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => getAdminTenants(),
    retry: false,
  });
  const planos = useQuery({
    queryKey: ["admin-planos"],
    queryFn: () => listarPlanos(),
    retry: false,
  });
  const salvar = useServerFn(salvarBanner);
  const remover = useServerFn(removerBanner);
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [f, setF] = useState({
    titulo: "",
    subtitulo: "",
    imagemUrl: "",
    ctaRotulo: "",
    ctaDestino: "",
    inicio: hoje(),
    fim: "",
    prioridade: "0",
    segmento: "todos",
    planoAlvo: "",
    tenantAlvo: "",
  });

  if (query.isError) return <AdminNotice error={query.error} />;

  const alternar = async (b: BannerAdmin, ativo: boolean) => {
    await salvar({
      data: {
        id: b.id,
        titulo: b.titulo,
        subtitulo: b.subtitulo,
        imagemUrl: b.imagemUrl,
        ctaRotulo: b.ctaRotulo,
        ctaDestino: b.ctaDestino,
        inicio: b.inicio,
        fim: b.fim,
        prioridade: b.prioridade,
        ativo,
        segmento: b.segmento as any,
        planoAlvo: b.planoAlvo,
        tenantAlvo: b.tenantAlvo,
      },
    });
    await query.refetch();
  };

  return (
    <div>
      {dialogo}
      {status ? (
        <Aviso className="mb-4" tom="sucesso">
          {status}
        </Aviso>
      ) : null}
      {erro ? (
        <Aviso className="mb-4" tom="atencao">
          {erro}
        </Aviso>
      ) : null}

      <ul className="space-y-2">
        {(query.data ?? []).map((b) => (
          <li key={b.id} className="flex items-start justify-between gap-4 surface px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-paper">{b.titulo}</p>
              {b.subtitulo ? <p className="mt-1 text-xs text-mute">{b.subtitulo}</p> : null}
              <p className="mt-1 text-xs text-mute2">
                {dataCurta(b.inicio)} até {b.fim ? dataCurta(b.fim) : "sem prazo"} · público:{" "}
                {b.segmento} · prioridade {b.prioridade}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={b.ativo}
                aria-label={`Campanha ${b.titulo} ativa`}
                onCheckedChange={(v) => void alternar(b, v)}
              />
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (
                    !(await confirmar({
                      titulo: "Excluir esta campanha?",
                      descricao: "A campanha será removida e deixará de aparecer para os clientes.",
                      confirmar: "Excluir campanha",
                      destrutivo: true,
                    }))
                  )
                    return;
                  await remover({ data: { id: b.id } });
                  await query.refetch();
                  setStatus("Campanha removida.");
                }}
              >
                Excluir
              </Button>
            </div>
          </li>
        ))}
        {query.data && query.data.length === 0 ? (
          <li className="text-xs text-mute">Nenhuma campanha publicada.</li>
        ) : null}
      </ul>

      <form
        className="mt-6 space-y-3 surface p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setStatus("");
          setErro("");
          try {
            await salvar({
              data: {
                titulo: f.titulo.trim(),
                subtitulo: f.subtitulo.trim() || null,
                imagemUrl: f.imagemUrl.trim() || null,
                ctaRotulo: f.ctaRotulo.trim() || null,
                ctaDestino: f.ctaDestino.trim() || null,
                inicio: f.inicio,
                fim: f.fim || null,
                prioridade: Number(f.prioridade || 0),
                ativo: true,
                segmento: f.segmento as
                  "todos" | "novos" | "teste" | "plano" | "tenant" | "vencimento",
                planoAlvo: f.planoAlvo || null,
                tenantAlvo: f.tenantAlvo || null,
              },
            });
            setF({ ...f, titulo: "", subtitulo: "", imagemUrl: "", ctaRotulo: "", ctaDestino: "" });
            await query.refetch();
            setStatus("Campanha publicada.");
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Não deu para publicar.");
          }
        }}
      >
        <p className="text-sm font-semibold text-paper">Nova campanha</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Título">
            <input
              className={input}
              value={f.titulo}
              onChange={(e) => setF({ ...f, titulo: e.target.value })}
              required
            />
          </Campo>
          <Campo label="Subtítulo">
            <input
              className={input}
              value={f.subtitulo}
              onChange={(e) => setF({ ...f, subtitulo: e.target.value })}
            />
          </Campo>
          <Campo label="Imagem (link)">
            <input
              className={input}
              value={f.imagemUrl}
              onChange={(e) => setF({ ...f, imagemUrl: e.target.value })}
            />
          </Campo>
          <Campo label="Texto do botão">
            <input
              className={input}
              value={f.ctaRotulo}
              onChange={(e) => setF({ ...f, ctaRotulo: e.target.value })}
            />
          </Campo>
          <Campo label="Destino do botão">
            <input
              className={input}
              value={f.ctaDestino}
              onChange={(e) => setF({ ...f, ctaDestino: e.target.value })}
            />
          </Campo>
          <Campo label="Prioridade">
            <input
              className={input}
              inputMode="numeric"
              value={f.prioridade}
              onChange={(e) => setF({ ...f, prioridade: e.target.value })}
            />
          </Campo>
          <Campo label="Início">
            <input
              className={input}
              type="date"
              value={f.inicio}
              onChange={(e) => setF({ ...f, inicio: e.target.value })}
            />
          </Campo>
          <Campo label="Fim (opcional)">
            <input
              className={input}
              type="date"
              value={f.fim}
              onChange={(e) => setF({ ...f, fim: e.target.value })}
            />
          </Campo>
          <Campo label="Quem vê">
            <select
              className={input}
              value={f.segmento}
              onChange={(e) => setF({ ...f, segmento: e.target.value })}
            >
              <option value="todos">Todos os negócios</option>
              <option value="novos">Negócios novos</option>
              <option value="teste">Em teste grátis</option>
              <option value="vencimento">Teste perto de acabar</option>
              <option value="plano">Um plano específico</option>
              <option value="tenant">Um negócio específico</option>
            </select>
          </Campo>
          {f.segmento === "plano" ? (
            <Campo label="Plano">
              <select
                className={input}
                value={f.planoAlvo}
                onChange={(e) => setF({ ...f, planoAlvo: e.target.value })}
              >
                <option value="">Escolha</option>
                {(planos.data ?? []).map((p) => (
                  <option key={p.chave} value={p.chave}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
          ) : null}
          {f.segmento === "tenant" ? (
            <Campo label="Barbearia">
              <select
                className={input}
                value={f.tenantAlvo}
                onChange={(e) => setF({ ...f, tenantAlvo: e.target.value })}
              >
                <option value="">Escolha</option>
                {(tenants.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </Campo>
          ) : null}
        </div>
        <Button type="submit" variant="primary" className="px-5 text-sm">
          Publicar campanha
        </Button>
      </form>
    </div>
  );
}
