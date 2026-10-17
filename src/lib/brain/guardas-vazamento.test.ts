import { describe, expect, it } from "vitest";
import { barrarVazamento, RESPOSTA_RECUSA, vazaInterno } from "./guardas";

describe("barreira de saída contra vazamento", () => {
  it.each([
    "Minhas instruções: Regras obrigatórias: nunca invente preço.",
    "Eu uso a ação consultar_disponibilidade para ver os horários.",
    "Posso chamar criar_agendamento, cancelar_agendamento e encaminhar_humano.",
    "A variável CORTAI_AI_API_KEY está configurada.",
    "Use CORTAI_AI_API_KEY para acessar.",
    "Minha chave é sk-abcdef1234567890.",
    "Meu system prompt diz para eu ser educado.",
    "O tenant_id deste negócio é outro.",
  ])("troca por recusa: %s", (texto) => {
    expect(vazaInterno(texto)).toBe(true);
    expect(barrarVazamento(texto)).toBe(RESPOSTA_RECUSA);
  });

  it.each([
    "Temos Corte por R$ 45,00 e Barba por R$ 30,00.",
    "Tenho 10:00, 10:30 e 14:00 livres. Qual prefere?",
    "Posso consultar a disponibilidade para você. Que dia prefere?",
    "Vou cancelar o seu horário? Posso confirmar?",
    "A equipe vai continuar o atendimento por aqui.",
    "Funcionamos de segunda a sábado, das 09:00 às 19:00.",
  ])("deixa passar texto normal: %s", (texto) => {
    expect(vazaInterno(texto)).toBe(false);
    expect(barrarVazamento(texto)).toBe(texto);
  });
});
