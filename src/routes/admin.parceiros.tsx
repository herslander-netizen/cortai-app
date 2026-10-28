import { createFileRoute } from "@tanstack/react-router";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import { EmptyState } from "@/components/ui/section";
import { useAcao } from "@/hooks/useAcao";
import {
  listarParceirosAdmin,
  removerParceiro,
  salvarParceiro,
  type Parceiro,
} from "@/lib/parceiros.functions";

export const Route = createFileRoute("/admin/parceiros")({
  head: () => ({
    meta: [
      { title: "Parceiros — Cortaí" },
      {
        name: "description",
        content: "Cadastre os parceiros exibidos na faixa da página inicial do Cortaí.",
      },
      { property: "og:title", content: "Parceiros — Cortaí" },
      { property: "og:description", content: "Gestão da faixa de parceiros da página inicial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ParceirosAdmin,
});

const VAZIO = { nome: "", logo_url: "", link: "", ordem: 0, ativo: true };

function ParceirosAdmin() {
  const [confirmar, dialogo] = useConfirmar();
  const consulta = useQuery({
    queryKey: ["parceiros-admin"],
    queryFn: () => listarParceirosAdmin(),
    retry: false,
  });
  const salvar = useServerFn(salvarParceiro);
  const remover = useServerFn(removerParceiro);
  const [form, setForm] = useState<typeof VAZIO & { id?: string }>(VAZIO);
  const [ordem, setOrdem] = useState("0");
  const [erro, setErro] = useState<string | null>(null);
  const acao = useAcao();

  const parceiros = (consulta.data ?? []) as Parceiro[];

  return (
    <AdminScreen
      title="Parceiros"
      subtitle="Faixa discreta da página inicial; sem parceiros ativos, ela fica oculta."
    >
      {dialogo}
      {consulta.isError ? <AdminNotice error={consulta.error} /> : null}

      <form
        className="mt-6 space-y-3 surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setErro(null);
          if (ordem.trim() !== "" && !Number.isFinite(Number(ordem))) {
            setErro("Informe uma ordem válida.");
            return;
          }
          const editando = Boolean(form.id);
          void acao.executar(
            "salvar",
            () =>
              salvar({
                data: {
                  ...(form.id ? { id: form.id } : {}),
                  nome: form.nome,
                  logo_url: form.logo_url || null,
                  link: form.link || null,
                  ordem: ordem.trim() === "" ? 0 : Number(ordem),
                  ativo: form.ativo,
                },
              }),
            {
              sucesso: editando ? "Parceiro salvo." : "Parceiro adicionado.",
              aoConcluir: async () => {
                setForm(VAZIO);
                setOrdem("0");
                await consulta.refetch();
              },
            },
          );
        }}
      >
        <p className="text-sm font-semibold text-paper">
          {form.id ? "Editar parceiro" : "Novo parceiro"}
        </p>
        <label className="block text-xs text-mute">
          Nome
          <input
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="field-control mt-1"
          />
        </label>
        <label className="block text-xs text-mute">
          Logo (link da imagem)
          <input
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            className="field-control mt-1"
          />
        </label>
        <label className="block text-xs text-mute">
          Link ao clicar
          <input
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="https://"
            className="field-control mt-1"
          />
        </label>
        <label className="block text-xs text-mute">
          Ordem
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
            className="field-control mt-1"
          />
        </label>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-paper">Visível na página inicial</span>
          <Switch
            checked={form.ativo}
            onCheckedChange={(v) => setForm({ ...form, ativo: v })}
            aria-label="Parceiro visível"
          />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" disabled={acao.ocupado}>
            {acao.estaEm("salvar") ? "Salvando…" : form.id ? "Salvar" : "Adicionar"}
          </Button>
          {form.id ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setForm(VAZIO);
                setOrdem("0");
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
        {erro ? <Aviso tom="acao">{erro}</Aviso> : null}
      </form>

      <ul className="mt-6 space-y-2">
        {parceiros.map((parceiro) => (
          <li
            key={parceiro.id}
            className="flex items-center justify-between gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-paper">{parceiro.nome}</span>
              <span className="text-xs text-mute2">
                Ordem {parceiro.ordem} · {parceiro.ativo ? "visível" : "oculto"}
              </span>
            </span>
            <span className="flex shrink-0 gap-3">
              <Button
                type="button"
                variant="ghost"
                className="min-h-12 px-3 text-sm font-medium text-[var(--figaro-primary,var(--primary))]"
                onClick={() => {
                  setOrdem(String(parceiro.ordem));
                  setForm({
                    id: parceiro.id,
                    nome: parceiro.nome,
                    logo_url: parceiro.logo_url ?? "",
                    link: parceiro.link ?? "",
                    ordem: parceiro.ordem,
                    ativo: parceiro.ativo,
                  });
                }}
              >
                Editar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-12 px-2 text-xs"
                disabled={acao.ocupado}
                onClick={async () => {
                  if (
                    !(await confirmar({
                      titulo: `Remover o parceiro ${parceiro.nome}?`,
                      descricao: "Ele sai da página inicial.",
                      confirmar: "Remover",
                      destrutivo: true,
                    }))
                  )
                    return;
                  void acao.executar(
                    `remover-${parceiro.id}`,
                    () => remover({ data: { id: parceiro.id } }),
                    {
                      sucesso: "Parceiro removido.",
                      aoConcluir: async () => {
                        if (form.id === parceiro.id) {
                          setForm(VAZIO);
                          setOrdem("0");
                        }
                        await consulta.refetch();
                      },
                    },
                  );
                }}
              >
                {acao.estaEm(`remover-${parceiro.id}`) ? "Removendo…" : "Remover"}
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {parceiros.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="Nenhum parceiro cadastrado"
          description="A faixa pública continuará oculta até o primeiro parceiro ativo."
        />
      ) : null}
    </AdminScreen>
  );
}
