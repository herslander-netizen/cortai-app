import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import type { FaseDoEditor } from "./estadoDoEditor";

import { supabase } from "@/integrations/supabase/client";
import {
  alterarLinkPublico,
  descartarRascunhoPagina,
  publicarPagina,
  restaurarMarca,
  salvarRascunhoPagina,
  type MarcaData,
  type MarcaForm,
} from "@/lib/marca.functions";
import { comprimirImagem } from "@/lib/imagem";
import type { PaginaConfig } from "@/lib/pagina-config";
import { getPaginaPublica } from "@/lib/publico.functions";
import { termos } from "@/lib/segmentos";

/** Estado e ações da tela "Personalizar página". */
export function useEditorDaPagina(initial: MarcaData, reload: () => void) {
  const queryClient = useQueryClient();
  const saveDraft = useServerFn(salvarRascunhoPagina);
  const publish = useServerFn(publicarPagina);
  const restore = useServerFn(restaurarMarca);
  const discard = useServerFn(descartarRascunhoPagina);
  const changePublicLink = useServerFn(alterarLinkPublico);
  const publicQuery = useQuery({
    queryKey: ["pagina-publica", initial.slug],
    queryFn: () => getPaginaPublica({ data: { slug: initial.slug } }),
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<MarcaForm>(initial);
  const [config, setConfig] = useState<PaginaConfig>(initial.pagina);
  const [logoPreview, setLogoPreview] = useState(initial.logo_signed_url);
  const [coverPreview, setCoverPreview] = useState(initial.capa_signed_url);
  const [avatarPreview, setAvatarPreview] = useState(initial.avatar_signed_url);
  const [fotosPreview, setFotosPreview] = useState<{ path: string; url: string | null }[]>([]);
  const [slug, setSlug] = useState(initial.slug);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [busy, setBusy] = useState(false);
  const [imagemPendente, setImagemPendente] = useState<{ file: File; kind: "logo" | "capa" | "avatar" | "foto" } | null>(null);
  const [fase, setFase] = useState<FaseDoEditor>("ocioso");
  const [erro, setErro] = useState(false);
  const [status, setStatusBruto] = useState<string | null>(null);
  const setStatus = (texto: string | null, ehErro = false) => {
    setStatusBruto(texto);
    setErro(ehErro);
  };
  const baseline = useMemo(
    () => JSON.stringify({ form: initial, config: initial.pagina }),
    [initial],
  );
  const naoSalvo = JSON.stringify({ form, config }) !== baseline;
  const vocabulario = termos(initial.segmento);

  useEffect(() => {
    setForm(initial);
    setConfig(initial.pagina);
    setLogoPreview(initial.logo_signed_url);
    setCoverPreview(initial.capa_signed_url);
    setAvatarPreview(initial.avatar_signed_url);
    setSlug(initial.slug);
  }, [initial]);
  useEffect(() => {
    let ativo = true;
    void Promise.all(
      form.fotos.map(async (path) => {
        if (path.startsWith("https://")) return { path, url: path };
        try {
          const { data } = await supabase.storage.from("tenant-logos").createSignedUrl(path, 60 * 60);
          return { path, url: data?.signedUrl ?? null };
        } catch {
          return { path, url: null };
        }
      }),
    ).then((fotos) => {
      if (ativo) setFotosPreview(fotos);
    });
    return () => {
      ativo = false;
    };
  }, [form.fotos]);

  const removerFoto = (path: string) => {
    setForm((old) => ({ ...old, fotos: old.fotos.filter((foto) => foto !== path) }));
    setStatus("Foto removida da galeria. Salve o rascunho para guardar a alteração.");
  };
  const setMarca = <K extends keyof MarcaForm>(key: K, value: MarcaForm[K]) =>
    setForm((old) => ({ ...old, [key]: value }));
  const setPagina = <K extends keyof PaginaConfig>(key: K, value: PaginaConfig[K]) =>
    setConfig((old) => ({ ...old, [key]: value }));

  // Libera URLs locais de prévia para não vazar memória.
  const previasLocais = useRef<string[]>([]);
  useEffect(() => () => previasLocais.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const upload = (event: ChangeEvent<HTMLInputElement>, kind: "logo" | "capa" | "avatar" | "foto") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // Toda foto passa pelo enquadramento (zoom e arrastar) antes do envio, inclusive as da galeria.
    setImagemPendente({ file, kind });
  };

  const cancelarImagem = () => setImagemPendente(null);
  const confirmarImagem = async (file: File) => {
    const kind = imagemPendente?.kind;
    setImagemPendente(null);
    if (kind) await enviarArquivo(file, kind);
  };

  const enviarArquivo = async (file: File, kind: "logo" | "capa" | "avatar" | "foto") => {
    if (kind === "foto" && form.fotos.length >= 8) {
      setStatus("A galeria aceita até 8 fotos.", true);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setStatus("Escolha um arquivo de imagem (JPG, PNG ou WebP).", true);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setStatus("Essa imagem é grande demais. Use uma de até 20 MB.", true);
      return;
    }
    setBusy(true);
    setStatus(kind === "capa" ? "Enviando capa…" : "Enviando imagem…");
    try {
      const blob = await comprimirImagem(file, {
        maxLado: kind === "capa" ? 1920 : kind === "foto" ? 1400 : 800,
        transparente: kind === "logo",
      });
      if (blob.size > 2 * 1024 * 1024) {
        setStatus("Mesmo reduzida, a imagem passou de 2 MB. Tente outra foto.", true);
        return;
      }
      const tipo = blob.type || file.type;
      const extension =
        tipo.split("/")[1]?.replace("jpeg", "jpg").replace("svg+xml", "svg") ?? "jpg";
      const path = `${initial.id}/${kind}-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("tenant-logos")
        .upload(path, blob, { contentType: tipo });
      if (error) {
        setStatus("Não foi possível enviar a imagem. Tente de novo.", true);
        return;
      }
      if (kind === "foto") {
        setForm((old) => ({ ...old, fotos: [...old.fotos, path] }));
        setStatus("Foto adicionada à galeria. Salve o rascunho para guardar a alteração.");
        return;
      }
      const preview = URL.createObjectURL(blob);
      previasLocais.current.push(preview);
      if (kind === "logo") {
        setMarca("logo_url", path);
        setLogoPreview(preview);
        void queryClient.invalidateQueries({ queryKey: ["logos-do-negocio"] });
      } else if (kind === "capa") {
        setMarca("capa_url", path);
        setCoverPreview(preview);
      } else {
        setPagina("chat", { ...config.chat, avatarUrl: path });
        setAvatarPreview(preview);
      }
      setStatus("Imagem pronta. Salve o rascunho para continuar depois.");
    } catch {
      setStatus("Não foi possível enviar a imagem. Tente de novo.", true);
    } finally {
      setBusy(false);
    }
  };

  // Capa e fotos escolhidas na galeria de fotos do negócio (as imagens já estão no armazenamento).
  const escolherCapa = (path: string, url: string) => {
    setMarca("capa_url", path);
    setCoverPreview(url);
    setStatus("Imagem de fundo escolhida. Salve ou publique para aplicar.");
  };
  const removerCapa = () => {
    setMarca("capa_url", null);
    setCoverPreview(null);
    setStatus("Imagem de fundo removida. Salve ou publique para aplicar.");
  };
  const definirFotos = (paths: string[]) => {
    setForm((old) => ({ ...old, fotos: paths.slice(0, 8) }));
    setStatus("Galeria atualizada. Salve o rascunho para guardar a alteração.");
  };

  const usarLogo = (path: string, url: string) => {
    setMarca("logo_url", path);
    setLogoPreview(url);
    setStatus("Logo escolhida. Salve ou publique para aplicar.");
  };
  const removerLogo = () => {
    setMarca("logo_url", null);
    setLogoPreview(null);
    setStatus("Logo removida. Salve ou publique para aplicar.");
  };

  const salvarSlug = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const resultado = await changePublicLink({ data: { slug } });
      setSlug(resultado.slug);
      await reload();
      setStatus("Link atualizado. O endereço anterior continua funcionando.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Não foi possível atualizar o link.",
        true,
      );
    } finally {
      setBusy(false);
    }
  };

  const executar = async (mode: "draft" | "publish") => {
    setBusy(true);
    setFase(mode === "draft" ? "salvando" : "publicando");
    setStatus(null);
    try {
      if (mode === "draft") {
        await saveDraft({ data: { marca: form, pagina: config } });
        setStatus("Rascunho salvo. Sua página pública não mudou.");
      } else {
        await publish({ data: { marca: form, pagina: config } });
        await queryClient.invalidateQueries({ queryKey: ["pagina-publica", initial.slug] });
        await queryClient.invalidateQueries({ queryKey: ["sessao"] });
        setStatus("Página publicada com sucesso.");
      }
      await reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível concluir.", true);
    } finally {
      setBusy(false);
      setFase("ocioso");
    }
  };

  /** Volta ao que está publicado. O rascunho descartado fica nas versões anteriores. */
  const descartar = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (initial.alteracoes_pendentes) await discard();
      setForm(initial);
      setConfig(initial.pagina);
      setLogoPreview(initial.logo_signed_url);
      setCoverPreview(initial.capa_signed_url);
      setAvatarPreview(initial.avatar_signed_url);
      await reload();
      setStatus("Alterações descartadas. A página voltou ao que está publicada.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível descartar.", true);
    } finally {
      setBusy(false);
    }
  };

  const usaConversa =
    config.experiencia === "conversa" ||
    (config.experiencia === "vitrine" && config.chat.modo === "conversa");
  const previewData = publicQuery.data
    ? {
        ...publicQuery.data,
        tenant: {
          ...publicQuery.data.tenant,
          ...form,
          logo_signed_url: logoPreview,
          capa_signed_url: coverPreview,
        },
      }
    : null;

  const restaurar = async (versaoId: string) => {
    setBusy(true);
    try {
      await restore({ data: { versaoId } });
      await reload();
      setStatus("Versão restaurada como rascunho.");
    } finally {
      setBusy(false);
    }
  };

  return {
    form,
    setMarca,
    config,
    setConfig,
    setPagina,
    slug,
    setSlug,
    device,
    setDevice,
    busy,
    status,
    setStatus,
    fase,
    erro,
    naoSalvo,
    pendente: initial.alteracoes_pendentes,
    vocabulario,
    fileRef,
    coverRef,
    avatarRef,
    logoPreview,
    coverPreview,
    avatarPreview,
    setAvatarPreview,
    fotosPreview,
    removerFoto,
    escolherCapa,
    removerCapa,
    definirFotos,
    upload,
    imagemPendente,
    cancelarImagem,
    confirmarImagem,
    usarLogo,
    removerLogo,
    salvarSlug,
    executar,
    descartar,
    restaurar,
    usaConversa,
    previewData,
  };
}
