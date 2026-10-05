import type { MarcaForm } from "@/lib/marca.functions";
import type { PaginaConfig } from "@/lib/pagina-config";
import { validarRede, type RedeId } from "@/lib/redes-do-negocio";
import { fieldClass } from "./campos";
import { IconeDaRede } from "./IconesDasRedes";

function CampoRede({
  rede,
  label,
  value,
  placeholder,
  onChange,
  inputMode,
}: {
  rede: RedeId;
  label: string;
  value: string | null;
  placeholder: string;
  onChange: (v: string) => void;
  inputMode?: "tel" | "url" | "text";
}) {
  const erro = validarRede(rede, value);
  const id = `rede-${rede}`;
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-xs font-medium text-mute">
        <IconeDaRede rede={rede} size={16} />
        {label}
      </label>
      <input
        id={id}
        className={fieldClass}
        value={value ?? ""}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {erro ? (
        <p id={`${id}-erro`} className="mt-1 text-xs text-brick">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

export function SecaoRedes({
  form,
  setMarca,
  config,
  setPagina,
}: {
  form: MarcaForm;
  setMarca: <K extends keyof MarcaForm>(key: K, value: MarcaForm[K]) => void;
  config: PaginaConfig;
  setPagina: <K extends keyof PaginaConfig>(key: K, value: PaginaConfig[K]) => void;
}) {
  const redes = config.redes ?? { tiktok: "", youtube: "", site: "" };
  const setExtra = (k: keyof typeof redes, v: string) => setPagina("redes", { ...redes, [k]: v });
  return (
    <div className="space-y-4">
      <p className="text-xs text-mute">Todos os campos são opcionais.</p>
      <CampoRede rede="instagram" label="Instagram" value={form.instagram} placeholder="@seu_negocio" onChange={(v) => setMarca("instagram", v || null)} />
      <CampoRede rede="facebook" label="Facebook" value={form.facebook} placeholder="facebook.com/seu_negocio" onChange={(v) => setMarca("facebook", v || null)} />
      <CampoRede rede="tiktok" label="TikTok" value={redes.tiktok} placeholder="@seu_negocio" onChange={(v) => setExtra("tiktok", v)} />
      <CampoRede rede="youtube" label="YouTube" value={redes.youtube} placeholder="@seu_canal" onChange={(v) => setExtra("youtube", v)} />
      <CampoRede rede="whatsapp" label="WhatsApp" value={form.whatsapp} placeholder="79 99999-9999" inputMode="tel" onChange={(v) => setMarca("whatsapp", v || null)} />
      <CampoRede rede="site" label="Site" value={redes.site} placeholder="www.seunegocio.com.br" inputMode="url" onChange={(v) => setExtra("site", v)} />
    </div>
  );
}
