import { Monitor, Smartphone } from "lucide-react";

import { ChatPreview } from "@/components/agendamento/ChatPreview";
import { EsqueletoPaginaPublica } from "@/components/layout/Esqueleto";
import { PaginaPublicaConteudo } from "@/components/marca/PaginaPublica";
import { Button } from "@/components/ui/button";
import type { PaginaConfig } from "@/lib/pagina-config";
import type { PaginaPublica } from "@/lib/publico.functions";
import { PreviaDireta } from "./PreviaDireta";

export type Dispositivo = "mobile" | "desktop";

/** Prévia ao vivo de acordo com a experiência escolhida. */
export function PreviaDaExperiencia({
  data,
  config,
  device,
  setDevice,
  nome,
  avatarUrl,
  capaUrl,
  altura = "h-[720px]",
}: {
  data: PaginaPublica | null;
  config: PaginaConfig;
  device: Dispositivo;
  setDevice: (d: Dispositivo) => void;
  nome: string;
  avatarUrl: string | null;
  capaUrl: string | null;
  altura?: string;
}) {
  const conversa = config.experiencia === "conversa";
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-mute">Prévia ao vivo</p>
        {config.experiencia === "vitrine" ? (
          <div className="flex rounded-md border border-line p-1">
            <Button
              variant={device === "mobile" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Prévia no celular"
              aria-pressed={device === "mobile"}
              onClick={() => setDevice("mobile")}
            >
              <Smartphone />
            </Button>
            <Button
              variant={device === "desktop" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Prévia no computador"
              aria-pressed={device === "desktop"}
              onClick={() => setDevice("desktop")}
            >
              <Monitor />
            </Button>
          </div>
        ) : null}
      </div>
      {conversa ? (
        <ChatPreview ativo config={config} nome={nome} logoUrl={avatarUrl} capaUrl={capaUrl} />
      ) : (
        <div
          className={`mx-auto max-w-full overflow-y-auto rounded-lg border border-line bg-background shadow-xl ${altura} ${config.experiencia === "vitrine" && device === "desktop" ? "w-full" : "w-[390px]"}`}
        >
          {!data ? (
            <EsqueletoPaginaPublica />
          ) : config.experiencia === "direta" ? (
            <PreviaDireta data={data} config={config} />
          ) : (
            <PaginaPublicaConteudo
              data={data}
              config={config}
              preview
              previaCelular={device === "mobile"}
            />
          )}
        </div>
      )}
    </div>
  );
}
