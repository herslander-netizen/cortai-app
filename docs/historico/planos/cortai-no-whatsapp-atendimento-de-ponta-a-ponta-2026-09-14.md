# CortAI no WhatsApp — atendimento de ponta a ponta

Objetivo: o cliente manda mensagem no WhatsApp da barbearia, o CortAI entende, consulta os dados reais do Cortaí, responde, agenda/cancela/remarca e passa para atendimento humano quando preciso.

O que já existe e será reaproveitado (nada será recriado): as ações operacionais do atendente (barbearia, serviços, profissionais, disponibilidade real, cliente, criar/remarcar/cancelar agendamento), o token por barbearia, a tela de Integrações, as permissões da equipe e o isolamento por barbearia.

## Dependência externa (importante)

A conexão por QR Code só existe se houver um serviço de WhatsApp rodando fora do Cortaí (o Cortaí é um site; ele não pode manter a sessão do WhatsApp aberta). Vou construir toda a integração com esse serviço e deixar documentado o que precisa ser publicado no servidor.

Enquanto o endereço e a chave desse serviço não forem configurados, a tela mostra honestamente "Serviço de WhatsApp não configurado" — sem QR falso, sem conexão simulada.

## Etapas

### 1. Banco (isolado por barbearia, com RLS e auditoria)
- conexões de WhatsApp (sessão, número, nome, status, QR temporário com validade, últimos erros)
- conversas (telefone, cliente, status: CortAI / humano / encerrada)
- mensagens (entrada e saída, tipo, conteúdo, id externo para não processar duas vezes)
- configurações do atendimento e automações por barbearia
- registro das ações da IA
- novas permissões: ver CortAI, gerenciar conversas, assumir conversa, configurar automações, gerenciar WhatsApp

### 2. Camada do provedor de WhatsApp
Interface única (criar sessão, obter QR, status, enviar mensagem, desconectar, reconectar) com a implementação do provedor configurável por variáveis de ambiente. Trocar de provedor depois não mexe no resto do sistema.

### 3. Entrada de eventos
Endpoint público para o serviço de WhatsApp avisar: QR atualizado, conectado, desconectado, erro, mensagem recebida, mensagem entregue. Assinatura conferida, entrega repetida ignorada.

### 4. Cérebro do atendimento
Serviço no servidor que identifica a barbearia e o cliente, carrega o contexto da conversa (entende "o segundo horário"), decide a intenção, usa só as ferramentas controladas para consultar dados reais e responde. Nunca inventa preço, horário, serviço ou confirmação; nunca confirma o que falhou; pede confirmação antes de agendar ou cancelar; passa para humano quando o cliente pedir.

### 5. Tela do CortAI no painel
- **WhatsApp**: não conectado → "Conectar WhatsApp" → QR real com contagem de expiração e "Gerar novo QR" → conectando → conectado (número, nome, data) com Reconectar e Desconectar.
- **Conversas**: lista com filtros (todas, CortAI, humano, não lidas), histórico da conversa, dados e agendamentos do cliente, botões Assumir, Retomar CortAI e Encerrar. Assumir uma conversa não desliga o CortAI das outras.
- **Configurações**: atendimento automático, saudação, mensagem de boas-vindas, mensagem fora do horário, confirmação/cancelamento/remarcação, encaminhamento humano, lembretes e tom (profissional, amigável, direto).
- **Status**: WhatsApp, CortAI e automação em verde/vermelho, com ação de reconectar.

Tudo respeitando as permissões: quem não tem acesso não vê o módulo.

### 6. Validação
Testes das ferramentas com dados reais, tentativa de acesso cruzado entre barbearias (deve falhar), entrega repetida de mensagem (não pode duplicar agendamento), verificação de tipos e build, e conferência em celular e computador.

## Fora deste trabalho
- Transcrição de áudio: a estrutura fica pronta, mas sem transcrição o CortAI não finge que entendeu.
- Publicação do serviço de WhatsApp no servidor e suas credenciais.
