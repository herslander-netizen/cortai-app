import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Copy, QrCode, Share2, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { getCrescimento } from "@/lib/crescimento.functions";
import { Carregando } from "@/components/layout/Carregando";

export const Route = createFileRoute("/barbeiro/crescimento")({
  head: () => ({
    meta: [
      { title: "Crescimento — Cortaí Gestão" },
      { name: "description", content: "Novos clientes, recorrência, indicações e ocupação da sua barbearia." },
      { property: "og:title", content: "Crescimento — Cortaí Gestão" },
      { property: "og:description", content: "O que faz sua barbearia crescer, em números reais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrescimentoPage,
});

function Metrica({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink2 px-4 py-4">
      <p className="text-xs text-mute">{rotulo}</p>
      <p className="mt-1 text-xl font-bold leading-tight text-paper">{valor}</p>
      <p className="mt-1 text-[11px] text-mute2">{detalhe}</p>
    </div>
  );
}

function CrescimentoPage() {
  const { data, isLoading } = useQuery({ queryKey: ["crescimento"], queryFn: () => getCrescimento() });
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);

  const link = data ? `${typeof window === "undefined" ? "" : window.location.origin}/b/${data.tenant.slug}` : "";

  useEffect(() => {
    if (!link || !mostrarQr || qr) return;
    let ativo = true;
    void import("qrcode").then(({ default: QRCode }) =>
      QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: "#0B0B0B", light: "#F5F5F3" } }),
    ).then((url) => { if (ativo) setQr(url); });
    return () => { ativo = false; };
  }, [link, mostrarQr, qr]);

  return (
    <Screen voltarPara="/barbeiro/mais" title="Crescimento" subtitle={data?.tenant.nome ?? "O que faz sua barbearia crescer."}>
      {isLoading ? <Carregando /> : null}

      {data ? (
        <>
          <div data-guia="crescimento-metricas" className="grid grid-cols-2 gap-3">
            <Metrica rotulo="Novos clientes" valor={String(data.novosClientesMes)} detalhe="neste mês" />
            <Metrica rotulo="Recorrentes" valor={String(data.clientesRecorrentes)} detalhe="voltaram mais de uma vez" />
            <Metrica rotulo="Vieram pelo link" valor={String(data.agendamentosPeloLink)} detalhe="página pública e indicação" />
            <Metrica rotulo="Ocupação" valor={`${data.ocupacaoPct}%`} detalhe={`${data.horariosVagosHoje} horários livres hoje`} />
            <Metrica rotulo="Para trazer de volta" valor={String(data.oportunidadesRetorno)} detalhe="passaram do intervalo habitual" />
            <Metrica
              rotulo="Indicações"
              valor={`${data.indicacoesConvertidas}/${data.indicacoesTotal}`}
              detalhe="convertidas do total"
            />
          </div>

          <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Ações de hoje</h2>
          <ul data-guia="crescimento-acoes">
            <li className="border-b border-line">
              <Link to="/barbeiro/clientes" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink2 text-gold"><UserPlus size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-paper">Clientes para trazer de volta</span>
                  <span className="mt-1 block text-xs text-mute">{data.oportunidadesRetorno === 0 ? "Ninguém atrasado agora." : `${data.oportunidadesRetorno} pessoas passaram do intervalo`}</span>
                </span>
                <span className="text-xs text-mute2">Abrir</span>
              </Link>
            </li>
            <li className="border-b border-line">
              <Link to="/barbeiro/agenda" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink2 text-gold"><CalendarClock size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-paper">Horários vazios</span>
                  <span className="mt-1 block text-xs text-mute">{data.naFila > 0 ? `${data.naFila} na lista de espera para chamar` : "Ofereça na lista de espera"}</span>
                </span>
                <span className="text-xs text-mute2">Abrir</span>
              </Link>
            </li>
            <li className="border-b border-line">
              <Link to="/barbeiro/indicacoes" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink2 text-gold"><Sparkles size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-paper">Indicações</span>
                  <span className="mt-1 block text-xs text-mute">Cliente que traz cliente</span>
                </span>
                <span className="text-xs text-mute2">Abrir</span>
              </Link>
            </li>
          </ul>

          <h2 className="mb-3 mt-8 text-sm font-semibold text-paper">Compartilhar minha barbearia</h2>
          <div data-guia="crescimento-compartilhar" className="rounded-xl border border-line bg-ink2 p-5">
            <p className="break-all text-xs text-mute">{link}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg border border-line2 py-3 text-[11px] text-paper"
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  setCopiado(true);
                }}
              >
                <Copy size={16} className="text-gold" />
                Copiar
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg border border-line2 py-3 text-[11px] text-paper"
                onClick={() => navigator.share?.({ title: data.tenant.nome, url: link })}
              >
                <Share2 size={16} className="text-gold" />
                Compartilhar
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg border border-line2 py-3 text-[11px] text-paper"
                onClick={() => setMostrarQr((v) => !v)}
              >
                <QrCode size={16} className="text-gold" />
                QR Code
              </button>
            </div>
            {copiado ? <p className="mt-3 text-xs text-sage">Link copiado.</p> : null}
            {mostrarQr && qr ? (
              <div className="mt-5 flex flex-col items-center gap-3 rounded-xl bg-paper p-5">
                <img src={qr} alt={`QR Code de ${data.tenant.nome}`} className="h-44 w-44" />
                <p className="text-center text-xs font-semibold uppercase tracking-wide text-ink">
                  {data.tenant.nome}
                </p>
                <p className="text-center text-[11px] text-ink/70">Aponte a câmera para agendar</p>
              </div>
            ) : null}
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block text-center text-xs text-gold underline"
            >
              Ver página pública
            </a>
          </div>
        </>
      ) : null}
    </Screen>
  );
}
