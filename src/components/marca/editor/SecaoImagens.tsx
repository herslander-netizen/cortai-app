import { ImagePlus } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

import { Button } from "@/components/ui/button";

export function SecaoImagens({
  coverRef,
  fileRef,
  coverPreview,
  logoPreview,
  upload,
}: {
  coverRef: RefObject<HTMLInputElement | null>;
  fileRef: RefObject<HTMLInputElement | null>;
  coverPreview: string | null;
  logoPreview: string | null;
  upload: (event: ChangeEvent<HTMLInputElement>, kind: "logo" | "capa") => void;
}) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Button
          variant="ghost"
          size="bloco"
          type="button"
          onClick={() => coverRef.current?.click()}
          className="relative aspect-video overflow-hidden rounded-lg border border-dashed border-line2 bg-ink2 p-0"
        >
          {coverPreview ? (
            <img src={coverPreview} alt="Capa atual" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center gap-2 text-sm text-mute">
              <ImagePlus size={17} />
              Foto de capa
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="bloco"
          type="button"
          onClick={() => fileRef.current?.click()}
          className="aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-line2 bg-ink2 p-0"
        >
          {logoPreview ? (
            <img src={logoPreview} alt="Logo atual" className="h-full w-full object-contain p-2" />
          ) : (
            <ImagePlus className="text-mute" />
          )}
        </Button>
      </div>
      <input
        ref={coverRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => upload(event, "capa")}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => upload(event, "logo")}
      />
      <p className="mt-2 text-xs text-mute">Capa à esquerda, logo à direita.</p>
    </div>
  );
}
