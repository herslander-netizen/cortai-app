import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, ImagePlus, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PainelPublicacao } from "@/components/divulgacao/PainelPublicacao";
import { canvasParaArquivo, desenharArte } from "@/components/divulgacao/arte";
import { getDadosDivulgacao } from "@/lib/divulgacao.functions";
import { REDES, legenda, linkRastreado, textoPadrao, type Modelo, type Rede } from "@/lib/divulgacao";
import { Chip } from "@/components/ui/chip";

export const Route = createFileRoute("/barbeiro/divulgar")({
  head: () => ({
    meta: [
      { title: "Divulgar nas redes — Flow" },
      { name: "description", content: "Crie posts para Instagram e TikTok com link de agendamento." },
      { property: "og:title", content: "Divulgar nas redes — Flow" },
      { property: "og:description", content: "Artes 9:16 prontas com legenda e hashtags." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DivulgarPage,
});

const MODELOS: { id: Modelo; rotulo: string }[] = [
  { id: "foto", rotulo: "Foto do trabalho" },
  { id: "servico", rotulo: "Serviço em destaque" },
  { id: "horarios", rotulo: "Horários de hoje" },
  { id: "promocao", rotulo: "Promoção do dia" },
];

const real = (c: number | null) =>
  c == null ? undefined : (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function DivulgarPage() {
  const buscar = useServerFn(getDadosDivulgacao);
  const { data } = useQuery({ queryKey: ["divulgacao"], queryFn: () => buscar() });
  const canvas = useRef<HTMLCanvasElement>(null);
  const [modelo, setModelo] = useState<Modelo>("foto");
  const [rede, setRede] = useState<Rede>("reels");
  const [foto, setFoto] = useState<HTMLImageElement | null>(null);
  const [servicoId, setServicoId] = useState("");
  const [horarios, setHorarios] = useState("14:00, 15:30, 17:00");
  const [promo, setPromo] = useState("20% off");
  const [texto, setTexto] = useState("");

  const servico = data?.servicos.find((s) => s.id === servicoId) ?? data?.servicos[0];
  const link = data
    ? linkRastreado(typeof window === "undefined" ? "https://cortai.dev" : window.location.origin, data.slug, rede)
    : "";
  const textoFinal = texto || (data ? textoPadrao(modelo, data.nome, servico?.nome, real(servico?.preco ?? null)) : "");
  const textoLegenda = useMemo(
    () => (data ? legenda({ rede, texto: textoFinal, link, segmento: data.segmento }) : ""),
    [data, rede, textoFinal, link],
  );

  useEffect(() => {
    if (!canvas.current || !data) return;
    const titulo =
      modelo === "servico" ? (servico?.nome ?? "Serviço") : modelo === "horarios" ? "Horários livres hoje" : modelo === "promocao" ? promo : data.nome;
    desenharArte(canvas.current, {
      titulo,
      subtitulo: modelo === "servico" ? real(servico?.preco ?? null) : modelo === "promocao" ? "Só hoje" : undefined,
      itens: modelo === "horarios" ? horarios.split(",").map((h) => h.trim()).filter(Boolean) : undefined,
      rodape: `Agende em cortai.dev/b/${data.slug}`,
      foto: modelo === "foto" || modelo === "promocao" ? foto : null,
    });
  }, [data, modelo, servico, horarios, promo, foto]);

  function escolherFoto(arquivo?: File) {
    if (!arquivo) return;
    const img = new Image();
    img.onload = () => setFoto(img);
    img.src = URL.createObjectURL(arquivo);
  }

  async function compartilhar() {
    if (!canvas.current) return;
    const arquivo = await canvasParaArquivo(canvas.current);
    await navigator.clipboard?.writeText(textoLegenda).catch(() => {});
    if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo], text: textoLegenda }).catch(() => {});
      return;
    }
    baixar();
    toast.success("Imagem baixada e legenda copiada. Agora é só postar.");
  }

  function baixar() {
    const a = document.createElement("a");
    a.href = canvas.current!.toDataURL("image/png");
    a.download = "cortai-divulgacao.png";
    a.click();
  }

  return (
    <Screen voltarPara="/barbeiro/mais" title="Divulgar nas redes" subtitle="Crie o post, confira e publique em 1 toque.">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <div className="mx-auto w-full max-w-[320px]">
          <canvas ref={canvas} className="aspect-[9/16] w-full rounded-[28px] border-0" aria-label="Prévia do post" />
          <p className="mt-2 text-center text-xs text-mute">
            {REDES[rede].nome} · {REDES[rede].limite} · melhor horário {REDES[rede].pico}
          </p>
        </div>

        <div className="space-y-3">
          <Card density="default" className="space-y-2">
            <p className="text-base font-semibold text-paper">Tipo de post</p>
            <div className="flex flex-wrap gap-2">
              {MODELOS.map((m) => (
                <Chip key={m.id} selecionado={modelo === m.id} onClick={() => setModelo(m.id)}>{m.rotulo}</Chip>
              ))}
            </div>
          </Card>

          <Card density="default" className="space-y-2">
            <p className="text-base font-semibold text-paper">Onde vai publicar</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(REDES) as Rede[]).map((r) => (
                <Chip key={r} selecionado={rede === r} onClick={() => setRede(r)}>{REDES[r].nome}</Chip>
              ))}
            </div>
          </Card>

          {(modelo === "foto" || modelo === "promocao") && (
            <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3 text-sm text-paper transition-colors active:bg-[var(--figaro-surface-container-high,var(--ink3))]">
              <ImagePlus className="size-5" /> {foto ? "Trocar foto" : "Escolher foto"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => escolherFoto(e.target.files?.[0])} />
            </label>
          )}
          {modelo === "servico" && (
            <select className="field-control" value={servico?.id ?? ""} onChange={(e) => setServicoId(e.target.value)} aria-label="Serviço">
              {data?.servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          )}
          {modelo === "horarios" && (
            <input className="field-control" value={horarios} onChange={(e) => setHorarios(e.target.value)} aria-label="Horários separados por vírgula" />
          )}
          {modelo === "promocao" && (
            <input className="field-control" value={promo} onChange={(e) => setPromo(e.target.value)} aria-label="Promoção" />
          )}

          <Card density="default" className="space-y-2">
            <p className="text-base font-semibold text-paper">Legenda</p>
            <textarea className="field-control min-h-24 py-3" value={textoFinal} onChange={(e) => setTexto(e.target.value)} aria-label="Texto da legenda" />
            <pre className="whitespace-pre-wrap rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-3 text-xs text-mute">{textoLegenda}</pre>
          </Card>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button variant="primary" className="min-h-12 w-full sm:w-auto" onClick={() => void compartilhar()}>
              <Share2 className="size-4" /> Compartilhar
            </Button>
            <Button variant="ghost" className="min-h-12 w-full sm:w-auto" onClick={baixar}>
              <Download className="size-4" /> Baixar
            </Button>
            <Button
              variant="ghost"
              className="min-h-12 w-full sm:w-auto"
              onClick={() => void navigator.clipboard.writeText(textoLegenda).then(() => toast.success("Legenda copiada."))}
            >
              <Copy className="size-4" /> Copiar legenda
            </Button>
          </div>

          <PainelPublicacao
            legenda={textoLegenda}
            gerarImagem={() => canvas.current?.toDataURL("image/jpeg", 0.85) ?? null}
          />
        </div>
      </div>
    </Screen>
  );
}
