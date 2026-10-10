export type FaseDoEditor = "ocioso" | "salvando" | "publicando";

/** O que o editor tem a dizer agora, sempre derivado de estado real. */
export function estadoDoEditor({
  fase,
  erro,
  status,
  naoSalvo,
  pendente,
}: {
  fase: FaseDoEditor;
  erro: boolean;
  status: string | null;
  naoSalvo: boolean;
  pendente: boolean;
}) {
  if (fase === "publicando")
    return { tom: "info", texto: "Publicando sua página…", ocupado: true } as const;
  if (fase === "salvando")
    return { tom: "info", texto: "Salvando o rascunho…", ocupado: true } as const;
  if (erro && status) return { tom: "erro", texto: status, ocupado: false } as const;
  if (naoSalvo)
    return {
      tom: "pendente",
      texto: "Você tem mudanças que ainda não foram salvas.",
      ocupado: false,
    } as const;
  if (pendente)
    return {
      tom: "pendente",
      texto: "Rascunho salvo, mas ainda não publicado. A página pública não mudou.",
      ocupado: false,
    } as const;
  if (status) return { tom: "ok", texto: status, ocupado: false } as const;
  return null;
}
