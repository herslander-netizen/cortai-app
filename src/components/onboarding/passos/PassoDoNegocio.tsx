/**
 * Passo "Negócio" do Onboarding: logo em cartão (a imagem cabe inteira, sem corte nem faixas), nome, WhatsApp e
 * endereço em campos padrão. A foto escolhida passa pelo ajuste antes de enviar (quem decide é a rota).
 */
import { Camera } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { mascaraTelefone } from "@/lib/previa";

export function PassoDoNegocio({
  logoUrl,
  enviandoLogo,
  onEscolherLogo,
  rotuloNome,
  rotuloWhatsapp,
  nome,
  onNome,
  whatsapp,
  onWhatsapp,
  endereco,
  onEndereco,
}: {
  logoUrl: string | null;
  enviandoLogo: boolean;
  onEscolherLogo: (evento: ChangeEvent<HTMLInputElement>) => void;
  rotuloNome: string;
  rotuloWhatsapp: string;
  nome: string;
  onNome: (v: string) => void;
  whatsapp: string;
  onWhatsapp: (v: string) => void;
  endereco: string;
  onEndereco: (v: string) => void;
}) {
  const arquivo = useRef<HTMLInputElement>(null);
  const rotulo = "block text-[13px] font-medium text-mute";
  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        type="button"
        onClick={() => arquivo.current?.click()}
        aria-label={logoUrl ? "Trocar logo ou foto" : "Enviar logo ou foto"}
        className="flex h-auto min-h-20 w-full items-center justify-start gap-4 whitespace-normal rounded-[28px] bg-[var(--agenda-cartao,var(--figaro-card-tile))] p-3 pr-5 text-left font-normal"
      >
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[20px] bg-[var(--figaro-surface-container-highest,var(--ink3))]">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="size-full object-contain p-1" />
          ) : (
            <Camera className="size-6 text-mute" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-paper">Logo ou foto</span>
          <span className="block text-[13px] text-mute">
            {enviandoLogo ? "Enviando…" : "Aparece no seu link. Opcional."}
          </span>
        </span>
        <span className="shrink-0 text-[13px] font-semibold text-primary">
          {logoUrl ? "Trocar" : "Adicionar"}
        </span>
      </Button>
      <input
        ref={arquivo}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onEscolherLogo}
      />

      <label className={rotulo}>
        {rotuloNome}
        <input
          value={nome}
          onChange={(e) => onNome(e.target.value)}
          autoComplete="organization"
          className="field-control mt-2 w-full"
        />
      </label>
      <label className={rotulo}>
        {rotuloWhatsapp}
        <input
          value={whatsapp}
          onChange={(e) => onWhatsapp(mascaraTelefone(e.target.value))}
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 90000-0000"
          className="field-control mt-2 w-full"
        />
      </label>
      <label className={rotulo}>
        Endereço
        <input
          value={endereco}
          onChange={(e) => onEndereco(e.target.value)}
          autoComplete="street-address"
          placeholder="Rua, número, bairro"
          className="field-control mt-2 w-full"
        />
      </label>
    </div>
  );
}
