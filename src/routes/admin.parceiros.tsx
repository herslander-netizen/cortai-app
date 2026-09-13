import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { listarParceirosAdmin, removerParceiro, salvarParceiro, type Parceiro } from "@/lib/parceiros.functions";

export const Route = createFileRoute("/admin/parceiros")({
  head: () => ({
    meta: [
      { title: "Parceiros — Cortaí" },
      { name: "description", content: "Cadastre os parceiros exibidos na faixa da página inicial do Cortaí." },
      { property: "og:title", content: "Parceiros — Cortaí" },
      { property: "og:description", content: "Gestão da faixa de parceiros da página inicial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParceirosAdmin,
});

const VAZIO = { nome: "", logo_url: "", link: "", ordem: 0, ativo: true };

function ParceirosAdmin() {
  const consulta = useQuery({ queryKey: ["parceiros-admin"], queryFn: () => listarParceirosAdmin(), retry: false });
  const salvar = useServerFn(salvarParceiro);
  const remover = useServerFn(removerParceiro);
  const [form, setForm] = useState<typeof VAZIO & { id?: string }>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  const parceiros = (consulta.data ?? []) as Parceiro[];

  return (
    <main className="px-5 pb-28 pt-8 md:pb-10">
      <h1 className="text-xl font-bold text-paper">Parceiros</h1>
      <p className="mt-1 text-sm text-mute">
        Aparecem numa faixa discreta na página inicial. Sem parceiros ativos, a faixa some sozinha.
      </p>

      <form
        className="mt-6 space-y-3 rounded-xl border border-line bg-ink2 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setErro(null);
          try {
            await salvar({
              data: {
                ...(form.id ? { id: form.id } : {}),
                nome: form.nome,
                logo_url: form.logo_url || null,
                link: form.link || null,
                ordem: Number(form.ordem) || 0,
                ativo: form.ativo,
              },
            });
            setForm(VAZIO);
            await consulta.refetch();
          } catch (e) {
            setErro((e as Error).message);
          }
        }}
      >
        <p className="text-sm font-semibold text-paper">{form.id ? "Editar parceiro" : "Novo parceiro"}</p>
        <label className="block text-xs text-mute">
          Nome
          <input
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper"
          />
        </label>
        <label className="block text-xs text-mute">
          Logo (link da imagem)
          <input
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper"
          />
        </label>
        <label className="block text-xs text-mute">
          Link ao clicar
          <input
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="https://"
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper"
          />
        </label>
        <label className="block text-xs text-mute">
          Ordem
          <input
            type="number"
            min={0}
            value={form.ordem}
            onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper"
          />
        </label>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-paper">Visível na página inicial</span>
          <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} aria-label="Parceiro visível" />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1">{form.id ? "Salvar" : "Adicionar"}</Button>
          {form.id ? (
            <button type="button" onClick={() => setForm(VAZIO)} className="text-xs text-mute">
              Cancelar
            </button>
          ) : null}
        </div>
        {erro ? (
          <p className="text-xs text-brick" role="alert">
            {erro}
          </p>
        ) : null}
      </form>

      <ul className="mt-6">
        {parceiros.map((parceiro) => (
          <li key={parceiro.id} className="flex items-center justify-between gap-4 border-b border-line py-3">
            <span className="min-w-0">
              <span className="block truncate text-sm text-paper">{parceiro.nome}</span>
              <span className="text-xs text-mute2">
                Ordem {parceiro.ordem} · {parceiro.ativo ? "visível" : "oculto"}
              </span>
            </span>
            <span className="flex shrink-0 gap-3">
              <button
                type="button"
                className="text-xs text-gold"
                onClick={() =>
                  setForm({
                    id: parceiro.id,
                    nome: parceiro.nome,
                    logo_url: parceiro.logo_url ?? "",
                    link: parceiro.link ?? "",
                    ordem: parceiro.ordem,
                    ativo: parceiro.ativo,
                  })
                }
              >
                Editar
              </button>
              <button
                type="button"
                className="text-xs text-brick"
                onClick={async () => {
                  await remover({ data: { id: parceiro.id } });
                  await consulta.refetch();
                }}
              >
                Remover
              </button>
            </span>
          </li>
        ))}
      </ul>
      {parceiros.length === 0 ? <p className="mt-4 text-sm text-mute">Nenhum parceiro cadastrado ainda.</p> : null}
    </main>
  );
}
