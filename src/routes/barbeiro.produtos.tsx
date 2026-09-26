import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, PackagePlus, ShoppingBag, Store } from "lucide-react";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { brl } from "@/lib/format";
import { useAcao } from "@/hooks/useAcao";
import { definirLojaAtiva, getProdutos, registrarVendaProduto, salvarProduto } from "@/lib/gestao.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";


export const Route = createFileRoute("/barbeiro/produtos")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "produtos_estoque"),
  head: () => ({ meta: [
    { title: "Produtos e loja — Cortaí Gestão" },
    { name: "description", content: "Estoque interno, produtos à venda e loja online da barbearia." },
    { property: "og:title", content: "Produtos e loja — Cortaí Gestão" },
    { property: "og:description", content: "Controle de produtos, estoque e loja." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: ProdutosPage,
});

type Form = {
  nome: string;
  foto_url: string | null;
  categoria: string;
  custo_centavos: number;
  preco_centavos: number;
  quantidade: number;
  estoque_minimo: number;
  ativo: boolean;
  controla_estoque: boolean;
  disponivel_venda: boolean;
};

const FORM_VAZIO: Form = {
  nome: "", foto_url: null, categoria: "Finalização", custo_centavos: 0, preco_centavos: 0,
  quantidade: 0, estoque_minimo: 3, ativo: true, controla_estoque: true, disponivel_venda: false,
};

function Escolha({ titulo, descricao, ativo, onChange }: { titulo: string; descricao: string; ativo: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4 transition-colors ${ativo ? "border-gold/60 bg-gold/5" : "border-line bg-ink"}`}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-paper">{titulo}</span>
        <span className="mt-1 block text-xs leading-relaxed text-mute">{descricao}</span>
      </span>
      <Switch checked={ativo} onCheckedChange={onChange} aria-label={titulo} />
    </label>
  );
}

function ProdutosPage() {
  const salvar = useServerFn(salvarProduto);
  const vender = useServerFn(registrarVendaProduto);
  const alternarLoja = useServerFn(definirLojaAtiva);
  const query = useQuery({ queryKey: ["produtos"], queryFn: () => getProdutos(), retry: false });
  const acao = useAcao();
  const [novo, setNovo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const NUMEROS_VAZIOS = { custo: "", preco: "", quantidade: "0", estoque_minimo: "3" };
  const [numeros, setNumeros] = useState(NUMEROS_VAZIOS);

  const loja = query.data?.loja;

  return <Screen voltarPara="/barbeiro/mais" title="Produtos e loja" subtitle="O que você guarda no estoque e o que vende para o cliente.">
    {query.isError ? <p className="text-sm text-mute">{(query.error as Error).message}</p> : null}

    {loja ? (
      <section className="surface-card p-4 md:max-w-3xl md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-paper"><Store size={15} className="text-gold" />Loja online</p>
            <p className="mt-1 text-xs leading-relaxed text-mute">Quando ativada, os produtos marcados como disponíveis para venda aparecem para seus clientes.</p>
          </div>
          <Switch
            checked={loja.ativa}
            disabled={!loja.liberada || acao.ocupado}
            aria-label="Loja online"
            onCheckedChange={(valor) =>
              acao.executar("loja", () => alternarLoja({ data: { ativa: valor } }), {
                sucesso: valor ? "Loja ativada." : "Loja desativada. Nenhum produto foi apagado.",
                aoConcluir: async () => { await query.refetch(); },
              })
            }
          />

        </div>
        {!loja.liberada ? (
          <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-mute2">A loja online não está incluída no seu plano atual. Fale com o Cortaí para liberar.</p>
        ) : null}
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
          <div><dt className="text-xs uppercase text-mute2">Situação</dt><dd className={`mt-1 text-sm font-semibold ${loja.ativa ? "text-sage" : "text-mute"}`}>{loja.ativa ? "Ativa" : "Desativada"}</dd></div>
          <div><dt className="text-xs uppercase text-mute2">À venda</dt><dd className="mt-1 text-sm font-semibold text-paper">{loja.aVenda}</dd></div>
          <div><dt className="text-xs uppercase text-mute2">Estoque baixo</dt><dd className={`mt-1 text-sm font-semibold ${loja.estoqueBaixo ? "text-brick" : "text-paper"}`}>{loja.estoqueBaixo}</dd></div>
        </dl>
      </section>
    ) : null}

    <Button data-guia="produtos-novo" variant="outline" className="mt-5 w-full" onClick={() => setNovo((value) => !value)}><PackagePlus /> Novo produto</Button>

    {novo ? <form className="surface-card mt-5 space-y-3 p-4 md:max-w-3xl md:p-5" onSubmit={(event) => {
      event.preventDefault();
      setErro(null);
      const numero = (valor: string) => (valor.trim() === "" || !Number.isFinite(Number(valor)) ? null : Number(valor));
      const quantidade = numero(numeros.quantidade);
      const estoqueMinimo = numero(numeros.estoque_minimo);
      if (quantidade === null) { setErro("Informe a quantidade em estoque."); return; }
      if (estoqueMinimo === null) { setErro("Informe o estoque mínimo."); return; }
      const custo = numero(numeros.custo);
      const preco = numero(numeros.preco);
      if (form.disponivel_venda && preco === null) { setErro("Informe o preço de venda do produto."); return; }
      void acao.executar(
        "novo-produto",
        () => salvar({ data: { ...form, custo_centavos: Math.round((custo ?? 0) * 100), preco_centavos: Math.round((preco ?? 0) * 100), quantidade, estoque_minimo: estoqueMinimo } }),
        {
          sucesso: "Produto salvo.",
          aoConcluir: async () => {
            setNovo(false);
            setForm(FORM_VAZIO);
            setNumeros(NUMEROS_VAZIOS);
            await query.refetch();
          },
        },
      );
    }}>

      <input required placeholder="Nome do produto" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input-premium" />
      <input placeholder="URL da foto" value={form.foto_url ?? ""} onChange={(e) => setForm({ ...form, foto_url: e.target.value || null })} className="input-premium" />
      <input required placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input-premium" />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-mute">Custo<input type="number" min="0" step="0.01" inputMode="decimal" className="input-premium" value={numeros.custo} onChange={(e) => setNumeros({ ...numeros, custo: e.target.value })} /></label>
        <label className="text-xs text-mute">Preço<input type="number" min="0" step="0.01" inputMode="decimal" className="input-premium" value={numeros.preco} onChange={(e) => setNumeros({ ...numeros, preco: e.target.value })} /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-mute">Quantidade<input type="number" min="0" inputMode="numeric" className="input-premium" value={numeros.quantidade} onChange={(e) => setNumeros({ ...numeros, quantidade: e.target.value })} /></label>
        <label className="text-xs text-mute">Estoque mínimo<input type="number" min="0" inputMode="numeric" className="input-premium" value={numeros.estoque_minimo} onChange={(e) => setNumeros({ ...numeros, estoque_minimo: e.target.value })} /></label>
      </div>

      <div className="space-y-2 pt-1">
        <Escolha titulo="Uso interno / somente estoque" descricao="Você controla a quantidade aqui dentro. O cliente não vê este produto." ativo={form.controla_estoque} onChange={(v) => setForm({ ...form, controla_estoque: v })} />
        <Escolha titulo="Disponível para venda" descricao="Aparece na loja para o cliente quando a loja online estiver ativada e houver preço." ativo={form.disponivel_venda} onChange={(v) => setForm({ ...form, disponivel_venda: v })} />
      </div>
      <Button className="h-11 w-full font-bold" disabled={acao.ocupado}>{acao.estaEm("novo-produto") ? "Salvando…" : "Salvar produto"}</Button>
    </form> : null}

    {erro ? <p className="mt-4 text-sm text-brick" role="alert">{erro}</p> : null}

    {query.data?.produtos.length === 0 ? <div className="mt-5"><EmptyState text="Nenhum produto cadastrado." /></div> : null}

    <ul data-guia="produtos-lista" className="mt-5">{query.data?.produtos.map((produto: any) => {
      const baixo = produto.controla_estoque && produto.quantidade <= produto.estoque_minimo;
      return <li key={produto.id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-4">
        {produto.foto_url ? <img src={produto.foto_url} alt={produto.nome} loading="lazy" className="h-12 w-12 rounded-lg object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink2 text-mute"><ShoppingBag size={18} /></span>}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-paper">{produto.nome}</p>
          <p className="mt-0.5 text-xs text-mute">{produto.categoria} · {brl(produto.preco_centavos)}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {produto.controla_estoque ? <span className="rounded border border-line2 px-1.5 py-0.5 text-xs uppercase text-mute">Estoque</span> : null}
            {produto.disponivel_venda && produto.preco_centavos > 0 ? <span className="rounded border border-gold/50 px-1.5 py-0.5 text-xs uppercase text-gold">À venda</span> : null}
            <span className={`text-xs ${baixo ? "text-brick" : "text-mute2"}`}>{baixo ? <AlertTriangle size={11} className="mr-1 inline" /> : null}{produto.quantidade} em estoque</span>
          </p>
        </div>
        <div className="grid gap-1.5">
          <Button
            data-guia="produtos-venda"
            size="sm"
            variant="outline"
            disabled={produto.quantidade < 1 || acao.ocupado}
            onClick={() =>
              acao.executar(`vender-${produto.id}`, () => vender({ data: { produtoId: produto.id, quantidade: 1, formaPagamento: "balcao" } }), {
                sucesso: `${produto.nome}: venda registrada.`,
                aoConcluir: async () => { await query.refetch(); },
              })
            }
          >
            {acao.estaEm(`vender-${produto.id}`) ? "Registrando…" : "Vender"}
          </Button>
          <Button size="sm" variant="ghost" className="text-xs" disabled={acao.ocupado} onClick={() =>
            acao.executar(
              `loja-${produto.id}`,
              () => salvar({ data: {
                id: produto.id, nome: produto.nome, foto_url: produto.foto_url, categoria: produto.categoria,
                custo_centavos: produto.custo_centavos, preco_centavos: produto.preco_centavos,
                quantidade: produto.quantidade, estoque_minimo: produto.estoque_minimo, ativo: produto.ativo,
                controla_estoque: produto.controla_estoque, disponivel_venda: !produto.disponivel_venda,
              } }),
              {
                sucesso: produto.disponivel_venda ? `${produto.nome} saiu da loja.` : `${produto.nome} entrou na loja.`,
                aoConcluir: async () => { await query.refetch(); },
              },
            )
          }>{acao.estaEm(`loja-${produto.id}`) ? "Atualizando…" : produto.disponivel_venda ? "Tirar da loja" : "Pôr à venda"}</Button>
        </div>

      </li>;
    })}</ul>
  </Screen>;
}
