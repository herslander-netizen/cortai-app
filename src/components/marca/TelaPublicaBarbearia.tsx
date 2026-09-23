import { useQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { Check, Copy, QrCode, Share2, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { TelaDeCarregamento } from "@/components/layout/Carregando";
import { Signature } from "@/components/layout/Signature";
import { PaginaPublicaConteudo } from "@/components/marca/PaginaPublica";
import { Button } from "@/components/ui/button";
import { getPaginaPublica } from "@/lib/publico.functions";

export function TelaPublicaBarbearia({ chave }: { chave: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["pagina-publica", chave], queryFn: () => getPaginaPublica({ data: { slug: chave } }) });
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);

  useEffect(() => {
    if (!mostrarQr || qr) return;
    QRCode.toDataURL(window.location.href, { width: 220, margin: 1 }).then(setQr);
  }, [mostrarQr, qr]);

  if (isLoading) return <TelaDeCarregamento texto="Abrindo a barbearia…" />;
  if (!data) throw notFound();

  return <div className="min-h-screen bg-background">
    <PaginaPublicaConteudo data={data} config={data.pagina} />
    <div className="brand-tools" aria-label="Opções da página">
      <Button variant="outline" size="icon" aria-label="Compartilhar" title="Compartilhar" onClick={() => navigator.share?.({ title: data.tenant.nome, url: window.location.href })}><Share2 /></Button>
      <Button variant="outline" size="icon" aria-label="Copiar link" title="Copiar link" onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopiado(true); window.setTimeout(() => setCopiado(false), 1800); }}>{copiado ? <Check /> : <Copy />}</Button>
      <Button variant="outline" size="icon" aria-label="Mostrar código QR" title="Mostrar código QR" onClick={() => setMostrarQr((value) => !value)}>{mostrarQr ? <X /> : <QrCode />}</Button>
    </div>
    {mostrarQr ? <div className="brand-qr" role="dialog" aria-label="Código QR da barbearia">{qr ? <img src={qr} alt={`Código para abrir a página de ${data.tenant.nome}`} /> : <span>Gerando…</span>}</div> : null}
    <Signature />
  </div>;
}
