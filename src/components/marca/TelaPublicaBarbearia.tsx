import { useQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { Check, Copy, MessageCircle, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

import { origemDaVisita, registrarEtapa } from "@/lib/funil";

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
import { urlPublica } from "@/lib/origem-publica";
import { textoDeCompartilhamento } from "@/lib/previa";

export function TelaPublicaBarbearia({ chave }: { chave: string }) {
  const consulta = useQuery({
    queryKey: ["pagina-publica", chave],
    queryFn: () => getPaginaPublica({ data: { slug: chave } }),
  });
  const { data, isLoading } = consulta;
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);
  const [barra, setBarra] = useState(false);
  const aoMudarBarra = useCallback((v: boolean) => setBarra(v), []);
  const slugAtual = data?.tenant.slug;
  const linkCom = (origem: string) => urlPublica(`/b/${slugAtual ?? chave}?origem=${origem}`);
  useEffect(() => {
    if (!slugAtual) return;
    registrarEtapa({
      slug: slugAtual,
      etapa: "vitrine_visita",
      experiencia: "vitrine",
      fluxo: null,
      origem: origemDaVisita(),
    });
  }, [slugAtual]);

  useEffect(() => {
    if (!mostrarQr || qr) return;
    QRCode.toDataURL(linkCom("qr"), { width: 220, margin: 1 }).then(setQr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarQr, qr]);

  if (isLoading) return <EsqueletoPaginaPublica onTentarDeNovo={() => void consulta.refetch()} />;
  if (consulta.isError)
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl items-center px-5">
        <div className="surface w-full p-5">
          <h1 className="text-lg font-semibold text-paper">Não conseguimos abrir esta página.</h1>
          <p className="mt-2 text-sm text-mute">Confira sua conexão e tente novamente.</p>
          <Button className="mt-5 w-full" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      </main>
    );
  if (!data) throw notFound();

  return (
    <div className="min-h-screen bg-background pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0">
      <PaginaPublicaConteudo data={data} config={data.pagina} onBarraVisivel={aoMudarBarra} />
      <div
        className="brand-tools"
        data-acima-da-barra={barra || undefined}
        aria-label="Opções da página"
      >
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
                  void navigator.share({
                    title: data.tenant.nome,
                    text: textoDeCompartilhamento(data.tenant.nome),
                    url: linkCom("compartilhar"),
                  })
                }
              >
                <Share2 /> Compartilhar pelo celular
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`${textoDeCompartilhamento(data.tenant.nome)}\n\n${linkCom("whatsapp")}`)}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <MessageCircle /> WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                await navigator.clipboard.writeText(linkCom("link"));
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
        <div
          className="brand-qr"
          data-acima-da-barra={barra || undefined}
          role="dialog"
          aria-label="Código QR do negócio"
        >
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
