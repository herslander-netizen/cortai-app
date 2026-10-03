import { useServerFn } from "@tanstack/react-start";
import { FileText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { getComandaDoAgendamento } from "@/lib/comanda-ticket.functions";
import { FolhaDoTicket } from "./FolhaDoTicket";

/** Abre o ticket do agendamento (a comanda nasce com ele; antigos são completados no servidor). */
export function VerTicketDoAgendamento({
  agendamentoId,
  desabilitado = false,
  className = "min-h-12",
}: {
  agendamentoId: string;
  desabilitado?: boolean;
  className?: string;
}) {
  const buscar = useServerFn(getComandaDoAgendamento);
  const [comandaId, setComandaId] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);

  async function abrir() {
    if (abrindo) return;
    setAbrindo(true);
    try {
      const r = await buscar({ data: { agendamentoId } });
      if (r.comandaId) setComandaId(r.comandaId);
      else aviso.info("Esse agendamento já foi encerrado sem comanda.");
    } catch {
      aviso.erro("Não foi possível abrir a comanda. Tente de novo.");
    } finally {
      setAbrindo(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className={className}
        disabled={desabilitado || abrindo}
        onClick={() => void abrir()}
      >
        <FileText aria-hidden /> {abrindo ? "Abrindo…" : "Ver comanda"}
      </Button>
      <FolhaDoTicket comandaId={comandaId} onFechar={() => setComandaId(null)} />
    </>
  );
}
