import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getConexoesSociais } from "@/lib/redes-sociais.functions";
import { cancelarPostagemSocial, criarPostagemSocial, getPostagensSociais, type PostagemSocial } from "@/lib/postagens-sociais.functions";
import { ROTULO_PLATAFORMA, type PlataformaSocial } from "@/lib/redes-sociais";
import { Chip } from "@/components/ui/chip";

const ROTULO_STATUS: Record<PostagemSocial["status"], string> = {
  agendada: "Agendada",
  publicando: "Publicando",
  publicada: "Publicada",
  falha: "Falhou",
  cancelada: "Cancelada",
};

const quandoTexto = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Publica a arte atual nas redes conectadas, agora ou numa data, e mostra a fila. */
export function PainelPublicacao({ gerarImagem, legenda }: { gerarImagem: () => string | null; legenda: string }) {
  const qc = useQueryClient();
  const buscarConexoes = useServerFn(getConexoesSociais);
  const buscarPostagens = useServerFn(getPostagensSociais);
  const criar = useServerFn(criarPostagemSocial);
  const cancelar = useServerFn(cancelarPostagemSocial);
  const conexoes = useQuery({ queryKey: ["conexoes-sociais"], queryFn: () => buscarConexoes() });
  const postagens = useQuery({ queryKey: ["postagens-sociais"], queryFn: () => buscarPostagens(), refetchInterval: 30_000 });
  const [escolhidas, setEscolhidas] = useState<PlataformaSocial[]>([]);
  const [agendar, setAgendar] = useState(false);
  const [quando, setQuando] = useState("");

  const ativas = (conexoes.data?.conexoes ?? []).filter((c) => c.status === "conectada" || c.status === "simulada");
  const atualizar = () => qc.invalidateQueries({ queryKey: ["postagens-sociais"] });

  const publicar = useMutation({
    mutationFn: async () => {
      const imagem = gerarImagem();
      if (!imagem) throw new Error("A arte ainda não está pronta.");
      return criar({
        data: {
          plataformas: escolhidas,
          legenda,
          imagemBase64: imagem,
          agendadoPara: agendar && quando ? new Date(quando).toISOString() : undefined,
        },
      });
    },
    onSuccess: (r) => {
      toast.success(r.agendada ? "Postagem agendada." : "Publicação enviada.");
      void atualizar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelarPost = useMutation({
    mutationFn: (id: string) => cancelar({ data: { id } }),
    onSuccess: () => void atualizar(),
    onError: (e: Error) => toast.error(e.message),
  });

  const alternar = (p: PlataformaSocial) =>
    setEscolhidas((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]));

  return (
    <section className="space-y-3 rounded-2xl border border-line p-4" aria-labelledby="titulo-publicar">
      <h2 id="titulo-publicar" className="rotulo-secao">Publicar direto nas redes</h2>
      {ativas.length === 0 ? (
        <p className="text-sm text-mute">
          Nenhuma conta conectada.{" "}
          <Link to="/barbeiro/redes" search={{ conectada: undefined, erro: undefined }} className="font-medium text-gold underline">Conectar Instagram ou TikTok</Link>
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {ativas.map((c) => {
              const ativo = escolhidas.includes(c.plataforma);
              return (
                <Chip key={c.id} selecionado={ativo} onClick={() => alternar(c.plataforma)}>
                  {ROTULO_PLATAFORMA[c.plataforma]}
                  {c.status === "simulada" && <span className="ml-1 text-xs text-mute">· demonstração</span>}
                </Chip>
              );
            })}
          </div>
          <label className="flex min-h-12 items-center gap-2 text-sm text-paper">
            <input type="checkbox" checked={agendar} onChange={(e) => setAgendar(e.target.checked)} className="size-5" />
            Agendar para depois
          </label>
          {agendar && (
            <input type="datetime-local" className="field-control" value={quando} onChange={(e) => setQuando(e.target.value)} aria-label="Data e hora da postagem" />
          )}
          <Button variant="primary" className="min-h-12 w-full rounded-full sm:w-auto"
            disabled={escolhidas.length === 0 || (agendar && !quando) || publicar.isPending}
            onClick={() => publicar.mutate()}>
            {agendar ? <CalendarClock className="size-4" /> : <Send className="size-4" />}
            {publicar.isPending ? "Enviando…" : agendar ? "Agendar postagem" : "Publicar agora"}
          </Button>
        </>
      )}

      {(postagens.data?.postagens.length ?? 0) > 0 && (
        <ul className="divide-y divide-line border-t border-line pt-2" aria-label="Postagens">
          {postagens.data!.postagens.map((p) => (
            <li key={p.id} className="flex min-h-12 items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-paper">{ROTULO_PLATAFORMA[p.plataforma]} · {quandoTexto(p.publicado_em ?? p.agendado_para)}</p>
                <p className="truncate text-xs text-mute">
                  {ROTULO_STATUS[p.status]}{p.simulada ? " (demonstração)" : ""}{p.erro ? ` — ${p.erro}` : ""}
                </p>
              </div>
              {p.status === "agendada" && (
                <Button variant="ghost" size="icon" className="size-12 shrink-0" aria-label="Cancelar postagem"
                  onClick={() => cancelarPost.mutate(p.id)}>
                  <X className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
