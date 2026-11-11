import { useMemo, useState, type ReactNode } from "react";
import { Activity, AlertCircle, AlertTriangle, ChevronDown, Radio, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WhatsappDoNegocio } from "@/lib/whatsapp-central.functions";
import {
  saudeParaAdmin,
  type CategoriaSaudeAdmin,
  type SaudeAdmin,
  type TomSaude,
} from "@/lib/whatsapp/saude-painel";

type Filtro = "todos" | "pendencias" | "nao_confirmado";
type Item = { negocio: WhatsappDoNegocio; saude: SaudeAdmin };

const COR: Record<TomSaude, string> = {
  ok: "text-sage", alerta: "text-gold", erro: "text-brick", neutro: "text-mute2",
};
const PONTO: Record<TomSaude, string> = {
  ok: "bg-sage", alerta: "bg-gold", erro: "bg-brick", neutro: "bg-mute2",
};

function Quantidade({ rotulo, valor, icon: Icon }: {
  rotulo: string; valor: number; icon: typeof Activity;
}) {
  return (
    <div className="min-w-0 border-t border-line px-1 py-4">
      <div className="flex items-center gap-2 text-mute2">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="text-xs">{rotulo}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-paper">{valor}</p>
    </div>
  );
}

function Etiqueta({ saude }: { saude: SaudeAdmin }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 text-xs font-semibold ${COR[saude.tom]}`}>
      <span className={`size-2 rounded-full ${PONTO[saude.tom]}`} aria-hidden />
      {saude.titulo}
    </span>
  );
}

/** Apresentação administrativa. Só recebe dados filtrados pelo servidor com papel admin. */
export function PainelSaudeWhatsapp({
  negocios, aberto, aoAlternar, detalhe,
}: {
  negocios: WhatsappDoNegocio[];
  aberto: string | null;
  aoAlternar: (id: string) => void;
  detalhe: (negocio: WhatsappDoNegocio) => ReactNode;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const itens = useMemo<Item[]>(() => {
    const agora = new Date();
    return negocios
      .map((negocio) => ({
        negocio,
        saude: saudeParaAdmin(negocio, agora),
      }))
      .sort((a, b) => a.saude.prioridade - b.saude.prioridade || a.negocio.nome.localeCompare(b.negocio.nome, "pt-BR"));
  }, [negocios]);
  const totais = useMemo(() => ({
    saudaveis: itens.filter((n) => n.saude.categoria === "saudavel").length,
    criticos: itens.filter((n) => n.saude.categoria === "critico").length,
    atencao: itens.filter((n) => n.saude.categoria === "atencao").length,
    naoConfirmados: itens.filter((n) => n.saude.categoria === "nao_confirmado").length,
  }), [itens]);
  const visiveis = itens.filter(({ negocio, saude }) => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const combina = !termo || negocio.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
      (negocio.numero ?? "").includes(termo);
    if (!combina) return false;
    if (filtro === "pendencias") return ["critico", "atencao"].includes(saude.categoria);
    if (filtro === "nao_confirmado") return saude.categoria === "nao_confirmado";
    return true;
  });

  return (
    <div className="space-y-7">
      <section aria-label="Resumo das conexões" className="surface px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-mute2">Saúde do WhatsApp</p>
            <h2 className="mt-1 text-lg font-semibold text-paper">Visão da plataforma</h2>
            <p className="mt-1 text-xs leading-relaxed text-mute">
              Apenas conexões próprias verificadas recentemente aparecem como saudáveis.
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink2 text-gold">
            <Activity className="size-5" aria-hidden />
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-5 md:grid-cols-4">
          <Quantidade rotulo="Saudáveis" valor={totais.saudaveis} icon={Radio} />
          <Quantidade rotulo="Precisam de atenção" valor={totais.atencao} icon={AlertTriangle} />
          <Quantidade rotulo="Incidentes críticos" valor={totais.criticos} icon={AlertCircle} />
          <Quantidade rotulo="Sem confirmação" valor={totais.naoConfirmados} icon={Activity} />
        </div>
      </section>

      <section aria-label="Conexões por estabelecimento" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-paper">Estabelecimentos</h2>
            <p className="mt-1 text-xs text-mute2">
              {negocios.length} negócios · {visiveis.length} exibidos
            </p>
          </div>
        </div>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute2" />
          <label htmlFor="admin-saude-busca" className="sr-only">Buscar estabelecimento ou número</label>
          <input
            id="admin-saude-busca"
            className="field-control min-h-12 w-full pl-11"
            type="search"
            placeholder="Buscar estabelecimento ou número"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtrar conexões">
          {([
            ["todos", "Todos"],
            ["pendencias", "Pendências"],
            ["nao_confirmado", "Sem confirmação"],
          ] as const).map(([valor, rotulo]) => (
            <Button
              key={valor}
              size="sm"
              variant="ghost"
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
              className={`min-h-12 rounded-full border px-4 ${filtro === valor ? "border-gold/50 bg-ink2 text-paper" : "border-line text-mute"}`}
            >
              {rotulo}
            </Button>
          ))}
        </div>
        {visiveis.length === 0 ? (
          <div className="surface px-5 py-8 text-center">
            <p className="text-sm font-medium text-paper">
              {negocios.length ? "Nenhum resultado para esses filtros." : "Ainda não há estabelecimentos cadastrados."}
            </p>
            <p className="mt-1 text-xs text-mute2">
              {negocios.length ? "Altere a busca ou selecione Todos." : "As conexões aparecerão aqui quando forem cadastradas."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visiveis.map(({ negocio: n, saude }) => (
              <li key={n.tenantId} className="surface overflow-hidden">
                <Button
                  variant="ghost"
                  className="h-auto min-h-20 w-full justify-between gap-3 whitespace-normal rounded-none px-4 py-4 text-left sm:px-5"
                  aria-expanded={aberto === n.tenantId}
                  aria-controls={`detalhe-saude-${n.tenantId}`}
                  onClick={() => aoAlternar(n.tenantId)}
                >
                  <span className="min-w-0 flex-1 space-y-2">
                    <span className="block truncate text-sm font-semibold text-paper">{n.nome}</span>
                    <Etiqueta saude={saude} />
                    <span className="block text-xs font-normal leading-relaxed text-mute2">{saude.descricao}</span>
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-mute motion-safe:transition-transform motion-safe:duration-200 ${aberto === n.tenantId ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </Button>
                {aberto === n.tenantId ? (
                  <div id={`detalhe-saude-${n.tenantId}`} className="border-t border-line px-4 pb-4 sm:px-5">
                    {detalhe(n)}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs leading-relaxed text-mute2">
          Uma verificação desatualizada não prova queda. Acompanhe os incidentes e os envios
          separadamente antes de reiniciar uma sessão.
        </p>
      </section>
    </div>
  );
}

export type { CategoriaSaudeAdmin };
