import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Screen, EmptyState } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { getEquipe, removerMembroEquipe, salvarMembroEquipe } from "@/lib/equipe.functions";
import { GRUPOS_PERMISSAO, PADRAO_POR_PAPEL, ROTULOS_PAPEL, ROTULOS_PERMISSAO, type PapelEquipe, type Permissao } from "@/lib/permissoes";

export const Route = createFileRoute("/barbeiro/equipe")({
  head: () => ({ meta: [
    { title: "Equipe e permissões — Cortaí Gestão" },
    { name: "description", content: "Defina perfis e permissões individuais de cada pessoa da sua barbearia." },
    { property: "og:title", content: "Equipe e permissões — Cortaí Gestão" },
    { property: "og:description", content: "Quem pode fazer o quê na sua barbearia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EquipePage,
});

const PAPEIS: PapelEquipe[] = ["dono", "gerente", "barbeiro", "recepcao"];

function EquipePage() {
  const query = useQuery({ queryKey: ["equipe"], queryFn: () => getEquipe(), retry: false });
  const salvar = useServerFn(salvarMembroEquipe);
  const remover = useServerFn(removerMembroEquipe);

  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<PapelEquipe>("barbeiro");
  const [permissoes, setPermissoes] = useState<Permissao[]>(PADRAO_POR_PAPEL.barbeiro);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [status, setStatus] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  if (query.isLoading) return <Screen title="Equipe"><Carregando texto="Carregando equipe…" /></Screen>;
  if (query.isError) {
    return <Screen title="Equipe" subtitle="Perfis e acessos da sua barbearia." voltarPara="/barbeiro/mais">
      <p className="rounded-xl border border-line bg-ink2 p-5 text-sm text-mute">{query.error instanceof Error ? query.error.message : "Acesso não disponível."}</p>
    </Screen>;
  }

  const membros = query.data?.membros ?? [];

  function trocarPapel(novo: PapelEquipe) {
    setPapel(novo);
    setPermissoes(PADRAO_POR_PAPEL[novo]);
  }

  async function enviar() {
    setErro(""); setStatus(""); setEnviando(true);
    try {
      await salvar({ data: { email: email.trim(), papel, permissoes, senha } });
      setSenha(""); setEmail("");
      await query.refetch();
      setStatus("Acesso salvo.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar agora.");
    } finally { setEnviando(false); }
  }

  async function excluir(vinculoId: string) {
    setErro(""); setStatus("");
    try {
      await remover({ data: { vinculoId, senha } });
      setSenha(""); setRemovendo(null);
      await query.refetch();
      setStatus("Acesso removido.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível remover agora.");
    }
  }

  return (
    <Screen title="Equipe e permissões" subtitle="Escolha um perfil e ajuste o que cada pessoa pode fazer." voltarPara="/barbeiro/mais">
      {status ? <p className="mb-4 text-sm text-sage" role="status">{status}</p> : null}
      {erro ? <p className="mb-4 text-sm text-red-400" role="alert">{erro}</p> : null}

      <h2 className="text-xs font-semibold uppercase tracking-wide text-mute2">Pessoas com acesso</h2>
      {membros.length === 0 ? <EmptyState text="Ainda só você tem acesso." /> : (
        <ul className="mt-3 divide-y divide-line">
          {membros.map((membro) => (
            <li key={membro.id} className="py-3.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-paper">{membro.email}</p>
                  <p className="mt-0.5 text-xs text-mute">{ROTULOS_PAPEL[membro.papel as PapelEquipe] ?? membro.papel} · {membro.papel === "dono" ? "acesso total" : `${(membro.permissoes ?? []).length} permissões`}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" className="rounded-lg border border-line px-3 py-2 text-[11px] text-paper"
                    onClick={() => { setEmail(membro.email); trocarPapel(membro.papel as PapelEquipe); setPermissoes(((membro.permissoes ?? []) as Permissao[]).length ? (membro.permissoes as Permissao[]) : PADRAO_POR_PAPEL[membro.papel as PapelEquipe]); }}>Editar</button>
                  <button type="button" className="rounded-lg border border-line px-3 py-2 text-[11px] text-mute" onClick={() => setRemovendo(removendo === membro.id ? null : membro.id)}>Remover</button>
                </div>
              </div>
              {removendo === membro.id ? (
                <div className="mt-3 rounded-lg border border-line bg-ink2 p-3">
                  <p className="text-xs text-mute">Confirme com a sua senha para remover este acesso.</p>
                  <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper" />
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="rounded-lg border border-line px-3 py-2 text-xs text-paper" onClick={() => setRemovendo(null)}>Cancelar</button>
                    <button type="button" className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-ink" onClick={() => void excluir(membro.id)}>Remover acesso</button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-mute2">Vincular ou atualizar</h2>
      <div className="mt-3 space-y-4 rounded-xl border border-line bg-ink2 p-4">
        <label className="block text-xs text-mute">E-mail da conta Cortaí
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@email.com" className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-paper" />
        </label>
        <div>
          <p className="text-xs text-mute">Perfil</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PAPEIS.map((p) => (
              <button key={p} type="button" aria-pressed={papel === p} onClick={() => trocarPapel(p)}
                className={`rounded-lg border px-3 py-2 text-xs ${papel === p ? "border-gold text-gold" : "border-line text-mute"}`}>{ROTULOS_PAPEL[p]}</button>
            ))}
          </div>
        </div>
        {papel === "dono" ? <p className="text-xs text-mute">O dono tem acesso total à barbearia.</p> : (
          <div className="space-y-4">
            {GRUPOS_PERMISSAO.map((grupo) => (
              <fieldset key={grupo.titulo}>
                <legend className="text-[11px] font-semibold uppercase text-mute2">{grupo.titulo}</legend>
                <div className="mt-2 space-y-1.5">
                  {grupo.itens.map((permissao) => (
                    <label key={permissao} className="flex items-center gap-2 text-xs text-paper">
                      <input type="checkbox" checked={permissoes.includes(permissao)} className="h-4 w-4 accent-[var(--gold,#c9a227)]"
                        onChange={(e) => setPermissoes((atual) => e.target.checked ? [...atual, permissao] : atual.filter((x) => x !== permissao))} />
                      {ROTULOS_PERMISSAO[permissao]}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        )}
        <label className="block text-xs text-mute">Sua senha (confirmação)
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-paper" />
        </label>
        <button type="button" disabled={enviando || !email || !senha} className="w-full rounded-lg bg-gold py-3 text-sm font-semibold text-ink disabled:opacity-60" onClick={() => void enviar()}>
          {enviando ? "Salvando…" : "Salvar acesso"}
        </button>
        <p className="text-[11px] text-mute2">A pessoa precisa já ter conta no Cortaí. A barbearia sempre mantém pelo menos um dono.</p>
      </div>
    </Screen>
  );
}
