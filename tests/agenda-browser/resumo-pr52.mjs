#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const dir = process.argv[2] ?? "test-results/pr52";
const files = fs.readdirSync(dir).filter((n) => /^amostra-.*\.json$/.test(n));
const data = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
function pct(nums, p) {
  const a = [...nums].sort((x, y) => x - y);
  return a.length ? Number(a[Math.max(0, Math.ceil(a.length * p) - 1)].toFixed(1)) : null;
}
const lines = [
  "# Comparação PR #52 vs base da PR (Chromium do GitHub Actions)",
  "",
  "Base fixa: commit 77c1ab23cb082dc23512fd6801004fafc4a6d109 (antes do PR #52).",
  "Candidato: PR #52, commit 915ade590f9daebe1ee733dd4bba805ff7b2e8a7 (somente o componente TSX foi alternado no runner).",
  "Medição: toque/pointerdown → commit React → callback do 1º e 2º requestAnimationFrame; proxies de responsividade, não tempo de pixel exibido.",
  "rAF: intervalos entre callbacks durante 360 ms da transição. Intervalos longos não equivalem diretamente a FPS em Android físico.",
  "Bancada com componentes reais AgendaTimeline, ListaAgenda e TrocaDeVisualizacao e dados inteiramente fictícios; sem autenticação, chamadas de rede, gestos reais e window.scrollTo do AgendaOperacional.",
  "",
  "| Resolução | Itens | Variante | Amostras | Commit P50/P95 (ms) | 1º rAF P50/P95 (ms) | 2º rAF P50/P95 (ms) | Intervalo rAF P95 (ms) | Quadros >50 ms |",
  "|---|---:|---|---:|---:|---:|---:|---:|---:|",
];
for (const viewport of ["mobile-360", "mobile-390", "desktop-1280"]) {
  for (const items of [40, 120]) {
    for (const variant of ["baseline", "pr52"]) {
      const cases = data.flatMap((d) =>
        d.variant === variant ? d.samples.filter((s) => s.viewport === viewport && s.items === items) : [],
      );
      const raw = cases.flatMap((c) => c.frames);
      if (!raw.length) throw Error("Faltam amostras " + viewport + " " + items + " " + variant);
      const vals = (k) => raw.map((x) => x[k]);
      const metrics = [pct(vals("commitMs"), .5), pct(vals("commitMs"), .95), pct(vals("frame1Ms"), .5), pct(vals("frame1Ms"), .95), pct(vals("frame2Ms"), .5), pct(vals("frame2Ms"), .95)];
      const rafIntervals = cases.map((c) => c.worstRafP95Ms);
      const slow = cases.reduce((t,c)=>t+c.framesOver50Ms,0);
      lines.push("| " + viewport + " | " + items + " | " + variant + " | " + raw.length +
        " | " + metrics[0] + "/" + metrics[1] +
        " | " + metrics[2] + "/" + metrics[3] +
        " | " + metrics[4] + "/" + metrics[5] +
        " | " + pct(rafIntervals,.95) +
        " | " + slow + " |");
    }
  }
}
lines.push("", "## Diferença do 2º rAF em P95 (candidato menos base)", "");
for (const viewport of ["mobile-360", "mobile-390", "desktop-1280"]) {
  for (const items of [40, 120]) {
    const dist = {};
    for (const variant of ["baseline", "pr52"]) {
      dist[variant] = data.filter((d) => d.variant === variant)
        .flatMap((d) => d.samples.filter((s) => s.viewport === viewport && s.items === items))
        .flatMap((s) => s.frames.map((f) => f.frame2Ms));
    }
    const b = pct(dist.baseline, .95), c = pct(dist.pr52, .95);
    const diff = Number((c-b).toFixed(1));
    const percent = Number(((c-b)/b*100).toFixed(1));
    lines.push("- " + viewport + ", " + items + " itens: base " + b + " ms → PR52 " + c + " ms; diferença " + diff + " ms (" + percent + "%).");
  }
}
const issues = data.flatMap((d) => d.issues);
lines.push("", "## Falhas de interface detectadas", "");
if (!issues.length) lines.push("Nenhuma na bancada.");
else lines.push(...issues.map((s) => "- " + s));
lines.push("",
  "Critério de interpretação: diferença pequena entre runs é ruído provável do runner.",
  "Sem medir o evento real no Android autenticado e sem executar alterarVisualizacao do AgendaOperacional, não atribuir o atraso a scrollTo, Motion, CSS ou busca de dados.",
  "Benchmark não significa que o PR pode ser mesclado. Testes visuais e de rolagem em aparelho real continuam necessários.",
);
const text = lines.join("\n") + "\n";
fs.writeFileSync(path.join(dir, "resumo.md"), text);
console.log("\n" + text);
if (issues.length) process.exitCode = 1;
