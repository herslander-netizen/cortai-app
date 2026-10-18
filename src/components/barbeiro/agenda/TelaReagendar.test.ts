import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tela = readFileSync("src/components/barbeiro/agenda/TelaReagendar.tsx", "utf8");
const ficha = readFileSync("src/components/barbeiro/agenda/PainelAtendimento.tsx", "utf8");
const servidor = readFileSync("src/lib/barbeiro.functions.ts", "utf8");
const motorWhatsapp = readFileSync("src/lib/whatsapp/notificacoes.server.ts", "utf8");

describe("ficha e Reagendar como no Figaro", () => {
  it("a ficha tem o rodapé Reagendar com a seta das outras ações", () => {
    expect(ficha).toContain("agenda-ficha-reagendar");
    expect(ficha).toContain('aria-label={maisAcoes ? "Fechar outras ações" : "Outras ações"}');
    expect(ficha).toContain("Cancelar agendamento");
    expect(ficha).toContain("Marcar falta");
    expect(ficha).toContain("<TelaReagendar");
  });

  it("a ficha mantém as ações do atendimento", () => {
    for (const texto of ["Cliente chegou", "Começar", "Finalizar e cobrar", "Notas", "Cobrar"])
      expect(ficha).toContain(texto);
  });

  it("Reagendar tem calendário, disponibilidade, manual e Salvar flutuante", () => {
    expect(tela).toContain("Por disponibilidade");
    expect(tela).toContain('"Manual"');
    expect(tela).toContain("agenda-reagendar-salvar");
    expect(tela).toContain("getHorariosParaRemarcar");
    expect(tela).toContain("disabled={d < hoje}");
  });

  it("a leitura de horários usa o motor único e não grava nada", () => {
    const fn = servidor.slice(servidor.indexOf("export const getHorariosParaRemarcar"));
    const corpo = fn.slice(0, fn.indexOf("export type ProfissionalParaRemarcar"));
    expect(corpo).toContain("horariosDisponiveis(");
    expect(corpo).toContain('exigirPermissao(context, tenant.id, "agendamento_manual")');
    expect(corpo).toContain('.neq("id", atual.id)');
    expect(corpo).not.toMatch(/\.(update|insert|delete)\(/);
  });

  it("a equipe do Reagendar mostra foto e expediente e não grava nada", () => {
    const fn = servidor.slice(servidor.indexOf("export const getEquipeParaRemarcar"));
    const corpo = fn.slice(0, fn.indexOf("export const trocarClienteDoAgendamento"));
    expect(corpo).toContain("expedienteDoProfissional(");
    expect(corpo).toContain('exigirPermissao(context, tenant.id, "agendamento_manual")');
    expect(corpo).not.toMatch(/\.(update|insert|delete)\(/);
    expect(tela).toContain("getEquipeParaRemarcar");
    expect(tela).toContain("<FotoDoProfissional");
  });

  it("Trocar Cliente confere negócio, estado, pagamento, comanda e choque, e audita", () => {
    const fn = servidor.slice(servidor.indexOf("export const trocarClienteDoAgendamento"));
    const corpo = fn.slice(0, fn.indexOf("export const getContagemDoMes"));
    expect(corpo).toContain('exigirPermissao(context, tenant.id, "agendamento_manual")');
    expect(corpo).toContain('.eq("tenant_id", tenant.id)');
    expect(corpo).toContain('.is("arquivado_em", null)');
    expect(corpo).toContain("pagamento_confirmado_em");
    expect(corpo).toContain('.from("comandas")');
    expect(corpo).toContain('.eq("cliente_id", cliente.id)');
    expect(corpo).toContain("auditoria_da_barbearia");
    expect(corpo).not.toMatch(/\.delete\(/);
    expect(corpo).toContain('notificarAgendamento(atual.id, "confirmacao_agendamento")');
    expect(corpo).toContain("data.avisarCliente !== false");
    // Os botões do cliente anterior deixam de valer para este horário.
    expect(corpo).toContain('.from("envios_de_whatsapp")');
    expect(corpo).toContain('.eq("cliente_id", atual.cliente_id)');
    expect(ficha).toContain("Trocar Cliente");
    expect(ficha).toContain("<TrocarCliente");
  });

  it("a trava de repetição do WhatsApp é por cliente (o novo cliente recebe a própria versão)", () => {
    expect(motorWhatsapp).toContain("e.cliente_id === ag.cliente_id");
    expect(motorWhatsapp).toContain("`cliente:${ag.cliente_id}`");
    expect(motorWhatsapp).toContain("...(versaoDoEnvio ? { versao: versaoDoEnvio } : {})");
  });
});
