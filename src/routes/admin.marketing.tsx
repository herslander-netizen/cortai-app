import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ExternalLink, QrCode, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { QrCodeReal } from "@/components/ia/QrCodeReal";
import { AdminScreen } from "@/components/layout/AdminScreen";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing — Administração Cortaí" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MarketingPage,
});

function MarketingPage() {
  const [mostrarQr, setMostrarQr] = useState(false);
  const endereco =
    typeof window === "undefined"
      ? "https://cortai.dev/apresentacao"
      : `${window.location.origin}/apresentacao`;
  async function copiar() {
    await navigator.clipboard.writeText(endereco);
    toast.success("Link copiado.");
  }
  async function compartilhar() {
    if (navigator.share) {
      await navigator.share({
        title: "Conheça o Cortaí",
        text: "Conheça o Cortaí conversando com o Cortaí.",
        url: endereco,
      });
      return;
    }
    await copiar();
  }
  return (
    <AdminScreen
      title="Marketing"
      subtitle="Apresente o Cortaí sem interferir na operação do produto."
    >
      <section className="max-w-2xl rounded-2xl border border-line bg-ink2 p-5 md:p-7">
        <p className="text-xs font-semibold uppercase text-gold">Apresentação pública</p>
        <h2 className="mt-2 text-xl font-bold text-paper">Conheça o Cortaí</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Uma experiência guiada por Agenda, Modo Foco, Clientes, Secretária e Caixa.
        </p>
        <div
          className="mt-5 rounded-xl border border-line2 bg-ink px-4 py-3 text-sm text-mute"
          aria-label="Link da apresentação"
        >
          {endereco}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <a href="/apresentacao" target="_blank" rel="noopener noreferrer">
              Abrir <ExternalLink />
            </a>
          </Button>
          <Button variant="outline" onClick={copiar}>
            <Copy /> Copiar link
          </Button>
          <Button variant="outline" onClick={() => setMostrarQr(!mostrarQr)}>
            {mostrarQr ? <Check /> : <QrCode />} QR Code
          </Button>
          <Button variant="outline" onClick={compartilhar}>
            <Share2 /> Compartilhar
          </Button>
        </div>
        {mostrarQr ? (
          <div className="mt-6 rounded-2xl border border-line bg-white p-4">
            <QrCodeReal valor={endereco} alt="QR Code da apresentação pública do Cortaí" />
          </div>
        ) : null}
      </section>
    </AdminScreen>
  );
}
