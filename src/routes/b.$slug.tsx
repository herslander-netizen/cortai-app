import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Copy, Instagram, MapPin, MessageCircle, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { type CSSProperties, useEffect, useState } from "react";

import coverAsset from "@/assets/cortai-barbershop-cover.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { Signature } from "@/components/layout/Signature";
import { brl } from "@/lib/format";
import { getPaginaPublica } from "@/lib/publico.functions";

export const Route = createFileRoute("/b/$slug")({
  head: ({ params }) => ({ meta: [
    { title: `${params.slug} — Agende pelo Cortaí` },
    { name: "description", content: "Conheça serviços, profissionais e agende seu horário pelo Cortaí." },
    { property: "og:title", content: `${params.slug} — Cortaí` },
    { property: "og:description", content: "Serviços, profissionais e agendamento em um só lugar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PaginaBarbearia,
});

function PaginaBarbearia() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["pagina-publica", slug], queryFn: () => getPaginaPublica({ data: { slug } }) });
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(window.location.href, { width: 220, margin: 1, color: { dark: "#0B0B0B", light: "#F5F5F3" } }).then(setQr);
  }, []);
  if (isLoading) return <main className="grid min-h-screen place-items-center text-sm text-mute">Carregando barbearia…</main>;
  if (!data) throw notFound();
  const { tenant } = data;
  const style = { "--gold": tenant.cor_primaria, "--primary": tenant.cor_primaria } as CSSProperties;
  const whatsapp = tenant.whatsapp?.replace(/\D/g, "");
  return <div className="client-brand min-h-screen bg-ink" style={style} data-hide-signature={tenant.assinatura_visivel === false}>
    <header className="relative mx-auto min-h-[62vh] max-h-[720px] overflow-hidden">
      <img src={tenant.capa_signed_url ?? coverAsset.url} alt={`Ambiente da ${tenant.nome}`} width={1200} height={1500} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-ink/55" />
      <div className="relative mx-auto flex min-h-[62vh] max-w-6xl flex-col justify-end px-5 pb-10 sm:px-8">
        {tenant.logo_signed_url ? <img src={tenant.logo_signed_url} alt={`Logo ${tenant.nome}`} className="mb-5 h-16 w-16 rounded-xl border border-line bg-ink2/80 object-contain p-1" /> : null}
        <p className="text-xs font-semibold uppercase text-gold">Agendamento pelo Cortaí</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight text-paper sm:text-6xl">{tenant.nome}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper/80 sm:text-base">{tenant.descricao ?? tenant.texto_boas_vindas ?? "Cuidado, estilo e horário reservado para você."}</p>
        {tenant.endereco ? <p className="mt-4 flex items-center gap-2 text-xs text-mute"><MapPin size={14} />{tenant.endereco}</p> : null}
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Button asChild className="h-12 font-bold"><Link to="/app/agendar">Agendar horário</Link></Button>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="icon" aria-label="Compartilhar" title="Compartilhar" onClick={() => navigator.share?.({ title: tenant.nome, url: window.location.href })}><Share2 /></Button>
          <Button variant="outline" size="icon" aria-label="Copiar link" title="Copiar link" onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopiado(true); }}><Copy /></Button>
          {whatsapp ? <Button asChild variant="outline" size="icon"><a href={`https://wa.me/${whatsapp}`} aria-label="WhatsApp" target="_blank" rel="noreferrer"><MessageCircle /></a></Button> : <Button variant="outline" size="icon" disabled><MessageCircle /></Button>}
        </div>
      </div>
      {copiado ? <p className="mt-2 text-xs text-sage">Link copiado.</p> : null}

      <section className="pt-12"><p className="text-xs font-semibold uppercase text-mute">Serviços</p><div className="mt-4 grid gap-x-8 sm:grid-cols-2">{data.servicos.map((servico) => <div key={servico.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-line py-4"><div className="min-w-0"><h2 className="text-sm font-semibold text-paper">{servico.nome}</h2><p className="mt-1 flex items-center gap-1 text-xs text-mute"><Clock3 size={12} />{servico.duracao_min} min</p></div><p className="text-sm font-semibold text-paper">{brl(servico.preco_centavos)}</p></div>)}</div></section>

      <section className="pt-12"><p className="text-xs font-semibold uppercase text-mute">Profissionais</p><div className="mt-5 flex flex-wrap gap-6">{data.profissionais.map((profissional) => <div key={profissional.id} className="w-20 text-center">{profissional.avatar_url ? <img src={profissional.avatar_url} alt={profissional.nome} loading="lazy" className="mx-auto h-16 w-16 rounded-full object-cover" /> : <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink2 text-lg font-semibold text-gold">{profissional.nome.charAt(0)}</span>}<p className="mt-2 truncate text-xs text-paper">{profissional.nome}</p></div>)}</div></section>

      {tenant.fotos_signed_urls.length ? <section className="pt-12"><p className="text-xs font-semibold uppercase text-mute">O espaço</p><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{tenant.fotos_signed_urls.map((foto) => <img key={foto} src={foto} alt={`Ambiente da ${tenant.nome}`} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />)}</div></section> : null}

      <section className="mt-12 grid gap-6 border-y border-line py-8 sm:grid-cols-[1fr_auto] sm:items-center"><div><h2 className="text-xl font-bold text-paper">Fale com a barbearia</h2><div className="mt-4 flex flex-wrap gap-4">{whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-paper"><MessageCircle size={17} className="text-gold" />WhatsApp</a> : null}{tenant.instagram ? <a href={`https://instagram.com/${tenant.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-paper"><Instagram size={17} className="text-gold" />Instagram</a> : null}</div></div>{qr ? <img src={qr} alt={`QR Code da página de ${tenant.nome}`} className="h-28 w-28 rounded-lg bg-paper p-2" /> : null}</section>
    </main>
    <Signature />
  </div>;
}