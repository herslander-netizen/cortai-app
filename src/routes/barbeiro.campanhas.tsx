import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Plus, TicketPercent } from "lucide-react";
import { useState } from "react";

import { PassosCampanha } from "@/components/campanhas/PassosCampanha";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TelaDeFormulario } from "@/components/ui/formulario/TelaDeFormulario";
import { getContextoDeCampanhas } from "@/lib/campanhas-contexto.functions";
import {
  campanhaDoRascunho,
  novoRascunhoCampanha,
  PASSOS_CAMPANHA,
  validarPassoCampanha,
  type EtapaCampanha,
  type RascunhoCampanha,
} from "@/lib/campanhas-rascunho";
import type { Campanha } from "@/lib/campanhas-regras";
import { brl } from "@/lib/format";
import { hojeNoFuso } from "@/lib/horarios";

export const Route = createFileRoute("/barbeiro/campanhas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Campanhas promocionais — Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CampanhasPage,
});

/**
 * Prévia independente do editor. Ainda não há tabelas de campanha ou resgate.
 * Não guardar rascunho em localStorage: o usuário não deve confundir dado local
 * com uma promoção publicada que o caixa reconheceria.
 */
function CampanhasPage() {
  const consulta = useQuery({
    queryKey: ["campanhas-contexto"],
    queryFn: () => getContextoDeCampanhas(),
    retry: false,
  });
  const [rascunho, setRascunho] = useState<RascunhoCampanha | null>(null);
  const [passo, setPasso] = useState<EtapaCampanha>(0);
  const [erros, setErros] = useState<string[]>([]);
  const [concluido, setConcluido] = useState<Campanha | null>(null);
  const [copiado, setCopiado] = useState(false);

  const contexto = consulta.data;
  const revisao = rascunho && contexto ? campanhaDoRascunho(rascunho, contexto.fuso) : null;

  function iniciar() {
    if (!contexto) return;
    setRascunho(novoRascunhoCampanha(hojeNoFuso(contexto.fuso)));
    setPasso(0);
    setErros([]);
    setConcluido(null);
    setCopiado(false);
  }

  function proximo() {
    if (!rascunho || !contexto) return;
    if (passo < 3) {
      const encontrados = validarPassoCampanha(rascunho, passo);
      if (encontrados.length) {
        setErros(encontrados);
        return;
      }
      if (passo === 2 && revisao && !revisao.valida) {
        setErros(revisao.erros);
        return;
      }
      setErros([]);
      setPasso((passo + 1) as EtapaCampanha);
      return;
    }
    if (!revisao?.valida) {
      setErros(revisao?.erros ?? ["Não foi possível revisar esta configuração."]);
      return;
    }
    setConcluido(revisao.campanha);
    setRascunho(null);
    setErros([]);
  }

  async function copiarResumo() {
    if (!concluido || !contexto) return;
    const beneficio = concluido.beneficio.tipo === "percentual"
      ? `${concluido.beneficio.percentual}%`
      : brl(concluido.beneficio.valorCentavos);
    const texto = [
      `Rascunho não publicado — ${concluido.nome}`,
      `Cupom: ${concluido.codigo}`,
      `Desconto: ${beneficio}`,
      `Compra mínima: ${brl(concluido.compraMinimaCentavos)}`,
      `Resgates: ${concluido.limiteGlobal ?? "sem limite"} no total, ${concluido.limitePorCliente ?? "sem limite"} por cliente`,
      `De ${concluido.inicioEm} até (exclusivo) ${concluido.fimEm}`,
      `Fuso: ${contexto.fuso}`,
      "Ainda não existe campanha ativa nem desconto no caixa.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <>
      <Screen
        voltarPara="/barbeiro/mais"
        title="Campanhas promocionais"
        subtitle="Prepare a oferta e revise o cupom antes de ativar."
      >
        <div className="space-y-4 pb-8">
          <Aviso tom="atencao" titulo="Etapa de planejamento">
            Você pode simular uma campanha, mas ela ainda não é salva nem publicada.
            O resgate e a cobrança precisam ser integrados e validados no caixa.
          </Aviso>

          {consulta.isLoading ? <EsqueletoFormulario campos={3} /> : null}
          {consulta.isError ? (
            <Aviso tom="acao" titulo="Não foi possível carregar os dados do negócio">
              Confira sua conexão e suas permissões.
              <div className="mt-3">
                <Button variant="outline" onClick={() => void consulta.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            </Aviso>
          ) : null}

          {contexto ? (
            <Card density="default" className="space-y-3">
              <div className="flex items-start gap-3">
                <TicketPercent className="mt-0.5 size-6 shrink-0 text-[var(--figaro-primary)]" aria-hidden />
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-paper">Prepare sua próxima oferta</h2>
                  <p className="mt-1 text-sm leading-6 text-mute">
                    Quatro etapas: detalhes, benefício, duração e revisão.
                    Você poderá copiar o resumo ao terminar.
                  </p>
                </div>
              </div>
              <Button variant="primary" className="min-h-12 w-full" onClick={iniciar}>
                <Plus className="size-4" aria-hidden /> Simular campanha
              </Button>
            </Card>
          ) : null}

          {concluido ? (
            <Card density="default" className="space-y-3">
              <h2 className="text-base font-semibold text-paper">Configuração revisada</h2>
              <p className="text-sm text-paper">{concluido.nome} · {concluido.codigo}</p>
              <p className="text-sm text-mute">
                Prévia concluída. O resumo não foi salvo e a campanha não está ativa.
              </p>
              <Button variant="outline" className="min-h-12 w-full" onClick={() => void copiarResumo()}>
                <ClipboardCopy className="size-4" aria-hidden />
                {copiado ? "Resumo copiado" : "Copiar resumo"}
              </Button>
            </Card>
          ) : null}
        </div>
      </Screen>

      {rascunho && contexto ? (
        <TelaDeFormulario
          titulo="Nova campanha"
          subtitulo="Prévia não publicada — nenhum desconto será aplicado."
          sujo
          onFechar={() => { setRascunho(null); setErros([]); }}
          {...(passo > 0 ? { onVoltar: () => { setPasso((passo - 1) as EtapaCampanha); setErros([]); } } : {})}
          compacto={{ passo: PASSOS_CAMPANHA[passo], indice: passo }}
          acao={{
            rotulo: passo === 3 ? "Concluir prévia" : "Continuar",
            onClick: proximo,
            flutuante: { icone: passo === 3 ? "visto" : "seta" },
          }}
        >
          <PassosCampanha
            passo={passo}
            rascunho={rascunho}
            servicos={contexto.servicos}
            fuso={contexto.fuso}
            campanha={revisao?.valida ? revisao.campanha : null}
            onChange={(novo) => { setRascunho(novo); setErros([]); }}
          />
          {erros.length ? (
            <Aviso tom="acao" titulo="Revise os campos antes de continuar">
              <ul className="list-disc space-y-1 pl-4">
                {erros.map((erro) => <li key={erro}>{erro}</li>)}
              </ul>
            </Aviso>
          ) : null}
        </TelaDeFormulario>
      ) : null}
    </>
  );
}
