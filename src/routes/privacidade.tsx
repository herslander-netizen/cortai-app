import { createFileRoute, Link } from "@tanstack/react-router";

import { VERSAO_DA_POLITICA, DESCRICAO_DAS_CATEGORIAS } from "@/lib/consentimento";
import { MarcaFlow } from "@/components/marca/MarcaFlow";

export const CONTATO_DE_PRIVACIDADE = {
  responsavel: "Alvo Digital — Herslander Jorge dos Santos",
  email: "falecomaalvo@gmail.com",
  site: "https://cortai.dev",
};

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Flow" },
      {
        name: "description",
        content:
          "Como o Flow coleta, usa, guarda e protege dados pessoais de negócios e clientes, conforme a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — Flow" },
      {
        property: "og:description",
        content: "Tratamento de dados, cookies, direitos do titular e contato do Flow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://cortai.dev/privacidade" },
    ],
    links: [{ rel: "canonical", href: "https://cortai.dev/privacidade" }],
  }),
  component: PaginaDePrivacidade,
});

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold text-paper">{titulo}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-mute">{children}</div>
    </section>
  );
}

function PaginaDePrivacidade() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-10">
      <MarcaFlow variante="branca" className="h-auto w-24 opacity-80" />
      <h1 className="mt-6 text-2xl font-bold text-paper">Política de Privacidade</h1>
      <p className="mt-2 text-xs text-mute2">
        Versão {VERSAO_DA_POLITICA} · última atualização em 14 de setembro de 2026
      </p>
      <p className="mt-4 text-sm leading-relaxed text-mute">
        Esta política explica como o Flow trata dados pessoais de responsáveis por negócios, equipes
        e clientes, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
      </p>

      <Bloco titulo="Quem é responsável">
        <p>
          O Flow é operado por {CONTATO_DE_PRIVACIDADE.responsavel}. Para qualquer assunto sobre
          privacidade, fale pelo e-mail{" "}
          <a className="text-gold underline" href={`mailto:${CONTATO_DE_PRIVACIDADE.email}`}>
            {CONTATO_DE_PRIVACIDADE.email}
          </a>
          .
        </p>
        <p>
          Cada negócio é responsável pelos dados dos próprios clientes; o Flow atua como operador
          dessas informações, sempre isoladas por negócio.
        </p>
      </Bloco>

      <Bloco titulo="Dados que tratamos">
        <p>
          <strong className="text-paper">Conta:</strong> nome, e-mail e, quando informado, telefone,
          usados para criar o acesso, autenticar e recuperar a senha.
        </p>
        <p>
          <strong className="text-paper">Negócio:</strong> nome, endereço, contato público,
          serviços, preços, equipe e horários, exibidos na página pública do negócio.
        </p>
        <p>
          <strong className="text-paper">Clientes do negócio:</strong> nome, telefone, histórico de
          agendamentos, fidelidade e pagamentos registrados pelo próprio negócio.
        </p>
        <p>
          <strong className="text-paper">Uso do sistema:</strong> registros técnicos de acesso e
          auditoria de ações sensíveis, necessários para segurança.
        </p>
        <p>Não pedimos dados sensíveis e não vendemos dados a terceiros.</p>
      </Bloco>

      <Bloco titulo="Por que tratamos esses dados">
        <p>
          Para executar o contrato de uso do Flow (agenda, clientes, financeiro, fidelidade e loja),
          cumprir obrigações legais, garantir segurança e prevenir fraudes, e — apenas com o seu
          consentimento — entender o uso do sistema e comunicar novidades.
        </p>
      </Bloco>

      <Bloco titulo="Cookies e tecnologias semelhantes">
        <p>Usamos quatro categorias, que você controla a qualquer momento:</p>
        <ul className="mt-2 space-y-2">
          {DESCRICAO_DAS_CATEGORIAS.map((c) => (
            <li key={c.chave}>
              <span className="font-semibold text-paper">{c.titulo}: </span>
              {c.detalhe}
            </li>
          ))}
        </ul>
        <p>
          Nada das categorias opcionais é carregado antes do seu aceite. Para revisar suas escolhas,
          abra Perfil → Privacidade e cookies.
        </p>
      </Bloco>

      <Bloco titulo="Com quem compartilhamos">
        <p>
          Apenas com fornecedores necessários para o funcionamento do serviço: hospedagem, banco de
          dados e autenticação, envio de mensagens e, quando o negócio ativa, o atendimento
          inteligente Flow. Todos tratam os dados sob instrução do Flow.
        </p>
      </Bloco>

      <Bloco titulo="Por quanto tempo guardamos">
        <p>
          Enquanto a conta estiver ativa e pelo prazo exigido por lei para registros fiscais,
          financeiros e de segurança. Encerrada a conta, os dados são excluídos ou anonimizados,
          exceto os que precisamos manter por obrigação legal.
        </p>
      </Bloco>

      <Bloco titulo="Seus direitos">
        <p>
          Você pode pedir confirmação de tratamento, acesso, correção, anonimização, portabilidade,
          exclusão e revogação do consentimento. Basta escrever para{" "}
          <a className="text-gold underline" href={`mailto:${CONTATO_DE_PRIVACIDADE.email}`}>
            {CONTATO_DE_PRIVACIDADE.email}
          </a>
          ; respondemos em até 15 dias.
        </p>
      </Bloco>

      <Bloco titulo="Segurança">
        <p>
          Os acessos são autenticados, os dados de cada negócio ficam isolados por regras no banco
          de dados, as ações sensíveis ficam registradas em auditoria e as chaves de integração
          nunca são exibidas no aplicativo depois de criadas.
        </p>
      </Bloco>

      <Bloco titulo="Mudanças nesta política">
        <p>
          Se mudarmos algo relevante, publicamos a nova versão aqui e pedimos novamente o seu
          consentimento de cookies.
        </p>
      </Bloco>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6 text-xs">
        <Link
          to="/apresentacao"
          className="rounded-lg border border-line px-4 py-2 font-semibold text-paper"
        >
          Voltar ao início
        </Link>
        <a
          href={`mailto:${CONTATO_DE_PRIVACIDADE.email}`}
          className="rounded-lg bg-gold px-4 py-2 font-bold text-ink"
        >
          Falar sobre privacidade
        </a>
      </div>
    </main>
  );
}
