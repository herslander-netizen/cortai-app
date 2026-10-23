import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BotaoFab } from "@/components/ui/BotaoFab";
import { Button } from "@/components/ui/button";
import { useMenosMovimento } from "@/hooks/useMovimento";
import { MOLA } from "@/lib/movimento-figaro";

/** Distância do teclado virtual até a base da tela (0 sem teclado). */
function useAlturaDoTeclado() {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const medir = () => setAltura(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, []);
  return altura;
}

/**
 * Tela cheia de formulário: botão redondo de fechar/voltar, título grande,
 * área rolável e a ação principal flutuante em pílula (a única primária).
 * Fecha por X, Esc e gesto de voltar; com dados não salvos pede confirmação.
 */
export function TelaDeFormulario({
  titulo,
  subtitulo,
  icone = "fechar",
  sujo = false,
  onFechar,
  onVoltar,
  compacto,
  acao,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  icone?: "fechar" | "voltar";
  sujo?: boolean;
  onFechar: () => void;
  /**
   * Passo anterior de um fluxo em etapas. Com ele, o botão do topo vira "voltar" e o gesto de voltar do
   * celular também chama `onVoltar`, sem pedir confirmação (só `onFechar` pede).
   */
  onVoltar?: () => void;
  /**
   * Cabeçalho compacto do Figaro (`FigarooCreationFlowScaffold`): botão e título do passo na mesma
   * barra, sem o título grande. `titulo` vira o texto pequeno de cima e `passo` o título do passo.
   */
  compacto?: { passo: string; indice: number };
  acao?: {
    rotulo: string;
    onClick: () => void;
    desabilitada?: boolean;
    carregando?: boolean;
    /** Salvou: o botão mostra ✓ + o rótulo (estado `Success` do Figaro) até a tela sair. */
    sucesso?: boolean;
    /** Confirmação que vira círculo com ✓ no sucesso (botão flutuante do Figaro). */
    morfo?: boolean;
    /**
     * Botão flutuante estendido do Figaro (`FigarooExtendedFAB`), alinhado à direita: a largura acompanha o
     * rótulo de cada passo e, ao salvar, vira círculo com uma forma girando e depois com o ✓.
     */
    flutuante?: { icone: "seta" | "visto" };
  };
  children: ReactNode;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const teclado = useAlturaDoTeclado();
  const sujoRef = useRef(sujo);
  sujoRef.current = sujo;
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;
  const voltarRef = useRef(onVoltar);
  voltarRef.current = onVoltar;
  const menosMovimento = useMenosMovimento();
  const indiceAnterior = useRef(compacto?.indice ?? 0);
  const sentidoDoTitulo = useRef(1);
  if (compacto && indiceAnterior.current !== compacto.indice) {
    sentidoDoTitulo.current = compacto.indice > indiceAnterior.current ? 1 : -1;
    indiceAnterior.current = compacto.indice;
  }

  function pedirFechar() {
    if (voltarRef.current) voltarRef.current();
    else if (sujoRef.current) setConfirmar(true);
    else fecharRef.current();
  }

  // Gesto de voltar do celular: uma entrada no histórico enquanto a tela está aberta.
  useEffect(() => {
    window.history.pushState({ telaDeFormulario: true }, "");
    const aoVoltar = () => {
      if (voltarRef.current) {
        window.history.pushState({ telaDeFormulario: true }, "");
        voltarRef.current();
      } else if (sujoRef.current) {
        window.history.pushState({ telaDeFormulario: true }, "");
        setConfirmar(true);
      } else fecharRef.current();
    };
    window.addEventListener("popstate", aoVoltar);
    return () => {
      window.removeEventListener("popstate", aoVoltar);
      if (window.history.state?.telaDeFormulario) window.history.back();
    };
  }, []);

  const Icone = icone === "voltar" || onVoltar ? ArrowLeft : X;
  const rotuloDoBotao = icone === "voltar" || onVoltar ? "Voltar" : "Fechar";

  return (
    <DialogPrimitive.Root open onOpenChange={(aberto) => (!aberto ? pedirFechar() : undefined)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/80" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-ink outline-none sm:inset-x-auto sm:left-1/2 sm:top-4 sm:bottom-0 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:rounded-t-[var(--raio-folha)] sm:border sm:border-line"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            pedirFechar();
          }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div
            className={`shrink-0 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] ${compacto ? "flex items-center gap-3" : ""}`}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={rotuloDoBotao}
              onClick={pedirFechar}
              className="shrink-0 rounded-full bg-ink3"
            >
              <Icone size={20} />
            </Button>
            {compacto ? (
              <div className="min-w-0 flex-1 overflow-hidden">
                <DialogPrimitive.Title className="truncate text-xs text-mute">
                  {titulo}
                </DialogPrimitive.Title>
                <div className="relative grid overflow-hidden">
                  <AnimatePresence initial={false} custom={sentidoDoTitulo.current}>
                    <motion.p
                      key={compacto.indice}
                      className="truncate text-lg font-semibold leading-7 text-paper [grid-area:1/1]"
                      custom={sentidoDoTitulo.current}
                      variants={{
                        entra: (d: number) =>
                          menosMovimento ? { opacity: 0 } : { x: `${d * 100}%`, opacity: 0 },
                        fica: {
                          x: "0%",
                          opacity: 1,
                          transition: menosMovimento
                            ? { duration: 0.15 }
                            : { x: MOLA.padraoEspacial, opacity: MOLA.padraoEfeito },
                        },
                        sai: (d: number) =>
                          menosMovimento
                            ? { opacity: 0, transition: { duration: 0.15 } }
                            : {
                                x: `${-d * 100}%`,
                                opacity: 0,
                                transition: { x: MOLA.padraoEspacial, opacity: MOLA.padraoEfeito },
                              },
                      }}
                      initial="entra"
                      animate="fica"
                      exit="sai"
                    >
                      {compacto.passo}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {compacto ? (
              subtitulo ? (
                <DialogPrimitive.Description className="mt-4 px-1 text-sm text-mute">
                  {subtitulo}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">
                  {titulo}
                </DialogPrimitive.Description>
              )
            ) : (
              <>
                <DialogPrimitive.Title className="titulo-tela mt-4 px-1">
                  {titulo}
                </DialogPrimitive.Title>
                {subtitulo ? (
                  <DialogPrimitive.Description className="subtitulo-tela mt-2 px-1">
                    {subtitulo}
                  </DialogPrimitive.Description>
                ) : (
                  <DialogPrimitive.Description className="sr-only">
                    {titulo}
                  </DialogPrimitive.Description>
                )}
              </>
            )}
            <div className={`${compacto ? "mt-5" : "mt-8"} space-y-8`}>{children}</div>
          </div>
          {acao ? (
            <div
              className={`shrink-0 bg-ink px-4 pt-3 ${acao.flutuante ? "" : "border-t border-line"}`}
              style={{
                marginBottom: teclado ? `${teclado}px` : undefined,
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              }}
            >
              {acao.flutuante ? (
                <div className="flex justify-end">
                  <BotaoFab
                    rotulo={acao.rotulo}
                    icone={
                      acao.flutuante.icone === "seta" ? (
                        <ArrowRight size={22} aria-hidden />
                      ) : (
                        <Check size={22} aria-hidden />
                      )
                    }
                    onClick={acao.onClick}
                    desabilitado={acao.desabilitada ?? false}
                    carregando={acao.carregando ?? false}
                    sucesso={acao.sucesso ?? false}
                  />
                </div>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="min-h-14 w-full rounded-full shadow-[var(--shadow-md)]"
                  disabled={acao.desabilitada || acao.carregando}
                  loading={acao.carregando ?? false}
                  success={acao.sucesso ?? false}
                  morfo={acao.morfo ?? false}
                  onClick={acao.onClick}
                >
                  {acao.rotulo}
                </Button>
              )}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>O que você preencheu será perdido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmar(false);
                fecharRef.current();
              }}
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogPrimitive.Root>
  );
}
