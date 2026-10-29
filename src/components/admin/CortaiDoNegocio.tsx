import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { SeloDaCortai } from "@/components/ia/SeloDaCortai";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  definirCortaiDoNegocio,
  getCortaiDoNegocio,
  testarGatewayDaCortai,
} from "@/lib/admin.functions";
import { aviso } from "@/lib/avisos";
import { SELO_DA_CORTAI } from "@/lib/brain/estado-cortai";
import { dataHoraLonga } from "@/lib/format";

/**
 * Flow IA de um negócio, no ADM: interruptor geral, pausa por crédito, consumo de 24 h
 * e limite do WhatsApp. Desligar a IA nunca desliga agenda, comandas nem avisos.
 */
export function CortaiDoNegocio({ tenantId }: { tenantId: string }) {
  const chave = ["adm-cortai", tenantId];
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: chave,
    queryFn: () => getCortaiDoNegocio({ data: { tenantId } }),
    retry: false,
  });
  const definir = useServerFn(definirCortaiDoNegocio);
  const testar = useServerFn(testarGatewayDaCortai);
  const [salvando, setSalvando] = useState(false);
  const [limite, setLimite] = useState("");
  const [teste, setTeste] = useState<string | null>(null);
  const [testando, setTestando] = useState(false);

  useEffect(() => {
    if (query.data) setLimite(String(query.data.limiteWhatsapp));
  }, [query.data]);

  if (query.isLoading) return <EsqueletoFormulario />;
  if (query.error || !query.data)
    return <p className="text-sm text-brick">Não foi possível ler a Flow IA deste negócio.</p>;
  const c = query.data;

  async function salvar(campos: { ativa?: boolean; limiteWhatsapp?: number; retomar?: true }) {
    setSalvando(true);
    try {
      await definir({ data: { tenantId, ...campos } });
      await queryClient.invalidateQueries({ queryKey: chave });
      aviso.ok("Flow IA atualizada.");
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : undefined);
    } finally {
      setSalvando(false);
    }
  }

  const linhasDeUso = [
    { rotulo: "Painel", uso: c.uso.painel, limite: c.limites.painel },
    { rotulo: "WhatsApp (clientes)", uso: c.uso.whatsapp, limite: c.limites.whatsapp },
    { rotulo: "WhatsApp (equipe)", uso: c.uso.equipe, limite: null },
    { rotulo: "Site", uso: c.uso.site, limite: c.limites.site },
  ];
  const limiteNumero = Number(limite);
  const limiteValido = /^\d+$/.test(limite) && limiteNumero <= 5000;

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-paper">Flow IA</h3>
            <SeloDaCortai estado={c.estado} mostrarAtiva />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-mute">{SELO_DA_CORTAI[c.estado].texto}</p>
        </div>
        <Switch
          checked={c.ativa}
          disabled={salvando}
          onCheckedChange={(ativa) => void salvar({ ativa })}
          aria-label="Flow IA ligada neste negócio"
        />
      </section>

      {c.pausadaEm ? (
        <section className="border-b border-line pb-5">
          <h3 className="text-sm font-semibold text-paper">Pausa por crédito</h3>
          <p className="mt-1 text-xs leading-relaxed text-mute">
            Pausada em {dataHoraLonga(c.pausadaEm)}
            {c.pausaMotivo ? ` (${c.pausaMotivo})` : ""}. Encerrar a pausa faz a Flow IA tentar de
            novo já na próxima mensagem.
          </p>
          <Button
            className="mt-3"
            variant="outline"
            disabled={salvando}
            onClick={() => void salvar({ retomar: true })}
          >
            Encerrar pausa
          </Button>
        </section>
      ) : null}

      <section className="border-b border-line pb-5">
        <h3 className="text-sm font-semibold text-paper">Consumo nas últimas 24 h</h3>
        <ul className="mt-3 space-y-2">
          {linhasDeUso.map((l) => (
            <li key={l.rotulo} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-paper">{l.rotulo}</span>
              <span className="text-xs text-mute">
                {l.uso}
                {l.limite !== null ? ` de ${l.limite}` : ""} turnos
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-b border-line pb-5">
        <label className="field-label" htmlFor="limite-whatsapp-cortai">
          Limite diário no WhatsApp (clientes)
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="limite-whatsapp-cortai"
            inputMode="numeric"
            value={limite}
            onChange={(e) => setLimite(e.target.value.replace(/\D/g, ""))}
            className="field-control max-w-[140px]"
          />
          <Button
            variant="outline"
            disabled={salvando || !limiteValido || limiteNumero === c.limiteWhatsapp}
            onClick={() => void salvar({ limiteWhatsapp: limiteNumero })}
          >
            Salvar limite
          </Button>
        </div>
        <p className="field-hint">
          De 0 a 5000. Passou do limite, o WhatsApp volta às respostas fixas.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-paper">Teste do gateway</h3>
        <p className="mt-1 text-xs leading-relaxed text-mute">
          Faz uma pergunta mínima ao gateway de IA deste ambiente (consome um crédito pequeno).
        </p>
        <Button
          className="mt-3"
          variant="ghost"
          disabled={testando}
          onClick={async () => {
            setTestando(true);
            setTeste(null);
            try {
              const r = await testar();
              setTeste(
                `${r.ok ? "Funcionando" : "Falhou"} · ${r.status} · ${r.ms} ms · ${r.mensagem}`,
              );
            } catch (e) {
              setTeste(e instanceof Error ? e.message : "Não foi possível testar agora.");
            } finally {
              setTestando(false);
            }
          }}
        >
          {testando ? "Testando…" : "Testar agora"}
        </Button>
        {teste ? <p className="mt-2 text-xs text-mute">{teste}</p> : null}
      </section>
    </div>
  );
}
