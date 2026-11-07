/**
 * "Mensagem depois de agendar" (dono, 07/11/2026): o texto que o negócio escreve (endereço de estacionamento,
 * orientação, "chegue 10 min antes") aparece na confirmação do cliente e vai na confirmação do WhatsApp. Uma linha-resumo
 * e a gaveta padrão com o campo; grava pelo servidor (permissão conferida lá).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MessageSquareText } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import {
  AcaoDaFolha,
  CartaoDaFolha,
  FolhaPadrao,
  NotaDaFolha,
  SecaoDaFolha,
} from "@/components/ui/folha-padrao";
import { aviso } from "@/lib/avisos";
import {
  getMensagemPosAgendamento,
  salvarMensagemPosAgendamento,
} from "@/lib/mensagem-pos-agendamento.functions";
import { LIMITE_DA_MENSAGEM_POS } from "@/lib/mensagem-pos-agendamento";

export function MensagemAposAgendar({ podeEditar }: { podeEditar: boolean }) {
  const qc = useQueryClient();
  const [aberta, setAberta] = useState(false);
  const [texto, setTexto] = useState("");
  const atual = useQuery({
    queryKey: ["mensagem-pos-agendamento"],
    queryFn: () => getMensagemPosAgendamento(),
  });
  useEffect(() => {
    if (aberta) setTexto(atual.data?.mensagem ?? "");
  }, [aberta, atual.data]);

  const salvar = useMutation({
    mutationFn: (mensagem: string) => salvarMensagemPosAgendamento({ data: { mensagem } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["mensagem-pos-agendamento"] });
      aviso.ok("Mensagem salva.");
      setAberta(false);
    },
    onError: () => aviso.erro("Não foi possível salvar agora."),
  });

  if (!atual.data) return null;
  const resumo = atual.data.mensagem.trim() || "Nenhuma mensagem";
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        disabled={!podeEditar}
        onClick={() => setAberta(true)}
        className="mt-3 flex h-auto min-h-14 w-full justify-start gap-3 rounded-[28px] bg-[var(--figaro-surface-container-high,var(--ink2))] px-4 text-left font-normal"
      >
        <MessageSquareText aria-hidden className="size-5 shrink-0 text-mute" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] text-paper">Mensagem depois de agendar</span>
          <span className="block truncate text-[13px] text-mute">{resumo}</span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-mute" />
      </Button>

      <FolhaPadrao
        aberto={aberta}
        onAberto={setAberta}
        titulo="Mensagem depois de agendar"
        descricao="O cliente vê na confirmação e recebe no WhatsApp."
        rodape={
          <AcaoDaFolha
            className="w-full"
            loading={salvar.isPending}
            onClick={() => salvar.mutate(texto)}
          >
            Salvar
          </AcaoDaFolha>
        }
      >
        <SecaoDaFolha titulo="Texto" />
        <CartaoDaFolha className="p-3">
          <Textarea
            aria-label="Mensagem depois de agendar"
            value={texto}
            maxLength={LIMITE_DA_MENSAGEM_POS}
            rows={5}
            placeholder="Ex.: Chegue 10 minutos antes. Estacionamento na rua de trás."
            onChange={(e) => setTexto(e.target.value)}
          />
          <p className="mt-2 text-right text-[12px] text-mute">
            {texto.length}/{LIMITE_DA_MENSAGEM_POS}
          </p>
        </CartaoDaFolha>
        <NotaDaFolha>
          Deixe vazio para não mostrar nada. Frases curtas funcionam melhor.
        </NotaDaFolha>
      </FolhaPadrao>
    </>
  );
}
