import { createFileRoute, Link } from "@tanstack/react-router";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { PreferenciasDePrivacidade } from "@/components/privacidade/PreferenciasDePrivacidade";
import { DESCRICAO_DAS_CATEGORIAS, VERSAO_DA_POLITICA } from "@/lib/consentimento";
import { CONTATO_DE_PRIVACIDADE } from "./privacidade";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Política de Cookies — Flow" },
      {
        name: "description",
        content: "Conheça cookies, armazenamento local e como revisar as preferências no Flow.",
      },
      { property: "og:title", content: "Política de Cookies — Flow" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cortaiapp.pages.dev/cookies" },
    ],
    links: [{ rel: "canonical", href: "https://cortaiapp.pages.dev/cookies" }],
  }),
  component: PaginaDeCookies,
});

function PaginaDeCookies() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-10">
      <MarcaFlow variante="branca" className="h-auto w-24 opacity-80" />
      <h1 className="mt-6 text-2xl font-bold text-paper">Política de Cookies</h1>
      <p className="mt-2 text-xs text-mute2">
        Versão {VERSAO_DA_POLITICA} · atualizada em 8 de novembro de 2026
      </p>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-mute">
        <p>
          O Flow usa cookies e tecnologias semelhantes, inclusive armazenamento local do
          navegador. Algumas são essenciais para que o serviço funcione. Outras categorias
          só devem ser ativadas com sua escolha quando forem disponibilizadas.
        </p>

        <h2 className="text-base font-bold text-paper">Categorias</h2>
        <ul className="space-y-3">
          {DESCRICAO_DAS_CATEGORIAS.map((categoria) => (
            <li key={categoria.chave} className="rounded-2xl border border-line px-4 py-3">
              <strong className="text-paper">{categoria.titulo}</strong>
              <span className="ml-2 text-xs text-mute2">
                {categoria.fixa ? "necessários" : "opcionais"}
              </span>
              <p className="mt-1">{categoria.detalhe}</p>
            </li>
          ))}
        </ul>

        <h2 className="text-base font-bold text-paper">Tecnologias necessárias</h2>
        <p>
          Login, segurança, estado da sessão, registro das escolhas de consentimento, tema
          básico e preferências operacionais podem funcionar mesmo com categorias opcionais
          recusadas. Bloquear esse armazenamento no navegador pode impedir o funcionamento
          de certos recursos ou exigir novo login.
        </p>

        <h2 className="text-base font-bold text-paper">Como revisar suas escolhas</h2>
        <p>
          Você pode aceitar, rejeitar ou alterar as categorias facultativas nas opções abaixo
          ou em Privacidade e cookies do perfil. Nenhuma categoria opcional deve ser marcada
          automaticamente como aceita. Quando o conteúdo desta política mudar de modo
          relevante, uma nova escolha poderá ser solicitada.
        </p>
        <p>
          O Flow guarda no navegador a versão, a data e as categorias escolhidas. Os demais
          prazos variam com a tecnologia, seu propósito e o prestador do serviço.
          Você também pode limpar os dados do site nas configurações do navegador.
        </p>

        <h2 className="text-base font-bold text-paper">Fornecedores e medições técnicas</h2>
        <p>
          Serviços externos necessários a login, pagamentos, mensagens e infraestrutura
          podem utilizar seus próprios mecanismos técnicos, conforme a funcionalidade
          utilizada e a política do fornecedor. Registros de segurança, prevenção de fraude
          e diagnóstico operacional não se confundem com rastreadores de publicidade.
          O consentimento para cookies de marketing não autoriza, por si só, mensagens
          promocionais pelo WhatsApp.
        </p>
        <p>
          Para compreender o tratamento de dados pessoais, consulte a{" "}
          <Link to="/privacidade" className="text-gold underline">
            Política de Privacidade
          </Link>. Dúvidas:{" "}
          <a className="text-gold underline" href={`mailto:${CONTATO_DE_PRIVACIDADE.email}`}>
            {CONTATO_DE_PRIVACIDADE.email}
          </a>.
        </p>
      </div>

      <PreferenciasDePrivacidade />

      <nav aria-label="Documentos institucionais" className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6 text-xs">
        <Link to="/termos" className="rounded-lg border border-line px-4 py-3 font-semibold text-paper">Termos de Uso</Link>
        <Link to="/privacidade" className="rounded-lg border border-line px-4 py-3 font-semibold text-paper">Privacidade</Link>
        <Link to="/apresentacao" className="rounded-lg border border-line px-4 py-3 font-semibold text-paper">Voltar ao início</Link>
      </nav>
    </main>
  );
}
