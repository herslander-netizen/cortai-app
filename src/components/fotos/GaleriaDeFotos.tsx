import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

import { AjustadorImagem, type AjusteDeFoto } from "@/components/ui/ajustador-imagem";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { enviarFoto } from "@/lib/enviar-foto";
import { listarFotosDoNegocio, type FotoDaGaleria } from "@/lib/fotos.functions";

export type FotoEscolhida = { path: string; url: string };

type Props = {
  aberto: boolean;
  onAberto: (aberto: boolean) => void;
  /** Escolher várias de uma vez (portfólio) em vez de uma só (produto, logo). */
  multiplo?: boolean;
  /** Quantas ainda cabem quando `multiplo` (o resto fica desabilitado). */
  max?: number;
  prefixo?: "produto" | "profissional" | "foto";
  titulo?: string;
  /** Com ajuste, cada foto nova passa pelo enquadramento (zoom e arrastar) antes de ser enviada. */
  ajuste?: AjusteDeFoto;
  onEscolher: (fotos: FotoEscolhida[]) => void;
};

/**
 * Galeria de fotos do negócio: tudo o que já foi enviado (para reaproveitar) e o envio de uma foto nova,
 * da galeria do aparelho ou da câmera. Substitui o campo "URL da foto": ninguém precisa colar link.
 */
export function GaleriaDeFotos({
  aberto,
  onAberto,
  multiplo = false,
  max = 6,
  prefixo = "foto",
  titulo = "Galeria de fotos",
  ajuste,
  onEscolher,
}: Props) {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["fotos-do-negocio"],
    queryFn: () => listarFotosDoNegocio(),
    enabled: aberto,
    staleTime: 60_000,
  });
  const [marcadas, setMarcadas] = useState<FotoEscolhida[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  /** Fotos novas esperando o enquadramento, uma de cada vez. */
  const [fila, setFila] = useState<File[]>([]);
  const doAparelho = useRef<HTMLInputElement>(null);
  const daCamera = useRef<HTMLInputElement>(null);

  const fechar = () => {
    setMarcadas([]);
    setErro(null);
    onAberto(false);
  };
  const concluir = (fotos: FotoEscolhida[]) => {
    onEscolher(fotos);
    fechar();
  };
  const alternar = (foto: FotoDaGaleria) => {
    if (!multiplo) return concluir([{ path: foto.path, url: foto.url }]);
    setMarcadas((atual) =>
      atual.some((f) => f.path === foto.path)
        ? atual.filter((f) => f.path !== foto.path)
        : atual.length < max
          ? [...atual, { path: foto.path, url: foto.url }]
          : atual,
    );
  };

  async function aoEscolherArquivos(e: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []).slice(0, multiplo ? max : 1);
    e.target.value = "";
    if (!arquivos.length) return;
    setErro(null);
    if (ajuste) {
      setFila(arquivos);
      return;
    }
    setEnviando(true);
    try {
      const enviadas: FotoEscolhida[] = [];
      for (const arquivo of arquivos) enviadas.push(await enviarFoto(arquivo, prefixo));
      void qc.invalidateQueries({ queryKey: ["fotos-do-negocio"] });
      if (!multiplo) return concluir(enviadas);
      setMarcadas((atual) => [...atual, ...enviadas].slice(0, max));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar a foto.");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarAjustada(arquivo: File) {
    setFila((atual) => atual.slice(1));
    setEnviando(true);
    try {
      const enviada = await enviarFoto(arquivo, prefixo);
      void qc.invalidateQueries({ queryKey: ["fotos-do-negocio"] });
      if (!multiplo) return concluir([enviada]);
      setMarcadas((atual) => [...atual, enviada].slice(0, max));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar a foto.");
    } finally {
      setEnviando(false);
    }
  }

  const fotos = data ?? [];
  const proxima = fila[0];
  return (
    <Sheet open={aberto} onOpenChange={(v) => (v ? onAberto(true) : fechar())}>
      <SheetContent side="bottom" className="max-h-[88dvh]">
        <SheetHeader>
          <SheetTitle>{titulo}</SheetTitle>
          <SheetDescription>
            {multiplo
              ? `Escolha até ${max} fotos ou envie novas.`
              : "Escolha uma foto que você já enviou ou envie uma nova."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={enviando}
            onClick={() => doAparelho.current?.click()}
          >
            {enviando ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {enviando ? "Enviando…" : "Enviar do aparelho"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={enviando}
            onClick={() => daCamera.current?.click()}
          >
            <Camera />
            Tirar foto
          </Button>
          <input
            ref={doAparelho}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            multiple={multiplo}
            className="hidden"
            data-testid="foto-do-aparelho"
            onChange={(e) => void aoEscolherArquivos(e)}
          />
          <input
            ref={daCamera}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void aoEscolherArquivos(e)}
          />
        </div>
        {erro ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {erro}
          </p>
        ) : null}

        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-mute">Carregando suas fotos…</p>
          ) : isError ? (
            <p className="text-sm text-mute">
              Não foi possível carregar a galeria.{" "}
              <button type="button" className="underline" onClick={() => void refetch()}>
                Tentar de novo
              </button>
            </p>
          ) : fotos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line2 p-6 text-center text-sm text-mute">
              Nenhuma foto ainda. Envie a primeira do seu aparelho.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {fotos.map((foto) => {
                const marcada = marcadas.some((f) => f.path === foto.path);
                const cheio = multiplo && !marcada && marcadas.length >= max;
                return (
                  <li key={foto.path}>
                    <button
                      type="button"
                      aria-pressed={multiplo ? marcada : undefined}
                      aria-label="Escolher esta foto"
                      disabled={cheio}
                      onClick={() => alternar(foto)}
                      className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-ink2 disabled:opacity-40 ${marcada ? "border-primary" : "border-transparent"}`}
                    >
                      <img
                        src={foto.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                      {marcada ? (
                        <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-4" />
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {multiplo ? (
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={marcadas.length === 0 || enviando}
            onClick={() => concluir(marcadas)}
          >
            {marcadas.length === 0
              ? "Escolha as fotos"
              : `Usar ${marcadas.length} ${marcadas.length === 1 ? "foto" : "fotos"}`}
          </Button>
        ) : null}
      </SheetContent>
      {ajuste && proxima ? (
        <AjustadorImagem
          key={`${proxima.name}-${proxima.lastModified}-${fila.length}`}
          file={proxima}
          titulo={ajuste.titulo ?? "Ajustar foto"}
          proporcao={ajuste.proporcao}
          fit={ajuste.fit ?? "cover"}
          redondo={ajuste.redondo ?? false}
          onCancelar={() => setFila((atual) => atual.slice(1))}
          onConfirmar={(arquivo) => void enviarAjustada(arquivo)}
        />
      ) : null}
    </Sheet>
  );
}
