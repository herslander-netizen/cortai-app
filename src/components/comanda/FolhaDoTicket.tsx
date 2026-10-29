import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { aviso } from "@/lib/avisos";
import { getTicketComanda } from "@/lib/comanda-ticket.functions";
import {
  numeroParaWhatsApp,
  textoDaComandaParaWhatsApp,
  type DadosDoTicket,
} from "@/lib/comanda-ticket";
import { brl } from "@/lib/format";
import { canvasParaJpg, desenharTicket } from "./desenhar-ticket";
import { LOGOTIPO_MARCA, SIMBOLO_MARCA, TicketComanda } from "./TicketComanda";

/** Copia a comanda como imagem (o navegador só copia PNG) para colar na conversa; falhar não atrapalha o envio. */
function copiarImagem(desenho: Promise<HTMLCanvasElement>) {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return;
    const png = desenho.then(
      (c) =>
        new Promise<Blob>((ok, falha) =>
          c.toBlob((b) => (b ? ok(b) : falha(new Error("sem imagem"))), "image/png"),
        ),
    );
    void navigator.clipboard.write([new ClipboardItem({ "image/png": png })]).catch(() => {});
  } catch {
    // Área de transferência indisponível: a imagem segue baixada.
  }
}

export function IconeWhatsApp({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

async function copiar(texto: string, ok: string) {
  try {
    await navigator.clipboard.writeText(texto);
    aviso.ok(ok);
  } catch {
    aviso.erro("Não foi possível copiar. Tente de novo.");
  }
}

/** Ações da comanda: mesma imagem do ticket (JPG) para WhatsApp e download. */
export function useAcoesDoTicket(ticket: DadosDoTicket | undefined) {
  const [gerando, setGerando] = useState<"conversa" | "compartilhar" | "baixar" | null>(null);
  const numero = ticket ? numeroParaWhatsApp(ticket.cliente.telefone) : null;
  function baixarArquivo(f: File) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function abrirWhatsApp(destino: string, texto: string) {
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  }
  async function executar(tipo: "conversa" | "compartilhar" | "baixar") {
    if (!ticket || gerando) return;
    // Começa antes de qualquer espera: copiar para a área de transferência precisa do toque ainda "fresco".
    const desenho = desenharTicket(ticket, SIMBOLO_MARCA, LOGOTIPO_MARCA);
    const conversa = tipo === "conversa" && numero ? numero : null;
    if (conversa) copiarImagem(desenho);
    setGerando(tipo);
    try {
      const f = await canvasParaJpg(await desenho, `comanda-${ticket.codigo}.jpg`);
      if (!f) throw new Error();
      if (conversa) {
        // Conversa do cliente: baixa e copia o JPG e abre a conversa com o texto da comanda. O WhatsApp
        // não aceita anexo pelo link, então a imagem entra pelo 📎 › Galeria ou colando.
        baixarArquivo(f);
        aviso.info(
          "Comanda baixada e copiada. Na conversa, toque em 📎 › Galeria ou cole a imagem.",
        );
        abrirWhatsApp(conversa, textoDaComandaParaWhatsApp(ticket, brl(ticket.totalCentavos)));
      } else if (tipo !== "baixar" && navigator.canShare?.({ files: [f] })) {
        // Compartilhar do celular: a imagem segue pronta; o app e o contato são escolhidos ali.
        try {
          await navigator.share({
            files: [f],
            text: `Comanda #${ticket.codigo}`,
            title: `Comanda #${ticket.codigo}`,
          });
        } catch (e) {
          if ((e as Error)?.name !== "AbortError") throw e;
        }
      } else {
        baixarArquivo(f);
        if (tipo === "baixar") aviso.ok("Imagem da comanda baixada.");
        else {
          aviso.info("Imagem baixada. Anexe no WhatsApp para enviar.");
          abrirWhatsApp("", `Comanda #${ticket.codigo}`);
        }
      }
    } catch {
      aviso.erro("Não foi possível gerar a imagem. Tente de novo.");
    } finally {
      setGerando(null);
    }
  }
  return {
    gerando,
    /** Há telefone válido do cliente para abrir a conversa dele. */
    temConversa: Boolean(numero),
    abrirConversa: () => void executar("conversa"),
    compartilhar: () => void executar("compartilhar"),
    /** Tela do cliente: compartilhar a própria comanda. */
    enviarWhatsApp: () => void executar("compartilhar"),
    baixar: () => void executar("baixar"),
    copiarPix: () => ticket?.pixChave && void copiar(ticket.pixChave, "Chave Pix copiada"),
  };
}

/** Conteúdo do ticket (sem moldura): usado como etapa dentro da superfície atual. */
export function ConteudoDoTicket({ comandaId }: { comandaId: string }) {
  const buscar = useServerFn(getTicketComanda);
  const q = useQuery({
    queryKey: ["ticket-comanda", comandaId],
    queryFn: () => buscar({ data: { comandaId } }),
    staleTime: 30_000,
  });
  const acoes = useAcoesDoTicket(q.data);
  return (
    <>
      {q.isLoading ? (
        <div className="papel-ticket mx-auto h-[560px] w-full max-w-[360px] animate-pulse opacity-60" />
      ) : null}
      {q.isError ? (
        <p className="py-10 text-center text-sm text-[var(--ticket-papel)]">
          Não foi possível abrir a comanda. Verifique a internet e tente de novo.
        </p>
      ) : null}
      {q.data ? (
        <>
          <TicketComanda ticket={q.data} onCopiarPix={acoes.copiarPix} />
          <div className="mx-auto mt-6 grid w-full max-w-[360px] gap-2">
            {acoes.temConversa ? (
              <Button
                size="lg"
                className="h-14 rounded-full"
                onClick={acoes.abrirConversa}
                disabled={Boolean(acoes.gerando)}
              >
                <IconeWhatsApp />
                {acoes.gerando === "conversa" ? "Gerando imagem…" : "Abrir conversa no WhatsApp"}
              </Button>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="h-12 rounded-full"
                onClick={acoes.compartilhar}
                disabled={Boolean(acoes.gerando)}
              >
                <Share2 aria-hidden />
                {acoes.gerando === "compartilhar" ? "Gerando…" : "Compartilhar"}
              </Button>
              <Button
                variant="secondary"
                className="h-12 rounded-full"
                onClick={acoes.baixar}
                disabled={Boolean(acoes.gerando)}
              >
                <Download aria-hidden />
                {acoes.gerando === "baixar" ? "Gerando…" : "Baixar imagem"}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

/** Folha do ticket: só para abrir a partir de uma tela sem outra superfície aberta. */
export function FolhaDoTicket({
  comandaId,
  onFechar,
}: {
  comandaId: string | null;
  onFechar: () => void;
}) {
  return (
    <Sheet open={Boolean(comandaId)} onOpenChange={(v) => !v && onFechar()}>
      <SheetContent
        side="bottom"
        className="max-h-[94dvh] overflow-y-auto rounded-t-[var(--raio-folha)] border-0 bg-[var(--ticket-fundo)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Comanda</SheetTitle>
          <SheetDescription>Detalhes da comanda, com envio pelo WhatsApp.</SheetDescription>
        </SheetHeader>
        {comandaId ? <ConteudoDoTicket comandaId={comandaId} /> : null}
      </SheetContent>
    </Sheet>
  );
}
