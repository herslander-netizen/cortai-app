import { createFileRoute } from "@tanstack/react-router";
import { useSucessoDoBotao } from "@/hooks/useSucessoDoBotao";
import { hojeNoFuso, somarDias } from "@/lib/horarios";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { EmptyState, Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { brl, fusoAtualDasTelas } from "@/lib/format";
import {
  getComissoes,
  getConfiguracaoFinanceira,
  pagarComissao,
  salvarConfiguracaoFinanceira,
} from "@/lib/financeiro.functions";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";

export const Route = createFileRoute("/barbeiro/comissoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Comissões — Painel do negócio | Flow" },
      {
        name: "description",
        content: "Comissão gerada, paga e pendente por profissional, item a item.",
      },
      { property: "og:title", content: "Comissões — Flow" },
      {
        property: "og:description",
        content: "Quanto cada profissional gerou e quanto ainda tem a receber.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ComissoesPage,
});

function periodo(chave: "hoje" | "semana" | "mes") {
  // Dias no fuso da barbearia, não no relógio do aparelho.
  const fim = hojeNoFuso(fusoAtualDasTelas());
  if (chave === "hoje") return { de: fim, ate: fim };
  if (chave === "semana") return { de: somarDias(fim, -6), ate: fim };
  return { de: `${fim.slice(0, 8)}01`, ate: fim };
}

function ComissoesPage() {
  const [filtro, setFiltro] = useState<"hoje" | "semana" | "mes">("mes");
  const intervalo = periodo(filtro);
  const comissoes = useQuery({
    queryKey: ["comissoes", filtro],
    queryFn: () => getComissoes({ data: intervalo }),
    retry: false,
  });
  const config = useQuery({
    queryKey: ["config-financeira"],
    queryFn: () => getConfiguracaoFinanceira(),
    retry: false,
  });
  const pagar = useServerFn(pagarComissao);
  const salvarConfig = useServerFn(salvarConfiguracaoFinanceira);

  const [form, setForm] = useState<null | {
    pixAtivo: boolean;
    pixChave: string;
    pixTipo: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
    pixWhatsapp: string;
    comissaoServico: string;
    comissaoProduto: string;
  }>(null);
  const [ocupado, setOcupado] = useState(false);
  const salvou = useSucessoDoBotao();
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const dados = config.data as any;
  const atual = form ?? {
    pixAtivo: Boolean(dados?.pix_ativo),
    pixChave: dados?.pix_chave ?? "",
    pixTipo: (dados?.pix_tipo ?? "aleatoria") as
      "cpf" | "cnpj" | "email" | "telefone" | "aleatoria",
    pixWhatsapp: dados?.pix_whatsapp ?? "",
    comissaoServico: String(dados?.comissao_servico_percentual ?? 50),
    comissaoProduto: String(dados?.comissao_produto_percentual ?? 10),
  };

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Comissões"
      subtitle="Calculada item a item, nunca sobre o total."
    >
      {comissoes.isLoading ? <EsqueletoLista /> : null}

      <OpcoesConectadas
        rotulo="Período"
        valor={filtro}
        opcoes={[
          { valor: "hoje", texto: "Hoje" },
          { valor: "semana", texto: "Semana" },
          { valor: "mes", texto: "Mês" },
        ]}
        onChange={setFiltro}
      />

      {(comissoes.data ?? []).length === 0 && !comissoes.isLoading ? (
        <div className="mt-5">
          <EmptyState text="Nenhuma comissão neste período." />
        </div>
      ) : null}

      <ul className="mt-5 space-y-3">
        {(comissoes.data ?? []).map((p: any) => (
          <li key={p.id} className="surface-card p-4 md:max-w-3xl md:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-paper">{p.nome}</p>
                <p className="mt-0.5 text-xs text-mute2">{p.atendimentos} atendimentos</p>
              </div>
              <span className="text-sm font-bold text-gold">{brl(p.comissao)}</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-xs">
              <div>
                <dt className="text-mute2">Serviços</dt>
                <dd className="text-paper">{brl(p.servicos)}</dd>
              </div>
              <div>
                <dt className="text-mute2">Produtos</dt>
                <dd className="text-paper">{brl(p.produtos)}</dd>
              </div>
              <div>
                <dt className="text-mute2">Comissão paga</dt>
                <dd className="text-sage">{brl(p.paga)}</dd>
              </div>
              <div>
                <dt className="text-mute2">Comissão pendente</dt>
                <dd className="text-brick">{brl(p.pendente)}</dd>
              </div>
            </dl>
            {p.pendente > 0 ? (
              <Button
                variant="outline"
                className="mt-4 w-full"
                disabled={ocupado}
                onClick={async () => {
                  setOcupado(true);
                  setErro(null);
                  setAviso(null);
                  try {
                    await pagar({ data: { profissionalId: p.id } });
                    setAviso(`Comissão de ${p.nome} registrada como paga.`);
                    await comissoes.refetch();
                  } catch (e) {
                    setErro(e instanceof Error ? e.message : "Não consegui registrar o pagamento.");
                  } finally {
                    setOcupado(false);
                  }
                }}
              >
                Registrar pagamento de {brl(p.pendente)}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {config.data ? (
        <section className="surface-card mt-8 p-4 md:max-w-3xl md:p-5">
          <h2 className="text-sm font-semibold text-paper">Regras de comissão e Pix</h2>
          <p className="mt-1 text-xs text-mute">
            Serviços e produtos podem ter percentual próprio; estes valores valem para quem não
            tiver.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-mute">
              Comissão de serviços (%)
              <input
                className="field-control"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={atual.comissaoServico}
                onChange={(e) => setForm({ ...atual, comissaoServico: e.target.value })}
              />
            </label>
            <label className="text-xs text-mute">
              Comissão de produtos (%)
              <input
                className="field-control"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={atual.comissaoProduto}
                onChange={(e) => setForm({ ...atual, comissaoProduto: e.target.value })}
              />
            </label>
            <label className="text-xs text-mute">
              Tipo da chave Pix
              <select
                className="field-control"
                value={atual.pixTipo}
                onChange={(e) =>
                  setForm({ ...atual, pixTipo: e.target.value as typeof atual.pixTipo })
                }
              >
                <option value="aleatoria">Aleatória</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="telefone">Telefone</option>
              </select>
            </label>
            <label className="text-xs text-mute">
              Chave Pix
              <input
                className="field-control"
                value={atual.pixChave}
                onChange={(e) => setForm({ ...atual, pixChave: e.target.value })}
                placeholder="Sua chave"
              />
            </label>
            <label className="text-xs text-mute">
              WhatsApp para comprovantes
              <input
                className="field-control"
                inputMode="tel"
                value={atual.pixWhatsapp}
                onChange={(e) => setForm({ ...atual, pixWhatsapp: e.target.value })}
                placeholder="(11) 90000-0000"
              />
            </label>
            <label className="flex items-end gap-2 text-xs text-mute">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={atual.pixAtivo}
                onChange={(e) => setForm({ ...atual, pixAtivo: e.target.checked })}
              />
              Aceitar pagamento por Pix
            </label>
          </div>
          <Button
            className="mt-4 w-full"
            disabled={ocupado}
            loading={ocupado}
            success={salvou.sucesso}
            onClick={async () => {
              setOcupado(true);
              setErro(null);
              setAviso(null);
              try {
                await salvarConfig({
                  data: {
                    pixAtivo: atual.pixAtivo,
                    pixChave: atual.pixChave,
                    pixTipo: atual.pixTipo,
                    pixWhatsapp: atual.pixWhatsapp,
                    comissaoServico: Number(atual.comissaoServico || 0),
                    comissaoProduto: Number(atual.comissaoProduto || 0),
                  },
                });
                setAviso("Configurações salvas.");
                salvou.confirmar();
                await config.refetch();
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Não consegui salvar agora.");
              } finally {
                setOcupado(false);
              }
            }}
          >
            Salvar configurações
          </Button>
        </section>
      ) : null}

      {aviso ? <p className="mt-5 text-sm text-sage">{aviso}</p> : null}
      {erro ? (
        <p className="mt-3 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}
    </Screen>
  );
}
