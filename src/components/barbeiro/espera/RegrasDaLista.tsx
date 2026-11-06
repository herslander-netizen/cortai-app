/**
 * "Regras da lista" (dono, 06/11/2026: "colocar escolha de regras para o profissional escolher como funciona a
 * fila"). Uma linha-resumo abaixo do interruptor da lista e a gaveta padrão com três escolhas: prazo para responder,
 * antecedência mínima e profissional. Grava pelo servidor (permissão conferida no banco).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AcaoDaFolha,
  CartaoDaFolha,
  FolhaPadrao,
  NotaDaFolha,
  SecaoDaFolha,
} from "@/components/ui/folha-padrao";
import { Button } from "@/components/ui/button";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import { aviso } from "@/lib/avisos";
import type { RegrasDaEspera } from "@/lib/fila-compatibilidade";
import { definirRegrasDaEspera, getRegrasDaEspera } from "@/lib/regras-espera.functions";

const PRAZOS = [
  { valor: "10", texto: "10 min" },
  { valor: "15", texto: "15 min" },
  { valor: "30", texto: "30 min" },
  { valor: "60", texto: "1 h" },
] as const;
const ANTECEDENCIAS = [
  { valor: "10", texto: "10 min" },
  { valor: "30", texto: "30 min" },
  { valor: "60", texto: "1 h" },
  { valor: "120", texto: "2 h" },
] as const;
const PROFISSIONAL = [
  { valor: "pedido", texto: "Só o pedido" },
  { valor: "qualquer", texto: "Qualquer um" },
] as const;

export function resumoDasRegras(r: RegrasDaEspera) {
  const prazo = r.prazoMin >= 60 ? `${r.prazoMin / 60} h` : `${r.prazoMin} min`;
  return `${prazo} para responder · ${r.qualquerProfissional ? "qualquer profissional" : "só o profissional pedido"}`;
}

export function RegrasDaLista() {
  const qc = useQueryClient();
  const [aberta, setAberta] = useState(false);
  const regras = useQuery({ queryKey: ["regras-espera"], queryFn: () => getRegrasDaEspera() });
  const [rascunho, setRascunho] = useState<RegrasDaEspera | null>(null);
  useEffect(() => {
    if (aberta && regras.data) setRascunho(regras.data);
  }, [aberta, regras.data]);

  const salvar = useMutation({
    mutationFn: (r: RegrasDaEspera) => definirRegrasDaEspera({ data: r }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["regras-espera"] });
      aviso.ok("Regras da lista salvas.");
      setAberta(false);
    },
    onError: () => aviso.erro("Você não tem permissão para isso ou a conexão falhou."),
  });

  if (!regras.data) return null;
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setAberta(true)}
        data-guia="espera-regras"
        className="mt-3 flex h-auto min-h-14 w-full justify-start gap-3 rounded-[20px] font-normal bg-[var(--figaro-surface-container,var(--ink2))] px-4 text-left"
      >
        <SlidersHorizontal aria-hidden className="size-5 shrink-0 text-mute" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] text-paper">Regras da lista</span>
          <span className="block truncate text-[13px] text-mute">
            {resumoDasRegras(regras.data)}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-mute" />
      </Button>

      <FolhaPadrao
        aberto={aberta}
        onAberto={setAberta}
        titulo="Regras da lista"
        descricao="Como a vaga liberada é oferecida a quem está esperando."
        rodape={
          <AcaoDaFolha
            className="w-full"
            disabled={!rascunho || !regras.data.disponivel}
            loading={salvar.isPending}
            onClick={() => {
              if (rascunho) salvar.mutate(rascunho);
            }}
          >
            Salvar
          </AcaoDaFolha>
        }
      >
        {rascunho ? (
          <>
            <SecaoDaFolha titulo="Prazo para responder" />
            <CartaoDaFolha className="p-3">
              <OpcoesConectadas
                rotulo="Prazo para responder"
                valor={String(rascunho.prazoMin) as (typeof PRAZOS)[number]["valor"]}
                opcoes={PRAZOS}
                onChange={(v) => setRascunho({ ...rascunho, prazoMin: Number(v) })}
              />
            </CartaoDaFolha>
            <NotaDaFolha>Sem resposta nesse tempo, a vaga segue para a próxima pessoa.</NotaDaFolha>

            <SecaoDaFolha titulo="Não oferecer com menos de" />
            <CartaoDaFolha className="p-3">
              <OpcoesConectadas
                rotulo="Antecedência mínima"
                valor={String(rascunho.antecedenciaMin) as (typeof ANTECEDENCIAS)[number]["valor"]}
                opcoes={ANTECEDENCIAS}
                onChange={(v) => setRascunho({ ...rascunho, antecedenciaMin: Number(v) })}
              />
            </CartaoDaFolha>
            <NotaDaFolha>Antes do horário da vaga, para dar tempo de o cliente chegar.</NotaDaFolha>

            <SecaoDaFolha titulo="Profissional" />
            <CartaoDaFolha className="p-3">
              <OpcoesConectadas
                rotulo="Profissional"
                valor={rascunho.qualquerProfissional ? "qualquer" : "pedido"}
                opcoes={PROFISSIONAL}
                onChange={(v) =>
                  setRascunho({ ...rascunho, qualquerProfissional: v === "qualquer" })
                }
              />
            </CartaoDaFolha>
            <NotaDaFolha>
              {rascunho.qualquerProfissional
                ? "Oferece também a quem pediu outro profissional, se o da vaga faz o serviço."
                : "Só oferece a quem pediu o profissional da vaga ou não escolheu nenhum."}
            </NotaDaFolha>
            {!regras.data.disponivel ? (
              <NotaDaFolha tom="erro">
                As regras ainda não podem ser salvas neste ambiente (atualização do banco pendente).
              </NotaDaFolha>
            ) : null}
          </>
        ) : null}
      </FolhaPadrao>
    </>
  );
}
