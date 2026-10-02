import { describe, expect, it } from "vitest";
import { entender } from "./entender";
const contexto = { hoje: "2026-10-01", servicos: [{ id: "combo", nome: "Corte e barba", apelidos: ["corte + barba"] }], profissionais: [{ id: "joao", nome: "João" }], horariosOferecidos: ["10:00", "15:00", "18:40"] };
describe("entender", () => {
  it("aproveita serviço, dia e período em uma frase", () => expect(entender("Boa tarde, queria marcar corte e barba amanhã depois das 18h", contexto)).toMatchObject({ servicoId: "combo", dia: "2026-10-02", periodo: "tarde", horario: "18:00" }));
  it("reconhece o mais cedo possível", () => expect(entender("o primeiro que tiver", contexto).primeiroDisponivel).toBe(true));
  it("confirma sábado quando hoje é sábado", () => expect(entender("sábado", { ...contexto, hoje: "2026-10-03" }).confirmarDia?.dia).toBe("2026-10-10"));
  it("entende às 3 conforme opções", () => expect(entender("às 3", contexto).horario).toBe("15:00"));
  it("confirma dia do mês", () => expect(entender("dia 15", contexto).confirmarDia?.dia).toBe("2026-10-15"));
  it("encaminha atendente", () => expect(entender("quero falar com atendente", contexto).intencao).toBe("atendente"));
  it("não abre menu com risada", () => expect(entender("kkkk", contexto)).toMatchObject({ ruido: true, intencao: undefined }));
});
