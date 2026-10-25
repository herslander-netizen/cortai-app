import { ImagePlus, X } from "lucide-react";
import { useState } from "react";

import { GaleriaDeFotos, type FotoEscolhida } from "@/components/fotos/GaleriaDeFotos";
import { Button } from "@/components/ui/button";

type Prefixo = "produto" | "profissional" | "foto";

/** Uma foto só (produto, logo): miniatura + "Escolher foto" que abre a galeria. Sem campo de link. */
export function SeletorDeFoto({
  rotulo = "Foto",
  previewUrl,
  temFoto,
  prefixo = "foto",
  onEscolher,
  onRemover,
  formato = "miniatura",
}: {
  /** `cartao`: imagem grande com "Alterar imagem" por cima, como o Hero do Figaro. */
  formato?: "miniatura" | "cartao";
  rotulo?: string;
  /** Link para mostrar a foto (assinado pelo servidor ou o que acabou de ser enviado). */
  previewUrl: string | null;
  temFoto: boolean;
  prefixo?: Prefixo;
  onEscolher: (foto: FotoEscolhida) => void;
  onRemover: () => void;
}) {
  const [aberta, setAberta] = useState(false);
  if (formato === "cartao") {
    return (
      <div className="space-y-2">
        <div className="relative aspect-video overflow-hidden rounded-[20px] bg-background">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-mute">
              <ImagePlus size={28} aria-hidden />
            </div>
          )}
          <Button
            type="button"
            size="sm"
            className="absolute bottom-3 right-3 rounded-full bg-[var(--figaro-primary-container)] text-[var(--figaro-on-primary-container)]"
            onClick={() => setAberta(true)}
          >
            <ImagePlus aria-hidden />
            {temFoto ? "Alterar imagem" : "Escolher imagem"}
          </Button>
        </div>
        {temFoto ? (
          <Button type="button" variant="text" size="sm" onClick={onRemover}>
            Remover
          </Button>
        ) : null}
        <GaleriaDeFotos
          aberto={aberta}
          onAberto={setAberta}
          prefixo={prefixo}
          titulo={`${rotulo}: galeria de fotos`}
          onEscolher={([foto]) => foto && onEscolher(foto)}
        />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label={
          temFoto ? `Trocar ${rotulo.toLowerCase()}` : `Adicionar ${rotulo.toLowerCase()}`
        }
        className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-line2 bg-ink2 text-mute"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus size={22} aria-hidden />
        )}
      </button>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <span className="text-xs text-mute">{rotulo}</span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAberta(true)}>
            {temFoto ? "Trocar foto" : "Escolher foto"}
          </Button>
          {temFoto ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRemover}>
              Remover
            </Button>
          ) : null}
        </div>
      </div>
      <GaleriaDeFotos
        aberto={aberta}
        onAberto={setAberta}
        prefixo={prefixo}
        titulo={`${rotulo}: galeria de fotos`}
        onEscolher={([foto]) => foto && onEscolher(foto)}
      />
    </div>
  );
}

export type FotoDaLista = { valor: string; url: string };

/** Várias fotos (portfólio): miniaturas com "x" e um quadro "Adicionar" que abre a galeria. */
export function ListaDeFotos({
  fotos,
  max,
  prefixo = "foto",
  titulo,
  onChange,
}: {
  fotos: FotoDaLista[];
  max: number;
  prefixo?: Prefixo;
  titulo?: string;
  onChange: (fotos: FotoDaLista[]) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const restantes = max - fotos.length;
  return (
    <div>
      <ul className="grid grid-cols-3 gap-2">
        {fotos.map((foto, i) => (
          <li
            key={foto.valor}
            className="relative aspect-square overflow-hidden rounded-lg bg-ink2"
          >
            <img src={foto.url} alt="" loading="lazy" className="size-full object-cover" />
            <button
              type="button"
              aria-label={`Remover foto ${i + 1}`}
              onClick={() => onChange(fotos.filter((f) => f.valor !== foto.valor))}
              className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-ink/80 text-paper"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
        {restantes > 0 ? (
          <li>
            <button
              type="button"
              onClick={() => setAberta(true)}
              className="grid aspect-square w-full place-items-center rounded-lg border border-dashed border-line2 bg-ink2 text-mute"
              aria-label="Adicionar fotos"
            >
              <span className="flex flex-col items-center gap-1 text-xs">
                <ImagePlus size={20} aria-hidden />
                Adicionar
              </span>
            </button>
          </li>
        ) : null}
      </ul>
      <GaleriaDeFotos
        aberto={aberta}
        onAberto={setAberta}
        multiplo
        max={Math.max(restantes, 1)}
        prefixo={prefixo}
        {...(titulo ? { titulo } : {})}
        onEscolher={(novas) =>
          onChange(
            [
              ...fotos,
              ...novas
                .filter((n) => !fotos.some((f) => f.valor === n.path))
                .map((n) => ({ valor: n.path, url: n.url })),
            ].slice(0, max),
          )
        }
      />
    </div>
  );
}
