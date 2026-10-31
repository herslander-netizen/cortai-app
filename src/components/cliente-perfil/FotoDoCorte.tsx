import { useServerFn } from "@tanstack/react-start";
import { Camera, Check } from "lucide-react";
import { useRef, useState } from "react";

import { AjustadorImagem } from "@/components/ui/ajustador-imagem";
import { Button } from "@/components/ui/button";
import { enviarFotoCorte } from "@/lib/perfil-cliente.functions";
import { termos as termosPara, type Segmento } from "@/lib/segmentos";

/** Reduz a foto para no máximo 1080px e JPEG ~0,72 antes de enviar. */
async function comprimir(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, 1080 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function FotoDoCorte({
  clienteId,
  agendamentoId,
  onEnviada,
  segmento = "outro",
}: {
  clienteId: string;
  agendamentoId?: string | null;
  onEnviada?: () => void;
  segmento?: Segmento;
}) {
  const termos = termosPara(segmento);
  const barbeiro = segmento === "barbearia";
  const enviar = useServerFn(enviarFotoCorte);
  const input = useRef<HTMLInputElement>(null);
  const [autorizou, setAutorizou] = useState(false);
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok">("livre");
  const [erro, setErro] = useState<string | null>(null);
  /** Foto esperando o enquadramento (zoom e arrastar) antes do envio. */
  const [pendente, setPendente] = useState<File | null>(null);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setPendente(null);
    setEstado("enviando");
    setErro(null);
    try {
      const imagem = await comprimir(arquivo);
      await enviar({
        data: { clienteId, agendamentoId: agendamentoId ?? null, imagem, consentimento: true },
      });
      setEstado("ok");
      onEnviada?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a foto.");
      setEstado("livre");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  if (estado === "ok")
    return (
      <p className="flex min-h-12 items-center gap-2 text-sm font-semibold text-paper">
        <Check aria-hidden className="size-4" />
        {termos.fotoAtendimento} salva na ficha.
      </p>
    );

  return (
    <div>
      <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2 text-sm text-paper">
        <input
          type="checkbox"
          className="mt-1 size-5 accent-current"
          checked={autorizou}
          onChange={(e) => setAutorizou(e.target.checked)}
        />
        <span>
          {barbeiro
            ? "O cliente autorizou fotografar o corte."
            : "Cliente autorizou fotografar o resultado."}{" "}
          <span className="block text-xs text-mute">
            Só {termos.comArtigo} vê. Dá para apagar depois.
          </span>
        </span>
      </label>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          if (arquivo) setPendente(arquivo);
        }}
      />
      <Button
        variant="outline"
        className="mt-1 h-12 w-full"
        disabled={!autorizou || estado === "enviando"}
        onClick={() => input.current?.click()}
      >
        <Camera aria-hidden />
        {estado === "enviando"
          ? "Salvando foto…"
          : barbeiro
            ? "Fotografar o corte"
            : "Fotografar o resultado"}
      </Button>
      {erro ? (
        <p className="mt-2 text-sm text-paper" role="alert">
          {erro}
        </p>
      ) : null}
      {pendente ? (
        <AjustadorImagem
          file={pendente}
          titulo={`Ajustar ${termos.fotoAtendimento.toLocaleLowerCase("pt-BR")}`}
          proporcao={1}
          onCancelar={() => setPendente(null)}
          onConfirmar={(arquivo) => void escolher(arquivo)}
        />
      ) : null}
    </div>
  );
}
