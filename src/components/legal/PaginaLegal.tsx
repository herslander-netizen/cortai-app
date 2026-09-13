import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { Signature } from "@/components/layout/Signature";
import type { DocumentoLegal } from "@/lib/legal/documentos";

/** Leitura longa: largura contida, tipografia calma e divisores discretos. */
export function PaginaLegal({ documento }: { documento: DocumentoLegal }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-[680px] px-5 pb-4 pt-8">
        <Link to="/legal" className="inline-flex items-center gap-1 text-xs text-mute transition-colors hover:text-paper">
          <ChevronLeft size={14} aria-hidden />
          Informações legais
        </Link>

        <header className="mt-5 border-b border-line pb-6">
          <h1 className="text-[26px] font-bold leading-tight text-paper md:text-[30px]">{documento.titulo}</h1>
          <p className="mt-3 text-sm leading-relaxed text-mute">{documento.resumo}</p>
          <p className="mt-4 text-[11px] text-mute2">
            Versão {documento.versao} · Última atualização em {documento.atualizadoEm}
          </p>
        </header>

        <article className="pt-2">
          {documento.secoes.map((secao) => (
            <section key={secao.titulo} className="border-b border-line/60 py-7 last:border-b-0">
              <h2 className="text-[15px] font-bold leading-snug text-paper">{secao.titulo}</h2>
              {secao.paragrafos?.map((texto) => (
                <p key={texto} className="mt-3 text-[14px] leading-[1.75] text-mute">
                  {texto}
                </p>
              ))}
              {secao.itens ? (
                <ul className="mt-3 space-y-2">
                  {secao.itens.map((item) => (
                    <li key={item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 text-[14px] leading-[1.75] text-mute">
                      <span aria-hidden className="mt-[11px] h-[3px] w-[3px] shrink-0 rounded-full bg-gold" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>

        <p className="mt-8 rounded-lg border border-line bg-ink2 px-4 py-3 text-[11px] leading-relaxed text-mute2">
          Documento de produto, redigido em linguagem clara e sujeito a revisão jurídica antes do lançamento
          comercial. Campos entre colchetes serão preenchidos com os dados oficiais do Cortaí.
        </p>
      </div>

      <div className="mx-auto w-full max-w-[680px]">
        <Signature />
      </div>
    </div>
  );
}
