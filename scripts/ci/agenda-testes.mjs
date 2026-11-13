#!/usr/bin/env node
/**
 * Suite automatizada por domínio. Descobre TODOS os arquivos de teste já
 * existentes que atendem aos critérios do grupo, sem manter lista manual que
 * envelhece. Não representa cobertura de 100% das funções do produto.
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const group = process.argv[2];
const groups = {
  operacao: (p) =>
    p.startsWith("src/components/barbeiro/agenda/") ||
    p.startsWith("src/components/barbeiro/agendamento-manual/"),
  regras: (p) =>
    p.startsWith("src/lib/") &&
    /(agenda|agendamento|calendario|horario|remarc|disponibilidad|recorrencia|sugestao|bloqueio|foco)/i.test(p),
  clientes: (p) =>
    p.startsWith("src/components/agendamento/") ||
    p.startsWith("src/components/onboarding/EditorDeHorarios.") ||
    p.startsWith("src/hooks/useHistoricoAgendamento.") ||
    p.startsWith("src/components/ui/seletor-de-horario.") ||
    p.startsWith("src/components/marca/modelos/SiteCompleto.agendamento.") ||
    p.startsWith("src/lib/pagina-config.agendamento."),
  atendimento: (p) =>
    (p.startsWith("src/lib/") && /(fila-|fila\.|lista-espera|atendimento|comanda|whatsapp|pagamento|mensagem-pos-agendamento)/i.test(p)) ||
    p.startsWith("src/components/comanda/") ||
    p.startsWith("src/components/financeiro/"),
  desempenho: (p) =>
    /(?:desempenho|memo-timeline|lista-periodo-renderizacao|troca-visualizacao|timeline-rolagem|rolagem|gesto-dia|bloqueio-rolagem|atualizacao-ao-voltar)/i.test(p) &&
    (p.includes("agenda") || p.includes("disponibilidade")),
};
if (!Object.hasOwn(groups, group)) {
  console.error("Informe grupo válido:", Object.keys(groups).join(", "));
  process.exit(2);
}

function walk(base, files = []) {
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const p = path.posix.join(base, entry.name);
    if (entry.isDirectory()) walk(p, files);
    else if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(p)) files.push(p);
  }
  return files;
}
const all = walk("src").sort();
const selected = all.filter(groups[group]);
if (!selected.length) {
  console.error("FALHA: suíte vazia", group);
  process.exit(1);
}
const minimum = { operacao: 40, regras: 10, clientes: 6, atendimento: 12, desempenho: 8 }[group];
if (selected.length < minimum) {
  console.error(`FALHA: ${group} tinha ${selected.length} arquivos, abaixo do mínimo ${minimum}`);
  process.exit(1);
}
console.log(`Grupo ${group}: ${selected.length} arquivos Vitest de ${all.length} no projeto`);
for (const file of selected) console.log(` - ${file}`);
const result = spawnSync("bunx", ["vitest", "run", ...selected], {
  stdio: "inherit",
  env: { ...process.env, CI: "true" },
});
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
