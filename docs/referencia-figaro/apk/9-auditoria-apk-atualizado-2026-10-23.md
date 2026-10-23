# Auditoria estática do APK Figaroo — referência enviada em 23/10/2026

## Objetivo e decisão de referência

O dono enviou `Figaroo.apk` em 23/10/2026 e informou que esta é uma atualização mais avançada do Figaro. Tratar este arquivo como a referência prioritária para consultas futuras e para a recuperação do Figaro no Cortaí. O APK foi salvo também na Biblioteca do ChatGPT em `Referencias/Cortaí-Figaro/Figaroo.apk`.

**Limite importante:** não há uma cópia anterior do binário acessível nesta sessão para comparação hash-a-hash. Portanto, este relatório não inventa uma lista de novidades em relação à versão anterior. Ele registra evidências verificadas nesta cópia e indica o que precisa ser confrontado no código do Cortaí. Os documentos existentes `1` a `8` continuam úteis, mas devem ser revalidados quando houver divergência.

## 1. Identificação do artefato

| Campo | Evidência |
|---|---|
| Nome do arquivo | `Figaroo.apk` |
| Tamanho | 88.853.086 bytes (~88,85 MB decimais; 84,7 MiB) |
| SHA-256 | `9fd5763de71cedf734f7565fb3f868dbb776a254a941eebad3a23dac1cc98528` |
| Pacote Android | `com.figaroo.android` |
| `versionCode` | 136 |
| `versionName` | 1.0.0 |
| `minSdkVersion` | 26 (Android 8.0) |
| `targetSdkVersion` / compile SDK | 36 |
| Estrutura ZIP | 593 entradas; 7 arquivos DEX; 436 entradas em `res/` |
| Vídeos incorporados | 5 MP4 em `res/raw/landing_peek_*.mp4` |
| Código nativo | Não foram encontradas bibliotecas em `lib/` nesta cópia |
| Origem indicada pelo manifesto | Distribuição Google Play (`com.android.stamp.source`) |

A versão visível `1.0.0` não deve ser interpretada como prova de ser antiga ou nova; o código interno de versão encontrado é 136. A hash acima permite confirmar se futuras consultas estão usando exatamente a mesma cópia.

## 2. Método e confiança

Foi feita inspeção estática do contêiner APK, do manifesto binário, do arquivo de segurança de rede, das pastas de recursos e dos símbolos/textos presentes nos sete DEX. Isso confirma que classes e identificadores estão empacotados, mas **não** demonstra que todos os caminhos funcionem em execução. Esta rodada não executou o app em emulador/celular e não é uma nova descompilação integral em Java/Kotlin. Para detalhes profundos de implementação, usar também as especificações já derivadas por JADX em `1-design-system.md`, `2-agenda.md`, `3-fluxos-do-atendimento.md`, `4-pagina-publica.md`, `5-navegacao-e-transicoes.md`, `6-animacoes.md`, `7-modulos.md` e `8-inventario-de-animacoes.md`.

## 3. Inventário de módulos confirmado pelos símbolos do APK

Os namespaces e nomes de classes encontrados mostram uma aplicação Android nativa organizada por módulos. Entre os módulos mais evidentes:

- **Agenda:** `AgendaScreen`, `AgendaViewModel`, `FigarooDayTimeline`, `AgendaPinchZoom`, `AgendaEventCardsLayer`, `AgendaResizeGrip`, `AgendaNowIndicator`, `AgendaTeamMemberFilterSheet`, `AgendaLocationPickerSheet`, `AgendaArmedTopBar`, `AgendaArmedBottomBar`, `AgendaEdgeAutoScroll`, `AgendaBufferZone` e estados/modelos `AgendaArmState`, `AgendaZoom`, `AgendaTimeProposal`.
- **Ficha e histórico:** painel de atendimento, histórico do agendamento, remarcar, status, seleção de cliente e fluxo de checkout.
- **Clientes e comunicação:** lista/visão geral, painel de cliente, notas e seletores.
- **Serviços e preços:** criação em etapas, categorias, taxas/preços, regras de concorrência e catálogo.
- **Equipe e disponibilidade:** criação/edição de profissional, perfil do responsável e disponibilidade personalizada.
- **Localidades:** cadastro, endereço, comodidades, horários de abertura e horários especiais.
- **Combos e fidelidade:** criação de combo, seleção de serviços, descontos, pacotes, venda de pacote e agendamento/registro de visitas.
- **Vendas e checkout:** resumo, escolha de pagamento, formas de pagamento, taxas e histórico de vendas.
- **Página pública:** configurações da página, editor do hero, formulário de contato, galeria/mídia, prévia do rascunho, tema/layout, slug/URL, QR Code e avaliações.
- **Marketing e métricas:** campanhas, seleção de clientes, painel de marketing, insights, previsão e indicadores de receita/agenda.
- **Conta e administração:** login/cadastro, perfil, acesso, notificações, assinatura/paywall, ajuste de equipe e verificação de e-mail.
- **Infraestrutura Android identificada:** Jetpack Compose/Material 3, Navigation Compose, Hilt/Dagger, Firebase Cloud Messaging, componentes de login Google/Credentials, SDK do Facebook e Google Play Billing (metadado 8.3.0).

A presença dos símbolos confirma que esses componentes pertencem ao binário; não comprova isoladamente a qualidade nem a conclusão de cada fluxo.

## 4. Prioridade de comparação com o Cortaí

A matriz de recuperação existente continua sendo o mapa de implementação, mas esta cópia deve prevalecer para dúvidas sobre o comportamento do Figaro. Conferir especialmente:

1. **Agenda e gestos:** zoom por pinça mantendo o horário focal; persistência do zoom; modo armado de interação com o cartão; alça de duração; rolagem automática nas bordas; estados visuais dos outros cartões durante a edição; buffers de preparo/limpeza; filtro de equipe/localidade; bloqueios, reservas e horários indisponíveis; estado do dia fechado/vazio.
2. **Jornada de navegação:** transições distintas entre áreas, dentro de fluxos e dentro de cadastros em etapas; folha que abre parcialmente ou pela altura do conteúdo; confirmação de descartar; retorno à tela anterior após salvar e atualização da tela anterior.
3. **Página pública:** hub da página, catálogo de layouts/temas, prévia antes de salvar, editores separados por seção, rascunho/publicação, QR/link e estados online/offline. Não presumir que o desenho atual seja paridade completa apenas porque há rotas equivalentes.
4. **Outros módulos:** comparar criação/edição de serviços, profissionais, localidades, combos, pacotes, clientes, campanhas, vendas, avaliações, conta, acesso e notificações. Usar a regra já acordada: recuperar experiência e funções úteis sem substituir backend, permissões, dados ou regras de negócio atuais.
5. **Animações:** cruzar cada identificador e comportamento observável com `8-inventario-de-animacoes.md`; não marcar item concluído apenas pela existência de um componente com nome parecido. Manter a evidência, valor, origem e situação por item.

Antes de codificar, localizar no branch os equivalentes existentes e seus testes. Priorizar o que está comprovadamente ausente; não duplicar funcionalidades presentes nem criar backend paralelo.

## 5. Revisão estática básica de segurança/empacotamento

### Achados e encaminhamentos

- **Backup Android habilitado:** o manifesto traz `android:allowBackup=true` e não expõe no próprio elemento `application` um vínculo explícito a regras customizadas de extração. Revisar no projeto de origem quais dados locais e credenciais podem entrar em backup, e definir regras explícitas se necessário. É um item para verificar, não prova de vazamento.
- **Exceção de tráfego HTTP:** a configuração global define `cleartextTrafficPermitted=false`. Existe uma exceção restrita para `localhost`, `127.0.0.1`, `10.0.2.2`, `10.0.3.2` e `192.168.2.19`. Confirmar se a exceção LAN `192.168.2.19` é intencional em uma compilação de distribuição; preferir deixá-la apenas em configuração de desenvolvimento caso não seja necessária ao usuário final.
- **Permissões observadas:** Internet, notificações, estado de rede e wake lock, além de permissões auxiliares de FCM/Google Play. `WRITE_EXTERNAL_STORAGE` está limitada a API 28. Não foi encontrada permissão de localização precisa nem de microfone no manifesto inspecionado. A lista não substitui teste de runtime/permissões de bibliotecas.
- **Componentes exportados:** a `MainActivity` exportada é o launcher; também existem componentes de callback do SDK Facebook, recebedor Firebase/FCM e receiver de AndroidX ProfileInstaller. Revisar os filtros e as configurações correspondentes no código-fonte, mas os componentes parecem ligados a SDKs conhecidos; não classificar automaticamente como vulnerabilidade.
- **Metadados de distribuição:** o APK carrega metadados de distribuição Google Play e sinalização de tipos de split `base__abi` e `base__density`. Não repacotar/redistribuir esta cópia sem verificar o formato de distribuição apropriado; isso não interfere em usá-la como referência para auditoria visual/técnica.
- **Chaves/endpoints:** não publicar valores de credenciais nem inferir segurança de backend a partir do APK. A auditoria estática não verificou autorização, dados transmitidos ou regras do servidor.

Nenhuma falha crítica foi comprovada apenas por esta inspeção estática. Os dois itens acionáveis são revisar o escopo de backup e confirmar a exceção de HTTP para IP privado.

## 6. Limites e próximo passo

A comparação byte a byte com a versão anterior está **pendente**, pois o APK antigo não foi localizado como binário independente nesta sessão. O tamanho aproximado por si só não permite dizer se os arquivos são iguais. Para confirmar mudanças entre builds, comparar as hashes e então fazer diff das classes/recursos; enquanto isso, a hash desta página identifica o artefato atualmente salvo.

**Não foi feita alteração em banco, produção, `main` ou regras de negócio.** Este documento é uma auditoria de referência e uma lista de verificação para orientar a recuperação segura do Figaro no Cortaí.
