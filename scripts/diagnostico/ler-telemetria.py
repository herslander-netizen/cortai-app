"""Remonta a telemetria temporária da prévia (src/lib/diagnostico/telemetria.ts).

Como usar: exporte as mensagens do registro do Supabase da prévia (projeto cortai-preview, fonte edge_logs,
filtro event_message like '%diag_cortai_tela%', ordem por timestamp) para um arquivo de texto, uma por linha,
e rode: python3 scripts/diagnostico/ler-telemetria.py arquivo.txt
Também lê o mock.log do ensaio local ("GET /rest/v1/diag_cortai_tela?...").
"""
import sys, re, json, collections, urllib.parse
lotes = collections.defaultdict(dict)
for linha in open(sys.argv[1], encoding="utf-8", errors="replace"):
    m = re.search(r"diag_cortai_tela\?([^\s|]+)", linha)
    if not m or linha.startswith("OPTIONS"):
        continue
    bruto = dict(par.split("=", 1) for par in m.group(1).split("&") if "=" in par)
    s, n, p, d = bruto.get("s", "?"), int(bruto.get("n", "0")), bruto.get("p", "1of1"), bruto.get("d", "")
    i, total = (int(x) for x in p.split("of"))
    lotes[(s, n)][i] = (total, d)
for (s, n), partes in sorted(lotes.items(), key=lambda kv: (kv[0][0], kv[0][1])):
    total = max(t for t, _ in partes.values())
    if len(partes) < total:
        print(f"[{s} lote {n}] incompleto {len(partes)}/{total}")
        continue
    texto = urllib.parse.unquote_plus("".join(partes[i][1] for i in range(1, total + 1)))
    try:
        for e in json.loads(texto):
            t = e.pop("t"); k = e.pop("k")
            print(f"{s} {t:>6} {k:<14} " + " ".join(f"{a}={b}" for a, b in e.items()))
    except Exception as erro:
        print(f"[{s} lote {n}] não decodificou: {erro}: {texto[:120]}")
