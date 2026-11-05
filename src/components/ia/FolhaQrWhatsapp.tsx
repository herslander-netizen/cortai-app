import { QrCode, Share2, Smartphone } from "lucide-react";
import { useState } from "react";

import { CodigoPorTelefone } from "@/components/ia/CodigoPorTelefone";
import { QrCodeReal } from "@/components/ia/QrCodeReal";
import { Button } from "@/components/ui/button";
import { IndicadorDeCarregamento } from "@/components/ui/IndicadorDeCarregamento";
import { AcaoDaFolha, CartaoDaFolha, FolhaPadrao } from "@/components/ui/folha-padrao";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import { useMediaQuery } from "@/hooks/use-mobile";
import { aviso } from "@/lib/avisos";
import type { TipoDeConexao } from "@/lib/whatsapp/finalidade-conexao";
import { imagemDoQr } from "./qr-compartilhar";

/** Validade do QR da Evolution (mesmo valor de `MINUTOS_DO_QR` no gateway). */
const VALIDADE_DO_QR_S = 120;

const PASSOS = [
  "Abra o WhatsApp do número do negócio.",
  "Toque em ⋮ ou Configurações → Dispositivos conectados.",
  "Toque em Conectar dispositivo e aponte para o código.",
] as const;

function formatarRestante(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Modo = "qr" | "numero";

/**
 * Gaveta de conexão do WhatsApp, no modelo padrão (`FolhaPadrao`). Toda a informação de conexão fica aqui:
 * - QR Code: código grande, tempo, passos e "Compartilhar" (manda a imagem para outro aparelho, já que o celular do
 *   negócio não escaneia a própria tela); enquanto o código não chega, mostra que está sendo gerado;
 * - Número de telefone: código de 8 caracteres para digitar no celular do negócio (`CodigoPorTelefone`).
 * Fecha sozinha quando o WhatsApp conecta (quem abre acompanha o estado).
 */
export function FolhaQrWhatsapp({
  valor,
  restante,
  aoFechar,
  aoGerarNovo,
  gerando,
  tipo,
  aoGerarCodigoPorNumero,
  gerarCodigo,
}: {
  valor: string | null;
  restante: number | null;
  aoFechar: () => void;
  aoGerarNovo: () => void;
  gerando: boolean;
  tipo: TipoDeConexao;
  aoGerarCodigoPorNumero: () => void;
  /** Linha da plataforma (ADM): gera o código pela função dela, não pela do negócio. */
  gerarCodigo?: (
    telefone: string,
  ) => Promise<{ codigo: string | null; expiraEm: string | null; aviso: string | null }>;
}) {
  // No celular o painel costuma estar no mesmo aparelho do WhatsApp, que não escaneia a própria tela: abre em
  // "Número". No computador, "QR Code" (dono, 05/11/2026). A escolha da pessoa sempre vence.
  const celular = useMediaQuery("(pointer: coarse) and (max-width: 767px)");
  const [escolhido, setModo] = useState<Modo | null>(null);
  const modo: Modo = escolhido ?? (celular ? "numero" : "qr");
  const [compartilhando, setCompartilhando] = useState(false);
  const expirado = restante !== null && restante <= 0;
  const acabando = restante !== null && restante > 0 && restante <= 15;
  const fracao = restante === null ? 1 : Math.max(0, Math.min(1, restante / VALIDADE_DO_QR_S));

  async function compartilhar() {
    if (!valor) return;
    setCompartilhando(true);
    try {
      const imagem = await imagemDoQr(valor);
      const arquivo = new File([imagem], "qr-whatsapp-flow.png", { type: "image/png" });
      const texto =
        "Escaneie em até 2 minutos: WhatsApp do negócio → Dispositivos conectados → Conectar dispositivo.";
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: "QR Code do WhatsApp", text: texto });
      } else {
        // Sem compartilhar arquivos (computador): baixa a imagem para abrir em outra tela.
        const url = URL.createObjectURL(imagem);
        const link = document.createElement("a");
        link.href = url;
        link.download = arquivo.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        aviso.info("Imagem do QR Code baixada. Abra em outra tela e escaneie com o celular.");
      }
    } catch (e) {
      // Fechar a janela de compartilhar não é erro.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        aviso.erro("Não foi possível compartilhar o QR Code. Gere um novo e tente de novo.");
      }
    } finally {
      setCompartilhando(false);
    }
  }

  return (
    <FolhaPadrao
      aberto
      onAberto={(aberto) => {
        if (!aberto) aoFechar();
      }}
      titulo="Conectar WhatsApp"
      resumo={
        <p className="flex items-center gap-2 pt-1 text-[13px] text-mute" aria-live="polite">
          {modo === "qr" && expirado ? (
            <span className="text-brick">Código vencido. Gere um novo para continuar.</span>
          ) : (
            <>
              <IndicadorDeCarregamento tamanho={16} decorativo />
              Aguardando conexão · fecha ao conectar
            </>
          )}
        </p>
      }
      rodape={
        modo === "qr" && valor ? (
          <>
            {expirado ? null : (
              <Button
                type="button"
                variant="text"
                className="h-14 shrink-0 px-4"
                loading={compartilhando}
                onClick={() => void compartilhar()}
              >
                <Share2 aria-hidden />
                Compartilhar
              </Button>
            )}
            <AcaoDaFolha
              type="button"
              variant={expirado ? "primary" : "outline"}
              className="w-full flex-1"
              loading={gerando}
              onClick={aoGerarNovo}
            >
              Gerar novo código
            </AcaoDaFolha>
          </>
        ) : null
      }
    >
      <OpcoesConectadas
        rotulo="Forma de conectar"
        valor={modo}
        onChange={setModo}
        className="mt-3"
        opcoes={[
          { valor: "qr", texto: "QR Code", icone: <QrCode aria-hidden /> },
          { valor: "numero", texto: "Número", icone: <Smartphone aria-hidden /> },
        ]}
      />

      {modo === "numero" ? (
        <CartaoDaFolha className="mt-3 p-4">
          <CodigoPorTelefone
            tipo={tipo}
            aoGerar={aoGerarCodigoPorNumero}
            {...(gerarCodigo ? { gerarCodigo } : {})}
          />
        </CartaoDaFolha>
      ) : (
        <>
          <CartaoDaFolha className="mt-3 flex flex-col items-center gap-3 px-5 py-4">
            {valor ? (
              <div className="relative rounded-[20px] bg-qr-light p-1 ring-1 ring-line">
                <div
                  className={`transition-opacity duration-200 [@media(max-height:900px)]:[&_img]:size-52 max-[380px]:[&_img]:size-48 ${expirado ? "opacity-15" : "opacity-100"}`}
                  aria-hidden={expirado}
                >
                  <QrCodeReal
                    valor={valor}
                    alt="QR Code para conectar o WhatsApp do negócio"
                    corDosModulos="--qr-modulo"
                    repintarImagem
                  />
                </div>
                {expirado ? (
                  <div className="absolute inset-0 grid place-items-center px-6 text-center">
                    <p className="rounded-full bg-qr-light px-3 py-1 text-sm font-semibold text-[var(--qr-modulo)]">
                      Código vencido
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="flex items-center gap-2 py-16 text-sm text-mute">
                <IndicadorDeCarregamento tamanho={16} decorativo />
                Gerando QR Code…
              </p>
            )}

            {restante !== null ? (
              <div className="w-full max-w-[248px]" role="timer" aria-live="off">
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full w-full origin-left rounded-full transition-transform duration-1000 ease-linear motion-reduce:transition-none ${
                      acabando || expirado ? "bg-brick" : "bg-gold"
                    }`}
                    style={{ transform: `scaleX(${fracao})` }}
                  />
                </div>
                <p
                  className={`mt-2 text-center text-[13px] font-medium tabular-nums ${
                    acabando || expirado ? "text-brick" : "text-mute"
                  }`}
                >
                  {expirado ? "Vencido" : `Vence em ${formatarRestante(restante)}`}
                </p>
              </div>
            ) : null}
          </CartaoDaFolha>

          <CartaoDaFolha className="mt-3">
            <ol aria-label="Como conectar">
              {PASSOS.map((passo, i) => (
                <li key={passo} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--figaro-surface-container-high,var(--ink3))] text-[13px] font-bold tabular-nums text-paper"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="text-[14px] leading-5 text-paper">{passo}</span>
                </li>
              ))}
            </ol>
          </CartaoDaFolha>
        </>
      )}
    </FolhaPadrao>
  );
}
