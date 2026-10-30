import { useQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { Check, Copy, MessageCircle, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { origemDaVisita, registrarEtapa } from "@/lib/funil";

import { EsqueletoPaginaPublica } from "@/components/layout/Esqueleto";
import { Signature } from "@/components/layout/Signature";
import { PaginaPublicaConteudo } from "@/components/marca/PaginaPublica";
import { Button } from "@/components/ui/button";
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
      <PaginaPublicaConteudo data={data} config={data.pagina} />
      {/* Compartilhar no fim da página (dono, 30/10: o botão flutuante cobria o conteúdo). Mesmas opções de antes. */}
      <section
        aria-label="Compartilhar esta página"
        className="mx-auto flex max-w-xl flex-col items-center gap-4 px-5 pb-4 pt-10 text-center"
      >
        <p className="text-sm font-semibold text-paper">Compartilhe esta página</p>
        <div className="flex items-center justify-center gap-3">
          {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
            <Button
              variant="outline"
              size="icon"
              className="size-12 rounded-full"
              aria-label="Compartilhar pelo celular"
              onClick={() =>
                void navigator
                  .share({
                    title: data.tenant.nome,
                    text: textoDeCompartilhamento(data.tenant.nome),
                    url: linkCom("compartilhar"),
                  })
                  .catch(() => undefined)
              }
            >
              <Share2 aria-hidden />
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="icon"
            className="size-12 rounded-full"
            aria-label="Enviar pelo WhatsApp"
            onClick={() => {
              window.open(
                `https://wa.me/?text=${encodeURIComponent(`${textoDeCompartilhamento(data.tenant.nome)}\n\n${linkCom("whatsapp")}`)}`,
                "_blank",
                "noopener,noreferrer",
              );
            }}
          >
            <MessageCircle aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-12 rounded-full"
            aria-label={copiado ? "Link copiado" : "Copiar link"}
            onClick={async () => {
              await navigator.clipboard.writeText(linkCom("link"));
              setCopiado(true);
              window.setTimeout(() => setCopiado(false), 1800);
            }}
          >
            {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-12 rounded-full"
            aria-label="Código QR"
            aria-expanded={mostrarQr}
            onClick={() => setMostrarQr((value) => !value)}
          >
            <QrCode aria-hidden />
          </Button>
        </div>
        {copiado ? (
          <p role="status" className="text-xs text-mute">
            Link copiado
          </p>
        ) : null}
        {mostrarQr ? (
          <div className="rounded-[20px] bg-qr-light p-3" aria-label="Código QR do negócio">
            {qr ? (
              <img
                src={qr}
                alt={`Código para abrir a página de ${data.tenant.nome}`}
                width={180}
                height={180}
              />
            ) : (
              <span className="text-sm text-qr-dark">Gerando…</span>
            )}
          </div>
        ) : null}
      </section>
      <Signature />
    </div>
  );
}
