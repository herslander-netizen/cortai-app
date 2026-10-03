import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TicketComanda, SIMBOLO_CORTAI } from "@/components/comanda/TicketComanda";
import { desenharTicket } from "@/components/comanda/desenhar-ticket";
import type { DadosDoTicket } from "@/lib/comanda-ticket";
const t: DadosDoTicket = { id: "x", codigo: "01102026-0930-2000", negocio: { nome: "Nando Barber", logoUrl: null }, data: "01/10/2026", horario: "09:30", cliente: { nome: "Icaro", telefone: "5579991787208" }, servicos: [{ quantidade: 1, descricao: "Barba", totalCentavos: 2000 }], produtos: [{ quantidade: 1, descricao: "Pomada", totalCentavos: 2500 }], subtotalCentavos: 4500, descontoCentavos: 500, totalCentavos: 4000, forma: "pix", estado: "pago", pixChave: "x" };
export const Route = createFileRoute("/previa-ticket-temp")({ ssr: false, component: P });
function P() { const [u, setU] = useState(""); useEffect(() => { void desenharTicket(t, SIMBOLO_CORTAI).then((c) => setU(c.toDataURL())); }, []);
  return <div className="flex gap-6 bg-[var(--ticket-fundo)] p-6"><div className="w-[380px]"><TicketComanda ticket={t} onCopiarPix={() => {}} onCopiarCodigo={() => {}} /></div>{u ? <img id="png" src={u} className="w-[416px]" /> : null}</div>; }
