/* eslint-disable @typescript-eslint/no-explicit-any -- imita o cliente encadeável do Supabase nos testes */
/**
 * Banco simulado em memória, só para testes: suporta o encadeamento que o cérebro usa
 * (select/eq/in/is/ilike/order/limit/maybeSingle/single, insert, update, delete).
 * Nada sai para a rede; cada teste monta as tabelas que quer.
 */
type Linha = Record<string, any>;
type Filtro = (l: Linha) => boolean;

function valor(l: Linha, coluna: string) {
  // Suporta o caminho JSON do PostgREST: "acao->>idDaMensagem" e "a->b->>c".
  const [raiz, ...resto] = coluna.split("->").map((p) => p.replace(/^>/, ""));
  let v: any = l[raiz!];
  for (const p of resto) v = v == null ? undefined : v[p];
  return v;
}

function padraoParaRegex(padrao: string) {
  const re = padrao
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/%/g, ".*")
    .replace(/_/g, ".");
  return new RegExp(`^${re}$`, "i");
}

export function criarBancoFalso(tabelas: Record<string, Linha[]>) {
  let contador = 0;
  const consultas: { tabela: string; filtros: [string, string, unknown][] }[] = [];

  function from(tabela: string) {
    const linhas = (tabelas[tabela] ??= []);
    const filtros: Filtro[] = [];
    const registro: [string, string, unknown][] = [];
    let modo: "select" | "update" | "delete" | "insert" = "select";
    let patch: Linha = {};
    let novo: Linha | null = null;
    let limite = Infinity;
    let contar = false;
    const ordem: [string, boolean][] = [];

    const executar = () => {
      consultas.push({ tabela, filtros: registro });
      if (modo === "insert") {
        const l = {
          id: `id-${++contador}`,
          criado_em: new Date(Date.now() + ++contador).toISOString(),
          ...novo,
        };
        linhas.push(l);
        return [l];
      }
      let alvo = linhas.filter((l) => filtros.every((f) => f(l)));
      if (modo === "update") {
        alvo.forEach((l) => Object.assign(l, patch));
        return alvo;
      }
      if (modo === "delete") {
        for (const l of alvo) linhas.splice(linhas.indexOf(l), 1);
        return alvo;
      }
      for (const [col, asc] of [...ordem].reverse())
        alvo = [...alvo].sort(
          (a, b) => (String(valor(a, col)) < String(valor(b, col)) ? -1 : 1) * (asc ? 1 : -1),
        );
      return alvo.slice(0, limite);
    };
    const comparar = (c: string, v: unknown, ok: (a: number, b: number) => boolean) => {
      registro.push(["cmp", c, v]);
      filtros.push((l) => {
        const a = Date.parse(String(valor(l, c)));
        const b = Date.parse(String(v));
        return Number.isFinite(a) && Number.isFinite(b) && ok(a, b);
      });
      return api;
    };

    const api: any = {
      select: (_colunas?: string, opcoes?: { count?: string }) => (
        (contar = opcoes?.count === "exact"),
        api
      ),
      gte: (c: string, v: unknown) => comparar(c, v, (a, b) => a >= b),
      gt: (c: string, v: unknown) => comparar(c, v, (a, b) => a > b),
      lte: (c: string, v: unknown) => comparar(c, v, (a, b) => a <= b),
      lt: (c: string, v: unknown) => comparar(c, v, (a, b) => a < b),
      insert: (l: Linha) => ((modo = "insert"), (novo = l), api),
      update: (p: Linha) => ((modo = "update"), (patch = p), api),
      delete: () => ((modo = "delete"), api),
      eq: (c: string, v: unknown) => (
        registro.push(["eq", c, v]),
        filtros.push((l) => valor(l, c) === v),
        api
      ),
      in: (c: string, v: unknown[]) => (
        registro.push(["in", c, v]),
        filtros.push((l) => v.includes(valor(l, c))),
        api
      ),
      is: (c: string, v: unknown) => (
        registro.push(["is", c, v]),
        filtros.push((l) => (valor(l, c) ?? null) === v),
        api
      ),
      ilike: (c: string, p: string) => (
        registro.push(["ilike", c, p]),
        filtros.push((l) => padraoParaRegex(p).test(String(valor(l, c) ?? ""))),
        api
      ),
      order: (c: string, o?: { ascending?: boolean }) => (
        ordem.push([c, o?.ascending !== false]),
        api
      ),
      limit: (n: number) => ((limite = n), api),
      maybeSingle: async () => ({ data: executar()[0] ?? null, error: null }),
      single: async () => {
        const r = executar()[0];
        return r ? { data: r, error: null } : { data: null, error: { message: "sem linha" } };
      },
      then: (ok: (v: any) => unknown, ko?: (e: unknown) => unknown) => {
        const linhasDoResultado = executar();
        return Promise.resolve({
          data: linhasDoResultado,
          error: null,
          count: contar ? linhasDoResultado.length : null,
        }).then(ok, ko);
      },
    };
    return api;
  }
  return { from, tabelas, consultas };
}
