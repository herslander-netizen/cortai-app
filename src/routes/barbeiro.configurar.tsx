import { createFileRoute } from "@tanstack/react-router";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { BoasVindasDoOnboarding } from "@/components/onboarding/BoasVindasDoOnboarding";
import { ConclusaoDoOnboarding } from "@/components/onboarding/ConclusaoDoOnboarding";
import { ProgressoDoOnboarding } from "@/components/onboarding/passos/MolduraDoPasso";
import { PassosDoOnboarding } from "@/components/onboarding/passos/PassosDoOnboarding";
import {
  ROTULOS,
  tituloDoPasso,
  useConfiguracaoInicial,
} from "@/components/onboarding/useConfiguracaoInicial";
import { ETAPAS_DO_ONBOARDING } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/barbeiro/configurar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configurar seu negócio — Flow" },
      {
        name: "description",
        content: "Em poucos minutos, o link de agendamento do seu negócio fica pronto.",
      },
      { property: "og:title", content: "Configurar seu negócio — Flow" },
      {
        property: "og:description",
        content: "Negócio, equipe, serviços, horários, regras e link — em poucos minutos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfigurarPage,
});

function ConfigurarPage() {
  const c = useConfiguracaoInicial();
  const {
    navigate,
    data,
    isLoading,
    refetch,
    setEtapaEscolhida,
    mostrandoBoasVindas,
    setMostrandoBoasVindas,
    etapa,
    indice,
    indicePersistido,
    mostrarBoasVindas,
    copiado,
    vocabulario,
    link,
    linkCurto,
    abrirPassoInicial,
    configurando,
    copiarLink,
    compartilharLink,
  } = c;
  const totalDePassos = ETAPAS_DO_ONBOARDING.length - 1;

  return (
    <Screen
      title={mostrarBoasVindas ? "Bem-vindo ao Flow" : tituloDoPasso(etapa, vocabulario.possessivo)}
      subtitle={
        mostrarBoasVindas
          ? "Seu negócio agora tem uma nova casa."
          : etapa === "pronto"
            ? "Seu link já recebe agendamentos."
            : `Passo ${indice + 1} de ${totalDePassos} · ${ROTULOS[etapa]}. O progresso fica salvo.`
      }
      hideHeader={Boolean(mostrandoBoasVindas && (!data || !data.concluidoEm))}
    >
      {isLoading && !data ? (
        <EsqueletoFormulario campos={4} onTentarDeNovo={() => void refetch()} />
      ) : null}

      {data ? (
        <>
          {mostrarBoasVindas ? (
            <BoasVindasDoOnboarding
              indicePersistido={indicePersistido}
              continuarLabel={
                indicePersistido > 0 ? "Continuar configuração" : "Começar configuração"
              }
              onAbrirPasso={abrirPassoInicial}
              onContinuar={() => setMostrandoBoasVindas(false)}
              onDepois={() => void navigate({ to: "/barbeiro" })}
            />
          ) : null}

          {!mostrarBoasVindas && etapa !== "pronto" ? (
            <ProgressoDoOnboarding indice={indice} total={totalDePassos} />
          ) : null}

          {!mostrarBoasVindas ? <PassosDoOnboarding c={c} /> : null}
          {etapa === "pronto" || configurando ? (
            // Tela cheia como no Figaro: a espera ("Configurando sua página…") e o resultado são o mesmo
            // componente, então o anel ondulado vira o visto sem trocar de tela.
            <div className="fixed inset-0 z-50 overflow-y-auto bg-ink px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(48px,env(safe-area-inset-top))]">
              <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col justify-center">
                <ConclusaoDoOnboarding
                  carregando={etapa !== "pronto"}
                  titulo={`${vocabulario.possessivo.charAt(0).toUpperCase()}${vocabulario.possessivo.slice(1)} já pode receber agendamentos.`}
                  link={link}
                  linkCurto={linkCurto}
                  copiado={copiado}
                  onCopiar={copiarLink}
                  onCompartilhar={compartilharLink}
                  onIrParaAgenda={() => void navigate({ to: "/barbeiro" })}
                  onRevisar={() => setEtapaEscolhida("dados")}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
