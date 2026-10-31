import { Crop, ImagePlus, X } from "lucide-react";
import { useState } from "react";

import { GaleriaDeFotos, type FotoEscolhida } from "@/components/fotos/GaleriaDeFotos";
import { AjustadorImagem, type AjusteDeFoto } from "@/components/ui/ajustador-imagem";
import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { enviarFoto } from "@/lib/enviar-foto";
import { arquivoDaUrl } from "@/lib/imagem";

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
  ajuste,
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
  /** Enquadramento da foto (zoom e arrastar). Padrão: capa 16:9 no cartão, quadrada na miniatura. */
  ajuste?: AjusteDeFoto;
}) {
  const [aberta, setAberta] = useState(false);
  const enquadramento: AjusteDeFoto = ajuste ?? {
    proporcao: formato === "cartao" ? 16 / 9 : 1,
    redondo: prefixo === "profissional",
  };
  const [reajuste, setReajuste] = useState<File | null>(null);
  const [abrindo, setAbrindo] = useState(false);

  async function reajustar() {
    if (!previewUrl) return;
    setAbrindo(true);
    try {
      setReajuste(await arquivoDaUrl(previewUrl, prefixo));
    } catch (falha) {
      aviso.erro(falha instanceof Error ? falha.message : "Não foi possível abrir a foto.");
    } finally {
      setAbrindo(false);
    }
  }

  async function enviarReajuste(arquivo: File) {
    setReajuste(null);
    try {
      onEscolher(await enviarFoto(arquivo, prefixo));
    } catch (falha) {
      aviso.erro(falha instanceof Error ? falha.message : "Não foi possível enviar a foto.");
    }
  }

  // Botão redondo sobre o canto da foto: não disputa espaço com "Trocar foto" e "Remover".
  const botaoAjustar =
    temFoto && previewUrl ? (
      <Button
        type="button"
        size="icon"
        aria-label={`Ajustar ${rotulo.toLowerCase()}`}
        loading={abrindo}
        onClick={() => void reajustar()}
        className={`absolute rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))] text-[var(--figaro-on-surface,var(--paper))] hover:bg-[var(--figaro-surface-container-highest,var(--ink3))] ${
          formato === "cartao"
            ? "bottom-3 left-3 size-10"
            : "-bottom-1 -right-1 size-8 after:absolute after:-inset-2 after:content-[''] [&_svg]:size-4"
        }`}
      >
        <Crop aria-hidden />
      </Button>
    ) : null;

  const ajustador = reajuste ? (
    <AjustadorImagem
      file={reajuste}
      titulo={enquadramento.titulo ?? `Ajustar ${rotulo.toLowerCase()}`}
      proporcao={enquadramento.proporcao}
      fit={enquadramento.fit ?? "cover"}
      redondo={enquadramento.redondo ?? false}
      onCancelar={() => setReajuste(null)}
      onConfirmar={(arquivo) => void enviarReajuste(arquivo)}
    />
  ) : null;

  const galeria = (
    <GaleriaDeFotos
      aberto={aberta}
      onAberto={setAberta}
      prefixo={prefixo}
      titulo={`${rotulo}: galeria de fotos`}
      ajuste={enquadramento}
      onEscolher={([foto]) => foto && onEscolher(foto)}
    />
  );
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
          {botaoAjustar}
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
        {galeria}
        {ajustador}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setAberta(true)}
          aria-label={
            temFoto ? `Trocar ${rotulo.toLowerCase()}` : `Adicionar ${rotulo.toLowerCase()}`
          }
          className={`grid size-20 shrink-0 place-items-center overflow-hidden border border-dashed border-line2 bg-ink2 text-mute ${enquadramento.redondo ? "rounded-full" : "rounded-lg"}`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className={`size-full ${enquadramento.fit === "contain" ? "object-contain" : "object-cover"}`}
            />
          ) : (
            <ImagePlus size={22} aria-hidden />
          )}
        </button>
        {botaoAjustar}
      </div>
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
      {galeria}
      {ajustador}
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
        ajuste={{ proporcao: 1 }}
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
