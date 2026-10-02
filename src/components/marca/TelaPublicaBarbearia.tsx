import { useQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { Check, Copy, MessageCircle, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { EsqueletoPaginaPublica } from "@/components/layout/Esqueleto";
import { Signature } from "@/components/layout/Signature";
import { PaginaPublicaConteudo } from "@/components/marca/PaginaPublica";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPaginaPublica } from "@/lib/publico.functions";

export function TelaPublicaBarbearia({ chave }: { chave: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["pagina-publica", chave],
    queryFn: () => getPaginaPublica({ data: { slug: chave } }),
  });
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);

  useEffect(() => {
    if (!mostrarQr || qr) return;
    QRCode.toDataURL(window.location.href, { width: 220, margin: 1 }).then(setQr);
  }, [mostrarQr, qr]);

  if (isLoading) return <EsqueletoPaginaPublica />;
  if (!data) throw notFound();

  return (
    <div className="min-h-screen bg-background">
      <PaginaPublicaConteudo data={data} config={data.pagina} />
      <div className="brand-tools" aria-label="Opções da página">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Share2 /> Compartilhar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {typeof navigator.share === "function" ? (
              <DropdownMenuItem
                onSelect={() =>
                  void navigator.share({ title: data.tenant.nome, url: window.location.href })
                }
              >
                <Share2 /> Compartilhar pelo celular
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`${data.tenant.nome} — ${window.location.href}`)}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <MessageCircle /> WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                await navigator.clipboard.writeText(window.location.href);
                setCopiado(true);
                window.setTimeout(() => setCopiado(false), 1800);
              }}
            >
              {copiado ? <Check /> : <Copy />} {copiado ? "Link copiado" : "Copiar link"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setMostrarQr((value) => !value)}>
              <QrCode /> Código QR
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {mostrarQr ? (
        <div className="brand-qr" role="dialog" aria-label="Código QR do negócio">
          {qr ? (
            <img src={qr} alt={`Código para abrir a página de ${data.tenant.nome}`} />
          ) : (
            <span>Gerando…</span>
          )}
        </div>
      ) : null}
      <Signature />
    </div>
  );
}
