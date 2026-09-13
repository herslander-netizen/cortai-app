import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock3, Copy, MapPin, MessageCircle, Phone, Share2 } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";

import coverAsset from "@/assets/cortai-barbershop-cover.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { Signature } from "@/components/layout/Signature";
import { brl } from "@/lib/format";
import { getPaginaPublica } from "@/lib/publico.functions";
import { TelaDeCarregamento } from "@/components/layout/Carregando";
import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { LinksSociais } from "@/components/marca/LinksSociais";

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

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="pt-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-mute">{titulo}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-mute2">{texto}</p>;
}

function PaginaBarbearia() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["pagina-publica", slug], queryFn: () => getPaginaPublica({ data: { slug } }) });
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);

  useEffect(() => {
    if (!mostrarQr || qr) return;
    let ativo = true;
    void import("qrcode").then(({ default: QRCode }) =>
      QRCode.toDataURL(window.location.href, { width: 220, margin: 1, color: { dark: "#0B0B0B", light: "#F5F5F3" } }),
    ).then((url) => { if (ativo) setQr(url); });
    return () => { ativo = false; };
  }, [mostrarQr, qr]);

  if (isLoading) return <TelaDeCarregamento texto="Abrindo a barbearia…" />;
  if (!data) throw notFound();

  const { tenant } = data;
  const style = { "--gold": tenant.cor_primaria, "--primary": tenant.cor_primaria } as CSSProperties;
  const whatsapp = tenant.whatsapp?.replace(/\D/g, "") || null;
  const telefone = tenant.telefone?.replace(/\D/g, "") || null;
  const linkContato = whatsapp ? `https://wa.me/${whatsapp}` : telefone ? `tel:+${telefone}` : null;

  return <div className="client-brand min-h-screen bg-ink" style={style} data-hide-signature={tenant.assinatura_visivel === false}>
    <header className="relative mx-auto min-h-[56vh] max-h-[620px] overflow-hidden">
      <img src={tenant.capa_signed_url ?? coverAsset.url} alt={`Ambiente da ${tenant.nome}`} width={1200} height={1500} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-ink/60" />
      <div className="relative mx-auto flex min-h-[56vh] max-w-6xl flex-col justify-end px-5 pb-9 sm:px-8">
        <LogoBarbearia nome={tenant.nome} url={tenant.logo_signed_url} size={60} className="mb-4" />
        <MarcaCortai tamanho="sm" assinatura={false} className="mb-3" />
        <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight text-paper sm:text-5xl">{tenant.nome}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper/80">{tenant.descricao ?? tenant.texto_boas_vindas ?? "Cuidado, estilo e horário reservado para você."}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-mute">
          {tenant.endereco ? <span className="flex items-center gap-1.5"><MapPin size={13} className="text-gold" />{tenant.endereco}</span> : null}
          {data.servicos.length ? <span className="flex items-center gap-1.5"><Clock3 size={13} className="text-gold" />{data.servicos.length} serviço{data.servicos.length > 1 ? "s" : ""} disponíve{data.servicos.length > 1 ? "is" : "l"}</span> : null}
        </div>
        <LinksSociais instagram={tenant.instagram} facebook={tenant.facebook} whatsapp={tenant.whatsapp} mostrarRotulos className="mt-4" />
      </div>
    </header>

    <main className="mx-auto max-w-6xl px-5 pb-14 sm:px-8">
      <Secao titulo="Serviços">
        {data.servicos.length ? (
          <div className="grid gap-x-8 sm:grid-cols-2">
            {data.servicos.map((servico) => (
              <div key={servico.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line py-3.5">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-paper">{servico.nome}</h2>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-mute"><Clock3 size={12} />{servico.duracao_min} min</p>
                </div>
                <p className="text-sm font-semibold text-paper">{brl(servico.preco_centavos)}</p>
              </div>
            ))}
          </div>
        ) : (
          <Vazio texto="Os serviços ainda não foram publicados. Fale com a barbearia para saber valores e durações." />
        )}
      </Secao>

      <Secao titulo="Profissionais">
        {data.profissionais.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.profissionais.map((profissional) => (
              <article key={profissional.id} className="rounded-xl border border-line bg-ink2 p-3.5">
                <div className="flex items-center gap-3">
                  {profissional.avatar_url ? (
                    <img src={profissional.avatar_url} alt={profissional.nome} loading="lazy" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink3 text-base font-semibold text-gold">{profissional.nome.charAt(0)}</span>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-paper">{profissional.nome}</h3>
                    {profissional.descricao ? <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-mute">{profissional.descricao}</p> : null}
                  </div>
                </div>
                {profissional.portfolio.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {profissional.portfolio.slice(0, 3).map((foto) => (
                      <img key={foto} src={foto} alt={`Trabalho de ${profissional.nome}`} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <Vazio texto="A equipe ainda não foi publicada. Você pode agendar e a barbearia confirma quem vai te atender." />
        )}
      </Secao>

      {data.produtos.length ? (
        <Secao titulo="Produtos">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.produtos.map((produto) => (
              <article key={produto.id} className="overflow-hidden rounded-xl border border-line bg-ink2">
                {produto.foto_url ? (
                  <img src={produto.foto_url} alt={produto.nome} loading="lazy" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square w-full bg-ink3" />
                )}
                <div className="p-3">
                  <h3 className="truncate text-sm font-semibold text-paper">{produto.nome}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-mute2">{produto.categoria}</p>
                  <p className="mt-1.5 text-sm font-semibold text-paper">{brl(produto.preco_centavos)}</p>
                  <p className="mt-0.5 text-[11px] text-mute">Comprar na barbearia</p>
                </div>
              </article>
            ))}
          </div>
        </Secao>
      ) : null}

      {tenant.fotos_signed_urls.length ? (
        <Secao titulo="O espaço">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tenant.fotos_signed_urls.map((foto) => (
              <img key={foto} src={foto} alt={`Ambiente da ${tenant.nome}`} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
            ))}
          </div>
        </Secao>
      ) : null}

      <section className="mt-12 rounded-2xl border border-line bg-ink2 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-paper">Reserve seu horário</h2>
        <p className="mt-1 text-sm text-mute">Escolha serviço, profissional e horário em menos de um minuto.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button asChild className="h-12 font-bold"><Link to="/app/agendar" search={{ b: slug }}>Agendar horário</Link></Button>
          {linkContato ? (
            <Button asChild variant="outline" className="h-12">
              <a href={linkContato} target={whatsapp ? "_blank" : undefined} rel="noreferrer">
                {whatsapp ? <MessageCircle /> : <Phone />}Falar com a barbearia
              </a>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-paper">Compartilhe esta barbearia</h2>
        <p className="mt-1 text-xs text-mute">Envie o link para quem precisa cortar o cabelo — ou mostre o código para apontar a câmera e agendar.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigator.share?.({ title: tenant.nome, url: window.location.href })}><Share2 />Compartilhar</Button>
          <Button variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopiado(true); }}>{copiado ? <Check /> : <Copy />}{copiado ? "Link copiado" : "Copiar link"}</Button>
          <Button variant="outline" size="sm" onClick={() => setMostrarQr((v) => !v)}>{mostrarQr ? "Esconder código" : "Mostrar código"}</Button>
        </div>
        {mostrarQr ? (
          <div className="mt-5 flex items-center gap-4">
            {qr ? <img src={qr} alt={`Código para abrir a página de ${tenant.nome}`} className="h-28 w-28 rounded-lg bg-paper p-2" /> : <div className="h-28 w-28 animate-pulse rounded-lg bg-ink3" />}
            <p className="max-w-xs text-xs leading-relaxed text-mute">Aponte a câmera do celular para este código para abrir esta página e agendar.</p>
          </div>
        ) : null}
      </section>
    </main>
    <Signature mostrarRedesSociais mostrarLegal />
  </div>;
}
