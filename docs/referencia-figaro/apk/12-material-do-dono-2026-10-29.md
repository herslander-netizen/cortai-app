# Spec 12 — Material do Figaro enviado pelo dono (29/10/2026)

O dono colou no chat um levantamento do APK do Figaro feito com outra ferramenta ("Tudo recuperação do
fígaro para levar ao cortaí"). O texto vai abaixo **como chegou**, sem edição (algumas partes vieram
repetidas). Ele **não** foi conferido linha a linha no código descompilado: trate como **[relato]**,
abaixo de **[código]** nas specs 1 a 11.

**Conferência rápida feita pelo Claude em 29/10** (contra as specs 1, 2, 5 e 6):

- **Batem com o que já está documentado:** mola sem quique `dampingRatio 1 / stiffness 400`
  (`BrandMotionKt`); escala ao pressionar 0,98; barra de cima da Agenda 64 ↔ 152 dp; coluna de horas de
  50 dp; fontes Poppins (títulos) e Plus Jakarta Sans (texto); `crossFlow` de 350 ms FastOutSlowIn
  (sobe 100 % da altura com fade, a de trás só esmaece) e `intraFlow` de 300 ms com 20 % de deslize;
  sucesso do botão segurado por 700 ms.
- **Novo em relação às specs 1–11** (só neste relato): animação da abertura/landing (chips com
  `CubicBezierEasing(0.3, 1.75, 0.4, 1.0)` em 500 ms, brilho radial duplo, dois players de vídeo, selo
  final 600/600/1000 ms), o código de acesso de 6 dígitos com tremida de ±8 dp, o morfismo do botão
  primário (carregando → sucesso), a gaveta abrindo pela borda com limiar de 30 % e o detalhamento do
  "cartão armado" da Agenda.
- **Não usar sem decisão do dono:** a paleta do Figaro (azul-marinho #001A40…, magenta #D3145D/#FF4D8D)
  — a identidade do Cortaí é marinho + azul de ação + ponto coral (decisão de 27/10), e o Figaro dá só
  composição, hierarquia, raios, folhas e movimento. Contratos de API, login social e endpoints do
  Figaro são só referência: o Cortaí usa o próprio Supabase Auth.
- **Agenda protegida:** itens daqui que mexam na Agenda (cartão armado, zoom, auto-rolagem, barra de
  cima) só entram com pedido específico do dono para a Agenda.

---

Vou passar algumas informações que consegui 

Sim, com certeza! A parte de Login e Abertura (Landing) do Figaroo possui um conjunto muito refinado de animações cinemáticas e físicas, implementadas em Jetpack Compose Animation com curvas Bézier customizadas e física de molas.

Aqui está o desmembramento matemático e técnico exato de todas as animações extraídas do código (`LandingSequenceViewKt`, `NavTransitionsKt`, `LandingSequenceController` e `LoginScreenKt`):

---

1. Animações da Sequência Cinemática de Abertura (`LandingSequenceViewKt`)

A. Efeito Elástico de Seleção dos Chips (`ChipSelectEasing`)
Quando um chip de cena é ativado ou selecionado, o disco e o ícone não apenas aumentam de tamanho linearmente — eles dão um pulinho elástico (overshoot) característico:
- Curva Bézier Cúbica: `CubicBezierEasing(0.3f, 1.75f, 0.4f, 1.0f)`
  > Note o valor `1.75f` no eixo Y1: ele ultrapassa o tamanho final em 75% antes de se acomodar, criando um efeito elástico super responsivo (pop).
- Duração: `ChipSelectDurationMs = 500ms`.
- Tamanho do Ícone:
  - Inativo: `18dp`
  - Ativo: `25dp` (`animateDpAsState`)
- Tamanho do Disco: interpolado dinamicamente via `animateDpAsState`.

B. Névoa Neon Dupla (Double Radial Glow com Blur)
O ícone do chip ativo projeta uma iluminação neon difusa em duas camadas radiais:
1. Glow Próximo (`NearGlow`):
   - `alpha = 0.70f` (70% de opacidade)
   - Raio: `ChipGlowNearRadius`
2. Glow Distante (`FarGlow`):
   - `alpha = 0.35f` (35% de opacidade)
   - Raio: `ChipGlowFarRadius`
- Gradiente Radial (`radialGradient`):
  - `0.0`: Cor de acento com 70% de opacidade
  - `0.45`: Cor de acento com 35% de opacidade
  - `1.0`: Transparente total (`Color.Transparent`)

C. Barra de Progresso do Chip (`LandingChipProgress`)
- Conforme o vídeo avança, a pílula do chip preenche uma barra de progresso horizontal (`progress(index)`) em tempo real.
- Ao pausar (quando o usuário segura o dedo na tela via `onHold`), o brilho transmuta suavemente para a cor de acento secundária (`ChipGlowPaused`) e o vídeo congela.

D. Transição Contínua de Vídeos (Dual ExoPlayer)
- Dois players simultâneos (`players[0]` e `players[1]`):
  - Enquanto um toca em `1.0f` de opacidade, o outro faz buffer da próxima cena.
  - A troca de cenas ocorre por crossfade interpolado (`slotAlpha(i)`).
  - Exceção de Corte Seco (`hardCutIntoNext = true`): na cena do site para a agenda, o corte é instantâneo (0ms) para dar ritmo de clipe publicitário.

E. Encerramento da Sequência (`LandingFinishMark`)
Ao término dos 5 passos ou ao pular a introdução:
1. Fade Out do Vídeo (`videoFade`): `tween(600ms)` de 1.0f para 0.0f.
2. Entrada do Selo/Logo (`finishMarkEnter`): `tween(600ms)` de 0.0f para 1.0f com escala suave.
3. Esmaecimento Suave (`finishMarkDim`): `tween(1000ms)` reduzindo a opacidade para `0.5f` (`FinishMarkDimmedAlpha`) para priorizar os botões de ação ("Entrar" e "Começar").

---

2. Transições de Navegação de Telas (`NavTransitionsKt`)

O Figaroo padroniza toda a navegação de autenticação com curvas e durações estritas:

A. Fluxo Cruzado entre Telas (`CrossFlow`) — Usado entre Landing $\leftrightarrow$ Login $\leftrightarrow$ SignUp
- Duração: `CrossFlowDurationMillis = 350ms`.
- Curva de Easing: `FastOutSlowInEasing` (equivalente ao `cubic-bezier(0.4, 0.0, 0.2, 1.0)` do Material Design / iOS).
- Entrada (`crossFlowEnter`):
  - `slideInVertically(350ms)` (desliza de baixo para cima 100% da altura da tela)
  - `+ fadeIn(350ms)`
- Saída (`crossFlowExit`):
  - `fadeOut(350ms)` (a tela de fundo esmaece sem mover para evitar conflito visual)
- Retorno (`crossFlowPopExit`):
  - `slideOutVertically(350ms)` (desce de volta ao rodapé)
  - `+ fadeOut(350ms)`

B. Transição Interna de Etapas (`IntraFlow`) — Usada ao avançar entre campos
- Duração: `IntraFlowDurationMillis = 300ms`.
- Fração de Deslocamento (`IntraFlowSlideFraction`): `0.2f` (apenas 20% da largura, evitando deslocamentos bruscos).
- Curva: `FastOutSlowInEasing`.
- Efeito: Slide horizontal suave de 20% com fade-in / fade-out cruzado.

---

3. Animações da Tela de Login (`LoginScreenKt`)

A. Transmutação de Fase A $\rightarrow$ Fase B (`AnimatedContent`)
A troca entre `EmailEntry` (digitação do e-mail) e `CredentialEntry` (senha ou PIN de 6 dígitos) não é uma troca de página bruta:
- O card de formulário preserva sua base e anima a troca de conteúdo com `AnimatedContent`.
- O e-mail digitado na Fase A contrai e se aloja em um chip compacto no topo com ícone de lápis/edição.

B. Componente PIN OTP de 6 Dígitos (`AccessCodeInput`)
- Foco e Borda Ativa: A caixa ativa do dígito atual expande sua espessura de borda e altera a cor para `--fg-acento` com animação fluida.
- Feedback de Erro (Shake / Tremor): Quando o código digitado é incorreto ou tem tamanho inferior a 6 dígitos, as 6 caixas disparam um micro-deslocamento horizontal oscilante (shake) de $\pm 8\text{dp}$ com coloração vermelha instantânea (`isError = true`).

C. Botão com Morfismo de Estados (`FigarooPrimaryButton`)
O botão principal de login executa morphing de três estados:
1. Estado Normal (Idle): Pílula cheia com texto e escala 1.0. Ao toque, aplica `PressScale = 0.98`.
2. Carregando (`isSubmitting`): O texto dá fade-out, as bordas colapsam suavemente para um spinner circular (`32dp`) no centro da pílula.
3. Sucesso (`isSubmitSuccess`): Ao receber a resposta `200 OK` com o token JWT, o spinner se transforma em um checkmark verde/cyan animado, mantido na tela por `700ms` antes da navegação disparar.

---

Todos esses parâmetros matemáticos e curvas de animação podem ser fornecidos ao GPT para reproduzir fielmente a mesma física de movimento.

Sim, com certeza! A parte de Login e Abertura (Landing) do Figaroo possui um conjunto muito refinado de animações cinemáticas e físicas, implementadas em Jetpack Compose Animation com curvas Bézier customizadas e física de molas.
Aqui está o desmembramento matemático e técnico exato de todas as animações extraídas do código (`LandingSequenceViewKt`, `NavTransitionsKt`, `LandingSequenceController` e `LoginScreenKt`):
---
1. Animações da Sequência Cinemática de Abertura (`LandingSequenceViewKt`)
A. Efeito Elástico de Seleção dos Chips (`ChipSelectEasing`)
Quando um chip de cena é ativado ou selecionado, o disco e o ícone não apenas aumentam de tamanho linearmente — eles dão um pulinho elástico (overshoot) característico:
- Curva Bézier Cúbica: `CubicBezierEasing(0.3f, 1.75f, 0.4f, 1.0f)`
  > Note o valor `1.75f` no eixo Y1: ele ultrapassa o tamanho final em 75% antes de se acomodar, criando um efeito elástico super responsivo (pop).
- Duração: `ChipSelectDurationMs = 500ms`.
- Tamanho do Ícone:
  - Inativo: `18dp`
  - Ativo: `25dp` (`animateDpAsState`)
- Tamanho do Disco: interpolado dinamicamente via `animateDpAsState`.
B. Névoa Neon Dupla (Double Radial Glow com Blur)
O ícone do chip ativo projeta uma iluminação neon difusa em duas camadas radiais:
1. Glow Próximo (`NearGlow`):
   - `alpha = 0.70f` (70% de opacidade)
   - Raio: `ChipGlowNearRadius`
2. Glow Distante (`FarGlow`):
   - `alpha = 0.35f` (35% de opacidade)
   - Raio: `ChipGlowFarRadius`
- Gradiente Radial (`radialGradient`):
  - `0.0`: Cor de acento com 70% de opacidade
  - `0.45`: Cor de acento com 35% de opacidade
  - `1.0`: Transparente total (`Color.Transparent`)
C. Barra de Progresso do Chip (`LandingChipProgress`)
- Conforme o vídeo avança, a pílula do chip preenche uma barra de progresso horizontal (`progress(index)`) em tempo real.
- Ao pausar (quando o usuário segura o dedo na tela via `onHold`), o brilho transmuta suavemente para a cor de acento secundária (`ChipGlowPaused`) e o vídeo congela.
D. Transição Contínua de Vídeos (Dual ExoPlayer)
- Dois players simultâneos (`players[0]` e `players[1]`):
  - Enquanto um toca em `1.0f` de opacidade, o outro faz buffer da próxima cena.
  - A troca de cenas ocorre por crossfade interpolado (`slotAlpha(i)`).
  - Exceção de Corte Seco (`hardCutIntoNext = true`): na cena do site para a agenda, o corte é instantâneo (0ms) para dar ritmo de clipe publicitário.
E. Encerramento da Sequência (`LandingFinishMark`)
Ao término dos 5 passos ou ao pular a introdução:
1. Fade Out do Vídeo (`videoFade`): `tween(600ms)` de 1.0f para 0.0f.
2. Entrada do Selo/Logo (`finishMarkEnter`): `tween(600ms)` de 0.0f para 1.0f com escala suave.
3. Esmaecimento Suave (`finishMarkDim`): `tween(1000ms)` reduzindo a opacidade para `0.5f` (`FinishMarkDimmedAlpha`) para priorizar os botões de ação ("Entrar" e "Começar").
---
2. Transições de Navegação de Telas (`NavTransitionsKt`)
O Figaroo padroniza toda a navegação de autenticação com curvas e durações estritas:
A. Fluxo Cruzado entre Telas (`CrossFlow`) — Usado entre Landing $\leftrightarrow$ Login $\leftrightarrow$ SignUp
- Duração: `CrossFlowDurationMillis = 350ms`.
- Curva de Easing: `FastOutSlowInEasing` (equivalente ao `cubic-bezier(0.4, 0.0, 0.2, 1.0)` do Material Design / iOS).
- Entrada (`crossFlowEnter`):
  - `slideInVertically(350ms)` (desliza de baixo para cima 100% da altura da tela)
  - `+ fadeIn(350ms)`
- Saída (`crossFlowExit`):
  - `fadeOut(350ms)` (a tela de fundo esmaece sem mover para evitar conflito visual)
- Retorno (`crossFlowPopExit`):
  - `slideOutVertically(350ms)` (desce de volta ao rodapé)
  - `+ fadeOut(350ms)`
B. Transição Interna de Etapas (`IntraFlow`) — Usada ao avançar entre campos
- Duração: `IntraFlowDurationMillis = 300ms`.
- Fração de Deslocamento (`IntraFlowSlideFraction`): `0.2f` (apenas 20% da largura, evitando deslocamentos bruscos).
- Curva: `FastOutSlowInEasing`.
- Efeito: Slide horizontal suave de 20% com fade-in / fade-out cruzado.
---
3. Animações da Tela de Login (`LoginScreenKt`)
A. Transmutação de Fase A $\rightarrow$ Fase B (`AnimatedContent`)
A troca entre `EmailEntry` (digitação do e-mail) e `CredentialEntry` (senha ou PIN de 6 dígitos) não é uma troca de página bruta:
- O card de formulário preserva sua base e anima a troca de conteúdo com `AnimatedContent`.
- O e-mail digitado na Fase A contrai e se aloja em um chip compacto no topo com ícone de lápis/edição.
B. Componente PIN OTP de 6 Dígitos (`AccessCodeInput`)
- Foco e Borda Ativa: A caixa ativa do dígito atual expande sua espessura de borda e altera a cor para `--fg-acento` com animação fluida.
- Feedback de Erro (Shake / Tremor): Quando o código digitado é incorreto ou tem tamanho inferior a 6 dígitos, as 6 caixas disparam um micro-deslocamento horizontal oscilante (shake) de $\pm 8\text{dp}$ com coloração vermelha instantânea (`isError = true`).
C. Botão com Morfismo de Estados (`FigarooPrimaryButton`)
O botão principal de login executa morphing de três estados:
1. Estado Normal (Idle): Pílula cheia com texto e escala 1.0. Ao toque, aplica `PressScale = 0.98`.
2. Carregando (`isSubmitting`): O texto dá fade-out, as bordas colapsam suavemente para um spinner circular (`32dp`) no centro da pílula.
3. Sucesso (`isSubmitSuccess`): Ao receber a resposta `200 OK` com o token JWT, o spinner se transforma em um checkmark verde/cyan animado, mantido na tela por `700ms` antes da navegação disparar.
---
Todos esses parâmetros matemáticos e curvas de animação podem ser fornecidos ao GPT para reproduzir fielmente a mesma física de movimento.

Loguin

Aqui está o desmembramento técnico minucioso de tudo o que existe na parte de Login e Autenticação do Figaroo, extraído diretamente do código descompilado das classes em `com.figaroo.android.authentication` e submódulos.
---
1. Arquitetura Geral de Autenticação (`com.figaroo.android.authentication`)
O módulo de autenticação é implementado em Jetpack Compose + Clean Architecture + MVI/StateFlow, desacoplado do restante do app e orquestrado por:
- `AuthNavGraphKt` / `LoginNavGraphKt`: Rotas e transições cinemáticas (`CrossFlowEnter`, `CrossFlowExit`).
- `TokenManager`: Gerenciador seguro de `AuthToken` (JWT de acesso + refresh token).
- `SessionEventBus`: Barramento reativo de eventos de sessão para bootstrap da aplicação.
- `IDeviceTokenRepository`: Registro assíncrono em background do token FCM (Firebase Cloud Messaging) pós-login (`registerDeviceTokenBestEffort`).
- `GoogleSignInProvider` & `FacebookSignInProvider`: Provedores nativos de login social integrados via Hilt.
---
2. Tela de Entrada Cinemática: Landing Screen (`LandingScreenKt`)
Antes do formulário de login, o Figaroo possui uma tela de abertura imersiva de alto impacto que apresenta a proposta de valor através de uma sequência de vídeo contínua.
Engenharia da Sequência de Vídeo (`LandingSequenceController`)
- Dual-ExoPlayer (`ExoPlayer[2]`): O controlador instancia dois players de vídeo simultâneos (`players[0]` e `players[1]`). Enquanto um player reproduz a cena atual, o outro carrega em segundo plano a próxima cena, garantindo transições contínuas sem telas pretas ou congelamentos.
- Tipos de Corte: Suporta tanto crossfade suave de transparência quanto corte seco instantâneo (`hardCutIntoNext`).
- Acessibilidade e Performance (`reduceMotion`): Se o sistema operacional Android do usuário tiver "Redução de Movimento" ativado, o controlador desativa os vídeos e carrega imagens estáticas de alta definição (`posters`).
Modelo de Cenas (`LandingSequenceScene`)
Cada cena da sequência contém:
- `id`: Identificador da cena.
- `nameRes`: Título/marca d'água da funcionalidade.
- `captionRes`: Legenda explicativa da tela.
- `chipIcon`: Ícone vetorial do chip de progresso.
- `video`: Recurso de vídeo MP4 em raw.
- `hardCutIntoNext`: Booleano para definir o tipo de transição.
Chips de Progresso com Pulso (`LandingChipState`)
Na parte inferior ou superior da cena, há chips interativos que mostram o progresso do vídeo:
- Estados: `Unvisited`, `Current` (com barra de progresso percentual `progress(index)` preenchendo em tempo real), `Visited` e `Pulsing`.
Botões de Ação na Landing
- Botão Primário ("Começar" / "Criar Conta"): Dispara navegação para `NavigationRoute.SignUp`.
- Botão Secundário ("Já tenho uma conta / Entrar"): Dispara navegação para `NavigationRoute.Login`.
---
3. Tela de Login Progressiva (`LoginScreenKt` & `LoginViewModel`)
O Figaroo utiliza um fluxo progressivo de identificação em duas fases (Fase A $\rightarrow$ Fase B), onde o usuário primeiro informa quem é, o backend analisa o método de autenticação da conta, e a tela transmuta dinamicamente para pedir senha ou código de acesso.
```text
[Landing Screen]
       │
       ▼
[Fase A: EmailEntry] ──(Social Auth: Google/Facebook)──► [Sucesso]
       │ (POST auth/start)
       ▼
[Fase B: CredentialEntry]
   ├── Método: Password   ──► [Campo Senha + Esqueceu a Senha]
   └── Método: AccessCode ──► [Input PIN 6 Dígitos + Timer Reenvio]
       │ (POST auth/login)
       ▼
[Sucesso: Salva Token + Registra FCM + Navega p/ App]
```
---
4. Máquina de Estados da UI (`LoginUiState`)
O estado da tela é selado em duas fases distintas:
Fase A: `LoginUiState.EmailEntry`
```kotlin
data class EmailEntry(
    val email: String = "",
    val emailFieldError: EmailFieldError? = null,
    val blockingError: ApiError? = null,
    val isSubmitting: Boolean = false,
    val isExternalLoginInFlight: Boolean = false,
    val googleSignInError: Boolean = false,
    val facebookSignInError: Boolean = false
)
```
- Validação de Email (`EmailFieldError`):
  - `Empty`: Campo não preenchido.
  - `Invalid`: Não atende à regex padrão de e-mail RFC.
Fase B: `LoginUiState.CredentialEntry`
```kotlin
data class CredentialEntry(
    val email: String,
    val method: LoginMethod, // Password, AccessCode ou ExternalProvider
    val password: String = "",
    val accessCode: String = "",
    val retryDate: Instant? = null,
    val credentialFieldError: CredentialFieldError? = null,
    val blockingError: ApiError? = null,
    val isResending: Boolean = false,
    val isSubmitting: Boolean = false,
    val isSubmitSuccess: Boolean = false,
    val isPasswordReset: Boolean = false,
    val isPasswordResetConfirmationVisible: Boolean = false
)
```
- Erros de Credencial (`CredentialFieldError`):
  - `PasswordTooShort`: Senha com menos de 5 caracteres.
  - `AccessCodeWrongLength`: Código de acesso diferente de exatamente 6 dígitos numéricos.
  - `InvalidCredentials`: Senha ou código incorreto retornado pela API (401/403).
---
5. Componentes Visuais e Fluxos Detalhados
5.1. Formulário da Fase A (Identificação)
1. Cabeçalho: Título claro e texto de apoio convidando o profissional a entrar.
2. Campo de Email: `OutlinedTextField` com ícone de envelope, limpeza de espaços laterais (`trim()`) e mensagem de erro inline em caso de formato inválido.
3. Botão Continuar: `FigarooPrimaryButton` com estado de carregamento atômico (`isSubmitting`).
4. Divisor: Linha sutil com rótulo "ou".
5. Botões de Login Social:
   - `Continue with Google` (com ícone colorido oficial).
   - `Continue with Facebook` (com ícone oficial).
   - Ao clicar, ativa `isExternalLoginInFlight = true`.
   - Se houver falha de rede ou cancelamento pelo usuário, abre diálogos nativos: `GoogleSignInFailedDialog` ou `FacebookSignInFailedDialog` com botão "Tentar Novamente".
5.2. Descoberta de Método (`startLogin`)
Ao tocar em "Continuar", o ViewModel chama:
`POST auth/start` com payload `{ "email": "usuario@exemplo.com" }`.
O servidor retorna `StartedLoginDto`:
- Se a conta usar senha tradicional $\rightarrow$ define `method = LoginMethod.Password`.
- Se for autenticação sem senha (passwordless / SMS / email link) $\rightarrow$ define `method = LoginMethod.AccessCode` e recebe um timestamp `retryDate` (para controlar o botão de reenvio).
- Se a conta estiver vinculada apenas a redes sociais $\rightarrow$ orienta a entrar pelo Google ou Facebook.
5.3. Formulário da Fase B: Senha (`LoginMethod.Password`)
1. Chip do Email Selecionado: Exibe o e-mail no topo acompanhado de botão de edição ("Trocar e-mail"), permitindo voltar à Fase A sem recarregar a tela (`resetToEmailEntry`).
2. Campo de Senha (`PasswordField`):
   - Mascaramento por padrão com botão de alternância (ícone de olho / visibilidade).
   - Validação inline de comprimento mínimo.
   - Ação de teclado: `ImeAction.Done` dispara o login automaticamente.
3. Fluxo "Esqueceu a Senha?" (`ForgotPasswordRow`):
   - Link posicionado logo abaixo do campo de senha.
   - Ao clicar, abre o modal de confirmação: `PasswordResetConfirmationDialog`.
   - Pergunta: "Enviar link de redefinição para [email]?"
   - Ao confirmar, dispara `POST auth/password-reset/start`, exibe toast de envio com sucesso e ativa o cooldown para novas tentativas.
5.4. Formulário da Fase B: Código de Acesso OTP (`AccessCodeInput`)
Se a conta estiver configurada para código de acesso de 6 dígitos:
1. Componente `AccessCodeInput`:
   - `ACCESS_CODE_LENGTH = 6`.
   - Em vez de um campo de texto único e comum, renderiza 6 caixas individuais (`AccessCodeBox`).
   - Cada caixa tem:
     - Borda arredondada suave (`RoundedCornerShape`).
     - Realce visual na caixa ativa (`isActive`).
     - Feedback de erro em vermelho se o código for rejeitado (`isError`).
   - Acessibilidade TalkBack com anúncio semântico contínuo: `"6-digit access code, %d of 6 digits entered"`.
   - Teclado numérico estrito (`KeyboardType.NumberPassword` ou `Number`), filtrando qualquer caractere não numérico via `Character.isDigit`.
2. Linha de Reenvio com Contador Regressivo (`ResendAccessCodeRow`):
   - Se `retryDate` estiver no futuro: o botão de reenvio fica desabilitado, mostrando contagem regressiva em segundos (ex: "Reenviar código em 45s").
   - Quando o tempo expira: o botão torna-se ativo e clicável ("Reenviar código").
   - Ao tocar, dispara `resendAccessCode()` chamando novamente `POST auth/start`.
---
6. Contratos de API (`LoginApiService` & `AuthApiService`)
As chamadas Retrofit do módulo de autenticação:
| Método | Endpoint | Payload (Request) | Resposta (Response) | Função |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `auth/start` | `StartLoginRequestDto(email)` | `StartedLoginDto` (`method`, `retryDate`) | Identifica o método da conta (Senha ou Código) |
| `POST` | `auth/login` | `LoginRequestDto(email, password, accessCode)` | `AuthTokenDto` (`token`, `refreshToken`, `expiresIn`) | Valida credenciais e gera sessão |
| `POST` | `auth/external` | `ExternalLoginRequestDto(provider, token)` | `AuthTokenDto` | Login com token OAuth do Google ou Facebook |
| `POST` | `auth/password-reset/start` | `PasswordResetStartRequestDto(email)` | `StartedPasswordResetDto` (`retryDate`) | Dispara e-mail de recuperação de senha |
| `POST` | `auth/password-reset/verify` | `PasswordResetVerifyRequestDto(token, newPassword)` | `AuthTokenDto` | Valida código do reset e define nova senha |
| `POST` | `auth/refresh` | `RefreshTokenRequestDto(refreshToken)` | `AuthTokenDto` | Renovação silenciosa do JWT expirado |
---
7. Finalização e Bootstrap do App
Quando `POST auth/login` ou `POST auth/external` retorna sucesso (`AuthTokenDto`):
1. Feedback Visual: `isSubmitSuccess = true` aciona animação de sucesso no botão primário.
2. Persistência do Token: Grava `accessToken` e `refreshToken` criptografados via `TokenManager`.
3. Notificações Push: Executa em corrotina `registerDeviceTokenBestEffort()`, enviando o token FCM do aparelho para vincular ao novo usuário autenticado.
4. Disparo do Evento Global: `SessionEventBus.emit(SessionEvent.LoggedIn)`.
5. Navegação: Emite `LoginNavigationEvent.NavigateToAuthenticated`, desempilhando as telas de login do histórico e abrindo a Agenda/Cockpit principal.
---
Qualquer detalhe específico sobre a tela de cadastro (`SignUp`), o onboarding ou as classes de gerenciamento de sessão pode ser desmembrado na sequência.

Token Movimento 

Aqui está o detalhamento minucioso de todas as animações, físicas de movimento, microinterações e transições de estado extraídas dos arquivos do Figaroo (`BrandMotionKt`, `FigarooPrimaryButton`, `FigarooExtendedFAB`, `FigarooNavigationDrawer`, `FigarooAgendaTopBar`), com suas fórmulas matemáticas, constantes exatas e regras de comportamento:
---
Especificação Completa de Animações e Movimento (Figaroo Design System)
No Figaroo, a filosofia de movimento é regida pelo princípio de física realista de precisão (Precision Spring Physics):
- Zero quique / sem oscilação elástica (Zero Overshoot): nenhuma janela, botão ou cartão passa do ponto de destino para depois voltar tremendo. O movimento desacelera organicamente até parar no pixel exato.
- Microinterações táteis de profundidade: qualquer elemento clicável reage instantaneamente ao toque com redução de escala calculada.
- Transições morfométricas: componentes não surgem do nada; eles expandem, colapsam e alternam entre estados (ex.: botão que vira spinner e depois vira ícone de sucesso).
---
1. Fórmulas e Parâmetros da Mola Física (`BrandMotionKt`)
As animações baseiam-se em equações diferenciais de mola do Jetpack Compose (`AnimationSpecKt.spring`), parametrizadas para três tipos de dados fundamentais (`Dp`, `IntSize` e `Float`):
```kotlin
// BrandMotion.kt (Constantes exatas extraídas do código)
public static final float PressScaleTarget = 0.98f;
// 1. Mola para dimensões espaciais (largura, altura, raio, padding)
public static final FiniteAnimationSpec<Dp> expandSizeSpringDp() {
    return AnimationSpecKt.spring(1.0f, 400.0f, ...);
}
// 2. Mola para tamanhos inteiros de layouts e contêineres
public static final FiniteAnimationSpec<IntSize> expandSizeSpringIntSize() {
    return AnimationSpecKt.spring(1.0f, 400.0f, ...);
}
// 3. Mola para valores escalares contínuos (opacidade, rotação, escala)
public static final FiniteAnimationSpec<Float> expandSizeSpringFloat() {
    return AnimationSpecKt.spring$default(1.0f, 400.0f, ...);
}
```
O que significam esses dois números:
1. `dampingRatio = 1.0f` (Amortecimento Crítico):
   - Na física clássica, um amortecimento menor que 1.0 produz oscilação (efeito "gelatina" ou "chiclete"). 
   - O valor estritamente 1.0 garante que o elemento atinja o repouso no menor tempo possível sem ultrapassar a fronteira (sem overshoot). Isso confere um aspecto sóbrio, cirúrgico e de alta performance ao app.
2. `stiffness = 400.0f` (Rigidez Média-Alta):
   - Determina a força com que a mola puxa o elemento para o destino. 
   - Com rigidez 400 e amortecimento crítico, a duração natural percebida da transição fica entre 180 ms e 220 ms, o intervalo ideal da psicologia cognitiva humana para parecer instantâneo sem parecer brusco.
---
2. Microinteração de Pressão ao Toque (`PressScaleTarget`)
- Constante: `0.98f` (redução de 2% no tamanho).
- Comportamento:
  - Dedo toca na tela (`PointerDown`): O botão ou cartão encolhe suavemente de `1.0` para `0.98` na origem central (`transform-origin: center`), simulando a compressão física de um botão mecânico sob o dedo.
  - Dedo solta da tela (`PointerUp` / `Release`): Volta imediatamente de `0.98` para `1.0`.
  - Cancelamento (arrasto para fora): Se o usuário desliza o dedo para fora do botão antes de soltar, a escala retorna suavemente para `1.0` sem disparar a ação.
- Aplicações: `FigarooPrimaryButton`, cartões de agendamento na agenda, botões de ação rápida e linhas de lista (`FigarooListRow`).
---
3. Máquina de Estados e Morfismo do Botão Flutuante (`FigarooExtendedFAB`)
O botão flutuante de criação da agenda possui uma das arquiteturas de animação mais sofisticadas do sistema, alternando entre quatro geometrias e estados operacionais:
Constantes Extraídas:
- `MorphCollapseDurationMillis = 220 ms` (Duração da transformação de pílula para círculo).
- `FigarooExtendedFabSuccessHoldMillis = 700 ms` (Tempo que a confirmação visual de sucesso permanece na tela).
- `LabelMinScale = 0.7f` (Limite de encolhimento do texto durante o colapso antes do fade-out).
- `FabCircleDiameter = 56dp` (Diâmetro do botão circular colapsado).
- `FabRestElevation = 6dp` (Elevação e sombra do botão em repouso).
- `LoadingIndicatorSize = 32dp` (Tamanho do spinner de carregamento).
- `IconLabelGap = 12dp` (Espaçamento entre o ícone e o texto).
- `DisabledContainerAlpha = 0.55f` e `DisabledContentAlpha = 0.85f` (Transição suave de opacidade ao desabilitar).
Estados Animados do FAB:
1. Expandido $\longleftrightarrow$ Colapsado (Scroll da Agenda):
   - Quando a lista ou timeline é rolada para baixo, o FAB encolhe a largura de pílula completa (ex.: 160dp com o texto "Novo agendamento") para um círculo perfeito de 56dp contendo apenas o ícone de `+`.
   - O texto não é simplesmente cortado: ele sofre uma transição combinada de escala descendente (até o limite de `0.7f`) e desvanecimento de opacidade (fade out), enquanto a largura se fecha na mola de 220 ms.
2. Repouso $\longrightarrow$ Loading (Execução de Ação):
   - Ao disparar uma mutação assíncrona, o ícone esmaece e dá lugar ao indicador circular de 32dp girando continuamente.
3. Loading $\longrightarrow$ Success (Sucesso da Operação):
   - O spinner se transforma em um ícone de checkmark (concluído) acompanhado de um pulso sutil de cor.
   - O componente entra em Hold de 700 ms (`FigarooExtendedFabSuccessHoldMillis`) garantindo que o cérebro do usuário registre que a ação foi salva com sucesso, antes de retornar suavemente ao estado de repouso ou fechar a folha.
---
4. Transições do Menu Lateral e Folhas (`FigarooNavigationDrawer` & Sheets)
- Gesto de Borda Nativo (`DrawerEdgeSwipeToOpen`):
  - Reconhece o arraste com o dedo a partir da borda esquerda com travamento de eixo vertical.
  - O deslocamento em pixels acompanha a ponta do dedo em escala 1:1 via transform linear sem atraso perceptual.
  - Ao soltar, calcula a velocidade angular e a distância: se ultrapassar 30% da largura (`348dp`) ou houver impulso rápido (fling), a mola expande até o final; caso contrário, retrai.
- Escurecimento de Fundo (`DrawerHeaderScrimAlpha = 0.95f`):
  - O backdrop não é preto opaco: ele atinge no máximo 95% de atenuação com desfoque de superfície progressivo (backdrop blur), mantendo a sensação de profundidade de camadas.
---
5. Expansão do Calendário da Agenda (`FigarooAgendaTopBar`)
- Colapsada (`64dp`) $\longleftrightarrow$ Expandida (`152dp`):
  - No modo compacto, exibe apenas a linha de data selecionada e mês.
  - Ao tocar no cabeçalho ou no ícone de calendário, a barra expande sua altura de 64dp para 152dp através da mola `expandSizeSpringDp(stiffness = 400f, damping = 1.0f)`.
  - A grade dos dias da semana entra em revelação vertical coordenada (stagger de opacidade e translação de 6dp para baixo), sem nenhum salto abrupto na rolagem dos cartões abaixo dela.
---
6. Correspondência com os Tokens do Cortaí (`src/lib/motion.ts`)
O Cortaí já possui uma infraestrutura em TypeScript que reflete com exatidão a física do Figaroo:
| Token / Conceito Figaroo | Equivalente Oficial no Cortaí (`motion.ts`) | Valores & Comportamento |
|---|---|---|
| `PressScaleTarget = 0.98f` | Microinteração `whileTap: { scale: 0.98 }` | Redução tátil de 2% no clique/toque. |
| `expandSizeSpringDp (stiffness 400, damping 1.0)` | `molaFolha` (`stiffness: 420, damping: 38`) | Mola crítica sem quique (damping ratio $\approx 0.95-1.0$). |
| `MorphCollapseDuration (220ms)` | `DURACAO.base` (`0.2s` / 200 ms) | Curva cúbica suave `[0.2, 0, 0, 1]`. |
| `Fast Feedback (120ms)` | `DURACAO.rapida` (`0.12s` / 120 ms) | Chips, seletores de horário e toggles rápidos. |
| `FigarooExtendedFabSuccessHold (700ms)` | Retenção de feedback de sucesso | Exibição de checkmark antes do fechamento de modais. |
| Cascata de Listas | `cascata(indice)` com limite de 6 itens | Delay de 30ms por linha para evitar sobrecarga visual. |
| Acessibilidade | `prefereMenosMovimento()` | Desativa molas e usa fade linear de 150ms. |
Toda a engenharia de movimento do Figaroo está documentada com as constantes matemáticas exatas. 

Design

Aqui está o mapeamento completo e minucioso de tudo o que foi extraído e descompilado dos arquivos do Figaroo (APK Android com Jetpack Compose, pacote `com.figaroo.android`), pronto para você copiar e passar para o GPT.
---
Mapeamento Completo do Aplicativo Figaroo (Design System, Arquitetura e Telas)
Este documento descreve a totalidade do sistema extraído do APK original do Figaroo: todos os tokens do Design System, componentes visuais fundamentais e todos os 17 módulos funcionais com suas respectivas telas, folhas modais (bottom sheets) e fluxos de navegação.
---
1. Design System e Tokens Visuais (`com.figaroo.android.designsystem`)
A. Paleta Tonal e Semântica (`ColorKt` & `ExtendedColors`)
- Primary (Navy Blue — 11 tons):
  - `Primary 10` (`#001A40`): Fundo ultraprofundo / base noturna.
  - `Primary 20` (`#002D6B`): Superfície escura de cartões elevados.
  - `Primary 30` (`#00408F`): Azul institucional / destaque nobre.
  - `Primary 40` (`#00509D`): Destaque de ação / botões primários no modo claro.
  - `Primary 50` (`#087CF0` / `#2467BB`): Cor da marca / link ativo.
  - `Primary 60` (`#3898FF`): Ação em foco.
  - `Primary 70` (`#4DA3FF`): Destaque no modo escuro.
  - `Primary 80` (`#82BEFF`): Bordas ativas / chips selecionados.
  - `Primary 90` (`#D5E2FF`): Superfícies de apoio claras / container suave.
  - `Primary 95` (`#EBF1FF`) e `Primary 99` (`#FAF8FF`): Tons quase brancos de fundo.
- Tertiary / Magenta Brand:
  - `#D3145D` (Modo claro) e `#FF4D8D` (Modo escuro): Acentos de destaque, badges e promoção.
- Superfícies e Neutros Orgânicos:
  - Modo Claro: Fundo `#F0F7F2` / `#F8FAF8`, cartões `#FFFFFF`, bordas `#D6E0D9` / `#E2E8E4`.
  - Modo Escuro: Fundo `#1B1F1C` / `#121513`, cartões `#2A2F2C`, bordas `#3E4440`.
- Cores Semânticas de Estado (`ExtendedColors`):
  - Success: `#2E7D32` (Texto/Ícone), Container `#E8F5E9` (claro) / `#1B3320` (escuro).
  - Warning: `#B6730F` / `#E08E22`, Container `#FFF8E1` (claro) / `#332510` (escuro).
  - Error: `#B3261E` / `#F2B8B5`, Container `#FFEBEE` (claro) / `#3B1A1A` (escuro).
  - Info: `#0288D1`, Container `#E1F5FE`.
  - Action Blue: `#00509D` / `#4DA3FF`.
  - Confetti Gold: `#FFD700` (Celebrações, conclusões e avaliações 5 estrelas).
B. Tipografia e Escala (`FigarooBrandTypography`)
- Display & Títulos: Fonte Poppins (Bold e SemiBold com tracking ligeiramente negativo para densidade premium).
- Corpo, Formulários e Rótulos: Fonte Plus Jakarta Sans (pesos 400, 500, 600, 700).
- Valores, Códigos e Horários: Fonte JetBrains Mono para numerais de dashboard, preços e seletores de tempo (steppers).
- Estilos Especiais: `displayStatValue` (títulos gigantes de indicadores do painel), `titleSection`, `bodyReadable`, `labelMicro`.
C. Geometria e Formas (`FigarooBrandShapes`)
- Cartões operacionais e de lista: `12dp` de raio nos cantos.
- Hero sections, diálogos e topo de Bottom Sheets: `28dp` de raio.
- Botões principais e pílulas de status: `50%` (Pill Shape / arredondamento total).
- Chips e inputs de formulário: `8dp` de raio.
- Avatares: `12dp` (squircle) ou circular (`50%`).
D. Dimensões e Espaçamentos (`Dimensions`)
- 84 tokens padronizados: `spacingNone (0)`, `spacingXs (4dp)`, `spacingSm (8dp)`, `spacingMd (16dp)`, `spacingLg (24dp)`, `spacingXl (32dp)`, `spacing2xl (48dp)`, `spacing3xl (64dp)`.
- Alturas fixas de componentes:
  - Botão Primário CTA: `56dp`.
  - Botão secundário de ação: `44dp` a `48dp` (alvo de toque mínimo).
  - Barra de Topo da Agenda (`FigarooAgendaTopBar`): `64dp` recolhida / `152dp` com calendário de dias expandido.
  - Barra inferior de navegação (`BottomNav`): `80dp`.
  - Pílula de seleção de horário: `32dp`.
  - Menu lateral (Drawer): `348dp` de largura.
E. Física de Movimento (`BrandMotionKt`)
- Fator de Pressão: `PressScaleTarget = 0.98f` (ao tocar num botão ou cartão, ele reduz sutilmente a 98% da escala).
- Mola Oficial sem Quique: `spring(dampingRatio = 1.0f, stiffness = 400.0f)` — animações firmes, rápidas, estáveis e com zero oscilação elástica.
---
2. Componentes Estruturais Centrais
1. `FigarooAgendaTopBar`:
   - Cabeçalho da agenda com rótulo do mês atual, seletor de localização/filial, botão expansor de calendário e sininho com badge de notificações não lidas.
2. `FigarooStatusPill` & `StatusPillTone`:
   - 6 variações semânticas de tags de estado: Success (Concluído/Confirmado), Warning (Atrasado/Pendente), Error (Cancelado/No-show), Info (Em atendimento), Brand (Destaque/VIP) e Neutral (Agendado/Futuro).
3. `FigarooPrimaryButton`:
   - Botão de ação com suporte a 4 estados reativos: Repouso, Pressionado (`0.98`), Carregando (com spinner integrado) e Sucesso (com retenção de checkmark por 700ms antes de fechar).
4. `FigarooListRow`:
   - Linha padrão de listagem (Avatar/Ícone à esquerda, título/subtítulo ao centro, metadado/badge/seta à direita) com suporte a colapso de leading.
5. `FigarooNavigationDrawer`:
   - Menu lateral completo com suporte a gesto nativo de arrasto para abrir da borda da tela (`DrawerEdgeSwipeToOpen`).
6. `FigarooExtendedFAB`:
   - Botão flutuante de ação expansível com texto que colapsa em ícone ao rolar a lista.
---
3. Mapeamento de Todos os 17 Módulos e Telas do Figaroo
1. Módulo Agenda (`com.figaroo.android.agenda`)
- `AgendaScreen` / `AgendaViewModel`: A tela principal da agenda operacional com visão de grade diária, navegação por calendário e alternância de profissional.
- `AppointmentDashboardScreen` & `AppointmentDashboardSheet`: Detalhes de um atendimento aberto; exibe cliente, serviço, valor, profissional, histórico de alterações e botões de ação rápida.
- `CreateAppointmentFlowScreen` / `CreateAppointmentViewModel`: Fluxo passo a passo para criar novo agendamento.
- `TimeSlotSelectorScreen` / `TimeSlotSelectorViewModel`: Seletor visual de horários disponíveis livres por profissional.
- `CreateAppointmentSummaryScreen`: Tela de revisão e resumo com confirmação dos dados antes de salvar.
- `EditAppointmentTimeSlotScreen`: Tela específica para remarcar horário e data de um agendamento existente.
- `CreateReservationFlowScreen` / `CreateReservationViewModel`: Criação de reservas diretas ou bloqueios.
- `ReservationActionsSheet`: Folha modal de ações da reserva (Iniciar corte, Marcar falta, Cancelar, Cobrar).
2. Módulo Caixa e Checkout (`com.figaroo.android.checkout` e `sales`)
- `CheckoutFlowScreen` / `CheckoutFlowViewModel`: Fluxo completo de encerramento de comanda e cobrança.
- `CheckoutEditServiceScreen`: Adição de serviços extras, troca de profissional ou ajuste manual de valores antes de fechar a conta.
- `CheckoutDiscountBottomSheet`: Modal deslizante para aplicação de descontos em percentual ou em dinheiro, com justificativa.
- `CheckoutPaymentSelectionScreen`: Escolha e divisão de formas de pagamento (Dinheiro, Pix, Cartão, Voucher).
- `SaleDashboardScreen` / `PackageSaleDashboardScreen`: Painel de vendas de produtos e de pacotes pré-pagos.
- `PaymentOptionsScreen`: Gestão de métodos de cobrança e taxas operacionais do estabelecimento.
- `FeeRuleSheet` & `ReapplyFeeDialog`: Configuração de taxas de serviço e recálculo de cobranças.
3. Módulo Serviços e Combos (`com.figaroo.android.services`)
- `ServicesListScreen` / `ServicesListViewModel`: Catálogo geral de serviços com busca, filtros de categoria e reordenação.
- `ServiceDashboardScreen`: Ficha técnica do serviço (duração, preço, comissões e profissionais vinculados).
- `CreateServiceFlowScreen` / `CreateServiceFlowViewModel`: Assistente de cadastro de novos serviços.
- `EditServiceDetailsScreen`: Edição de nome, descrição e foto do serviço.
- `EditServiceRatesScreen`: Configuração de preço normal e preços diferenciados por profissional ou dia da semana.
- `EditServiceConcurrencyRulesScreen`: Regras de simultaneidade (ex: atender dois clientes durante o tempo de ação de uma química).
- `EditServiceAppointmentRulesScreen`: Regras de agendamento (tempo de intervalo, limite de antecedência).
- `ServiceCategoriesOverviewScreen` / `CreateServiceCategoryScreen`: Gerenciamento de categorias de serviços.
- `CombosListScreen` / `ComboDashboardScreen`: Catálogo e visão detalhada de pacotes de serviços agrupados (combos).
- `CreateComboFlowScreen` / `EditComboServicesScreen` / `EditComboDiscountScreen`: Criação de combos com desconto progressivo ou fixo.
- `ComboCustomDiscountSheet`: Aplicação de descontos especiais em combos.
4. Módulo Equipe e Profissionais (`com.figaroo.android.teammembers`)
- `TeamMembersListScreen` / `TeamMembersListViewModel`: Lista de todos os colaboradores, seus papéis e status.
- `TeamMemberDashboardScreen`: Visão individual do membro da equipe (desempenho, faturamento e avaliações).
- `CreateTeamMemberFlowScreen`: Fluxo de convite e cadastro de um novo membro da equipe.
- `EditTeamMemberDetailsScreen`: Edição de perfil, telefone, avatar e cargo do profissional.
- `EditTeamMemberWeeklyAvailabilityScreen`: Configuração da jornada de trabalho semanal padrão (dias de folga, horários de entrada/saída e intervalo).
- `EditTeamMemberCustomAvailabilityScreen`: Bloqueios de férias, atestados ou folgas pontuais.
- `EditTeamMemberServicesScreen`: Seleção de quais serviços cada profissional está habilitado a realizar.
- `CompleteOwnerProfileFlowScreen`: Fluxo para o proprietário preencher seus dados profissionais.
5. Módulo Pacotes e Fidelidade (`com.figaroo.android.loyalty`)
- `PackagesListScreen` / `PackagesListViewModel`: Listagem de planos de fidelidade e pacotes pré-pagos disponíveis (ex: 4 cortes por mês).
- `PackageDashboardScreen`: Gestão do pacote, volume de vendas e taxa de utilização.
- `CreatePackageFlowScreen` / `EditPackageDetailsScreen`: Criação e configuração de regras de novos pacotes.
- `EditPackageRulesScreen`: Prazos de validade e termos de uso do pacote.
- `EditPackageServicesScreen`: Definição de quais serviços estão incluídos no pacote e quantidade de créditos.
- `SellPackageFlowScreen`: Registro de venda de um pacote diretamente a um cliente.
- `BookPackageVisitScreen`: Abatimento de crédito ao agendar um corte pertencente a um pacote ativo.
- `PackageRhythmEditorViewModel` & `PackagePriceSheet`: Definição de ritmo de retorno esperado e tabela de preços.
- `PackageClientsSheet`: Lista de clientes com planos ou pacotes ativos.
6. Módulo Clientes e CRM (`com.figaroo.android.marketingdashboard` e `clientsoverview`)
- `ClientsOverviewScreen`: Tabela e busca geral da base de clientes com filtros rápidos (VIP, Frequente, Sumido, Novo).
- `ClientDashboardScreen`: Visão 360° do cliente com histórico de visitas, total gasto, preferências e estatísticas.
- `CreateClientFlowScreen` / `EditClientDetailsScreen`: Cadastro e edição de ficha do cliente.
- `ClientNoteSheet` / `ClientNoteFormViewModel`: Anotações técnicas confidenciais da equipe sobre o cliente.
- `EditClientNotificationsScreen`: Controle de preferências de envio de mensagens e notificações.
- `MarketingDashboardScreen`: Painel de campanhas de reativação de clientes inativos.
- `CreateMarketingCampaignFlowScreen`: Criação de disparos promocionais para clientes ausentes há mais de 30/60 dias.
- `EditMarketingCampaignRulesScreen` & `EditMarketingCampaignDurationScreen`: Prazos e regras das campanhas.
7. Módulo Personalização do Site Público (`com.figaroo.android.pagesettings`)
- `PageSettingsScreen`: Hub central de configuração da página pública do estabelecimento.
- `LayoutThemeScreen` / `LayoutThemePreviewScreen`: Seletor de temas visuais com prévia interativa ao vivo:
  - Classic: Visual tradicional, limpo e elegante.
  - Rock'n'Roll: Fundo escuro com contrastes agressivos e acentos vibrantes.
  - Retrô: Tons quentes, tipografia clássica e estilo vintage.
- `HeroEditorScreen`: Edição do topo da página (título de impacto, slogan e imagem de capa).
- `PhotoGalleryEditorScreen`: Upload e ordenação de fotos do portfólio de cortes e do ambiente.
- `ServiceListEditorScreen`: Seleção e destaque dos serviços que aparecem na home pública.
- `TeamEditorScreen`: Seleção de quais profissionais serão exibidos na página de apresentação.
- `RatingsEditorScreen`: Escolha de avaliações de clientes para destacar no site.
- `ContactFormEditorScreen` & `SocialNetworksEditorScreen`: Canais de atendimento e links de redes sociais.
- `PageQrCodeScreen`: Geração e exportação do QR Code de divulgação da página.
- `DraftPagePreviewScreen`: Pré-visualização do site em modo rascunho antes da publicação oficial.
8. Módulo Relatórios e Indicadores (`com.figaroo.android.insights`)
- `InsightsDashboardScreen` / `InsightsDashboardViewModel`: Painel analítico de faturamento e desempenho.
- `RevenueInsightTileViewModel`: Gráficos de receita bruta, ticket médio e comparação com o mês anterior.
- `ForecastInsightTileViewModel`: Previsão de faturamento futuro com base nos agendamentos já confirmados.
- `TeamComparisonTileViewModel`: Comparativo de produtividade e faturamento entre profissionais.
- `InsightsPanelVisibilitySheet`: Personalização de quais cartões de métricas devem aparecer no painel.
9. Módulo Filiais e Locais (`com.figaroo.android.locations`)
- `LocationsListScreen` / `LocationDashboardScreen`: Gestão de múltiplas unidades físicas vinculadas ao negócio.
- `CreateLocationFlowScreen`: Cadastro de nova unidade/filial.
- `EditLocationAddressScreen`: Endereço físico e posicionamento no mapa.
- `EditLocationOpeningTimesScreen` & `EditLocationCustomScheduleScreen`: Horários de funcionamento regulares e especiais da unidade.
- `EditLocationAmenitiesScreen`: Comodidades oferecidas no local (Wi-Fi, Estacionamento, Bar, Ar-condicionado).
10. Módulo Histórico de Atendimentos (`com.figaroo.android.history`)
- `AppointmentHistoryScreen` / `AppointmentHistoryViewModel`: Registro cronológico de todos os agendamentos já finalizados, cancelados ou remarcados.
- `SaleHistoryScreen`: Histórico de recibos e vendas de produtos com possibilidade de estorno.
11. Módulo Avaliações (`com.figaroo.android.ratings`)
- `RatingsOverviewScreen` / `RatingsOverviewViewModel`: Listagem consolidada de todas as avaliações recebidas por clientes, notas médias por serviço e feedbacks.
12. Módulo Configurações do Negócio (`com.figaroo.android.companysettings`)
- `BusinessInfoScreen`: Razão social, nome fantasia, CNPJ/CPF e categoria do estabelecimento.
- `AppointmentSettingsScreen`: Políticas de cancelamento, antecedência mínima para agendamento e limites de encaixe.
- `EditPageSlugScreen`: Definição e alteração do link público amigável do negócio (`figaroo.me/seu-negocio`).
- `NotificationSettingsScreen`: Ativação e configuração de notificações automáticas via push e mensagens.
13. Módulo Assinatura e Planos (`com.figaroo.android.billing`)
- `PaywallScreen` / `PaywallViewModel`: Vitrine dos planos de assinatura do aplicativo e upgrade de conta.
- `AdjustTeamSizeScreen`: Cálculo e expansão da assinatura de acordo com o número de profissionais ativos na equipe.
14. Módulo Notificações (`com.figaroo.android.notifications`)
- `NotificationsOverviewScreen`: Central de alertas recebidos pelo gestor (novos agendamentos, cancelamentos, avaliações).
- `NotificationDetailScreen`: Visualização completa e ação direta a partir do aviso recebido.
15. Módulo Configurações de Conta do Usuário (`com.figaroo.android.accountsettings`)
- `AccountSettingsScreen`: Painel de dados pessoais do usuário logado.
- `ChangeEmailScreen` & `EmailVerificationScreen`: Alteração e validação de e-mail de acesso.
- `SetPasswordScreen`: Criação e troca de senha.
- `AccessConfigScreen`: Gerenciamento de permissões de acesso ao app.
16. Módulo Onboarding Inicial (`com.figaroo.android.onboarding` e `signup`)
- `WelcomeScreen` & `SignUpScreen`: Telas de boas-vindas e cadastro de novo usuário.
- `LocationsOnboardingScreen`: Configuração da primeira unidade.
- `ServicesOnboardingScreen`: Seleção rápida de serviços populares sugeridos para começar o catálogo.
- `TeamOnboardingScreen`: Inclusão dos primeiros membros da equipe.
- `OnboardingCompleteScreen`: Conclusão do setup e redirecionamento direto para a Agenda.
17. Componentes e Diálogos Globais do Core (`com.figaroo.android.core`)
- `TimePickerDialog`: Seletor de hora nativo elegante.
- `CopyToOtherDaysSheet`: Ação rápida para copiar a grade horária de um dia da semana para os demais.
- `NewOffPeriodSheet`: Cadastro rápido de bloqueios pontuais na agenda.
- `MediaGalleryPickerScreen`: Seletor de fotos da galeria com corte inteligente para avatares e capas.
- `FigarooFullScreenDialog` & `FigarooConfirmDialog`: Diálogos modais de confirmação com visual padronizado.
- `FigarooHelpBottomSheet`: Ajuda contextual aberta pelo rodapé das telas.
---
Este mapeamento reúne cada detalhe visual e funcional recuperado dos arquivos do Figaroo. 

Agenda

Aqui está o desmembramento técnico aprofundado, minucioso e completo da Agenda do Figaroo, extraído diretamente da engenharia reversa das 1.760 classes do módulo `com.figaroo.android.agenda`.
---
Desmembramento Integral da Agenda do Figaroo
A Agenda do Figaroo é um dos sistemas de grade horária móvel mais avançados já desenhados em Jetpack Compose. Ela não é apenas uma lista de cards: é um motor dinâmico de tempo contínuo com suporte a zoom por pinça (pinch-to-zoom), física de cartões "armados" para arrasto (Armed Cards), autocorreção de ancoragem de rolagem e separação de camadas.
---
1. Arquitetura de Camadas e Modelos Centrais
```
                 ┌───────────────────────────────┐
                 │       AgendaViewModel         │
                 │   (Estado Mestre: UiState)    │
                 └──────────────┬────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  Timeline Day │       │   List View   │       │ Pinch / Zoom  │
│(Grade Contínua│       │ (Cronológica) │       │(Escala Tempo) │
└───────┬───────┘       └───────────────┘       └───────────────┘
        │
        ├─────────────────────────────┐
        ▼                             ▼
┌──────────────────┐        ┌──────────────────┐
│  Resting State   │        │   Armed State    │
│(Modo Normal/Lido)│        │(Arrasto/Edição)  │
└──────────────────┘        └──────────────────┘
```
Modelos de Dados Centrais (`logic.model`):
1. `DayEvent` (Polimórfico):
   - `ServiceEvent`: Agendamento real com cliente, serviço, profissional, horário de início (`proposedStart`) e fim (`proposedEnd`).
   - `GapEvent`: Vão livre entre dois atendimentos. O Figaroo trata o espaço vazio como um evento de primeira classe (Slot), permitindo tocar diretamente no buraco da grade para preenchê-lo.
   - `UnavailableBlock` / `DayTimelineOffTimeBlock`: Horários de almoço, folgas ou bloqueios manuais da barbearia.
2. `SlotPacker` (`availability.SlotPacker`):
   - Algoritmo de empacotamento de tempo que calcula lacunas de tempo ociosas e encaixes ideais para não deixar "buracos mortos" de 15 minutos na agenda.
3. `AgendaFetchBounds` & `AgendaMinuteSpan`:
   - Define a janela temporal de busca (1440 minutos por dia padrão) com paginação horizontal contínua de datas.
---
2. A Geometria Matemática da Grade (`AgendaTimelineGeometry`)
Diferente de listas comuns, a timeline do Figaroo é uma superfície contínua de minutos regida por pixels por minuto variáveis:
```java
// AgendaTimelineGeometry.java
public final class AgendaTimelineGeometry {
    private final float restingMinuteHeight;   // Altura do minuto em repouso
    private final float armedMinuteHeight;     // Altura do minuto no modo "armado" (expandido)
    private final float pixelsPerDp;
    private final float dayTopPx;
    private final float visibleTopPx;
    private final float visibleBottomInsetPx;
    public final float getRestingPixelsPerMinute() {
        return this.restingMinuteHeight * this.pixelsPerDp;
    }
    public final float getArmedPixelsPerMinute() {
        return this.armedMinuteHeight * this.pixelsPerDp;
    }
    public final int getDayHeightDifferencePx() {
        return dayHeightPx(this.armedMinuteHeight) - dayHeightPx(this.restingMinuteHeight);
    }
}
```
Altura Dinâmica do Dia:
$$\text{AlturaTotalDoDia(px)} = 1440 \times \text{minuteHeight} \times \text{pixelsPerDp}$$
- Em repouso, a grade tem uma escala compacta para caber mais horas na tela.
- Quando o usuário inicia um arrasto, a grade expande verticalmente para a escala Armed, aumentando a precisão de minutos para que o dedo consiga posicionar o corte exatamente de 5 em 5 ou de 15 em 15 minutos.
---
3. O Sistema de Cartão "Armado" (`AgendaArmState`)
O recurso mais impressionante do Figaroo é o conceito de Armar o Cartão (`arm` / `disarm`). 
Em vez de abrir um modal ou arrastar um elemento solto sem referência, tocar e segurar um agendamento transforma o app inteiro no Modo Armado:
```kotlin
// Estados da máquina de arrasto:
public final class AgendaArmState {
    val armedTarget: AgendaArmTarget?      // Qual agendamento ou bloqueio está sob controle
    val anchorMinute: Float?               // Minuto exato onde o dedo tocou dentro do cartão
    val proposal: AgendaDragProposal?      // Nova proposta de início/fim em tempo real
    val notifiesClient: Boolean            // Interruptor: "Avisar cliente por WhatsApp sobre a mudança?"
    val saveStatus: AgendaArmSaveStatus    // Idle -> Saving -> Saved -> Failed
}
```
Como Funciona o Arrasto Passo a Passo:
1. Hold / Toque Sustentado: O usuário segura o cartão por ~300ms. O sistema chama `arm(target, anchorMinute)`.
2. Ocultação do Chrome (`isChromeHidden = true`): A barra superior, filtros e menus somem suavemente para dar espaço total à tela.
3. Ancoragem Inteligente de Rolagem (`anchoredScrollTarget`):
   ```java
   public final float anchoredScrollTarget(float scroll, float anchorMinute, float fromUnits, float toUnits, float maxScroll) {
       return RangesKt.coerceIn(scroll + (anchorMinute * (toUnits - fromUnits)), 0.0f, maxScroll);
   }
   ```
   Problema que isso resolve: quando a grade expande verticalmente ao armar o cartão, o conteúdo normalmente "pularia" para longe do dedo. O Figaroo recalcula a rolagem no exato milissegundo da transição, de modo que o ponto onde o dedo encostou permaneça imóvel sob a ponta do dedo.
4. Deslocamento (`movedArmedCard(toStartMinute)`):
   - Conforme o dedo desliza para cima ou para baixo, calcula o novo `proposedStart` e `proposedEnd`.
   - Se o horário foi alterado, ativa automaticamente a flag `notifiesClient = true` (preparando o disparo de notificação).
5. Redimensionamento pela Base (`resizedArmedCard(toEndMinute)`):
   - Permite esticar ou encurtar a duração do serviço mantendo o horário de início fixo.
6. Autocorreção ao Desarmar (`disarmAnchorMinute`):
   - Ao soltar, se o usuário cancelar ou se a alteração for salva, a grade contrai de volta com interpolação suave da mola física (`expandSizeSpring`).
---
4. Zoom com Gesto de Pinça na Timeline (`AgendaPinchZoomKt`)
O Figaroo possui suporte a Pinch-to-Zoom contínuo na grade horária da agenda:
- Gesto: Usando dois dedos (polegar e indicador), o profissional pode afastar ou aproximar os dedos.
- `AgendaZoomStore` & `AgendaZoom`:
  - Zoom Out (Visão Macro): Diminui os pixels por minuto para enxergar o dia inteiro (manhã, tarde e noite) sem precisar rolar.
  - Zoom In (Visão Micro): Estica a grade verticalmente para permitir ver encaixes curtos de 10 a 15 minutos com texto legível.
- Âncora de Pinça (`AgendaPinchScrollAnchor`): O ponto focal do zoom é o centro entre os dois dedos, impedindo que a tela salte para o início da manhã.
---
5. Indicador do Minuto Atual em Tempo Real (`CurrentMinuteFlowKt` & `AgendaNowIndicator`)
- Fluxo Contínuo: Um coletor reativo (`CurrentMinuteFlow`) emite o minuto exato do dia a cada 30 segundos.
- Régua Visual: 
  - Uma linha horizontal vibrante corta a grade com um círculo sólido na lateral esquerda contendo o horário atual em tempo real (ex.: `14:35`).
  - O indicador atualiza sua posição `topPx` matematicamente:
    $$\text{top} = \text{CurrentMinute} \times \text{PixelsPerMinute}$$
- Sincronização de Scroll: Ao tocar na pílula "Agora", a agenda aciona uma animação de rolagem suave para centralizar a linha do minuto atual no terço superior da tela.
---
6. Painel Detalhado do Atendimento (`AppointmentDashboardSheetKt`)
Ao dar um toque simples em um cartão da agenda, abre-se a folha modal de atendimento com as seguintes seções estruturadas:
1. `AppointmentHeroCard` (Topo):
   - Foto/avatar do cliente, nome completo, telefone e selo de status (`StatusIndicator`).
   - Botões de chamada telefônica direta e atalho para conversa no WhatsApp.
2. `ServicesCard`:
   - Lista discriminada de cada serviço do atendimento (ex.: Corte Degradê + Barba Terapia).
   - Duração individual de cada etapa e preço em fonte monoespaçada.
   - Tag de promoção ou combo aplicado (`AppliedComboIndicator`).
3. Ações Acopladas no Rodapé (`AppointmentDashboardDockedActions`):
   - Barra inferior fixa que apresenta botões conforme a máquina de estados:
     - `Iniciar Atendimento`
     - `Concluir e Ir para o Caixa`
     - `Remarcar Horário`
     - `Cancelar Reserva`
---
7. Fluxo de Criação em Etapas (`CreateAppointmentFlowScreen`)
O fluxo para criar um agendamento novo dentro da agenda é orquestrado como uma máquina de estados linear (`StepRoute`):
1. `CreateAppointmentClientStep`:
   - Busca instantânea na base de clientes existentes com destaque para os mais recentes.
   - Botão rápido para cadastro de novo cliente (apenas Nome e Telefone).
2. `CreateAppointmentServicesStep`:
   - Catálogo com abas de categorias.
   - Seleção múltipla com somatório dinâmico de tempo total e valor total no rodapé flutuante.
3. `CreateAppointmentTimeSlotStep` (`TimeSlotSelector`):
   - Oferece dois modos (`SelectionMode`):
     - Automático / Disponibilidade: Exibe apenas os horários livres calculados pelo `SlotPacker`.
     - Manual / Grade Aberta: Permite ao barbeiro forçar um horário específico mesmo com sobreposição consciente.
4. `CreateAppointmentSummaryScreen`:
   - Tela de confirmação com resumo completo e botão final que utiliza o `FigarooPrimaryButton` com transição de loading e checkmark de sucesso (`700ms`).
---
8. Mapeamento Completo das Classes da Agenda do Figaroo
| Pacote | Classe Principal | Responsabilidade no Sistema |
|---|---|---|
| `agenda.ui` | `AgendaScreenKt` | Tela mestre que abriga TopBar, alternador de visualização e FAB. |
| `agenda.ui` | `AgendaViewModel` | Retém o estado imutável da tela (`AgendaUiState`), filtros e data. |
| `agenda.ui.components` | `FigarooDayTimelineKt` | Renderizador nativo da grade vertical de horários e blocos. |
| `agenda.ui.components` | `AgendaTimelineGeometry` | Cálculos trigonométricos e lineares de minuto para pixel. |
| `agenda.ui.components` | `AgendaArmState` | Máquina de estados de arraste, ancoragem de rolagem e redimensionamento. |
| `agenda.ui.components` | `AgendaPinchZoomKt` | Lógica de gesto de pinça com dois dedos para zoom na grade. |
| `agenda.ui.components` | `CurrentMinuteFlowKt` | Emissor reativo do minuto atual com linha temporal vermelha/azul. |
| `agenda.ui.components` | `AgendaListViewKt` | Visualização alternativa em lista cronológica para leitura rápida. |
| `agenda.ui.components` | `AgendaTeamMemberFilterSheet` | Filtro deslizante para selecionar profissionais individuais ou equipe toda. |
| `agenda.ui.appointmentdashboard` | `AppointmentDashboardSheetKt` | Folha modal 360° do atendimento selecionado com ações acopladas. |
| `agenda.ui.createappointmentflow` | `CreateAppointmentFlowScreen` | Assistente passo a passo para marcar novo corte. |
| `agenda.ui.timeslotselector` | `TimeSlotSelectorScreenKt` | Seletor de horários com calendário mensal integrado e lista de vagas. |
| `agenda.ui.blocking` | `CreateBlockingSheetKt` | Criação de folgas, intervalos de almoço e bloqueios manuais na grade. |
| `agenda.logic.availability` | `SlotPacker` | Algoritmo de empacotamento inteligente de horários vagos (Gaps). |
| `agenda.logic.repository` | `AgendaRepositoryImpl` | Conexão com API remota, sincronização de agendamentos e persistência. |
---
Este é o desmembramento técnico completo, com a matemática de pixels, física dos cartões armados, arquitetura de gestos e código original descompilado da Agenda do Figaroo. 

Agenda do Figaroo: estrutura completa, com medidas tiradas do código
Remontei o aplicativo que você enviou e li o código da agenda: são 287 classes em `com.figaroo.android.agenda`. Os números abaixo saíram do código, não são estimativas. Quando algo for dedução minha, eu aviso.
---
1. Organização das pastas
```text
agenda/
├─ di/                     AgendaModule (liga a API)
├─ logic/
│  ├─ availability/        SlotPacker (encaixa horários livres)
│  ├─ model/               64 modelos (estado, arrasto, zoom, reservas…)
│  ├─ repository/          AgendaApiService, AgendaRepositoryImpl, AgendaZoomStore
│  │  └─ dto/              36 formatos de dados trocados com o servidor
│  ├─ state/               AgendaUiState
│  └─ usecase/             GetAgenda, DeleteReservationEvent, DeleteReservationSeries
└─ ui/
   ├─ AgendaScreen, AgendaViewModel, AgendaViewMode (Calendar | List)
   ├─ components/          50 peças (linha do tempo, cartões, zoom, arrasto…)
   ├─ appointmentdashboard/ painel do atendimento (Hero, Serviços, Ações fixas)
   ├─ blocking/            criar e detalhar bloqueio
   ├─ createappointmentflow/ novo agendamento (Cliente → Serviços → Horário → Resumo)
   ├─ createreservationflow/ reserva recorrente (Cliente → Motivo → Datas → Resumo)
   ├─ editappointmenttimeslot/ trocar horário
   ├─ reservationactions/  ações da reserva
   └─ timeslotselector/    lista de horários (disponíveis e manual)
```
Arquitetura: a tela consulta o `AgendaViewModel`. Ele carrega a agenda pelo `GetAgendaUseCase`, que usa o `AgendaRepository` e chama a API. O estado único fica em `AgendaUiState`.
---
2. Escala de tempo e zoom (o núcleo da agenda)
`MinuteHeight` define quantos dp ocupa cada minuto:
| Nível | dp por minuto | 1 hora |
|---|---|---|
| Mínimo (Comfortable ÷ 2) | 1,0 | 60 dp |
| Padrão / Comfortable | 2,0 | 120 dp |
| Armado / Máximo (Comfortable × 2) | 4,0 | 240 dp |
| Compacto (outras telas) | 1,067 | 64 dp |
```kotlin
// AgendaZoom (copiado do código)
clamped(h)  = h.coerceIn(1.0, 4.0)
zoomed(r,s) = clamped(r * s)               // pinça
armed(r)    = max(r, 4.0)                  // cartão armado nunca fica abaixo de 4
focalMinute = ((scroll + focalY) - dayTop) / pxPorMinuto, limitado a 0..1440
```
- Geometria (`AgendaTimelineGeometry`): a altura do dia é `round(1440 × dpPorMinuto × pixelsPorDp)`. O código guarda dois valores, o de repouso e o armado. A diferença entre eles (`dayHeightDifferencePx`) serve para corrigir a rolagem quando o zoom muda.
- Pinça (`AgendaPinchZoom`): exige 2 dedos. A âncora fica no minuto que está entre os dedos, então esse minuto permanece no mesmo lugar da tela durante o zoom. O nível escolhido é salvo no `AgendaZoomStore` e volta na próxima abertura.
- Linhas de 5 minutos: aparecem só com zoom. Começam a surgir em 2,5 dp/min e ficam totalmente visíveis em 3,0 dp/min. São tracejadas (4 dp de traço, 2 dp de espaço), com espessura de 2/3 da linha de hora. As linhas de hora usam alpha 0,5.
---
3. Linha do tempo (`FigarooDayTimeline`)
| Elemento | Valor |
|---|---|
| Coluna das horas (`DayTimelineGutter`) | 50 dp (52 dp nas listas) |
| Espaço entre hora e grade | 10 dp |
| Espaço entre coluna e cartão | 12 dp |
| Folga para a barra do topo | 100 dp |
| Dias passados | alpha 0,45 |
| Pontos no limite do dia | 5 pontos, alpha 0,5 |
| Indicador do "agora" | atualiza a cada minuto (`CurrentMinuteFlow`) |
Camadas, de baixo para cima:
1. `HourGridLayer`: grade de horas e de 5 minutos.
2. `DayTimelineOffTimeBlock`: folga do profissional. Hachura com alpha 0,06, barra de identidade de 3,5 dp com alpha 0,3, cantos de 8 dp.
3. `DayTimelineUnavailableBlock`: fora do expediente. Hachura com alpha 0,025, rótulo a 7 dp do topo.
4. `AgendaEventCardsLayer`: os cartões.
5. `AgendaNowIndicator`: linha do agora.
6. `AgendaArmedChrome`: barras e etiqueta de horário que aparecem só durante a edição.
Colunas quando há horários sobrepostos (`layoutEvents`): os eventos são ordenados pelo início e agrupados quando se sobrepõem. Cada um recebe uma coluna (`ColumnSlot` / `PlacedEvent`). O fim usado no cálculo é configurável (`footprintEnd`), por isso um evento pode ocupar mais espaço do que dura.
---
4. Cartão de atendimento
Medidas fixas: cantos de 8 dp, barra lateral de 3,5 dp (cantos de 2 dp), altura mínima de 28 dp, selos em pílula (999), avatar de 40 dp.
Níveis automáticos (`CardTier.forCard`): o conteúdo muda conforme a altura do cartão.
| Nível | Quando | Margem interna (E, T, D, B) | Ícone | Mostra |
|---|---|---|---|---|
| ExtraSmall | menor que 15 min | 8, 2, 8, 2 | 12 dp | só o título, centralizado |
| Small | menor que max(30 min, 48 dp) | 9, 7, 10, 7 | 15 dp | título + ícone de combo |
| Medium | menor que max(45 min, 68 dp) | igual ao Small | 15 dp | + linha de horário |
| Large | menor que max(60 min, 96 dp) | 10, 9, 11, 9 | 16 dp | + cliente |
| ExtraLarge | 60 min ou mais | 11, 11, 12, 11 | 17 dp | + lista de serviços |
Estados do cartão (`AgendaCardDisplayState`):
- Resting: normal.
- Armed: em edição.
- Dimmed: os outros cartões ficam com alpha 0,4 enquanto um está em edição.
Quando a duração muda, a prévia aparece com alpha 0,5.
Marcadores (`ServiceEventTag`): Confirmado, Não compareceu, Promoção, Combo.
Situação (`AppointmentStatus`): Pendente, Confirmado, Não compareceu.
---
5. Cartão armado (mover e redimensionar)
```text
Toque longo (tempo padrão do Android, LongPressTimeout ≈ 400–500 ms)
  → arm(alvo, minutoÂncora)    alvo = Service | OffTime
  → zoom vai para 4 dp/min em 300 ms (ArmZoomDurationMillis)
  → rolagem compensada para o cartão ficar sob o dedo (AgendaArmScrollAnchor)
  → aparecem barra do topo, barra de baixo e etiqueta de horário
  → arrastar o corpo (Grip.Card) = mover
    arrastar a borda de baixo (Grip.BottomEdge) = mudar a duração
  → tocar fora = sair (detectArmedExitTap)
  → salvar: Idle → Saving → Saved (fica 1000 ms visível)
```
Regras do arrasto (`AgendaDragProposal`):
- Encaixe de 5 minutos (`SnapMinutes = 5`). Isso agora está confirmado no código.
- Duração mínima de 5 minutos.
- `obstacleSpans`: os outros eventos funcionam como obstáculos.
- `keepsPastStart`: um atendimento que já começou mantém o início.
- `moved`: só salva se a posição mudou de fato.
Rolagem automática na borda (`AgendaEdgeAutoScroll`):
```kotlin
velocidade = maxVel × min(1, (topo + faixa − dedoY) / faixa)    // subindo
velocidade = maxVel × min(1, (dedoY − (base − faixa)) / faixa)  // descendo
deslocamento = velocidade × min(tempoDoQuadro, 1/30 s)           // limite de 33 ms
minutoDoDedo = minutoDoToque + (scroll − scrollNoToque) / pxPorMinuto
```
Alça de duração: 32 × 4 dp. Etiqueta de horário com 6 dp de margem lateral. O cartão armado fica por cima dos outros (zIndex 1).
---
6. Lista, criação e painel
- Lista (`AgendaListView`): cabeçalho por dia com situação do dia, linhas normais e de reserva, e marcadores de vazio (margem de 14/13 dp, ícone de 18 dp).
- Botão de criar (`AgendaCreateFabMenu`): abre as opções Agendamento, Reserva e Bloqueio.
- Filtros: profissional (avatar de 38 dp) e local.
- Novo agendamento: 4 passos com transição de 300 ms. Fecha 1200 ms depois de salvar. Aceita vários serviços (`CreateAppointmentServiceDto` é uma lista) e indica combo aplicado (`AppliedComboIndicator`).
- Horários (`TimeSlotSelector`): duas abas, disponíveis (`SlotPacker`) e manual. No modo manual aparece um aviso amarelo (texto 13/18 sp, margens 12/10 dp). Bloco de horário com altura mínima de 56 dp e borda de 2 dp.
- Painel do atendimento: abre como folha. Fundo escurecido com alpha 0,32; enquanto carrega, a folha abre até a metade. Tem cartão principal (margem do topo de 22 dp), cartão de serviços (com preço riscado quando há desconto) e ações fixas embaixo, que mudam conforme a situação.
- Remarcar: `RescheduleAppointmentRequest` com `RescheduleClientChannels`, para escolher se o cliente é avisado.
- Lembrete: faixa de lembrete por WhatsApp (`WhatsappReminderBannerData`).
- Atualização: recarrega ao voltar para o app, respeitando um intervalo mínimo (`FOREGROUND_REFRESH_MIN_INTERVAL`). Desiste depois de 5 s sem resposta.
---
7. Letras e cores (sistema visual do Figaroo)
Fontes: Poppins nos títulos, Plus Jakarta Sans nos textos e JetBrains Mono nos horários e preços.
Tamanhos usados na agenda:
| Uso | Tamanho / altura da linha |
|---|---|
| Título do mini cartão | 15/20 |
| Informações | 13/18 |
| Linhas de serviço | 11/14 |
| Data selecionada | 19/24 |
| Dia do calendário | 16/20 |
Cores: Navy `#001A40 → #00509D`, magenta `#B61055 / #D3145D`, destaque `#4DA3FF`. A paleta completa já está no seu CSS como `--fg-*`.
---
8. Como isso se traduz no Cortaí (referência rápida)
```ts
export const DP_POR_MIN = { minimo: 1, padrao: 2, armado: 4 };
export const ENCAIXE_MIN = 5;
export const DURACAO_MINIMA = 5;
export const ARMAR_MS = 300;
export const SALVO_MS = 1000;
export const nivelDoCartao = (alturaPx: number, pxMin: number) =>
  alturaPx < 15 * pxMin ? "xs"
  : alturaPx < Math.max(30 * pxMin, 48) ? "sm"
  : alturaPx < Math.max(45 * pxMin, 68) ? "md"
  : alturaPx < Math.max(60 * pxMin, 96) ? "lg" : "xl";
```
---
9. Sugestões de melhoria para o Cortaí
1. Trocar a altura fixa por níveis de cartão. Hoje o Cortaí usa 2,25 px/min e cartões de no mínimo 72 px. O modelo de 5 níveis do Figaroo resolve texto cortado sem alterar a posição dos cartões.
2. Zoom de verdade: pinça entre 1 e 4 dp/min, com a âncora entre os dedos e o nível salvo.
3. Modo armado: ampliar para 4 dp/min ao segurar o cartão e escurecer os outros (alpha 0,4). Isso dá precisão de 5 minutos no dedo.
4. Rolagem automática na borda com limite por quadro (fórmula acima). É o que mais falta para arrastar além da tela.
5. Mostrar o salvamento: Salvando → Salvo, visível por 1 s, sem bloquear a agenda. Dá para combinar com o seu desfazer de 5 s.
6. Linhas de 5 minutos só com zoom alto, para manter a tela limpa no zoom normal.
7. Hachura para folga e fora do expediente, separando visualmente o bloqueio do horário livre.
8. Atualizar ao voltar ao app, com intervalo mínimo, para evitar a agenda desatualizada depois de minimizar.
9. Vários serviços no mesmo atendimento: precisa passar pelo motor oficial de horários e pelos preços do catálogo. Não é só uma mudança de tela.
---
O que não consegui ler: o tamanho exato das letras de cada nível de cartão, o tempo exato do toque longo (o Figaroo usa o padrão do Android) e se existe um estado "falhou" no salvamento (só encontrei Parado, Salvando e Salvo). Não mexi em nada do Cortaí. Se quiser, começo pelos itens 1 e 3, que dão o maior ganho visual sem alterar a posição dos cartões.

Aqui estão os fluxos dos 24 módulos do Figaroo, tela por tela. Tudo saiu do aplicativo que você mandou: nomes de telas, etapas, janelas, estados (carregando, erro, sucesso) e mensagens internas.

Um aviso antes de passar ao GPT: os nomes são exatos. O que cada ação faz por dentro eu deduzi pelos nomes, porque o corpo das funções não foi lido.

---

Padrões que valem para o app inteiro
- Estados de toda tela: Carregando → Sucesso ou Erro (com "tentar de novo"). Telas que salvam têm também "erro ao salvar".
- Navegação: cada tela tem Voltar, Fechar ou nenhum.
- Apagar ou desativar: pede confirmação, executa, fecha a tela sozinho e volta para a lista.
- Janelas comuns: confirmação, erro do servidor, ajuda, escolher hora, copiar horário para outros dias, nova folga e editar biografia.
- Sessão: entrou → expirou (volta ao login) → saiu.
- Bloqueio por plano: mostra a tela de planos, que pode ser fechada ou obrigatória.
- Registro de uso: cadastro iniciado, cadastro concluído, etapa do onboarding concluída e saída da conta.

---

1. Abertura e login
- Abertura: Entrar → Login; Criar conta → Cadastro.
- Login:
  1. Digitar e-mail (pode dar erro no campo).
  2. Digitar senha (pode dar erro no campo).
  3. Se o e-mail for novo, vai para o Cadastro.
  4. Também aceita entrar com Google ou Facebook e recuperar a senha.
  5. Deu certo: abre a área interna e a Agenda.

2. Cadastro
- Cadastro: dados do dono → aceite → cria a conta.
- Tem uma janela de Ajuda.
- Ao concluir, entra direto no app.

3. Configuração inicial (onboarding)
1. Boas-vindas
2. Locais: vazio → adiciona o primeiro → preenchido
3. Serviços: vazio → cadastra → preenchido
4. Equipe: preenchido, ou aviso de "perfil do dono incompleto", que leva a Completar perfil do dono
5. Concluído: carregando → tela de comemoração (ou erro)

Cada etapa mostra seu estado: pendente, atual ou feita.

4. Agenda
- Agenda: dia, troca de data, zoom com os dedos, linha do "agora".
  - Janela Escolher local.
  - Janela Filtrar profissionais.
  - Segurar um cartão permite mover ou mudar a duração.
- Novo agendamento:
  1. Cliente
  2. Serviços
  3. Horário
  4. Resumo e confirmar
- Escolher horário: horários livres por profissional.
- Painel do agendamento (abre em janela ou tela cheia; carregando, sucesso ou erro):
  - ver dados
  - editar horário
  - cancelar
  - cobrar (abre o Caixa)
- Editar horário: carregando → carregado → salvar (ou erro ao salvar).
- Reserva (períodos recorrentes ou especiais):
  1. Cliente
  2. Datas
  3. Motivo
  4. Resumo
- Ações da reserva: apagar só esta data ou apagar a série inteira.
- Bloqueio: criar (escolhe a data) → detalhe do bloqueio → apagar.

5. Caixa
1. Caixa: itens da venda
2. Editar serviço na venda
3. Desconto (janela)
4. Escolher forma de pagamento
5. Resumo e concluir

6. Vendas
- Painel da venda: carregando, sucesso ou erro.
- Painel da venda de pacote.
- Formas de pagamento:
  - regra de taxa (janela)
  - pergunta "reaplicar taxa?"
- Venda não suportada: aviso para tipos de venda que o app não trata.

7. Histórico
- Histórico de agendamentos
- Histórico de vendas

8. Clientes
- Visão de clientes: lista separada em seções, cada linha com nome e uma informação embaixo; a lista pode separar por unidade.
- Escolher cliente, usado nos outros fluxos.
- Novo cliente:
  1. Dados
  2. Salvar (cria o cliente)
- Painel do cliente:
  - ver dados
  - editar dados
  - escolher como o cliente recebe avisos
  - notas: criar, editar e apagar (em janela)
  - apagar cliente

9. Marketing e campanhas
- Painel de marketing: resultados das campanhas.
- Nova campanha:
  1. Modelo (carregando, carregado ou erro)
  2. Detalhes
  3. Serviços
  4. Regras (com campo de valor livre)
  5. Duração
- Painel da campanha:
  - resultados
  - editar detalhes, regras ou duração
  - arquivar

10. Pacotes
- Lista de pacotes
- Novo pacote:
  1. Detalhes
  2. Serviços
  3. Regras
  4. Ritmo de visitas
- Painel do pacote:
  - editar preço (janela)
  - editar detalhes, serviços e regras
  - ver clientes do pacote (janela)
  - desativar ou apagar (fecha sozinho depois)
- Vender pacote:
  1. Pacote
  2. Pagamento
  3. Programação das visitas
  4. Marcar a primeira visita
- Marcar visita do pacote
- Cancelar o pacote de um cliente

11. Serviços
- Lista de serviços → Novo serviço
- Painel do serviço:
  - detalhes
  - preços
  - regras de agendamento
  - atendimentos ao mesmo tempo
  - profissionais que fazem
  - desativar ou apagar
- Categorias: visão geral → criar → editar
- Escolher serviço, usado nos outros fluxos
- Combos:
  1. Lista → novo combo
  2. Painel do combo: detalhes, desconto (com valor personalizado) e serviços
  3. Desativar ou apagar

12. Equipe
- Lista da equipe → Novo profissional
- Painel do profissional:
  - dados
  - serviços
  - horário semanal (copiar para outros dias)
  - horários especiais e folgas
  - apagar
- Completar perfil do dono

13. Locais
- Lista de locais → Novo local
- Painel do local:
  - dados
  - endereço
  - comodidades
  - horário de funcionamento
  - horário especial
  - apagar (fecha sozinho depois)

14. Página pública
- Ajustes da página (carregando, sucesso ou erro):
  - publicar
  - descartar rascunho
- Editores:
  - capa
  - serviços
  - equipe
  - locais
  - galeria de fotos
  - avaliações
  - redes sociais
  - formulário de contato
- Layout e tema: escolher → prévia
- Prévia do rascunho: carregando, pronta ou erro
- QR Code: salvar na galeria ou imprimir; cada um pode dar certo ou falhar
- Endereço da página: editar o link

15. Avaliações
- Visão geral com notas de 1 a 5 estrelas e comentários.

16. Indicadores
- Painel com blocos de:
  - faturamento
  - previsão
  - comparação entre profissionais
- Uma janela escolhe quais blocos aparecem.

17. Avisos
- Lista de avisos → detalhe do aviso → abre a tela relacionada.

18. Ajustes da empresa
- Dados do negócio (salvar e fechar)
- Regras de agendamento
- Avisos para clientes, com janela para escolher o canal
- Endereço da página

19. Conta
- Ajustes da conta
- Trocar e-mail → confirmar e-mail
- Definir senha
- Permissões de acesso
- Sair, com confirmação

20. Assinatura
- Planos: sem ação, carregando, sucesso ou erro
- Tela de planos: abre quando o plano não libera o recurso
- Mudar o tamanho da equipe

21. Fotos
- Galeria: escolher uma imagem, usada em serviços, página e perfis.

22. Ajustes de desenvolvedor
- Área interna de testes, não aparece para o usuário.

23 e 24. Base do app e visual
São as janelas e regras comuns listadas no início.

---

Mapa geral
```text
Abertura → Login/Cadastro → Onboarding (Locais → Serviços → Equipe → Concluído)
   → AGENDA ─┬─ Novo agendamento → Painel → Cobrar → Caixa → Pagamento → Venda
             ├─ Reserva / Bloqueio
             └─ Menu: Clientes · Marketing · Pacotes · Serviços · Equipe · Locais
                      Página pública · Avaliações · Indicadores · Avisos
                      Ajustes da empresa · Conta · Assinatura
```

Tudo recuperação do fígaro para levar ao cortaí 