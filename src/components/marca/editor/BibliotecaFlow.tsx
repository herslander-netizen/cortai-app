import { ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { enviarFoto } from "@/lib/enviar-foto";
import { buscarVisualFlow, SEGMENTOS_DA_BIBLIOTECA, type ImagemVisualFlow } from "@/lib/flow-visual-library";
import { SEGMENTOS_CONFIG, type Segmento } from "@/lib/segmentos";

type FotoEscolhida = { path: string; url: string };

/** Abre a Biblioteca no editor original. Somente Aplicar envia e seleciona a mídia. */
export function BibliotecaFlow({
  segmentoInicial, tipo, onAplicar, disabled = false,
}: {
  segmentoInicial: Segmento;
  tipo: "hero" | "galeria";
  onAplicar: (foto: FotoEscolhida) => void;
  disabled?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [segmento, setSegmento] = useState<Segmento>(segmentoInicial);
  const [texto, setTexto] = useState("");
  const [selecionada, setSelecionada] = useState<ImagemVisualFlow | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fotos = useMemo(
    () => buscarVisualFlow({ segmento, tipo, texto }),
    [segmento, tipo, texto],
  );

  async function aplicar() {
    if (!selecionada || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      // Nunca persistir /temas ou /exemplos como caminho do Storage.
      const resposta = await fetch(selecionada.src, { credentials: "same-origin" });
      if (!resposta.ok) throw new Error("Imagem indisponível. Escolha outra.");
      const arquivo = new File([await resposta.blob()], selecionada.id + ".webp", { type: "image/webp" });
      const salva = await enviarFoto(arquivo, "foto");
      onAplicar(salva);
      setAberto(false);
      setSelecionada(null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível aplicar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => setAberto(true)}>
        <ImageIcon aria-hidden /> Biblioteca Flow
      </Button>
      <Sheet open={aberto} onOpenChange={(v) => { if (!enviando) setAberto(v); }}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>Biblioteca Flow</SheetTitle>
            <SheetDescription>
              Fotos ilustrativas geradas por IA, organizadas por segmento. Suas fotografias têm prioridade.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-paper">
              Segmento
              <select
                className="field-control mt-1 w-full"
                value={segmento}
                onChange={(e) => { setSegmento(e.target.value as Segmento); setSelecionada(null); }}
              >
                {SEGMENTOS_DA_BIBLIOTECA.map((id) => (
                  <option value={id} key={id}>{SEGMENTOS_CONFIG[id].rotulo}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-paper">
              Buscar imagens
              <input
                className="field-control mt-1 w-full"
                type="search"
                placeholder="Ambiente, unhas, cabelo…"
                value={texto}
                onChange={(e) => { setTexto(e.target.value); setSelecionada(null); }}
              />
            </label>
            {fotos.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {fotos.map((imagem) => (
                  <li key={imagem.id}>
                    <Button
                      type="button"
                      variant={selecionada?.id === imagem.id ? "default" : "outline"}
                      size="bloco"
                      aria-pressed={selecionada?.id === imagem.id}
                      className="w-full"
                      onClick={() => setSelecionada(imagem)}
                    >
                      <img
                        src={imagem.miniatura}
                        alt=""
                        width={360}
                        height={210}
                        loading="lazy"
                        decoding="async"
                        className="aspect-video w-full rounded-lg object-cover"
                      />
                      <span className="line-clamp-2 text-left">{imagem.titulo}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-5 text-sm text-mute">
                Sem imagens neste filtro. Envie sua foto ou escolha outro segmento.
              </p>
            )}
            {selecionada ? (
              <section aria-label="Prévia da imagem" className="space-y-3 rounded-[20px] bg-ink2 p-3">
                <img
                  src={selecionada.src}
                  alt={selecionada.descricao}
                  width={800}
                  height={450}
                  className="aspect-video w-full rounded-lg object-cover"
                />
                <p className="text-sm text-paper">{selecionada.descricao}</p>
                <p className="text-xs text-mute">
                  {selecionada.origem}. {selecionada.licenca}.
                </p>
                <Button
                  type="button"
                  loading={enviando}
                  disabled={enviando}
                  className="w-full"
                  onClick={() => void aplicar()}
                >
                  Aplicar {tipo === "hero" ? "à capa" : "à galeria"}
                </Button>
              </section>
            ) : (
              <p className="text-sm text-mute">Selecione uma imagem para ver a prévia.</p>
            )}
            {erro ? <p role="alert" className="text-sm text-brick">{erro}</p> : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
