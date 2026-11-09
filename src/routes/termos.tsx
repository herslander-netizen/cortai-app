import { createFileRoute, Link } from "@tanstack/react-router";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { CONTATO_DE_PRIVACIDADE } from "./privacidade";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Flow" },
      { name: "description", content: "Condições de uso do Flow para negócios, equipes e clientes." },
      { property: "og:title", content: "Termos de Uso — Flow" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cortaiapp.pages.dev/termos" },
    ],
    links: [{ rel: "canonical", href: "https://cortaiapp.pages.dev/termos" }],
  }),
  component: TermosDeUso,
});

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-bold text-paper">{titulo}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-mute">{children}</div>
    </section>
  );
}

function TermosDeUso() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-10">
      <MarcaFlow variante="branca" className="h-auto w-24 opacity-80" />
      <h1 className="mt-6 text-2xl font-bold text-paper">Termos de Uso</h1>
      <p className="mt-2 text-xs text-mute2">Versão 2026-11-08 · 8 de novembro de 2026</p>
      <p className="mt-4 text-sm leading-relaxed text-mute">
        Estes termos disciplinam o uso do Flow, plataforma de gestão, divulgação e
        agendamento para negócios de serviços, operada por {CONTATO_DE_PRIVACIDADE.responsavel}.
        As funcionalidades disponíveis dependem do plano, da configuração do negócio e das
        condições apresentadas em cada contratação.
      </p>

      <Secao titulo="1. Quem utiliza a plataforma">
        <p>
          O negócio configura serviços, valores, horários, profissionais e atendimento.
          A equipe acessa somente as funções autorizadas pelo negócio. Clientes podem
          consultar páginas públicas e solicitar agendamentos. Cada usuário deve fornecer
          dados verdadeiros e respeitar os direitos dos demais.
        </p>
      </Secao>

      <Secao titulo="2. Conta e proteção de acesso">
        <p>
          O usuário deve proteger suas credenciais, não compartilhar acessos indevidamente
          e comunicar suspeitas de uso não autorizado. O negócio administra os acessos
          de sua equipe, incluindo a remoção de permissões quando necessário. O Flow pode
          adotar medidas proporcionais para prevenir fraude e uso abusivo.
        </p>
      </Secao>

      <Secao titulo="3. Serviços, preços e agendamentos">
        <p>
          O estabelecimento é responsável por seus serviços, preços, qualidade do atendimento
          e políticas de alteração e cancelamento, observadas as leis aplicáveis. A prestação
          do serviço anunciado ao cliente ocorre, em regra, entre ele e o estabelecimento.
          O Flow oferece a infraestrutura tecnológica da agenda.
        </p>
        <p>
          O envio de uma solicitação, rascunho ou mensagem não garante reserva.
          Uma operação só deve ser considerada concluída após confirmação efetiva do sistema.
        </p>
      </Secao>

      <Secao titulo="4. Planos, pagamentos e encerramento">
        <p>
          Preços, limites de utilização, forma de cobrança, renovação e recursos incluídos
          serão os informados no momento da contratação do plano. Integrações financeiras
          podem utilizar prestadores externos. Antes de pagar, confira as condições
          apresentadas. Cancelamento, reembolso e eventual direito de arrependimento respeitam
          o contrato aplicável e a legislação brasileira, inclusive o Código de Defesa do
          Consumidor quando pertinente.
        </p>
      </Secao>

      <Secao titulo="5. WhatsApp, notificações e automações">
        <p>
          O estabelecimento deve observar as regras de contato, preferências do cliente,
          fundamento jurídico para mensagens e políticas da Meta/WhatsApp. É proibido usar
          o Flow para spam, disparos não solicitados, envio ilícito ou violação dos termos
          de terceiros. Provedores externos podem ter limites ou indisponibilidade.
        </p>
        <p>
          Automação e notificações podem falhar ou sofrer atraso; para informações críticas,
          o negócio deve confirmar a operação e manter formas de atendimento alternativas.
        </p>
      </Secao>

      <Secao titulo="6. Assistente por inteligência artificial">
        <p>
          Quando habilitada, a Flow IA pode auxiliar conversas e operações autorizadas.
          Suas respostas podem conter erros ou informações incompletas. A confirmação de
          uma ação deve seguir as permissões e os mecanismos de validação do sistema.
          A IA não substitui conferência humana em situações relevantes.
        </p>
      </Secao>

      <Secao titulo="7. Conteúdo publicado e condutas proibidas">
        <p>
          Os estabelecimentos respondem pelos conteúdos que cadastram, como imagens,
          marcas, descrições e informações comerciais, e devem possuir os direitos
          necessários para utilizá-los. Não é permitido acessar informações de outro
          negócio, explorar vulnerabilidades, prejudicar o serviço, violar propriedade
          intelectual ou realizar atividades ilícitas.
        </p>
        <p>
          A propriedade intelectual da plataforma é preservada, sem prejuízo dos direitos
          de cada usuário sobre os conteúdos que legitimamente forneceu.
        </p>
      </Secao>

      <Secao titulo="8. Privacidade e confidencialidade">
        <p>
          O tratamento de informações segue a{" "}
          <Link to="/privacidade" className="text-gold underline">Política de Privacidade</Link>{" "}
          e a{" "}
          <Link to="/cookies" className="text-gold underline">Política de Cookies</Link>.
          Os estabelecimentos são responsáveis por orientar sua equipe, proteger os dados de
          seus clientes e atender suas obrigações legais.
        </p>
      </Secao>

      <Secao titulo="9. Disponibilidade, responsabilidade e segurança">
        <p>
          Trabalhamos para manter o serviço disponível, mas a internet, integrações,
          equipamentos e provedores podem apresentar falhas. Isso não afasta direitos do
          consumidor ou responsabilidades impostas por lei. Eventos de erro devem ser
          comunicados pelos canais de suporte.
        </p>
      </Secao>

      <Secao titulo="10. Suspensão, alterações e término">
        <p>
          Poderá haver suspensão proporcional em situações de risco de segurança,
          violação relevante destes termos ou exigência legal, observados os direitos
          aplicáveis. Alterações destes termos terão data e versão identificáveis.
          Quando a legislação exigir nova concordância, ela não será presumida.
          O encerramento não impede retenções legalmente necessárias.
        </p>
      </Secao>

      <Secao titulo="11. Lei aplicável e contato">
        <p>
          Aplicam-se as leis brasileiras e as regras legais de competência, inclusive
          as normas imperativas de proteção ao consumidor. Contato:{" "}
          <a className="text-gold underline" href={`mailto:${CONTATO_DE_PRIVACIDADE.email}`}>
            {CONTATO_DE_PRIVACIDADE.email}
          </a>.
        </p>
      </Secao>

      <nav aria-label="Documentos institucionais" className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6 text-xs">
        <Link to="/privacidade" className="rounded-lg border border-line px-4 py-3 font-semibold text-paper">Privacidade</Link>
        <Link to="/cookies" className="rounded-lg border border-line px-4 py-3 font-semibold text-paper">Cookies</Link>
        <Link to="/apresentacao" className="rounded-lg border border-line px-4 py-3 font-semibold text-paper">Voltar ao início</Link>
      </nav>
    </main>
  );
}
