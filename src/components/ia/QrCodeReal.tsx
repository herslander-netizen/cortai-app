import { useEffect, useState } from "react";
import { BlocoEsqueleto, RegiaoDeEsqueleto } from "@/components/layout/Esqueleto";

/**
 * Mostra o QR Code REAL devolvido pelo serviço de WhatsApp.
 *
 * O serviço pode entregar o código de duas formas: já como imagem (data URL ou
 * base64 de PNG) ou como o texto cru da sessão. Nos dois casos o conteúdo vem
 * do serviço — aqui só desenhamos. Nada é estático, decorativo ou inventado.
 */
export function QrCodeReal({
  valor,
  alt,
  corDosModulos = "--qr-dark",
  repintarImagem = false,
}: {
  valor: string;
  alt: string;
  /** Variável CSS da cor dos módulos (padrão `--qr-dark`). */
  corDosModulos?: string;
  /** QR que chega como imagem colorida (Evolution): repinta em preto sobre branco. */
  repintarImagem?: boolean;
}) {
  const jaEhImagem = valor.startsWith("data:image");
  const pareceBase64Png = !jaEhImagem && /^[A-Za-z0-9+/=\s]+$/.test(valor) && valor.length > 300;
  const [desenhado, setDesenhado] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (jaEhImagem || pareceBase64Png) {
      setDesenhado(null);
      if (!repintarImagem) return;
      let ativo = true;
      const url = jaEhImagem ? valor : `data:image/png;base64,${valor.replace(/\s/g, "")}`;
      void import("./qr-compartilhar")
        .then((m) => m.repintarQr(url))
        .then((pronto) => {
          if (ativo) setDesenhado(pronto);
        })
        // Sem canvas: mostra a imagem como veio, nunca some com o QR.
        .catch(() => {
          if (ativo) setDesenhado(url);
        });
      return () => {
        ativo = false;
      };
    }
    let ativo = true;
    setFalhou(false);
    const estilos = window.getComputedStyle(document.documentElement);
    void import("qrcode")
      .then((m) =>
        m.toDataURL(valor, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 512,
          color: {
            dark: estilos.getPropertyValue(corDosModulos).trim(),
            light: estilos.getPropertyValue("--qr-light").trim(),
          },
        }),
      )
      .then((url) => {
        if (ativo) setDesenhado(url);
      })
      .catch(() => {
        if (ativo) setFalhou(true);
      });
    return () => {
      ativo = false;
    };
  }, [valor, jaEhImagem, pareceBase64Png, corDosModulos, repintarImagem]);

  const imagemPronta = jaEhImagem
    ? valor
    : pareceBase64Png
      ? `data:image/png;base64,${valor.replace(/\s/g, "")}`
      : null;
  // Repintando: espera o QR preto (alguns milissegundos) em vez de piscar o azul.
  const src = imagemPronta && !repintarImagem ? imagemPronta : desenhado;

  if (falhou) {
    return (
      <p className="text-xs text-brick">Não foi possível desenhar este QR Code. Gere um novo.</p>
    );
  }

  if (!src) {
    return (
      <RegiaoDeEsqueleto className="mx-auto h-56 w-56">
        <BlocoEsqueleto className="h-56 w-56 border border-line2" />
      </RegiaoDeEsqueleto>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={224}
      height={224}
      className="mx-auto h-56 w-56 rounded-xl bg-qr-light p-2"
    />
  );
}
