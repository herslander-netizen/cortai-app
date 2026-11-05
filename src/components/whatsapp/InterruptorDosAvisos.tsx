import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Aviso } from "@/components/ui/aviso";
import { Switch } from "@/components/ui/switch";
import { definirNotificacoesWhatsapp, type PainelDoCortai } from "@/lib/whatsapp.functions";

/**
 * Interruptor geral dos avisos pelo WhatsApp (`tenants.notificacoes_whatsapp_ativas`), no topo da aba Avisos:
 * desligado, nenhum aviso sai pelo WhatsApp (o sininho continua). Antes ficava na aba Conexão como botão.
 */
export function InterruptorDosAvisos({ painel }: { painel: PainelDoCortai }) {
  const cliente = useQueryClient();
  const definir = useServerFn(definirNotificacoesWhatsapp);
  const alterar = useMutation({
    mutationFn: (ativas: boolean) => definir({ data: { ativas } }),
    onSettled: () => {
      void cliente.invalidateQueries({ queryKey: ["cortai-painel"] });
      void cliente.invalidateQueries({ queryKey: ["avisos-dos-clientes"] });
    },
  });
  const ativas = alterar.isPending ? !!alterar.variables : painel.notificacoesAtivas;
  return (
    <section className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-paper">Avisos pelo WhatsApp</h2>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            {ativas
              ? "Confirmações, lembretes e avisos saem pelo WhatsApp do negócio."
              : "Desligados: nenhum aviso sai pelo WhatsApp. O sininho continua avisando a equipe."}
          </p>
        </div>
        <Switch
          checked={ativas}
          disabled={!painel.podeGerenciarWhatsapp || alterar.isPending}
          onCheckedChange={(v) => alterar.mutate(v)}
          aria-label="Ligar ou desligar os avisos pelo WhatsApp"
          className="mt-0.5 shrink-0"
        />
      </div>
      {ativas && !painel.envioDeNotificacoesDisponivel ? (
        <Aviso tom="info" className="mt-3">
          O WhatsApp está desconectado; enquanto isso os avisos ficam no sininho.{" "}
          <Link to="/barbeiro/cortai" className="font-semibold underline">
            Conectar
          </Link>
        </Aviso>
      ) : null}
      {alterar.isError ? (
        <Aviso tom="acao" className="mt-3">
          Não foi possível salvar agora. Tente de novo.
        </Aviso>
      ) : null}
    </section>
  );
}
