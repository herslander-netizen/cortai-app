import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, PackagePlus, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { getProdutos, registrarVendaProduto, salvarProduto } from "@/lib/gestao.functions";

export const Route = createFileRoute("/barbeiro/produtos")({
  head: () => ({ meta: [
    { title: "Produtos — Cortaí Gestão" },
    { name: "description", content: "Catálogo, estoque e vendas de produtos da barbearia." },
    { property: "og:title", content: "Produtos — Cortaí Gestão" },
    { property: "og:description", content: "Controle de produtos e estoque." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const salvar = useServerFn(salvarProduto);
  const vender = useServerFn(registrarVendaProduto);
  const query = useQuery({ queryKey: ["produtos"], queryFn: () => getProdutos(), retry: false });
  const [novo, setNovo] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", foto_url: null as string | null, categoria: "Finalização", custo_centavos: 0, preco_centavos: 0, quantidade: 0, estoque_minimo: 3, ativo: true });
  return <Screen title="Produtos" subtitle="Catálogo, vendas e estoque.">
    <Button variant="outline" className="w-full" onClick={() => setNovo((value) => !value)}><PackagePlus /> Novo produto</Button>
    {novo ? <form className="mt-5 space-y-3 rounded-xl border border-line bg-ink2 p-4" onSubmit={async (event) => { event.preventDefault(); await salvar({ data: form }); setNovo(false); setForm({ nome: "", foto_url: null, categoria: "Finalização", custo_centavos: 0, preco_centavos: 0, quantidade: 0, estoque_minimo: 3, ativo: true }); await query.refetch(); setStatus("Produto salvo."); }}>
      <input required placeholder="Nome do produto" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input-premium" />
      <input placeholder="URL da foto" value={form.foto_url ?? ""} onChange={(e) => setForm({ ...form, foto_url: e.target.value || null })} className="input-premium" />
      <input required placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input-premium" />
      <div className="grid grid-cols-2 gap-3"><label className="text-xs text-mute">Custo<input type="number" min="0" step="0.01" className="input-premium" onChange={(e) => setForm({ ...form, custo_centavos: Math.round(Number(e.target.value) * 100) })} /></label><label className="text-xs text-mute">Preço<input type="number" min="0" step="0.01" className="input-premium" onChange={(e) => setForm({ ...form, preco_centavos: Math.round(Number(e.target.value) * 100) })} /></label></div>
      <div className="grid grid-cols-2 gap-3"><label className="text-xs text-mute">Quantidade<input type="number" min="0" className="input-premium" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} /></label><label className="text-xs text-mute">Estoque mínimo<input type="number" min="0" className="input-premium" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: Number(e.target.value) })} /></label></div>
      <Button className="h-11 w-full font-bold">Salvar produto</Button>
    </form> : null}
    {status ? <p className="mt-4 text-sm text-sage">{status}</p> : null}
    {query.isError ? <p className="mt-5 text-sm text-mute">Entre com uma conta vinculada para gerenciar produtos.</p> : null}
    {query.data?.produtos.length === 0 ? <div className="mt-5"><EmptyState text="Nenhum produto cadastrado." /></div> : null}
    <ul className="mt-5">{query.data?.produtos.map((produto) => {
      const baixo = produto.quantidade <= produto.estoque_minimo;
      return <li key={produto.id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-4">
        {produto.foto_url ? <img src={produto.foto_url} alt={produto.nome} loading="lazy" className="h-12 w-12 rounded-lg object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink2 text-mute"><ShoppingBag size={18} /></span>}
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-paper">{produto.nome}</p><p className="mt-0.5 text-xs text-mute">{produto.categoria} · {brl(produto.preco_centavos)}</p><p className={`mt-1 flex items-center gap-1 text-xs ${baixo ? "text-brick" : "text-mute2"}`}>{baixo ? <AlertTriangle size={12} /> : null}{produto.quantidade} em estoque</p></div>
        <Button size="sm" variant="outline" disabled={produto.quantidade < 1} onClick={async () => { await vender({ data: { produtoId: produto.id, quantidade: 1, formaPagamento: "balcao" } }); setStatus(`${produto.nome}: venda registrada.`); await query.refetch(); }}>Vender</Button>
      </li>;
    })}</ul>
  </Screen>;
}