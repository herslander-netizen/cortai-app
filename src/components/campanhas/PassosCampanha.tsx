import { Card } from "@/components/ui/card";
import { CampoDeFormulario } from "@/components/ui/formulario/CampoDeFormulario";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import { brl } from "@/lib/format";
import {
  lerValorEmCentavos,
  type EtapaCampanha,
  type RascunhoCampanha,
} from "@/lib/campanhas-rascunho";
import type { Campanha } from "@/lib/campanhas-regras";

type Servico = { id: string; nome: string; precoCentavos: number };

type Props = {
  passo: EtapaCampanha;
  rascunho: RascunhoCampanha;
  servicos: readonly Servico[];
  fuso: string;
  campanha: Campanha | null;
  onChange: (proximo: RascunhoCampanha) => void;
};

function DataDaCampanha({ valor, rotulo, onChange }: {
  valor: string; rotulo: string; onChange: (v: string) => void;
}) {
  return (
    <CampoDeFormulario
      rotulo={rotulo}
      type="date"
      min="2000-01-01"
      max="2100-12-31"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function PassosCampanha({
  passo, rascunho, servicos, fuso, campanha, onChange,
}: Props) {
  const mudar = (parcial: Partial<RascunhoCampanha>) => onChange({ ...rascunho, ...parcial });

  if (passo === 0) {
    return (
      <div className="space-y-4" data-campanha-etapa="detalhes">
        <Card density="default" className="space-y-4">
          <CampoDeFormulario
            rotulo="Nome da campanha"
            value={rascunho.nome}
            maxLength={80}
            autoComplete="off"
            onChange={(e) => mudar({ nome: e.target.value })}
          />
          <CampoDeFormulario
            rotulo="Código do cupom"
            value={rascunho.codigo}
            maxLength={20}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => mudar({ codigo: e.target.value.toUpperCase() })}
            dica="4 a 20 caracteres: letras, números ou hífen."
          />
        </Card>
        <p className="px-1 text-xs leading-5 text-mute">
          O código identifica uma promoção. A exclusividade por negócio será garantida pelo
          banco quando a publicação for habilitada.
        </p>
      </div>
    );
  }

  if (passo === 1) {
    return (
      <div className="space-y-4" data-campanha-etapa="beneficio">
        <Card density="default" className="space-y-4">
          <p className="text-sm font-semibold text-paper">Tipo de desconto</p>
          <OpcoesConectadas
            rotulo="Tipo de desconto da campanha"
            valor={rascunho.tipoDesconto}
            onChange={(tipoDesconto) => mudar({ tipoDesconto })}
            opcoes={[
              { valor: "percentual", texto: "Percentual" },
              { valor: "valor_fixo", texto: "Valor em R$" },
            ]}
          />
          {rascunho.tipoDesconto === "percentual" ? (
            <CampoDeFormulario
              rotulo="Desconto (%)"
              type="number"
              min={1}
              max={100}
              step={1}
              inputMode="numeric"
              value={rascunho.percentual}
              onChange={(e) => mudar({ percentual: e.target.value })}
            />
          ) : (
            <CampoDeFormulario
              rotulo="Desconto fixo (R$)"
              inputMode="decimal"
              value={rascunho.valorFixo}
              onChange={(e) => mudar({ valorFixo: e.target.value })}
            />
          )}
          <CampoDeFormulario
            rotulo="Compra mínima (R$)"
            inputMode="decimal"
            value={rascunho.compraMinima}
            onChange={(e) => mudar({ compraMinima: e.target.value })}
            dica="Use zero para não exigir um valor mínimo."
          />
          <CampoDeFormulario
            rotulo="Resgates no total (opcional)"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={rascunho.limiteGlobal}
            onChange={(e) => mudar({ limiteGlobal: e.target.value })}
            dica="Em branco: sem limite global."
          />
          <CampoDeFormulario
            rotulo="Resgates por cliente (opcional)"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={rascunho.limitePorCliente}
            onChange={(e) => mudar({ limitePorCliente: e.target.value })}
            dica="Em branco: sem limite por cliente."
          />
        </Card>
        <Card density="default" className="space-y-3">
          <h3 className="text-sm font-semibold text-paper">Serviços elegíveis</h3>
          <p className="text-xs leading-5 text-mute">
            Nenhum selecionado: cupom válido para qualquer serviço.
          </p>
          {servicos.length === 0 ? (
            <p className="text-sm text-mute">Nenhum serviço ativo disponível.</p>
          ) : (
            <ul className="space-y-1">
              {servicos.map((s) => {
                const marcado = rascunho.servicosIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 py-1">
                      <input
                        type="checkbox"
                        checked={marcado}
                        className="size-5 shrink-0 accent-[var(--figaro-primary)]"
                        onChange={(e) => mudar({
                          servicosIds: e.target.checked
                            ? [...rascunho.servicosIds, s.id]
                            : rascunho.servicosIds.filter((id) => id !== s.id),
                        })}
                      />
                      <span className="min-w-0 flex-1 text-sm text-paper">{s.nome}</span>
                      <span className="shrink-0 text-xs text-mute">{brl(s.precoCentavos)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  if (passo === 2) {
    return (
      <div className="space-y-4" data-campanha-etapa="duracao">
        <Card density="default" className="space-y-4">
          <DataDaCampanha
            rotulo="Primeiro dia da campanha"
            valor={rascunho.inicio}
            onChange={(inicio) => mudar({ inicio })}
          />
          <DataDaCampanha
            rotulo="Último dia da campanha"
            valor={rascunho.ultimoDia}
            onChange={(ultimoDia) => mudar({ ultimoDia })}
          />
        </Card>
        <p className="px-1 text-xs leading-5 text-mute">
          Período contado no fuso {fuso}. O desconto vale do início do primeiro dia
          até o fim do último dia. A publicação real ainda está desativada.
        </p>
      </div>
    );
  }

  if (!campanha) return null;
  const selecionados = servicos.filter((s) => campanha.servicosIds.includes(s.id));
  const desconto = campanha.beneficio.tipo === "percentual"
    ? `${campanha.beneficio.percentual}%`
    : brl(campanha.beneficio.valorCentavos);
  const data = (dia: string) => dia.split("-").reverse().join("/");
  return (
    <div className="space-y-4" data-campanha-etapa="revisao">
      <Card density="default" className="space-y-3">
        <h3 className="text-lg font-semibold text-paper">{campanha.nome}</h3>
        <p className="text-sm font-semibold text-[var(--figaro-primary)]">{campanha.codigo}</p>
        <div className="space-y-2 text-sm text-paper">
          <p>Benefício: <strong>{desconto}</strong></p>
          <p>Compra mínima: {brl(campanha.compraMinimaCentavos)}</p>
          <p>Resgates globais: {campanha.limiteGlobal ?? "Sem limite"}</p>
          <p>Por cliente: {campanha.limitePorCliente ?? "Sem limite"}</p>
          <p>Serviços: {selecionados.length
            ? selecionados.map((s) => s.nome).join(", ")
            : "Todos os serviços"}</p>
          <p>De {data(rascunho.inicio)} até {data(rascunho.ultimoDia)}</p>
        </div>
      </Card>
      <p className="px-1 text-xs leading-5 text-mute">
        Esta é somente uma revisão de configuração. Concluir não cria campanha,
        não reserva código e não ativa descontos.
      </p>
    </div>
  );
}
