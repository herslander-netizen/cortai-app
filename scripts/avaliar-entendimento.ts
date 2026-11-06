/**
 * Relatório do entendimento do motor do WhatsApp contra o corpus pt-BR (estudo de 05/11/2026).
 * Uso: bun scripts/avaliar-entendimento.ts > /tmp/entendimento.md
 */
import { avaliarCorpus } from "../src/lib/whatsapp/motor/corpus/avaliar";

const a = avaliarCorpus();
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const linhas: string[] = [];

linhas.push("# Entendimento do motor do WhatsApp — linha de base", "");
linhas.push(`- Frases do corpus: **${a.geral.total}**`);
linhas.push(
  `- Intenções que o motor já tem: **${a.suportadas.certos}/${a.suportadas.total}** (${pct(a.suportadas.taxa)})`,
);
linhas.push(
  `- Intenções que o motor ainda não tem: ${a.semSuporte.total} frases, ${a.semSuporte.disparos} com disparo indevido`,
);
linhas.push(`- Disparos indevidos no total: **${a.disparosIndevidos.length}**`);
linhas.push(
  `- Variações automáticas das frases já entendidas: ${a.variacoes.certos}/${a.variacoes.total} (${pct(a.variacoes.taxa)})`,
);
linhas.push(
  `- Entidades (data, período, serviço): ${a.entidades.certos}/${a.entidades.total} (${pct(a.entidades.taxa)})`,
  "",
);

linhas.push("## Por intenção", "", "| Intenção | Acertos | Taxa |", "|---|---|---|");
for (const [k, v] of Object.entries(a.porIntencao).sort((x, y) => x[1].taxa - y[1].taxa))
  linhas.push(`| ${k} | ${v.certos}/${v.total} | ${pct(v.taxa)} |`);

linhas.push("", "## Por estilo", "", "| Estilo | Acertos | Taxa |", "|---|---|---|");
for (const [k, v] of Object.entries(a.porEstilo).sort((x, y) => x[1].taxa - y[1].taxa))
  linhas.push(`| ${k} | ${v.certos}/${v.total} | ${pct(v.taxa)} |`);

linhas.push("", "## Disparos indevidos", "", "| Frase | Esperado | Motor |", "|---|---|---|");
for (const r of a.disparosIndevidos) linhas.push(`| ${r.texto} | ${r.intencao} | ${r.previsto} |`);

linhas.push("", "## Erros por intenção", "");
for (const [k, v] of Object.entries(a.porIntencao)) {
  if (!v.erros.length) continue;
  linhas.push(`- **${k}**: ${v.erros.map((e) => `"${e.texto}" → ${e.previsto}`).join("; ")}`);
}

linhas.push("", "## Variações que quebram", "");
for (const q of a.variacoes.quebras.slice(0, 80))
  linhas.push(`- "${q.variacao}" (de "${q.original}") → ${q.previsto}`);
if (a.variacoes.quebras.length > 80) linhas.push(`- … e mais ${a.variacoes.quebras.length - 80}`);

linhas.push("", "## Entidades com erro", "");
for (const e of a.entidades.erros) linhas.push(`- "${e.texto}": ${e.detalhe}`);

console.log(linhas.join("\n"));
