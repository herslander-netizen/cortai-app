/**
 * Textos jurídicos do Cortaí.
 *
 * Os documentos vivem em dados (e não em JSX) para que a versão, a data e o
 * conteúdo sejam auditáveis num lugar só e possam ser revisados por advogado
 * antes do lançamento comercial.
 *
 * Placeholders entre colchetes ([RAZÃO SOCIAL], [CNPJ], ...) são propositais:
 * não inventamos dados cadastrais nem contatos.
 */

export type SecaoLegal = {
  titulo: string;
  paragrafos?: string[];
  itens?: string[];
};

export type DocumentoLegal = {
  slug: string;
  titulo: string;
  /** Rótulo curto usado em rodapés e listas. */
  rotulo: string;
  resumo: string;
  versao: string;
  atualizadoEm: string;
  /** Para quem o documento é escrito — usado só como etiqueta discreta. */
  publico: "Todos" | "Barbearias" | "Clientes";
  secoes: SecaoLegal[];
};

export const CONTROLADOR = "[RAZÃO SOCIAL]";
export const CNPJ = "[CNPJ]";
export const ENDERECO = "[ENDEREÇO COMPLETO]";
export const EMAIL_JURIDICO = "[E-MAIL JURÍDICO]";
export const EMAIL_PRIVACIDADE = "[E-MAIL DE PRIVACIDADE]";
export const ENCARREGADO = "[ENCARREGADO PELO TRATAMENTO DE DADOS (DPO)]";

const IDENTIFICACAO: SecaoLegal = {
  titulo: "Quem opera o Cortaí",
  paragrafos: [
    `O Cortaí é uma plataforma de agendamento e gestão para barbearias, operada por ${CONTROLADOR}, inscrita no CNPJ ${CNPJ}, com endereço em ${ENDERECO}.`,
    `Contato jurídico: ${EMAIL_JURIDICO}. Contato para assuntos de privacidade e proteção de dados: ${EMAIL_PRIVACIDADE}.`,
  ],
};

const TERMOS_USO: DocumentoLegal = {
  slug: "termos-de-uso",
  titulo: "Termos de Uso",
  rotulo: "Termos de Uso",
  resumo: "As regras gerais para usar o Cortaí, válidas para todas as pessoas e estabelecimentos.",
  versao: "1.0",
  atualizadoEm: "13 de setembro de 2026",
  publico: "Todos",
  secoes: [
    IDENTIFICACAO,
    {
      titulo: "1. O que estes termos regulam",
      paragrafos: [
        "Estes Termos de Uso regulam o acesso e a utilização do Cortaí por qualquer pessoa: clientes que agendam horários, barbearias que usam a plataforma para gerir o próprio negócio e profissionais vinculados a essas barbearias.",
        "Ao criar uma conta ou utilizar o Cortaí, você declara que leu e concorda com estes termos e com a Política de Privacidade. Se não concordar, não utilize a plataforma.",
        "Barbearias e estabelecimentos também estão sujeitos aos Termos para Barbearias, que complementam este documento.",
      ],
    },
    {
      titulo: "2. O que o Cortaí é (e o que não é)",
      paragrafos: [
        "O Cortaí é uma ferramenta de tecnologia. Nós disponibilizamos agenda, cadastro de clientes, serviços, profissionais, loja, programa de fidelidade, página pública da barbearia e recursos relacionados.",
        "O Cortaí não presta serviços de barbearia, estética ou cuidados pessoais, não emprega os profissionais das barbearias e não participa da execução do atendimento. O serviço é prestado diretamente pelo estabelecimento ao cliente.",
        "O Cortaí não é parte no contrato entre cliente e barbearia. Preço, forma de pagamento, qualidade, garantia, horário de funcionamento e condições de atendimento são definidos e cumpridos pelo estabelecimento.",
      ],
    },
    {
      titulo: "3. Cadastro, conta e credenciais",
      paragrafos: [
        "Para usar a maior parte dos recursos é necessário criar uma conta com informações verdadeiras, completas e atualizadas.",
        "A conta é pessoal e intransferível. Você é responsável por manter suas credenciais em sigilo e por todas as ações realizadas com seu acesso.",
        "Se suspeitar de uso indevido da sua conta, comunique-nos imediatamente para que possamos adotar as medidas cabíveis.",
      ],
      itens: [
        "É proibido criar contas com dados de terceiros sem autorização.",
        "É proibido compartilhar credenciais de acesso administrativo de uma barbearia com quem não tenha vínculo com o estabelecimento.",
        "Contas de equipe devem receber apenas as permissões necessárias para a função exercida.",
      ],
    },
    {
      titulo: "4. Uso permitido",
      paragrafos: ["Você se compromete a usar o Cortaí de forma lícita, respeitosa e conforme estes termos."],
      itens: [
        "Não tentar acessar dados, contas ou áreas às quais não tenha autorização.",
        "Não utilizar mecanismos automatizados para extrair dados em massa da plataforma.",
        "Não interferir no funcionamento, na segurança ou na infraestrutura do serviço.",
        "Não inserir conteúdo ilícito, ofensivo, enganoso ou que viole direitos de terceiros.",
        "Não utilizar o Cortaí para enviar comunicações não solicitadas a clientes de outras barbearias.",
      ],
    },
    {
      titulo: "5. Disponibilidade, manutenção e falhas técnicas",
      paragrafos: [
        "Trabalhamos para manter o Cortaí disponível e estável, mas nenhum serviço digital é imune a interrupções. Pode haver indisponibilidade por manutenção programada, correções emergenciais, falhas de provedores de infraestrutura, problemas de conectividade ou eventos fora do nosso controle.",
        "Sempre que possível, manutenções programadas relevantes serão comunicadas com antecedência razoável.",
        "Recomendamos que a barbearia mantenha um procedimento alternativo mínimo para atendimento em caso de indisponibilidade temporária.",
      ],
    },
    {
      titulo: "6. Responsabilidades de cada parte",
      paragrafos: [
        "Responsabilidade do Cortaí: manter a plataforma em funcionamento conforme descrito, adotar medidas de segurança razoáveis, tratar dados pessoais conforme a legislação aplicável e comunicar alterações relevantes.",
        "Responsabilidade da barbearia: a veracidade das informações publicadas (serviços, preços, horários, endereço, profissionais), a execução e a qualidade do atendimento, o cumprimento das obrigações fiscais, trabalhistas, sanitárias e consumeristas, e a gestão adequada dos dados dos seus clientes.",
        "Responsabilidade do cliente: fornecer informações corretas, comparecer aos horários agendados ou cancelar com antecedência, e tratar profissionais e estabelecimentos com respeito.",
        "O Cortaí não se exime de responsabilidade por falhas que lhe sejam atribuíveis. Não respondemos, porém, por danos decorrentes exclusivamente da conduta da barbearia, do cliente ou de terceiros, nem por eventos alheios ao nosso controle.",
      ],
    },
    {
      titulo: "7. Integrações e serviços de terceiros",
      paragrafos: [
        "O Cortaí pode se integrar a serviços de terceiros, como provedores de hospedagem, autenticação, envio de mensagens e, no futuro, meios de pagamento. Esses serviços possuem termos próprios e podem sofrer indisponibilidade independentemente do Cortaí.",
        "Links para sites externos, redes sociais e páginas de parceiros são oferecidos por conveniência e não implicam endosso do conteúdo de terceiros.",
      ],
    },
    {
      titulo: "8. Propriedade intelectual",
      paragrafos: [
        "A marca Cortaí, o software, a interface, os textos, a identidade visual e a documentação da plataforma pertencem ao Cortaí e são protegidos pela legislação aplicável.",
        "O conteúdo enviado pela barbearia (logo, fotos, descrições, nomes de serviços) continua pertencendo à barbearia, que concede ao Cortaí uma licença limitada e não exclusiva para exibir esse conteúdo nas páginas e funcionalidades da plataforma enquanto a conta estiver ativa.",
        "É vedada a reprodução, engenharia reversa ou redistribuição do software sem autorização expressa.",
      ],
    },
    {
      titulo: "9. Modelo comercial e sua evolução",
      paragrafos: [
        "O Cortaí pode evoluir comercialmente. Isso inclui, entre outras possibilidades, a oferta de planos pagos, a cobrança por funcionalidades específicas, a cobrança de percentual ou comissão relacionada a agendamentos e a eventual intermediação de pagamentos.",
        "Nenhuma dessas condições passa a valer de forma automática ou silenciosa. Qualquer cobrança nova ou alteração de condição comercial dependerá de regras comerciais específicas, comunicação prévia ao usuário afetado, publicação de nova versão dos termos aplicáveis e respeito ao prazo de vigência informado.",
        "Recursos atualmente oferecidos sem custo podem passar a ser pagos no futuro, sempre com aviso prévio e com a possibilidade de o usuário recusar a nova condição e encerrar o uso do recurso ou da conta.",
      ],
    },
    {
      titulo: "10. Suspensão e encerramento de contas",
      paragrafos: [
        "Você pode encerrar sua conta a qualquer momento. A barbearia deve observar as condições específicas previstas nos Termos para Barbearias.",
        "Podemos suspender ou encerrar contas em caso de violação destes termos, uso fraudulento, risco à segurança da plataforma, determinação legal ou inadimplência de valores devidos, quando aplicável.",
        "Sempre que a situação permitir, avisaremos antes e daremos oportunidade de correção. Em casos de risco grave e imediato, a suspensão pode ser preventiva.",
      ],
    },
    {
      titulo: "11. Suporte",
      paragrafos: [
        `O suporte é prestado pelos canais indicados na plataforma e pelo contato ${EMAIL_JURIDICO} para assuntos contratuais. Não garantimos prazo de resposta fixo, salvo quando previsto em condição comercial contratada.`,
        "O suporte técnico do Cortaí não resolve questões relativas ao atendimento prestado pela barbearia, que devem ser tratadas diretamente com o estabelecimento.",
      ],
    },
    {
      titulo: "12. Alterações da plataforma e dos termos",
      paragrafos: [
        "Podemos alterar, incluir ou descontinuar funcionalidades para evoluir o produto. Mudanças relevantes que afetem o uso serão comunicadas.",
        "Estes termos podem ser atualizados. A versão e a data de atualização aparecem no início deste documento e as regras de alteração estão descritas na Política de Alterações dos Documentos.",
      ],
    },
    {
      titulo: "13. Legislação aplicável e foro",
      paragrafos: [
        "Estes termos são regidos pela legislação brasileira, incluindo o Código de Defesa do Consumidor, o Marco Civil da Internet e a Lei Geral de Proteção de Dados, quando aplicáveis.",
        "Fica eleito o foro do domicílio do consumidor para as relações de consumo e, nas demais hipóteses, o foro de [COMARCA], salvo disposição legal em contrário.",
      ],
    },
  ],
};

const TERMOS_BARBEARIAS: DocumentoLegal = {
  slug: "termos-barbearias",
  titulo: "Termos para Barbearias e Estabelecimentos",
  rotulo: "Termos para Barbearias",
  resumo: "Condições específicas para quem usa o Cortaí para gerir uma barbearia ou estabelecimento.",
  versao: "1.0",
  atualizadoEm: "13 de setembro de 2026",
  publico: "Barbearias",
  secoes: [
    {
      titulo: "1. Aplicação",
      paragrafos: [
        "Este documento complementa os Termos de Uso e se aplica a barbearias, estabelecimentos e profissionais que utilizam o Cortaí para gerir agenda, clientes, serviços, equipe, loja e página pública.",
        "Em caso de divergência sobre matéria específica de estabelecimento, prevalece este documento.",
      ],
    },
    {
      titulo: "2. Cadastro do estabelecimento",
      paragrafos: [
        "O cadastro deve ser feito por pessoa com poderes para representar o estabelecimento. As informações fornecidas devem ser verdadeiras e mantidas atualizadas.",
      ],
      itens: [
        "Nome, descrição, endereço e contatos exibidos ao público são de responsabilidade do estabelecimento.",
        "Logo, capa e imagens enviadas devem ser de uso autorizado.",
        "Serviços, durações e preços devem refletir a realidade praticada.",
        "Horários de funcionamento e disponibilidade devem ser mantidos corretos na agenda.",
      ],
    },
    {
      titulo: "3. Profissionais e equipe",
      paragrafos: [
        "O estabelecimento é o único responsável pelo vínculo com seus profissionais e pela relação trabalhista, contratual ou de parceria existente entre eles. O Cortaí não é empregador, contratante nem intermediário dessa relação.",
        "O acesso de cada membro da equipe deve ser criado individualmente, com o perfil e as permissões adequados à função. O estabelecimento responde pelo uso feito por sua equipe.",
      ],
    },
    {
      titulo: "4. Agenda, clientes e dados",
      paragrafos: [
        "Os dados dos clientes cadastrados pelo estabelecimento são tratados pelo Cortaí conforme a Política de Privacidade e as instruções do estabelecimento no uso da plataforma.",
        "O estabelecimento deve tratar esses dados apenas para finalidades legítimas ligadas ao atendimento e ao relacionamento com o cliente, respeitando a legislação de proteção de dados.",
        "O envio de comunicações a clientes deve observar consentimento e opções de descadastramento, quando exigidos.",
      ],
    },
    {
      titulo: "5. Obrigações do estabelecimento",
      itens: [
        "Prestar o serviço nas condições anunciadas na plataforma.",
        "Honrar os agendamentos confirmados ou comunicar alterações com a maior antecedência possível.",
        "Cumprir obrigações fiscais, trabalhistas, sanitárias e de defesa do consumidor.",
        "Manter a política de cancelamento e no-show do estabelecimento clara para o cliente.",
        "Não utilizar a plataforma para práticas enganosas, discriminatórias ou ilícitas.",
      ],
    },
    {
      titulo: "6. Planos, taxas e comissões futuras",
      paragrafos: [
        "O Cortaí pode adotar planos pagos, cobrança por funcionalidades, taxas de uso ou percentual/comissão sobre agendamentos, bem como intermediação de pagamentos, conforme a evolução do produto.",
        "Essas condições só se tornam exigíveis após: (i) definição de regras comerciais específicas; (ii) comunicação prévia ao estabelecimento pelos canais de contato cadastrados; (iii) publicação da versão correspondente deste documento; e (iv) início do prazo de vigência informado.",
        "O estabelecimento que não concordar com a nova condição poderá recusá-la e encerrar o uso do recurso afetado ou da conta antes do início da vigência, sem cobrança retroativa.",
        "Enquanto uma condição comercial não estiver expressamente contratada, não há cobrança de percentual sobre agendamentos.",
      ],
    },
    {
      titulo: "7. Inadimplência",
      paragrafos: [
        "Quando houver valores contratados e não pagos, o Cortaí poderá restringir funcionalidades pagas, suspender o acesso administrativo ou encerrar a conta, sempre após comunicação e prazo razoável para regularização.",
        "Restrições por inadimplência serão aplicadas de modo a preservar, na medida do possível, o acesso do estabelecimento aos seus próprios dados durante o período de regularização.",
      ],
    },
    {
      titulo: "8. Encerramento e exportação de dados",
      paragrafos: [
        "O estabelecimento pode encerrar o uso da plataforma a qualquer momento, observadas as condições de eventual plano contratado.",
        "Quando a funcionalidade estiver disponível, o estabelecimento poderá exportar seus dados cadastrais e operacionais antes do encerramento. Enquanto não houver exportação automatizada, o pedido pode ser feito pelos canais de contato e será atendido em prazo razoável, observadas limitações técnicas e legais.",
        "Após o encerramento, os dados são mantidos ou eliminados conforme os prazos previstos na Política de Privacidade.",
      ],
    },
    {
      titulo: "9. Página pública e loja",
      paragrafos: [
        "A página pública e a loja exibem apenas o que o estabelecimento configurar. O Cortaí não revisa previamente esse conteúdo, mas pode remover material manifestamente ilícito, enganoso ou que viole direitos de terceiros.",
        "A venda de produtos pela loja, quando ativada, é realizada pelo próprio estabelecimento, que responde por descrição, preço, estoque, entrega e garantia.",
      ],
    },
    {
      titulo: "10. Suporte e acesso administrativo do Cortaí",
      paragrafos: [
        "A equipe do Cortaí pode acessar configurações do estabelecimento para prestar suporte, corrigir problemas e ajustar informações mediante solicitação ou necessidade técnica, com registro de auditoria.",
        "Esse acesso de suporte não se confunde com acesso à conta pessoal de usuários e não envolve acesso a senhas.",
      ],
    },
  ],
};

const PRIVACIDADE: DocumentoLegal = {
  slug: "privacidade",
  titulo: "Política de Privacidade",
  rotulo: "Política de Privacidade",
  resumo: "Como o Cortaí trata dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD).",
  versao: "1.0",
  atualizadoEm: "13 de setembro de 2026",
  publico: "Todos",
  secoes: [
    {
      titulo: "1. Controlador e encarregado",
      paragrafos: [
        `Controlador dos dados tratados na operação da plataforma: ${CONTROLADOR}, CNPJ ${CNPJ}, ${ENDERECO}.`,
        `Encarregado pelo tratamento de dados pessoais: ${ENCARREGADO}. Contato: ${EMAIL_PRIVACIDADE}.`,
        "Quando a barbearia utiliza a plataforma para gerir seus próprios clientes, ela atua como controladora dos dados dos seus clientes e o Cortaí atua como operador, tratando esses dados conforme as instruções do estabelecimento e a legislação aplicável.",
      ],
    },
    {
      titulo: "2. Categorias de dados tratados",
      itens: [
        "Dados de cadastro: nome, e-mail, telefone e senha em formato protegido.",
        "Dados de perfil: tipo de conta (cliente, barbearia, equipe) e vínculos com estabelecimentos.",
        "Dados de agendamento: serviço escolhido, profissional, data, horário, situação do agendamento e histórico.",
        "Dados operacionais da barbearia: serviços, preços, horários, profissionais, produtos, vendas e registros financeiros lançados pelo estabelecimento.",
        "Dados de relacionamento: observações e preferências registradas pelo estabelecimento sobre o cliente, avaliações e participação em programas de fidelidade e indicação.",
        "Dados técnicos: registros de acesso e de uso necessários à segurança e ao funcionamento do serviço.",
      ],
      paragrafos: [
        "Não solicitamos dados sensíveis. Caso o estabelecimento registre observações de saúde ou características pessoais na ficha do cliente, ele é responsável por obter a base legal adequada para esse tratamento.",
      ],
    },
    {
      titulo: "3. Finalidades e bases legais",
      itens: [
        "Criar e manter a conta e permitir o acesso à plataforma — execução de contrato.",
        "Realizar e gerir agendamentos entre cliente e barbearia — execução de contrato.",
        "Permitir que a barbearia gerencie seu negócio na plataforma — execução de contrato e legítimo interesse do estabelecimento.",
        "Manter a segurança da plataforma, prevenir fraudes e apurar uso indevido — legítimo interesse e cumprimento de obrigação legal.",
        "Atender solicitações de suporte — execução de contrato.",
        "Cumprir obrigações legais, regulatórias e guarda de registros de acesso — cumprimento de obrigação legal.",
        "Enviar comunicações promocionais sobre o Cortaí — consentimento, revogável a qualquer momento.",
      ],
    },
    {
      titulo: "4. Compartilhamento",
      paragrafos: [
        "Não vendemos dados pessoais. O compartilhamento ocorre apenas quando necessário:",
      ],
      itens: [
        "Com a barbearia escolhida pelo cliente, para viabilizar o agendamento e o atendimento.",
        "Com prestadores de infraestrutura, hospedagem, banco de dados, autenticação e comunicação que atuam como operadores, sob obrigação contratual de confidencialidade e segurança.",
        "Com autoridades públicas, quando houver obrigação legal, ordem judicial ou requisição válida.",
        "Em eventual reorganização societária, mantendo-se as condições desta política.",
      ],
    },
    {
      titulo: "5. Armazenamento e transferência internacional",
      paragrafos: [
        "Os dados são armazenados em infraestrutura de nuvem contratada pelo Cortaí, com controles de acesso e segurança oferecidos pelo provedor.",
        "Caso o provedor mantenha servidores fora do Brasil, a transferência internacional observará as hipóteses e garantias previstas na LGPD.",
      ],
    },
    {
      titulo: "6. Segurança",
      paragrafos: [
        "Adotamos medidas técnicas e administrativas razoáveis para proteger os dados, incluindo controle de acesso por perfil e permissão, regras de acesso no banco de dados, tráfego criptografado e armazenamento de senhas em formato irreversível.",
        "Nenhum sistema é totalmente imune a incidentes. Por isso mantemos procedimentos de resposta e melhoria contínua.",
      ],
    },
    {
      titulo: "7. Retenção e eliminação",
      paragrafos: [
        "Mantemos os dados enquanto a conta estiver ativa e pelo tempo necessário às finalidades descritas.",
        "Após o encerramento da conta, podemos reter determinados dados pelo prazo exigido por lei, para exercício regular de direitos ou para registros financeiros e de auditoria, eliminando-os ao fim do prazo aplicável.",
        "Registros de acesso são mantidos pelo prazo previsto no Marco Civil da Internet.",
      ],
    },
    {
      titulo: "8. Direitos do titular",
      paragrafos: ["Conforme a LGPD, você pode solicitar a qualquer momento:"],
      itens: [
        "Confirmação da existência de tratamento e acesso aos dados.",
        "Correção de dados incompletos, inexatos ou desatualizados.",
        "Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.",
        "Portabilidade, nos termos da regulamentação aplicável.",
        "Informação sobre compartilhamentos realizados.",
        "Revogação do consentimento, quando o tratamento se basear nele.",
        "Oposição a tratamento fundado em legítimo interesse.",
      ],
    },
    {
      titulo: "9. Como exercer seus direitos",
      paragrafos: [
        `Envie a solicitação para ${EMAIL_PRIVACIDADE}, identificando-se adequadamente. Responderemos em prazo razoável e, nos casos previstos em lei, dentro do prazo legal.`,
        "Pedidos relativos a dados registrados por uma barbearia podem ser encaminhados a ela, por ser a controladora daquele tratamento; nesse caso, apoiamos o estabelecimento no atendimento.",
      ],
    },
    {
      titulo: "10. Incidentes de segurança",
      paragrafos: [
        "Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, adotaremos as medidas de contenção cabíveis e faremos a comunicação à Autoridade Nacional de Proteção de Dados e aos titulares afetados, nos termos da legislação.",
      ],
    },
    {
      titulo: "11. Crianças e adolescentes",
      paragrafos: [
        "O Cortaí não se destina ao uso autônomo por menores de 16 anos. O agendamento para menores deve ser realizado por responsável legal.",
      ],
    },
    {
      titulo: "12. Atualizações desta política",
      paragrafos: [
        "Esta política pode ser atualizada para refletir mudanças no produto ou na legislação. A versão e a data constam no início do documento.",
      ],
    },
  ],
};

const COOKIES: DocumentoLegal = {
  slug: "cookies",
  titulo: "Política de Cookies",
  rotulo: "Cookies",
  resumo: "O que guardamos no seu navegador e para quê.",
  versao: "1.0",
  atualizadoEm: "13 de setembro de 2026",
  publico: "Todos",
  secoes: [
    {
      titulo: "1. O que usamos",
      paragrafos: [
        "O Cortaí utiliza cookies e tecnologias equivalentes de armazenamento local do navegador apenas no necessário para o funcionamento do serviço e para lembrar preferências simples.",
        "Descrevemos abaixo somente o que realmente existe hoje na plataforma.",
      ],
    },
    {
      titulo: "2. Essenciais",
      paragrafos: [
        "Necessários para autenticar o acesso, manter a sessão iniciada, proteger contra requisições maliciosas e permitir a navegação entre as áreas da plataforma.",
        "Sem eles não é possível entrar na conta nem usar a área do cliente ou a gestão da barbearia. Por isso não podem ser desativados dentro do produto.",
      ],
    },
    {
      titulo: "3. Preferências",
      paragrafos: [
        "Guardam escolhas locais que melhoram a experiência, como a dispensa do convite para instalar o aplicativo e preferências de exibição de dicas.",
        "São armazenados apenas no seu dispositivo e podem ser apagados limpando os dados do site no navegador.",
      ],
    },
    {
      titulo: "4. Analíticos e publicidade",
      paragrafos: [
        "Atualmente o Cortaí não utiliza cookies de publicidade nem ferramentas de rastreamento de terceiros para perfilamento comportamental.",
        "Caso venhamos a adotar medição de uso ou análise estatística, esta política será atualizada com a identificação da ferramenta, da finalidade e da forma de controle pelo usuário.",
      ],
    },
    {
      titulo: "5. Como controlar",
      paragrafos: [
        "Você pode apagar ou bloquear cookies nas configurações do seu navegador. Bloquear os essenciais impedirá o login e o uso das áreas autenticadas.",
      ],
    },
  ],
};

const AGENDAMENTO: DocumentoLegal = {
  slug: "agendamento",
  titulo: "Política de Agendamento, Cancelamento e No-show",
  rotulo: "Agendamento e cancelamento",
  resumo: "Como funcionam marcação, confirmação, atraso, cancelamento e falta.",
  versao: "1.0",
  atualizadoEm: "13 de setembro de 2026",
  publico: "Todos",
  secoes: [
    {
      titulo: "1. Como o agendamento funciona",
      paragrafos: [
        "O cliente escolhe serviço, profissional, dia e horário entre as opções disponibilizadas pela barbearia. O agendamento é registrado na agenda do estabelecimento.",
        "A disponibilidade exibida depende das configurações feitas pela barbearia. O Cortaí não controla a agenda do estabelecimento nem garante a existência de horários.",
      ],
    },
    {
      titulo: "2. Confirmação e alterações pela barbearia",
      paragrafos: [
        "A barbearia pode confirmar, remarcar ou cancelar um agendamento por motivos operacionais, como imprevistos com o profissional ou fechamento do estabelecimento.",
        "Nesses casos, a comunicação ao cliente e a solução são de responsabilidade da barbearia.",
      ],
    },
    {
      titulo: "3. Cancelamento pelo cliente",
      paragrafos: [
        "O cliente pode cancelar pela plataforma, quando o recurso estiver disponível, ou diretamente com a barbearia.",
        "Pedimos que o cancelamento seja feito com a maior antecedência possível para que o horário possa ser oferecido a outra pessoa.",
        "Prazos mínimos de antecedência, quando existirem, são definidos pela barbearia e devem ser informados por ela ao cliente.",
      ],
    },
    {
      titulo: "4. Atraso",
      paragrafos: [
        "O atraso pode reduzir o tempo de atendimento ou inviabilizar a execução do serviço, conforme a agenda do profissional.",
        "A tolerância de atraso é definida pela barbearia.",
      ],
    },
    {
      titulo: "5. No-show (falta sem aviso)",
      paragrafos: [
        "Considera-se no-show a ausência do cliente no horário marcado sem cancelamento prévio.",
        "A barbearia pode registrar a falta no histórico do cliente e adotar medidas próprias, como exigir confirmação prévia em agendamentos futuros ou restringir o agendamento on-line, conforme a política do estabelecimento.",
        "Quando a barbearia utilizar programa de fidelidade ou plano de créditos, a falta pode consumir crédito, se essa regra estiver ativada pelo estabelecimento e for previamente informada ao cliente.",
      ],
    },
    {
      titulo: "6. Cobranças",
      paragrafos: [
        "O Cortaí não realiza cobrança de multa por cancelamento ou no-show. Eventual cobrança é definida e realizada pela própria barbearia, conforme a legislação de defesa do consumidor e mediante informação prévia e clara ao cliente.",
      ],
    },
    {
      titulo: "7. Fila de espera",
      paragrafos: [
        "Quando o estabelecimento ativar a fila de espera, a entrada na fila não garante atendimento nem horário específico. A ordem e o aviso dependem da operação da barbearia.",
      ],
    },
  ],
};

const CONDUTA: DocumentoLegal = {
  slug: "conduta",
  titulo: "Política de Conteúdo e Conduta",
  rotulo: "Conteúdo e conduta",
  resumo: "O que pode e o que não pode ser publicado ou feito dentro do Cortaí.",
  versao: "1.0",
  atualizadoEm: "13 de setembro de 2026",
  publico: "Todos",
  secoes: [
    {
      titulo: "1. Conteúdo publicado",
      paragrafos: [
        "Textos, imagens, nomes de serviços, descrições, avaliações e comentários são de responsabilidade de quem os publica.",
        "Ao publicar, você declara ter os direitos necessários sobre o conteúdo.",
      ],
    },
    {
      titulo: "2. Conteúdo proibido",
      itens: [
        "Conteúdo ilícito, discriminatório, violento ou que incite ódio.",
        "Conteúdo enganoso sobre preços, serviços, resultados ou qualificações.",
        "Material que viole direitos autorais, marcas ou imagem de terceiros.",
        "Dados pessoais de terceiros publicados sem autorização.",
        "Conteúdo sexual explícito ou impróprio ao contexto do serviço.",
      ],
    },
    {
      titulo: "3. Avaliações",
      paragrafos: [
        "Avaliações devem refletir experiência real de atendimento. É proibido criar avaliações falsas, comprar avaliações ou pressionar clientes para alterar opiniões.",
        "Avaliações não são editadas pelo Cortaí por discordância da barbearia, mas podem ser removidas quando violarem esta política.",
      ],
    },
    {
      titulo: "4. Conduta entre pessoas",
      paragrafos: [
        "Espera-se respeito mútuo entre clientes, profissionais e estabelecimentos. Assédio, ameaça, injúria e discriminação não são tolerados.",
      ],
    },
    {
      titulo: "5. Denúncias e medidas",
      paragrafos: [
        `Conteúdos ou condutas que violem esta política podem ser denunciados por ${EMAIL_JURIDICO}.`,
        "Após análise, podemos remover conteúdo, notificar o responsável, restringir recursos ou suspender a conta, conforme a gravidade e a reincidência. Sempre que possível, a pessoa afetada será informada e poderá se manifestar.",
      ],
    },
  ],
};

const PAGAMENTOS: DocumentoLegal = {
  slug: "pagamentos",
  titulo: "Política de Pagamentos",
  rotulo: "Pagamentos",
  resumo: "Como os pagamentos funcionam hoje e como funcionarão caso o Cortaí passe a intermediá-los.",
  versao: "1.0 (estrutura preparada)",
  atualizadoEm: "13 de setembro de 2026",
  publico: "Todos",
  secoes: [
    {
      titulo: "1. Situação atual",
      paragrafos: [
        "Hoje o Cortaí não processa pagamentos e não intermedeia valores entre cliente e barbearia.",
        "O pagamento do serviço e dos produtos é feito diretamente ao estabelecimento, pelos meios que ele aceitar. Os registros financeiros existentes na plataforma são apenas controles internos lançados pela própria barbearia.",
        "As funções de caixa, vendas, fiado e carteira são ferramentas de anotação e organização. Elas não movimentam dinheiro e não constituem serviço de pagamento.",
      ],
    },
    {
      titulo: "2. Estrutura prevista para ativação futura",
      paragrafos: [
        "Caso o Cortaí passe a oferecer cobrança de planos, cobrança por funcionalidades, percentual sobre agendamentos ou intermediação de pagamentos, as regras abaixo passarão a valer na medida do que for efetivamente ativado.",
      ],
      itens: [
        "Identificação do meio de pagamento ou instituição utilizada, com os respectivos termos.",
        "Descrição clara do valor, da forma de cálculo, da periodicidade e do momento da cobrança.",
        "Regras de emissão de comprovante e documento fiscal.",
        "Regras de estorno, reembolso e contestação.",
        "Regras de repasse à barbearia, prazos e eventuais retenções.",
        "Tratamento de inadimplência e de suspensão de recursos pagos.",
      ],
    },
    {
      titulo: "3. Condições para entrar em vigor",
      paragrafos: [
        "Nenhuma cobrança ou intermediação passa a existir automaticamente. A ativação depende de: definição da regra comercial, comunicação prévia ao usuário afetado, publicação da versão correspondente desta política e dos termos aplicáveis, e início do prazo de vigência informado.",
        "O usuário que não concordar poderá recusar a nova condição e encerrar o uso do recurso ou da conta antes da vigência, sem cobrança retroativa.",
      ],
    },
    {
      titulo: "4. Enquanto isso",
      paragrafos: [
        "Divergências sobre valores cobrados pela barbearia devem ser tratadas diretamente com o estabelecimento, que é o prestador do serviço e o responsável pela cobrança.",
      ],
    },
  ],
};

const ALTERACOES: DocumentoLegal = {
  slug: "alteracoes",
  titulo: "Política de Alterações dos Documentos",
  rotulo: "Alterações dos documentos",
  resumo: "Como versionamos, comunicamos e colocamos em vigor mudanças nestes documentos.",
  versao: "1.0",
  atualizadoEm: "13 de setembro de 2026",
  publico: "Todos",
  secoes: [
    {
      titulo: "1. Versionamento",
      paragrafos: [
        "Cada documento possui número de versão e data de última atualização exibidos no início da página.",
        "Correções de redação, ajustes de clareza e atualizações de contato geram alteração menor da versão. Mudanças que afetem direitos, obrigações ou condições comerciais geram alteração maior.",
      ],
    },
    {
      titulo: "2. Comunicação",
      paragrafos: [
        "Alterações relevantes são comunicadas pelos canais de contato cadastrados e/ou por aviso dentro da plataforma antes do início da vigência.",
        "Alterações menores passam a valer a partir da publicação, com a data indicada no documento.",
      ],
    },
    {
      titulo: "3. Novo aceite",
      paragrafos: [
        "Quando a mudança for relevante, poderemos solicitar novo aceite dentro da plataforma. O aceite registra o documento, a versão, a data e a hora e o usuário que aceitou.",
        "O aviso de novo aceite é apresentado de forma não bloqueante sempre que possível, permitindo continuar usando o Cortaí enquanto o prazo de vigência não se encerra.",
      ],
    },
    {
      titulo: "4. Recusa",
      paragrafos: [
        "Quem não concordar com a nova versão pode encerrar a conta antes do início da vigência. Nesse caso, aplicam-se as regras de encerramento previstas nos termos aplicáveis.",
      ],
    },
    {
      titulo: "5. Histórico",
      paragrafos: [
        `Versões anteriores podem ser solicitadas por ${EMAIL_JURIDICO}.`,
      ],
    },
  ],
};

export const DOCUMENTOS: DocumentoLegal[] = [
  TERMOS_USO,
  TERMOS_BARBEARIAS,
  PRIVACIDADE,
  COOKIES,
  AGENDAMENTO,
  CONDUTA,
  PAGAMENTOS,
  ALTERACOES,
];

export function acharDocumento(slug: string) {
  return DOCUMENTOS.find((doc) => doc.slug === slug) ?? null;
}

/** Documentos cujo aceite é registrado no cadastro. */
export const DOCUMENTOS_DE_ACEITE = ["termos-de-uso", "privacidade"] as const;

/**
 * Versão combinada do aceite. Ao subir esta constante, pedimos novo aceite
 * de forma não bloqueante a quem já tinha aceitado a versão anterior.
 */
export const VERSAO_DO_ACEITE = "2026-09-13.1";
