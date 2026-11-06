/**
 * Partes do Onboarding separadas de `useConfiguracaoInicial`: adicionar alguém à equipe, a logo (escolha → ajuste → envio comprimido, até 2 MB) e
 * o link (copiar e compartilhar, marcando o item do checklist).
 */
import { useState, type ChangeEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import { aviso } from "@/lib/avisos";
import { comprimirImagem } from "@/lib/imagem";
import type { Funcao } from "./passos/PassoDaEquipe";

export function useEquipeDoOnboarding({
  criar,
  convidar,
  recarregar,
}: {
  criar: (nome: string) => Promise<unknown>;
  convidar: (email: string, papel: Funcao) => Promise<unknown>;
  recarregar: () => void;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaFuncao, setNovaFuncao] = useState<Funcao>("barbeiro");
  const [adicionando, setAdicionando] = useState(false);

  async function adicionarPessoa() {
    const valor = novoNome.trim();
    const email = novoEmail.trim();
    if (novaFuncao === "recepcao" && !email) {
      aviso.erro("Para a recepção, informe o e-mail da pessoa.");
      return;
    }
    if (novaFuncao !== "recepcao" && valor.length < 2) return;
    setAdicionando(true);
    try {
      if (novaFuncao !== "recepcao") await criar(valor);
      if (email) await convidar(email, novaFuncao);
      aviso.ok(email ? `${valor || email} foi convidado.` : `${valor} entrou na equipe.`);
      setNovoNome("");
      setNovoEmail("");
      recarregar();
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não consegui adicionar agora.");
    } finally {
      setAdicionando(false);
    }
  }

  return {
    novoNome,
    setNovoNome,
    novoEmail,
    setNovoEmail,
    novaFuncao,
    setNovaFuncao,
    adicionando,
    adicionarPessoa,
  };
}

export function useLogoDoOnboarding(tenantId: string | undefined) {
  const [logo, setLogo] = useState<{ caminho: string; previa: string } | null>(null);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  /** Logo esperando o enquadramento (zoom e arrastar) antes do envio. */
  const [logoPendente, setLogoPendente] = useState<File | null>(null);

  async function enviarLogo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo || !tenantId) return;
    if (!arquivo.type.startsWith("image/")) {
      aviso.erro("Escolha uma imagem.");
      return;
    }
    setLogoPendente(arquivo);
  }

  async function enviarLogoAjustada(arquivo: File) {
    setLogoPendente(null);
    if (!tenantId) return;
    setEnviandoLogo(true);
    try {
      const blob = await comprimirImagem(arquivo, { maxLado: 800, transparente: true });
      if (blob.size > 2 * 1024 * 1024) {
        aviso.erro("Use uma imagem de até 2 MB.");
        return;
      }
      const extensao =
        blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const caminho = `${tenantId}/logo-${Date.now()}.${extensao}`;
      const { error } = await supabase.storage
        .from("tenant-logos")
        .upload(caminho, blob, { contentType: blob.type || "image/png" });
      if (error) {
        aviso.erro("Não consegui enviar a imagem. Tente outra.");
        return;
      }
      setLogo({ caminho, previa: URL.createObjectURL(blob) });
    } catch {
      aviso.erro("Não consegui preparar a imagem. Tente outra.");
    } finally {
      setEnviandoLogo(false);
    }
  }

  return { logo, enviandoLogo, logoPendente, setLogoPendente, enviarLogo, enviarLogoAjustada };
}

export function useLinkDoOnboarding({
  link,
  nome,
  marcar,
  recarregar,
}: {
  link: string;
  nome: string | undefined;
  marcar: () => Promise<unknown>;
  recarregar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  function marcarLinkCompartilhado() {
    void marcar()
      .then(recarregar)
      .catch(() => undefined);
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      marcarLinkCompartilhado();
    } catch {
      aviso.erro("Não consegui copiar o link. Tente novamente.");
    }
  }

  /** Folha de compartilhar do aparelho; sem ela, abre o WhatsApp com a mensagem pronta. */
  async function compartilharLink() {
    const texto = `Agende seu horário na ${nome ?? "nossa página"}: ${link}`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: nome ?? "Flow", text: texto, url: link });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
      }
      marcarLinkCompartilhado();
    } catch {
      // Cancelar a folha de compartilhar não é erro.
    }
  }

  return { copiado, copiarLink, compartilharLink, marcarLinkCompartilhado };
}
