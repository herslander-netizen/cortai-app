# Evoluir o Cortaí Chat dentro do produto atual

## Resultado
Criar no mesmo `/agendar/$slug` um modo conversacional determinístico, rápido e acessível, mantendo o agendamento Tradicional como padrão para todos os negócios existentes. O Chat reutilizará a seleção, disponibilidade, proteção contra conflitos, criação, alteração, cancelamento, WhatsApp, calendário e lista de espera já existentes.

## Arquitetura preservada
- Usar `useSelecaoAgendamento`, `disponibilidade.ts`, as regras oficiais do tenant e `agendarComoConvidado`; nenhuma disponibilidade ou mutação será recriada na interface.
- Manter a proteção final no RPC atual, limites públicos, isolamento por negócio, idempotência e substituição segura de horário.
- Guardar modo e personalização do Chat na configuração JSON já existente da página pública, com fallback explícito `tradicional`; não criar tabela nova.
- Adicionar somente o campo opcional de foto do serviço, pois o modelo atual não possui onde armazená-la. A foto do profissional já usa `avatar_url`; avatar da recepção reutilizará o mesmo armazenamento privado de imagens e a assinatura já existente.
- Registrar essas decisões em `AGENTS.md` e manter o roteiro atualizado.

## Agendamento conversacional
- Extrair do arquivo atual um contêiner compartilhado para confirmação, persistência local, alteração/cancelamento e calendário.
- Criar a apresentação Chat com identidade Cortaí: cabeçalho compacto do negócio/recepção, mensagens da recepção sem balão pesado, respostas do cliente em alto contraste, três pontos curtos, entrada suave, rolagem automática e movimento reduzido quando solicitado pelo aparelho.
- Fluxo: saudação → identificação → serviço → profissional ou “Não tenho preferência” → faixa de dias → horários oficiais → resumo editável → confirmação → sucesso.
- Mostrar serviços em cards com espaço reservado para foto, nome, duração e preço; mostrar profissionais com avatar ou iniciais, sem inventar imagens.
- Permitir voltar a qualquer escolha sem apagar nome/telefone e remover escolhas dependentes quando necessário.
- Exibir horários em pequenos grupos progressivos, sem atraso artificial; dia fechado/lotado oferece próximos dias e, quando disponível, entrada na lista de espera.
- Reutilizar o `.ics`, “Meus agendamentos”, alteração/cancelamento e “Novo agendamento”.
- Usar o contexto local já seguro para reconhecer quem agendou neste aparelho. “Repetir meu atendimento” será oferecido somente quando houver contexto confiável; não revelar cadastro pela simples digitação de telefone.

## Limites funcionais confirmados
- O domínio atual aceita um serviço por agendamento (`servico_id` e RPC singular). Nesta entrega, o Chat terá seleção única clara; não haverá uma falsa seleção múltipla. Evoluir para vários serviços exigiria um contrato transacional específico e ficará como pendência arquitetural separada.
- Cortaí Chat não terá texto livre nem chamada de IA. CortAI e seu atendimento atual permanecem intactos.
- A prévia é uma simulação local e nunca cria agendamento.

## Configuração e onboarding
- Acrescentar “Como seu cliente agenda?” com opções Conversa e Tradicional, explicação curta e prévia interativa.
- Integrar a escolha como etapa opcional do onboarding, mantendo os passos atuais e permitindo concluir sem foto ou textos personalizados.
- Acrescentar nas configurações: nome e avatar da recepção, mensagem inicial, texto final, cor de destaque restrita à paleta Cortaí, comemoração discreta, salvar no calendário e lista de espera.
- Reutilizar as regras já existentes de antecedência, cancelamento, período máximo, intervalo e passo; não duplicá-las em configuração do Chat.
- Disponibilizar upload opcional de foto do serviço e avatar do profissional usando compressão e armazenamento atuais.

## Segmentação e conteúdo
- Levar `segmento` para a agenda pública e usar `segmentoParaApresentacao`/vocabulário centralizado; ausência de segmento será neutra.
- Corrigir resíduos visíveis encontrados no booking, onboarding/configuração, serviços, preview, WhatsApp/CortAI e metadados relacionados.
- Preservar nomes técnicos legados, papéis, RPCs e rotas quando necessários à compatibilidade.
- Manter `/demonstracao` explicitamente como barbearia e fora dos defaults globais.

## Fotos necessárias
A estrutura e os uploads serão entregues sem fotos inventadas. Para preencher a experiência real, pedir ao usuário depois:
- uma foto horizontal por serviço, recomendada 4:3, mínimo 1200×900, sem texto sobreposto;
- um retrato quadrado por profissional, recomendado 800×800;
- um retrato ou símbolo quadrado da recepção digital, recomendado 800×800;
- manter logo, capa e galeria atuais sem substituição.
Até esses arquivos chegarem, cards usam áreas neutras e iniciais, nunca imagens aleatórias.

## Validação
- Testar a máquina de estados da conversa, fallback Tradicional, segmentação neutra/barbearia, cálculo oficial e configuração antiga sem novos campos.
- Validar em 390×844 e 1280×900: fluxo completo, voltar/editar, lotação, erro, teclado/foco, rolagem, toque mínimo e movimento reduzido.
- Verificar modo claro/escuro disponível, página pública e painel logado sem alterar dados além de registros de teste controlados.
- Rodar testes, typecheck e build; rodar lint e separar passivo anterior de qualquer erro introduzido.
- Revisar regressões no modo Tradicional, CortAI, WhatsApp e página pública.
- Não publicar.
