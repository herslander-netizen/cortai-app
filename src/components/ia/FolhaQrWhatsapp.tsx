import { QrCodeReal } from "@/components/ia/QrCodeReal";
import { IndicadorDeCarregamento } from "@/components/ui/IndicadorDeCarregamento";
import { AcaoDaFolha, CartaoDaFolha, FolhaPadrao } from "@/components/ui/folha-padrao";

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

/**
 * Gaveta de conexão do WhatsApp por QR Code, no modelo padrão (`FolhaPadrao`): código grande em fundo claro, tempo
 * restante em barra, passos numerados e uma ação só ("Gerar novo código"), que vira a principal quando o código vence.
 * Fecha sozinha quando o WhatsApp conecta (quem abre acompanha o estado).
 */
export function FolhaQrWhatsapp({
  valor,
  restante,
  aoFechar,
  aoGerarNovo,
  gerando,
}: {
  valor: string;
  restante: number | null;
  aoFechar: () => void;
  aoGerarNovo: () => void;
  gerando: boolean;
}) {
  const expirado = restante !== null && restante <= 0;
  const acabando = restante !== null && restante > 0 && restante <= 15;
  const fracao = restante === null ? 1 : Math.max(0, Math.min(1, restante / VALIDADE_DO_QR_S));

  return (
    <FolhaPadrao
      aberto
      onAberto={(aberto) => {
        if (!aberto) aoFechar();
      }}
      titulo="Conectar WhatsApp"
      descricao="Use o celular com o número do negócio."
      resumo={
        <p className="flex items-center gap-2 pt-1 text-[13px] text-mute" aria-live="polite">
          {expirado ? (
            <span className="text-brick">Código vencido. Gere um novo para continuar.</span>
          ) : (
            <>
              <IndicadorDeCarregamento tamanho={16} decorativo />
              Aguardando leitura · fecha ao conectar
            </>
          )}
        </p>
      }
      rodape={
        <AcaoDaFolha
          type="button"
          variant={expirado ? "primary" : "outline"}
          className="w-full"
          loading={gerando}
          onClick={aoGerarNovo}
        >
          Gerar novo código
        </AcaoDaFolha>
      }
    >
      <CartaoDaFolha className="mt-3 flex flex-col items-center gap-3 px-5 py-4">
        <div className="relative rounded-[20px] bg-qr-light p-1 ring-1 ring-line">
          <div
            className={`transition-opacity duration-200 max-[380px]:[&_img]:size-48 ${expirado ? "opacity-15" : "opacity-100"}`}
            aria-hidden={expirado}
          >
            <QrCodeReal
              valor={valor}
              alt="QR Code para conectar o WhatsApp do negócio"
              corDosModulos="--qr-modulo"
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
            <li key={passo} className="flex items-center gap-3 px-4 py-3">
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
    </FolhaPadrao>
  );
}
