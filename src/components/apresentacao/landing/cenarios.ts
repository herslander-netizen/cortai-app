import type { Cenario } from "@/components/entrada/historias/HistoriaWhatsapp";
import { CENARIO_PADRAO } from "@/components/entrada/historias/HistoriaWhatsapp";

/** Ramos de exemplo do bate-papo da página pública: homens e mulheres, vários tipos de negócio de serviços. */
export const CENARIOS_DA_PAGINA: readonly Cenario[] = [
  CENARIO_PADRAO,
  {
    negocio: "Barbearia Centro",
    servicos: ["Corte masculino", "Barba", "Corte + barba"],
    profissional: "Rafael Costa",
    cliente: "Bruno",
    valor: "R$ 70,00",
    horarios: ["10:00", "14:30", "16:00"],
  },
  {
    negocio: "Espaço Bem-Estar",
    servicos: ["Limpeza de pele", "Massagem relaxante", "Design de sobrancelha"],
    profissional: "Camila Rocha",
    cliente: "Marina",
    valor: "R$ 120,00",
    horarios: ["09:00", "11:30", "17:00"],
  },
];
