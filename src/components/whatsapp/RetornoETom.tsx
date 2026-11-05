import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSucessoDoBotao } from "@/hooks/useSucessoDoBotao";
import { salvarConfiguracaoDoCortai, type PainelDoCortai } from "@/lib/whatsapp.functions";
import { TONS, type ConfiguracaoDoAtendimento } from "@/lib/whatsapp/contrato";

/**
 * Retorno (lembrar o cliente na hora de voltar) e tom das mensagens — a parte da configuração do atendimento que
 * não é um aviso de agendamento. Confirmação e lembretes têm UM controle só: o interruptor de cada aviso em
 * `AvisosParaClientes` (`automacoes_de_ia`), que o envio respeita primeiro (reorganização do dono, 05/11/2026).
 * Os valores de confirmação e lembretes da configuração seguem como vieram, só como padrão de quem nunca mexeu.
 */
export function RetornoETom({ painel }: { painel: PainelDoCortai }) {
  const cliente = useQueryClient();
  const salvar = useServerFn(salvarConfiguracaoDoCortai);
  const [config, setConfig] = useState(painel.configuracao);
  const [retorno, setRetorno] = useState(String(painel.configuracao.recuperacaoDias));
  const salvou = useSucessoDoBotao();
  const mutation = useMutation({
    mutationFn: () => salvar({ data: { ...config, recuperacaoDias: Number(retorno) || 30 } }),
    onSuccess: () => {
      salvou.confirmar();
      void cliente.invalidateQueries({ queryKey: ["cortai-painel"] });
    },
  });
  return (
    <section className="space-y-3">
      <Bloco titulo="Retorno" descricao="Lembra o cliente quando chega a hora de voltar.">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-paper">Lembrar o cliente de voltar</p>
          <Switch
            checked={config.recuperacaoAtiva}
            onCheckedChange={(v) => setConfig({ ...config, recuperacaoAtiva: v })}
            aria-label="Lembrar o cliente de voltar"
          />
        </div>
        {config.recuperacaoAtiva ? (
          <label className="field-label mt-4 block">
            Intervalo mínimo de retorno (dias)
            <input
              type="number"
              inputMode="numeric"
              min={7}
              max={180}
              value={retorno}
              onChange={(e) => setRetorno(e.target.value)}
              className="field-control mt-1 w-full"
            />
          </label>
        ) : null}
      </Bloco>
      <Bloco titulo="Tom das mensagens" descricao="Vale para todos os avisos automáticos.">
        <select
          value={config.tom}
          aria-label="Tom das mensagens"
          onChange={(e) =>
            setConfig({ ...config, tom: e.target.value as ConfiguracaoDoAtendimento["tom"] })
          }
          className="field-control w-full"
        >
          {Object.entries(TONS).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </Bloco>
      <Button
        className="w-full"
        loading={mutation.isPending}
        success={salvou.sucesso}
        onClick={() => mutation.mutate()}
      >
        Salvar retorno e tom
      </Button>
      {mutation.isError ? <Aviso tom="acao">Não foi possível salvar.</Aviso> : null}
    </section>
  );
}

function Bloco({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
      <h2 className="text-sm font-semibold text-paper">{titulo}</h2>
      {descricao ? <p className="mt-1 text-xs leading-relaxed text-mute">{descricao}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}
