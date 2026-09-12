import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { brl } from "@/lib/format";
import { ExclusaoPermanente } from "@/components/seguranca/ExclusaoPermanente";
import { Aviso } from "@/components/ui/aviso";
import {
  arquivarCliente,
  excluirClientePermanente,
  getFichaCliente,
  registrarBaixaFiado,
} from "@/lib/barbeiro.functions";
import { Carregando } from "@/components/layout/Carregando";

export const Route = createFileRoute("/barbeiro/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do cliente — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Fiado em aberto, baixas de pagamento e ficha técnica do corte." },
      { property: "og:title", content: "Ficha do cliente — Cortaí" },
      { property: "og:description", content: "Fiado, baixas e ficha técnica do corte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FichaPage,
});

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

function FichaPage() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();
  const baixar = useServerFn(registrarBaixaFiado);
  const arquivar = useServerFn(arquivarCliente);
  const excluir = useServerFn(excluirClientePermanente);
  const [arquivando, setArquivando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ficha-cliente", id],
    queryFn: () => getFichaCliente({ data: { clienteId: id } }),
  });

  const aberto = data?.emAbertoCentavos ?? 0;
  const quitado = aberto === 0;
  const limite = data?.cliente.limite_fiado_centavos ?? 0;
  const pct = limite > 0 ? Math.min(Math.round((aberto / limite) * 100), 100) : aberto > 0 ? 100 : 0;
  const cor = quitado ? "text-sage" : "text-brick";
  const corFundo = quitado ? "bg-sage" : "bg-brick";

  async function registrar(centavos: number) {
    const r = await baixar({ data: { clienteId: id, centavos } });
    setAviso(
      r.restante > 0
        ? `Baixa de ${brl(r.pago)} registrada. Ainda faltam ${brl(r.restante)}.`
        : `Baixa de ${brl(r.pago)} registrada. Fiado quitado.`,
    );
    setValor("");
    refetch();
  }

  return (
    <Screen title={data?.cliente.nome ?? "Ficha do cliente"} subtitle={data?.cliente.telefone ?? ""}>
      <Link to="/barbeiro/clientes" className="mb-4 inline-block text-xs text-mute underline">
        Voltar para clientes
      </Link>

      {isLoading ? <Carregando /> : null}
      {aviso ? <Aviso tom="info" className="mb-4">{aviso}</Aviso> : null}

      {data ? (
        <>
          <div className="rounded-lg border border-line bg-ink2 px-5 py-5">
            <p className="text-xs text-mute">Fiado em aberto</p>
            <p className={`mt-1 text-[28px] font-bold leading-none ${cor}`}>{brl(aberto)}</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ink3">
              <div className={`h-full ${corFundo}`} style={{ width: `${quitado ? 100 : pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-mute2">
              {quitado
                ? "Sem dívidas. Limite liberado."
                : `${brl(aberto)} de um limite de ${brl(limite)} · débito mais antigo em ${
                    data.maisAntigo ? dataCurta(data.maisAntigo) : "—"
                  }`}
            </p>
          </div>

          <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Débitos em aberto</h2>
          {data.debitos.length === 0 ? (
            <EmptyState text="Nenhum débito lançado." />
          ) : (
            <ul>
              {data.debitos.map((d) => {
                const velho = diasDesde(d.criado_em) > 30;
                return (
                  <li key={d.id} className="flex items-start justify-between gap-4 border-b border-line py-4">
                    <div>
                      <p className="text-sm text-paper">{d.descricao ?? "Lançado no fiado"}</p>
                      <p className={`mt-0.5 text-xs ${velho ? "text-brick" : "text-mute2"}`}>
                        {dataCurta(d.criado_em)}
                        {velho ? ` · ${diasDesde(d.criado_em)} dias` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-brick">{brl(d.centavos)}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6">
            <label className="block">
              <span className="text-xs text-mute2">Valor da baixa parcial</span>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                disabled={quitado}
                onChange={(e) => setValor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line2 bg-ink2 px-3 py-3 text-sm text-paper disabled:opacity-50"
              />
            </label>
            <button
              type="button"
              className="btn-secondary mt-3 w-full disabled:opacity-50"
              disabled={quitado || !valor}
              onClick={() => {
                const centavos = Math.round(Number(valor.replace(/\./g, "").replace(",", ".")) * 100);
                if (!Number.isFinite(centavos) || centavos <= 0) return;
                registrar(centavos);
              }}
            >
              Dar baixa parcial
            </button>
            <button
              type="button"
              className="btn-primary mt-3 w-full disabled:opacity-50"
              disabled={quitado}
              onClick={() => registrar(aberto)}
            >
              Quitar tudo
            </button>
            <p className="mt-2 text-xs text-mute2">
              Toda baixa entra como lançamento novo na carteira. O débito original nunca é alterado.
            </p>
            <a
              className="btn-tertiary mt-4 inline-block text-sm"
              href={`https://wa.me/55${data.cliente.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(
                `Olá, ${data.cliente.nome}! Passando para lembrar do valor de ${brl(aberto)} em aberto na barbearia.`,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Cobrar no WhatsApp
            </a>
          </div>

          {data.baixas.length > 0 ? (
            <>
              <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Baixas registradas</h2>
              <ul>
                {data.baixas.map((b) => (
                  <li key={b.id} className="flex items-start justify-between gap-4 border-b border-line py-4">
                    <div>
                      <p className="text-sm text-paper">{b.descricao ?? "Baixa do fiado"}</p>
                      <p className="mt-0.5 text-xs text-mute2">{dataCurta(b.criado_em)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-sage">+{brl(b.centavos)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className="mb-2 mt-8 text-sm font-semibold text-paper">Ficha técnica do corte</h2>
          <p className="rounded-lg border border-line bg-ink2 px-4 py-4 text-sm text-mute">
            {data.cliente.ficha_tecnica ?? "Nada anotado ainda sobre máquina, tesoura ou preferências."}
          </p>

          <section className="mt-10 border-t border-line pt-6">
            <h2 className="text-sm font-semibold text-paper">Situação do cliente</h2>
            <p className="mt-1 text-xs text-mute">
              {data.cliente.arquivado_em
                ? "Arquivado: some das listas do dia a dia, mas o histórico continua nos relatórios."
                : "Ativo nas listas e na agenda. Arquivar é reversível e não apaga nada."}
            </p>
            <button
              type="button"
              disabled={arquivando}
              className="btn-secondary mt-3 w-full disabled:opacity-50"
              onClick={async () => {
                setArquivando(true);
                setErro(null);
                try {
                  await arquivar({ data: { clienteId: id, arquivar: !data.cliente.arquivado_em } });
                  setAviso(data.cliente.arquivado_em ? "Cliente reativado." : "Cliente arquivado.");
                  refetch();
                } catch {
                  setErro("Não foi possível mudar a situação agora.");
                } finally {
                  setArquivando(false);
                }
              }}
            >
              {arquivando ? "Salvando…" : data.cliente.arquivado_em ? "Reativar cliente" : "Arquivar cliente"}
            </button>
            {erro ? <p className="mt-2 text-xs text-brick">{erro}</p> : null}
            <p className="mt-5 text-xs text-mute2">
              A exclusão definitiva só é possível para cadastros sem nenhum atendimento ou lançamento financeiro.
              Com histórico, o caminho seguro é arquivar.
            </p>
            <div className="mt-2">
              <ExclusaoPermanente
                titulo={`Excluir ${data.cliente.nome} permanentemente`}
                descricao="O cadastro e a carteira deste cliente serão apagados. Clientes com atendimentos ou valores lançados não podem ser excluídos."
                onExcluir={async (senha) => {
                  await excluir({ data: { clienteId: id, senha } });
                }}
                onSucesso={() => navigate({ to: "/barbeiro/clientes" })}
              />
            </div>
          </section>
        </>
      ) : null}
    </Screen>
  );
}
