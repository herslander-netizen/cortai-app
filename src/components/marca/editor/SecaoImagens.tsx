import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { listarLogosDoNegocio } from "@/lib/marca.functions";
import { MOLA } from "@/lib/movimento-figaro";

export function SecaoImagens({
  coverRef,
  fileRef,
  coverPreview,
  logoPreview,
  logoAtual,
  busy,
  upload,
  usarLogo,
  removerLogo,
}: {
  coverRef: RefObject<HTMLInputElement | null>;
  fileRef: RefObject<HTMLInputElement | null>;
  coverPreview: string | null;
  logoPreview: string | null;
  logoAtual: string | null;
  busy: boolean;
  upload: (event: ChangeEvent<HTMLInputElement>, kind: "logo" | "capa") => void;
  usarLogo: (path: string, url: string) => void;
  removerLogo: () => void;
}) {
  const reduzirMovimento = useReducedMotion();
  const logos = useQuery({
    queryKey: ["logos-do-negocio"],
    queryFn: () => listarLogosDoNegocio(),
    staleTime: 5 * 60_000,
  });
  const galeria = logos.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium text-mute">Logo</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          aria-label={logoPreview ? "Trocar logo" : "Adicionar logo"}
          className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line2 bg-ink2 p-4 text-sm text-mute transition-colors hover:border-gold focus-visible:border-gold focus-visible:outline-none disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="animate-spin" />
          ) : logoPreview ? (
            <img src={logoPreview} alt="Logo selecionada" className="h-28 w-28 object-contain" />
          ) : (
            <>
              <ImagePlus size={24} />
              <span className="font-medium text-paper">Adicionar logo</span>
              <span className="text-xs">PNG, JPG ou WebP · até 20 MB</span>
            </>
          )}
        </button>
        {logoPreview ? (
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              <RefreshCw /> Substituir
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={removerLogo}>
              <Trash2 /> Remover
            </Button>
          </div>
        ) : null}
        {galeria.length > 1 || (galeria.length === 1 && galeria[0]!.path !== logoAtual) ? (
          <div className="mt-4">
            <p className="mb-2 text-xs text-mute">Logos já enviadas</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {galeria.map((l) => {
                const ativa = l.path === logoAtual;
                return (
                  <li key={l.path}>
                    <motion.button
                      type="button"
                      initial={false}
                      animate={{ scale: ativa ? 0.97 : 1, padding: ativa ? 16 : 8, borderRadius: ativa ? 8 : 12 }}
                      transition={reduzirMovimento ? { duration: 0 } : MOLA.padraoCompose}
                      disabled={busy || ativa}
                      onClick={() => usarLogo(l.path, l.url)}
                      aria-pressed={ativa}
                      className={`relative flex w-full flex-col items-center gap-1 border bg-ink2 text-[11px] ${ativa ? "border-gold text-gold" : "border-line2 text-mute hover:border-gold"}`}
                    >
                      <img src={l.url} alt="" className="aspect-square w-full object-contain" />
                      {ativa ? (
                        <span className="flex items-center gap-1"><Check size={12} /> Em uso</span>
                      ) : (
                        <span>Usar esta logo</span>
                      )}
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-mute">Foto de capa</p>
        <Button
          variant="ghost"
          size="bloco"
          type="button"
          onClick={() => coverRef.current?.click()}
          className="relative aspect-video w-full overflow-hidden rounded-lg border border-dashed border-line2 bg-ink2 p-0"
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
      </div>
      <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => upload(event, "capa")} />
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => upload(event, "logo")} />
    </div>
  );
}
