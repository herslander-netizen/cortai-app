import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Copy, QrCode, Share2, Sparkles, UserPlus } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { getCrescimento } from "@/lib/crescimento.functions";
import { EsqueletoPainel } from "@/components/layout/Esqueleto";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/barbeiro/crescimento")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "crescimento"),
  head: () => ({
    meta: [
      { title: "Crescimento — Flow" },
      {
        name: "description",
        content: "Novos clientes, recorrência, indicações e ocupação do seu negócio.",
      },
      { property: "og:title", content: "Crescimento — Flow" },
      { property: "og:description", content: "O que faz seu negócio crescer, em números reais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CrescimentoPage,
});

function Metrica({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="surface-card px-4 py-4">
      <p className="text-xs text-mute">{rotulo}</p>
      <p className="mt-1 text-xl font-bold leading-tight text-paper">{valor}</p>
      <p className="mt-1 text-xs text-mute2">{detalhe}</p>
    </div>
  );
}

function CrescimentoPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["crescimento"],
    queryFn: () => getCrescimento(),
  });
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);

  const link = data
    ? `${typeof window === "undefined" ? "" : window.location.origin}/b/${data.tenant.slug}`
    : "";

  useEffect(() => {
    if (!link) return;
    const estilos = window.getComputedStyle(document.documentElement);
    QRCode.toDataURL(link, {
      width: 320,
      margin: 1,
      color: {
        dark: estilos.getPropertyValue("--qr-dark").trim(),
        light: estilos.getPropertyValue("--qr-light").trim(),
      },
    }).then(setQr);
  }, [link]);

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Crescimento"
      subtitle={data?.tenant.nome ?? "O que faz seu negócio crescer."}
    >
      {isLoading ? <EsqueletoPainel onTentarDeNovo={() => void refetch()} /> : null}

      {data ? (
        <>
          <div
            data-guia="crescimento-metricas"
            className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"
          >
            <Metrica
              rotulo="Novos clientes"
              valor={String(data.novosClientesMes)}
              detalhe="neste mês"
            />
            <Metrica
              rotulo="Recorrentes"
              valor={String(data.clientesRecorrentes)}
              detalhe="voltaram mais de uma vez"
            />
            <Metrica
              rotulo="Vieram pelo link"
              valor={String(data.agendamentosPeloLink)}
              detalhe="página pública e indicação"
            />
            <Metrica
              rotulo="Ocupação"
              valor={`${data.ocupacaoPct}%`}
              detalhe={`${data.horariosVagosHoje} horários livres hoje`}
            />
            <Metrica
              rotulo="Para trazer de volta"
              valor={String(data.oportunidadesRetorno)}
              detalhe="passaram do intervalo habitual"
            />
            <Metrica
              rotulo="Indicações"
              valor={`${data.indicacoesConvertidas}/${data.indicacoesTotal}`}
              detalhe="convertidas do total"
            />
          </div>

          <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Ações de hoje</h2>
          <ul data-guia="crescimento-acoes" className="space-y-2">
            <li>
              <Card asChild variant="touchable" density="none">
              <Link
                to="/barbeiro/clientes"
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]">
                  <UserPlus size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-paper">
                    Clientes para trazer de volta
                  </span>
                  <span className="mt-1 block text-xs text-mute">
                    {data.oportunidadesRetorno === 0
                      ? "Ninguém atrasado agora."
                      : `${data.oportunidadesRetorno} pessoas passaram do intervalo`}
                  </span>
                </span>
                <span className="text-xs text-mute2">Abrir</span>
              </Link>
              </Card>
            </li>
            <li>
              <Card asChild variant="touchable" density="none">
              <Link
                to="/barbeiro/agenda"
                search={{ acao: undefined }}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]">
                  <CalendarClock size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-paper">Horários vazios</span>
                  <span className="mt-1 block text-xs text-mute">
                    {data.naFila > 0
                      ? `${data.naFila} na lista de espera para chamar`
                      : "Ofereça na lista de espera"}
                  </span>
                </span>
                <span className="text-xs text-mute2">Abrir</span>
              </Link>
              </Card>
            </li>
            <li>
              <Card asChild variant="touchable" density="none">
              <Link
                to="/barbeiro/indicacoes"
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]">
                  <Sparkles size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-paper">Indicações</span>
                  <span className="mt-1 block text-xs text-mute">Cliente que traz cliente</span>
                </span>
                <span className="text-xs text-mute2">Abrir</span>
              </Link>
              </Card>
            </li>
          </ul>

          <h2 className="mb-3 mt-8 text-sm font-semibold text-paper">Compartilhar meu negócio</h2>
          <Card data-guia="crescimento-compartilhar" density="default" className="md:max-w-2xl">
            <p className="break-all text-xs text-mute">{link}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button
                variant="ghost"
                type="button"
                className="min-h-16 flex-col gap-1 px-2 text-xs"
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  setCopiado(true);
                }}
              >
                <Copy size={16} className="text-[var(--figaro-primary,var(--primary))]" />
                Copiar
              </Button>
              <Button
                variant="ghost"
                type="button"
                className="min-h-16 flex-col gap-1 px-2 text-xs"
                onClick={() => navigator.share?.({ title: data.tenant.nome, url: link })}
              >
                <Share2 size={16} className="text-[var(--figaro-primary,var(--primary))]" />
                Compartilhar
              </Button>
              <Button
                variant="ghost"
                type="button"
                className="min-h-16 flex-col gap-1 px-2 text-xs"
                onClick={() => setMostrarQr((v) => !v)}
              >
                <QrCode size={16} className="text-[var(--figaro-primary,var(--primary))]" />
                QR Code
              </Button>
            </div>
            {copiado ? <p className="mt-3 text-xs text-sage">Link copiado.</p> : null}
            {mostrarQr && qr ? (
              <div className="mt-5 flex flex-col items-center gap-3 rounded-xl bg-paper p-5">
                <img src={qr} alt={`QR Code de ${data.tenant.nome}`} className="h-44 w-44" />
                <p className="text-center text-xs font-semibold uppercase tracking-wide text-ink">
                  {data.tenant.nome}
                </p>
                <p className="text-center text-xs text-ink/70">Aponte a câmera para agendar</p>
              </div>
            ) : null}
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block text-center text-sm font-medium text-[var(--figaro-primary,var(--primary))] underline underline-offset-2"
            >
              Ver página pública
            </a>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
