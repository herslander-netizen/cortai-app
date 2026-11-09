import { createFileRoute, Link } from "@tanstack/react-router";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { VERSAO_DA_POLITICA } from "@/lib/consentimento";

export const CONTATO_DE_PRIVACIDADE = {
  responsavel: "Alvo Digital — Herslander Jorge dos Santos",
  email: "falecomaalvo@gmail.com",
  site: "https://cortaiapp.pages.dev",
};

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Flow" },
      {
        name: "description",
        content: "Como o Flow trata dados pessoais de negócios, equipes e clientes, conforme a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — Flow" },
      { property: "og:description", content: "Dados pessoais, WhatsApp, IA, direitos e contato." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://cortaiapp.pages.dev/privacidade" },
    ],
    links: [{ rel: "canonical", href: "https://cortaiapp.pages.dev/privacidade" }],
  }),
  component: PaginaDePrivacidade,
});

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-bold text-paper">{titulo}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-mute">{children}</div>
    </section>
  );
}

function PaginaDePrivacidade() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-10">
      <MarcaFlow variante="branca" className="h-auto w-24 opacity-80" />
      <h1 className="mt-6 text-2xl font-bold text-paper">Política de Privacidade</h1>
      <p className="mt-2 text-xs text-mute2">
        Versão {VERSAO_DA_POLITICA} · atualizada em 8 de novembro de 2026
      </p>
      <p className="mt-4 text-sm leading-relaxed text-mute">
        Esta política explica o tratamento de dados pessoais no Flow, plataforma para gestão e
        agendamento de negócios de serviços, em conformidade com a Lei Geral de Proteção de
        Dados Pessoais (LGPD, Lei nº 13.709/2018). Abrange as páginas públicas, o aplicativo
        e as integrações habilitadas.
      </p>

      <Secao titulo="1. Quem trata as informações">
        <p>
          O Flow é operado por {CONTATO_DE_PRIVACIDADE.responsavel}. Para dúvidas ou pedidos
          sobre privacidade:{" "}
          <a className="text-gold underline" href={`mailto:${CONTATO_DE_PRIVACIDADE.email}`}>
            {CONTATO_DE_PRIVACIDADE.email}
          </a>.
        </p>
        <p>
          O Flow define as finalidades de dados da conta, suporte e segurança da plataforma.
          Quanto aos dados inseridos pelos estabelecimentos sobre seus próprios clientes, o
          negócio geralmente define as finalidades, enquanto o Flow fornece tecnologia para
          processá-los. A condição de controlador ou operador depende da atividade concreta.
        </p>
      </Secao>

      <Secao titulo="2. Dados pessoais que podem ser tratados">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-paper">Conta e equipe:</strong> nome, e-mail, telefone, identificadores de login, funções, permissões e histórico de acesso.</li>
          <li><strong className="text-paper">Negócios:</strong> endereço e contato, serviços, preços, fotos, horários, profissionais e conteúdos da página pública.</li>
          <li><strong className="text-paper">Clientes:</strong> nome, telefone, agendamentos, preferências, registros de atendimento, fidelidade e transações cadastradas pelo negócio.</li>
          <li><strong className="text-paper">Comunicações:</strong> textos, áudios, eventos de entrega e respostas quando o estabelecimento ativa WhatsApp, notificações ou automações.</li>
          <li><strong className="text-paper">Segurança e uso:</strong> IP e outros dados técnicos disponíveis nos provedores, erros, registros de auditoria, configurações e eventos de operação.</li>
          <li><strong className="text-paper">Permissões adicionais:</strong> notificações e localização, quando a função é utilizada e as permissões correspondentes são concedidas.</li>
        </ul>
        <p>
          O Flow não solicita dados sensíveis para agendamentos comuns. Estabelecimentos e
          usuários devem evitar inserir informações de saúde ou outros dados sensíveis em
          campos livres sem necessidade e fundamento jurídico adequado.
        </p>
      </Secao>

      <Secao titulo="3. Finalidades e bases legais">
        <p>
          Tratamos informações conforme a finalidade de cada operação: criação de conta,
          agendamento, gestão de clientes, cobrança, suporte, atendimento, segurança e
          cumprimento de obrigações legais. Conforme o caso, as bases legais podem envolver
          execução de contrato ou procedimentos preliminares, cumprimento de obrigação legal,
          exercício regular de direitos, legítimo interesse quando cabível ou consentimento.
        </p>
        <p>
          A autorização para tecnologias opcionais do site não equivale a autorização para
          campanhas pelo WhatsApp. Mensagens comerciais exigem fundamento jurídico e observância
          das preferências de contato e das regras do canal.
        </p>
      </Secao>

      <Secao titulo="4. WhatsApp e inteligência artificial">
        <p>
          Se o negócio ativar a funcionalidade, o Flow poderá utilizar a Meta/WhatsApp,
          integrações de conexão como Evolution API e provedores de IA para receber
          solicitações, enviar avisos e oferecer atendimento automatizado. Os fornecedores
          efetivamente utilizados dependem da configuração do estabelecimento.
        </p>
        <p>
          A assistência automatizada pode apresentar limitações. Agendamentos, alterações e
          pagamentos devem ser considerados efetivados apenas quando confirmados nos registros
          do sistema. O cliente pode recorrer ao atendimento humano disponibilizado pelo
          estabelecimento.
        </p>
      </Secao>

      <Secao titulo="5. Compartilhamento e transferências">
        <p>
          Os dados necessários podem ser tratados por prestadores de infraestrutura, como
          Cloudflare e Supabase, e por serviços habilitados de autenticação, mensageria,
          pagamentos, notificações e inteligência artificial, incluindo Meta/WhatsApp e Asaas
          quando utilizados. O compartilhamento deve respeitar as finalidades do serviço,
          a necessidade e as obrigações aplicáveis.
        </p>
        <p>
          Alguns fornecedores podem processar dados fora do Brasil. Quando houver transferência
          internacional, devem ser observadas as condições e salvaguardas legais aplicáveis.
        </p>
      </Secao>

      <Secao titulo="6. Cookies e armazenamento local">
        <p>
          Cookies e armazenamento no navegador podem manter autenticação, consentimento,
          funcionamento e preferências. Categorias facultativas de análise e marketing
          dependem de escolha quando disponibilizadas. Registros técnicos necessários à
          segurança e operação não são a mesma coisa que rastreadores opcionais.
        </p>
        <p>
          Consulte a{" "}
          <Link to="/cookies" className="text-gold underline">Política de Cookies</Link>{" "}
          para as categorias, tecnologias e como alterar suas escolhas.
        </p>
      </Secao>

      <Secao titulo="7. Retenção e segurança">
        <p>
          Os dados são conservados conforme sua finalidade, necessidades legítimas e
          obrigações legais, que variam entre registros de conta, transações e atendimento.
          Encerrar uma conta não elimina necessariamente registros que devam ser preservados
          por obrigação legal ou defesa de direitos.
        </p>
        <p>
          O Flow adota controles de acesso por estabelecimento, autenticação e registros de
          ações relevantes. Nenhum sistema oferece garantia absoluta contra incidentes.
          A equipe e os estabelecimentos também precisam proteger seus acessos.
        </p>
      </Secao>

      <Secao titulo="8. Direitos dos titulares">
        <p>
          É possível pedir confirmação do tratamento, acesso, correção, informações sobre
          compartilhamento, portabilidade quando aplicável, eliminação ou anonimização nas
          hipóteses legais, oposição e revogação do consentimento. Envie a solicitação para{" "}
          <a className="text-gold underline" href={`mailto:${CONTATO_DE_PRIVACIDADE.email}`}>
            {CONTATO_DE_PRIVACIDADE.email}
          </a>. Poderemos verificar a identidade do solicitante de forma proporcional, e os
          prazos e exceções seguirão a legislação aplicável.
        </p>
        <p>
          Pedidos referentes a dados administrados por um estabelecimento também podem ser
          direcionados ao próprio negócio responsável pelo atendimento.
        </p>
      </Secao>

      <Secao titulo="9. Crianças e adolescentes">
        <p>
          O uso e o tratamento de informações de menores devem respeitar seu melhor
          interesse e as exigências legais. Quando for exigida autorização do responsável
          legal, o agente responsável pelo tratamento deve providenciá-la.
        </p>
      </Secao>

      <Secao titulo="10. Atualizações desta política">
        <p>
          Esta política pode ser alterada para acompanhar novas funcionalidades, fornecedores
          e normas. A data e a versão serão publicadas nesta página. Quando uma mudança
          exigir consentimento adicional, será solicitada uma nova escolha, sem presumir
          autorização pelo silêncio.
        </p>
      </Secao>

      <nav aria-label="Documentos institucionais" className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6 text-xs">
        <Link to="/termos" className="rounded-lg border border-line px-4 py-3 font-semibold text-paper">Termos de Uso</Link>
        <Link to="/cookies" className="rounded-lg border border-line px-4 py-3 font-semibold text-paper">Política de Cookies</Link>
        <Link to="/apresentacao" className="rounded-lg border border-line px-4 py-3 font-semibold text-paper">Voltar ao início</Link>
      </nav>
    </main>
  );
}
