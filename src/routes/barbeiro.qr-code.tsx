import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { desenharCartaoDoQr, VARIANTES_DO_QR, type VarianteDoQr } from "@/lib/qr-cartao";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, CircleHelp, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { getMarca } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { urlPublica } from "@/lib/origem-publica";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";

export const Route = createFileRoute("/barbeiro/qr-code")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  head: () => ({
    meta: [
      { title: "QR Code e link público — Flow" },
      { name: "description", content: "Gere, baixe e imprima o QR Code da página pública do seu negócio." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: QrCodeDaPagina,
});

function QrCodeDaPagina() {
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca(), retry: false });
  const [mensagem, setMensagem] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [varianteDoQr, setVarianteDoQr] = useState<VarianteDoQr>("papel");
  const [cartaoDoQr, setCartaoDoQr] = useState<string | null>(null);
  const nomeDoNegocio = query.data?.marca?.nome ?? "";
  useEffect(() => {
    if (!qrCode) return;
    let ativo = true;
    const imagem = new Image();
    imagem.onload = () => {
      try {
        const cor = window.getComputedStyle(document.documentElement).getPropertyValue("--qr-dark").trim() || undefined;
        const url = desenharCartaoDoQr({ qr: imagem, nome: nomeDoNegocio, variante: varianteDoQr, ...(cor ? { corDaMarca: cor } : {}) });
        if (ativo) setCartaoDoQr(url);
      } catch {
        if (ativo) setMensagem("Não foi possível montar a imagem do QR Code.");
      }
    };
    imagem.src = qrCode;
    return () => { ativo = false; };
  }, [qrCode, varianteDoQr, nomeDoNegocio]);
  const imprimirQr = () => {
    if (!cartaoDoQr) return;
    const janela = window.open("", "_blank");
    if (!janela) { setMensagem("Não foi possível abrir a impressão. Libere pop-ups ou salve a imagem."); return; }
    janela.document.write(`<!doctype html><title>QR Code</title><style>body{margin:0;display:grid;place-items:center}img{max-width:100%;height:auto}@page{margin:0}</style><img src="${cartaoDoQr}" onload="window.print()">`);
    janela.document.close();
  };
  const link = query.data?.marca ? urlPublica(`/${query.data.marca.slug}`) : "";

  useEffect(() => {
    if (!link) return;
    let ativo = true;
    const estilos = window.getComputedStyle(document.documentElement);
    void QRCode.toDataURL(link, {
      width: 512,
      margin: 1,
      color: {
        dark: estilos.getPropertyValue("--qr-dark").trim() || "#10203A",
        light: estilos.getPropertyValue("--qr-light").trim() || "#FFFFFF",
      },
    }).then((url) => {
      if (ativo) setQrCode(url);
    }).catch(() => {
      if (ativo) setMensagem("Não foi possível gerar o QR Code agora.");
    });
    return () => { ativo = false; };
  }, [link]);

  if (query.isLoading) {
    return (
      <Screen voltarPara="/barbeiro" title="QR Code e link público">
        <EsqueletoFormulario campos={4} onTentarDeNovo={() => void query.refetch()} />
      </Screen>
    );
  }

  if (query.isError || !query.data?.marca) {
    return (
      <Screen voltarPara="/barbeiro" title="QR Code e link público" subtitle="Compartilhe sua página pública com clientes.">
        <div className="surface space-y-3 p-5">
          <CircleHelp className="text-mute" size={24} aria-hidden />
          <p className="text-sm text-paper">
            Não foi possível carregar as informações da página. Confira se você está no negócio correto e tente novamente.
          </p>
          <Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button>
        </div>
      </Screen>
    );
  }

  const marca = query.data.marca;

  return (
    <Screen
      voltarPara="/barbeiro"
      title="QR Code e link público"
      subtitle="Copie o link e gere um QR Code para salvar ou imprimir."
    >
      <div className="space-y-4">
        <section className="surface overflow-hidden p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]">
              <QrCode size={20} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-paper">{marca.nome}</h2>
              <p className="mt-1 break-all text-sm text-mute">{link}</p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                {marca.alteracoes_pendentes ? (
                  <>
                    <CircleHelp size={15} className="text-gold" aria-hidden />
                    <span className="text-paper">Há alterações que ainda precisam ser publicadas</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} className="text-sage" aria-hidden />
                    <span className="text-paper">Nenhuma alteração pendente no editor</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 pt-4">
            <Button asChild variant="outline">
              <a href={link} target="_blank" rel="noreferrer">
                Ver página <ArrowUpRight size={16} aria-hidden />
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setMensagem("Link copiado.");
                } catch {
                  setMensagem("Não foi possível copiar o link neste navegador.");
                }
              }}
            >
              Copiar link
            </Button>
          </div>
          <div className="mt-4 rounded-[12px] border-0 bg-[var(--figaro-surface-container,var(--ink2))] p-4 text-center">
            {qrCode ? <img src={cartaoDoQr ?? qrCode} alt={`QR Code para abrir a página pública de ${marca.nome}`} width={240} className="mx-auto h-auto w-60 max-w-full rounded-lg bg-qr-light" /> : <p role="status" className="text-sm text-mute">Gerando QR Code…</p>}
            <p className="mt-2 text-xs text-mute">Aponte a câmera do celular para abrir sua página pública.</p>
            <OpcoesConectadas
              rotulo="Tipo de cartão do QR Code"
              className="mt-4"
              valor={varianteDoQr}
              opcoes={(Object.keys(VARIANTES_DO_QR) as VarianteDoQr[]).map((v) => ({ valor: v, texto: VARIANTES_DO_QR[v].rotulo }))}
              onChange={setVarianteDoQr}
            />
            {cartaoDoQr ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="lg" className="w-full">
                  <a href={cartaoDoQr} download={`qr-${marca.slug}-${varianteDoQr}.png`}>Salvar imagem</a>
                </Button>
                <Button type="button" variant="outline" size="lg" className="w-full" onClick={imprimirQr}>Imprimir</Button>
              </div>
            ) : null}
          </div>
          {mensagem ? <p role="status" className="mt-3 text-xs text-mute">{mensagem}</p> : null}
        </section>

      </div>
    </Screen>
  );
}
