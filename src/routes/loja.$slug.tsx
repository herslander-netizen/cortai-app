import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Phone, ShoppingBag, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Signature } from "@/components/layout/Signature";
import { TelaDeCarregamento } from "@/components/layout/Carregando";
import { brl } from "@/lib/format";
import { estiloDaMarca } from "@/lib/cor-marca";
import { getLojaPublica, type ProdutoPublico } from "@/lib/loja.functions";

export const Route = createFileRoute("/loja/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Loja da ${params.slug} — Flow` },
      { name: "description", content: "Produtos selecionados pelo negócio para levar para casa." },
      { property: "og:title", content: `Loja — ${params.slug}` },
      { property: "og:description", content: "Produtos do negócio, com retirada no local." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: `https://cortai.dev/loja/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `https://cortai.dev/loja/${params.slug}` }],
  }),
  component: LojaPage,
});

function LojaPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["loja-publica", slug],
    queryFn: () => getLojaPublica({ data: { slug } }),
  });
  const [aberto, setAberto] = useState<ProdutoPublico | null>(null);

  if (isLoading) return <TelaDeCarregamento texto="Abrindo a loja…" />;
  if (!data || data.produtos.length === 0) throw notFound();

  const { tenant } = data;
  const marca = estiloDaMarca(tenant.cor_primaria);
  const whatsapp = tenant.whatsapp?.replace(/\D/g, "") || null;
  const telefone = tenant.telefone?.replace(/\D/g, "") || null;
  const contato = whatsapp ? `https://wa.me/${whatsapp}` : telefone ? `tel:+${telefone}` : null;

  return (
    <div
      className="client-brand min-h-screen bg-ink"
      data-custom-brand={marca.personalizada || undefined}
      style={marca.style}
    >
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 pb-10 pt-8">
        <header>
          <Link
            to="/b/$slug"
            params={{ slug }}
            className="flex items-center gap-2 text-xs text-mute hover:text-paper"
          >
            <ArrowLeft size={14} />
            Voltar para {tenant.nome}
          </Link>
          <div className="mt-5 flex items-center gap-3">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={`Logo ${tenant.nome}`}
                className="h-12 w-12 rounded-md object-contain"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-ink2 text-gold">
                <ShoppingBag size={20} />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-paper">Loja da {tenant.nome}</h1>
              <p className="mt-0.5 text-xs text-mute">Reserve aqui e retire no local.</p>
            </div>
          </div>
        </header>

        <main className="mt-8 flex-1">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.produtos.map((produto) => (
              <li key={produto.id}>
                <button
                  type="button"
                  onClick={() => setAberto(produto)}
                  className="w-full overflow-hidden surface text-left"
                >
                  {produto.foto_url ? (
                    <img
                      src={produto.foto_url}
                      alt={produto.nome}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <span className="flex aspect-square w-full items-center justify-center bg-ink3 text-mute">
                      <ShoppingBag size={22} />
                    </span>
                  )}
                  <span className="block p-3">
                    <span className="block truncate text-sm font-semibold text-paper">
                      {produto.nome}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-mute2">
                      {produto.categoria}
                    </span>
                    <span className="mt-1.5 block text-sm font-semibold text-gold">
                      {brl(produto.preco_centavos)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </main>
        <Signature />
      </div>

      {aberto ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/80 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={aberto.nome}
        >
          <div className="w-full max-w-md rounded-t-2xl border border-line bg-ink2 p-5 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-paper">{aberto.nome}</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setAberto(null)}
                className="text-mute hover:text-paper"
              >
                <X size={18} />
              </button>
            </div>
            {aberto.foto_url ? (
              <img
                src={aberto.foto_url}
                alt={aberto.nome}
                className="mt-4 aspect-square w-full rounded-xl object-cover"
              />
            ) : null}
            <p className="mt-4 text-xs uppercase text-mute2">{aberto.categoria}</p>
            <p className="mt-1 text-xl font-bold text-gold">{brl(aberto.preco_centavos)}</p>
            <p className="mt-3 text-xs leading-relaxed text-mute">
              Pagamento e retirada no local. Avise a equipe para separar o seu.
            </p>
            <div className="mt-5 grid gap-2">
              {contato ? (
                <Button asChild className="h-11 font-bold">
                  <a href={contato} target={whatsapp ? "_blank" : undefined} rel="noreferrer">
                    {whatsapp ? <MessageCircle /> : <Phone />}Tenho interesse
                  </a>
                </Button>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-4 py-3 text-xs text-mute2">
                  Fale com a equipe para comprar este produto.
                </p>
              )}
              <Button variant="outline" className="h-11" onClick={() => setAberto(null)}>
                Continuar vendo
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
