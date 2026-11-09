# Governança de dados e documentos institucionais — Flow

Atualizado em 2026-11-08. Inventário preliminar e checklist de conformidade
para revisão jurídica e técnica. **Não é auditoria certificada da LGPD**.
Documentos públicos: `/privacidade`, `/cookies`, `/termos`.

## Estrutura inspecionada

- `src/routes/privacidade.tsx`, `src/lib/consentimento.ts`,
  `src/components/privacidade/*`: política, preferências e aviso.
- `src/routes/__root.tsx`: consentimento global, tema, autenticação,
  diagnósticos de navegação.
- `src/lib/funil.ts`: eventos de conversão sem identificação pessoal
  explicitamente registrada pelo cliente nessa requisição.
- `src/lib/diagnostico/telemetria.ts`: diagnóstico temporário habilitado
  na prévia, mesmo sem consentimento de análise facultativa.
- `MUSE.md` e regras WhatsApp: Cloudflare, Supabase, Meta/Evolution,
  Asaas e gateway de IA conforme configuração.
- `src/components/layout/Signature.tsx`: links institucionais.

## Matriz inicial

| Operação | Categorias de dados | Finalidade e cautelas |
|---|---|---|
| Conta e sessão | identidade, contato, tokens e permissões | autenticação; armazenamento necessário; controle de acesso |
| Gestão e agendamento | contato, histórico, preferências, financeiro, fotos | execução para o negócio; acesso por tenant |
| Mensageria | telefone, mensagens, áudios, eventos de entrega, opt-out | atendimento, avisos; regras Meta, bases legais e preferências |
| IA configurável | mensagem/contexto mínimo enviado ao provedor | assistência; minimização e segurança |
| Cobrança | valores e identificadores da transação | pagamentos; parceiro Asaas quando configurado |
| Preferências de interface | tema, dados de sessão, estado local | funcionalidade básica mesmo sem opção analítica |
| Medição de marketing | identificadores opcionais se forem implementados | só habilitar quando houver base legal e preferência apropriada |
| Diagnóstico da prévia | rota, erros, dados técnicos | resolução de falhas; retenção mínima e revisão de necessidade |

## Pendências para verificação antes de lançamento principal

1. Confirmar razão social/nome empresarial, eventual CNPJ, endereço de
   contato e dados cadastrais oficiais; não inventar essas informações.
2. Verificar canal de encarregado (DPO), atendimento a titulares e
   papéis de controlador/operador conforme atividade.
3. Inventariar fornecedores ATIVOS e suas regiões de processamento,
   responsabilidades, contratos e transferências internacionais:
   Cloudflare, Supabase, Meta/WhatsApp, Evolution, Asaas, OAuth, IA.
4. Inventariar cookies, localStorage e identificadores reais com
   nome, fornecedor, categoria, finalidade, duração e disparo.
   Categorias de consentimento no front **não provam**, por si,
   que todos os scripts facultativos estejam bloqueados.
5. Definir retenção, backups, encerramento, exclusão e exportação por
   categoria de registros; verificar como os direitos são atendidos.
6. Verificar minimização de dados de menores, fotos, anotações em
   texto livre e eventual presença de dados sensíveis nos negócios.
7. Conferir cobrança, renovação, rescisão, reembolso e eventual
   direito de arrependimento sob o CDC aplicável.
8. Implantar aceite explícito e auditável, **versionado por documento**,
   na contratação/cadastro quando validado juridicamente. Exibir link
   não comprova que o usuário aceitou um contrato.
9. Testar preferências sem consentimento, rejeição, aceite, mudança de
   versão, falha de armazenamento local e retirada de consentimento;
   revisar necessidade de interrupção de scripts facultativos carregados.
10. Revisar `telemetria.ts`: diagnóstico temporário da prévia ativado
    independentemente do consentimento analítico; limitar e documentar
    sua necessidade e período de retenção.
11. Revisar textos e links em 360 e 390 px, temas claro/escuro e modo
    não autenticado; confirmar publicação somente na prévia.
12. Submeter os textos institucionais à revisão jurídica especializada
    antes do site principal receber uma versão definitiva.

## Referências oficiais

- LGPD — Lei 13.709/2018
- ANPD: Guia Orientativo Cookies e Proteção de Dados Pessoais
  https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais
- ANPD: Comunicação de Incidente de Segurança
  https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
- ANPD: Relatório de Impacto à Proteção de Dados Pessoais
  https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd

## Limite de escopo

Não alterar `main`, site principal, banco, migrações, autenticação,
WhatsApp, agentes de IA, DNS ou segredos nesta entrega.
