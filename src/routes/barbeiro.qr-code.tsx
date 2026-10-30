import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { desenharCartaoDoQr, VARIANTES_DO_QR, type VarianteDoQr } from "@/lib/qr-cartao";
import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp, Printer } from "lucide-react";
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
  const link = query.data?.marca ? urlPublica(`/${query.data.marca.slug}`) : "";
  useEffect(() => {
    if (!qrCode) return;
    let ativo = true;
    const imagem = new Image();
    imagem.onload = () => {
      try {
        const cor = window.getComputedStyle(document.documentElement).getPropertyValue("--qr-dark").trim() || undefined;
        const desenhar = (logo: HTMLImageElement | null) => {
          const url = desenharCartaoDoQr({
            qr: imagem,
            nome: nomeDoNegocio,
            variante: varianteDoQr,
            logo,
            endereco: link.replace(/^https?:\/\//, ""),
            ...(cor ? { corDaMarca: cor } : {}),
          });
          if (ativo) setCartaoDoQr(url);
        };
        // Símbolo do Flow no centro do QR (Figaro, captura do dono 30/10); sem ele, o cartão sai igual.
        const logo = new Image();
        logo.onload = () => desenhar(logo);
        logo.onerror = () => desenhar(null);
        logo.src = "/marca/flow/flow-simbolo-v2.svg";
      } catch {
        if (ativo) setMensagem("Não foi possível montar a imagem do QR Code.");
      }
    };
    imagem.src = qrCode;
    return () => { ativo = false; };
  }, [qrCode, varianteDoQr, nomeDoNegocio, link]);
  const imprimirQr = () => {
    if (!cartaoDoQr) return;
    const janela = window.open("", "_blank");
    if (!janela) { setMensagem("Não foi possível abrir a impressão. Libere pop-ups ou salve a imagem."); return; }
    janela.document.write(`<!doctype html><title>QR Code</title><style>body{margin:0;display:grid;place-items:center}img{max-width:100%;height:auto}@page{margin:0}</style><img src="${cartaoDoQr}" onload="window.print()">`);
    janela.document.close();
  };

  useEffect(() => {
    if (!link) return;
    let ativo = true;
    const estilos = window.getComputedStyle(document.documentElement);
    void QRCode.toDataURL(link, {
      width: 512,
      margin: 1,
      // Nível H: o QR continua lendo com o símbolo no centro.
      errorCorrectionLevel: "H",
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
      <Screen voltarPara="/barbeiro/marca" title="QR Code" barraSimples>
        <EsqueletoFormulario campos={4} onTentarDeNovo={() => void query.refetch()} />
      </Screen>
    );
  }

  if (query.isError || !query.data?.marca) {
    return (
      <Screen voltarPara="/barbeiro/marca" title="QR Code" barraSimples>
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

  // Figaro (captura do dono, 30/10): barra simples "QR Code", Papel/Adesivo, a folha em destaque e as duas pílulas.
  return (
    <Screen voltarPara="/barbeiro/marca" title="QR Code" barraSimples>
      <div className="space-y-6 pt-2">
        <OpcoesConectadas
          rotulo="Tipo de cartão do QR Code"
          valor={varianteDoQr}
          opcoes={(Object.keys(VARIANTES_DO_QR) as VarianteDoQr[]).map((v) => ({
            valor: v,
            texto: VARIANTES_DO_QR[v].rotulo,
          }))}
          onChange={setVarianteDoQr}
        />
        <div className="flex items-center justify-center rounded-[24px] bg-[var(--figaro-surface-container,var(--ink2))] px-6 py-16">
          {cartaoDoQr ? (
            <img
              src={cartaoDoQr}
              alt={`QR Code para abrir a página pública de ${marca.nome}`}
              className="h-auto w-full max-w-[360px] shadow-[var(--elevacao-3)]"
            />
          ) : (
            <p role="status" className="text-sm text-mute">
              Gerando QR Code…
            </p>
          )}
        </div>
        <div className="space-y-4">
          <Button
            asChild={Boolean(cartaoDoQr)}
            disabled={!cartaoDoQr}
            className="h-14 w-full rounded-full text-base"
          >
            {cartaoDoQr ? (
              <a href={cartaoDoQr} download={`qr-${marca.slug}-${varianteDoQr}.png`}>
                Salvar na Galeria
              </a>
            ) : (
              <span>Salvar na Galeria</span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!cartaoDoQr}
            className="h-14 w-full rounded-full text-base"
            onClick={imprimirQr}
          >
            <Printer aria-hidden />
            Imprimir
          </Button>
        </div>
        {mensagem ? (
          <p role="status" className="text-center text-sm text-mute">
            {mensagem}
          </p>
        ) : null}
      </div>
    </Screen>
  );
}
