import { useState } from "react";
import { Activity, ChevronDown, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CentralDeAutomacao } from "@/lib/whatsapp/central-automacao";
import { haQuanto, linhasDaCentral, type TomDaLinha } from "@/lib/whatsapp/central-rotulos";
import { saudeParaNegocio, type TomSaude } from "@/lib/whatsapp/saude-painel";

const COR: Record<TomSaude, string> = {
  ok: "text-sage", alerta: "text-gold", erro: "text-brick", neutro: "text-mute2",
};
const PONTO: Record<TomSaude, string> = {
  ok: "bg-sage", alerta: "bg-gold", erro: "bg-brick", neutro: "bg-mute2",
};

const ROTULO: Record<string, string> = {
  whatsapp: "WhatsApp",
  ia: "Respostas com IA",
  evolution: "Serviço de conexão",
  avisos: "Avisos automáticos",
  monitoramento: "Verificação automática",
};

/**
 * Saúde amigável para a equipe. Diagnóstico de infraestrutura fica recolhido
 * e somente quem gerencia o WhatsApp pode abri-lo.
 */
export function SaudeDoWhatsapp({
  central, podeGerenciar, ultimaFalha,
}: {
  central: CentralDeAutomacao;
  podeGerenciar: boolean;
  ultimaFalha: { texto: string; quando: string } | null;
}) {
  const [detalhes, setDetalhes] = useState(false);
  const saude = saudeParaNegocio(central);
  const linhas = linhasDaCentral(central);
  const agora = new Date();
  const visiveis = linhas.filter((l) => ["whatsapp", "ia", "avisos"].includes(l.chave));

  return (
    <section className="surface overflow-hidden" aria-labelledby="titulo-saude-whatsapp">
      <div className="px-5 pb-5 pt-5">
        <div className="flex items-start gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-ink2 ${COR[saude.tom]}`}>
            {saude.tom === "ok" ? (
              <ShieldCheck className="size-5" aria-hidden />
            ) : (
              <Activity className="size-5" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-mute2">
              Saúde da conexão
            </p>
            <h2 id="titulo-saude-whatsapp" className="mt-1 flex items-start gap-2 text-base font-semibold text-paper">
              <span className={`mt-2 size-2 shrink-0 rounded-full ${PONTO[saude.tom]}`} aria-hidden />
              {saude.titulo}
            </h2>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-mute">{saude.descricao}</p>
        <p className="mt-2 text-xs leading-relaxed text-mute2">{saude.orientacao}</p>
        <p className="mt-3 text-xs text-mute2">
          Última verificação: {haQuanto(central.ultimaVerificacaoEm, agora)}
        </p>
      </div>

      <div className="divide-y divide-line border-t border-line">
        {visiveis.map((l) => (
          <div className="flex min-h-12 items-center justify-between gap-3 px-5 py-3" key={l.chave}>
            <span className="text-sm text-paper">{ROTULO[l.chave] ?? l.rotulo}</span>
            <span className={`flex items-center gap-2 text-right text-xs font-medium ${COR[l.tom as TomDaLinha]}`}>
              <span className={`size-2 shrink-0 rounded-full ${PONTO[l.tom as TomDaLinha]}`} aria-hidden />
              {l.estado}
            </span>
          </div>
        ))}
      </div>

      {podeGerenciar ? (
        <div className="border-t border-line">
          <Button
            variant="ghost"
            className="min-h-12 w-full justify-between rounded-none px-5 text-xs text-mute"
            aria-expanded={detalhes}
            aria-controls="detalhes-conexao-flow"
            onClick={() => setDetalhes((atual) => !atual)}
          >
            <span>Diagnóstico detalhado</span>
            <ChevronDown
              className={`size-4 motion-safe:transition-transform motion-safe:duration-200 ${detalhes ? "rotate-180" : ""}`}
              aria-hidden
            />
          </Button>
          {detalhes ? (
            <div id="detalhes-conexao-flow" className="space-y-3 border-t border-line px-5 py-4">
              {linhas.filter((l) => ["evolution", "monitoramento"].includes(l.chave)).map((l) => (
                <div className="flex items-center justify-between gap-3" key={l.chave}>
                  <span className="text-sm text-mute">{ROTULO[l.chave] ?? l.rotulo}</span>
                  <span className={`text-xs font-medium ${COR[l.tom as TomDaLinha]}`}>{l.estado}</span>
                </div>
              ))}
              {ultimaFalha ? (
                <p className="text-xs text-mute2">
                  Última ocorrência: {ultimaFalha.texto}, {haQuanto(ultimaFalha.quando, agora)}
                </p>
              ) : null}
              <p className="text-xs leading-relaxed text-mute2">
                Os avisos de falha e recuperação chegam pelo sininho e pelas notificações do app.
                O estado da conexão não confirma a entrega de cada mensagem.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
