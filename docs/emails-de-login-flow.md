# E-mails de login do Flow (Supabase Auth)

Os e-mails de login são enviados pelo próprio Supabase e editados **no painel**, não no código:
Supabase → projeto `cortai-prod` → **Authentication → Email Templates**. Colar o assunto e o corpo de cada
modelo abaixo. As variáveis `{{ .ConfirmationURL }}` e `{{ .SiteURL }}` são do Supabase e não devem ser alteradas.

O app usa três modelos: **Confirm signup** (cadastro e reenvio da confirmação), **Invite user** (convite para a
equipe) e **Reset password** (esqueci a senha e redefinição pela equipe). Linguagem neutra (negócio, profissional,
cliente) e sem imagens externas, para não depender de domínio.

---

## 1. Confirm signup

**Assunto:** `Confirme seu e-mail no Flow`

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1b1f1c">
  <p style="font-size:28px;font-weight:700;margin:0 0 24px">flow<span style="color:#fc4980">.</span></p>
  <h1 style="font-size:20px;margin:0 0 12px">Confirme seu e-mail</h1>
  <p style="font-size:15px;line-height:22px;margin:0 0 24px">
    Falta só um passo para começar a usar o Flow. Toque no botão abaixo para confirmar seu e-mail.
  </p>
  <p style="margin:0 0 24px">
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#1b1f1c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px">
      Confirmar e-mail
    </a>
  </p>
  <p style="font-size:13px;line-height:20px;color:#5b6660;margin:0">
    Se você não criou uma conta no Flow, ignore este e-mail.
  </p>
  <p style="font-size:13px;color:#5b6660;margin:24px 0 0">Flow · Seu negócio no ritmo certo.</p>
</div>
```

## 2. Invite user

**Assunto:** `Você foi convidado para a equipe no Flow`

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1b1f1c">
  <p style="font-size:28px;font-weight:700;margin:0 0 24px">flow<span style="color:#fc4980">.</span></p>
  <h1 style="font-size:20px;margin:0 0 12px">Você foi convidado</h1>
  <p style="font-size:15px;line-height:22px;margin:0 0 24px">
    Um negócio convidou você para fazer parte da equipe no Flow. Toque no botão abaixo para aceitar e criar seu acesso.
  </p>
  <p style="margin:0 0 24px">
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#1b1f1c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px">
      Aceitar convite
    </a>
  </p>
  <p style="font-size:13px;line-height:20px;color:#5b6660;margin:0">
    Se você não esperava este convite, ignore este e-mail.
  </p>
  <p style="font-size:13px;color:#5b6660;margin:24px 0 0">Flow · Seu negócio no ritmo certo.</p>
</div>
```

## 3. Reset password

**Assunto:** `Redefina sua senha do Flow`

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1b1f1c">
  <p style="font-size:28px;font-weight:700;margin:0 0 24px">flow<span style="color:#fc4980">.</span></p>
  <h1 style="font-size:20px;margin:0 0 12px">Redefinir senha</h1>
  <p style="font-size:15px;line-height:22px;margin:0 0 24px">
    Recebemos um pedido para redefinir a senha da sua conta no Flow. Toque no botão abaixo para escolher uma nova senha.
  </p>
  <p style="margin:0 0 24px">
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#1b1f1c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px">
      Escolher nova senha
    </a>
  </p>
  <p style="font-size:13px;line-height:20px;color:#5b6660;margin:0">
    Se você não pediu para redefinir a senha, ignore este e-mail. Sua senha continua a mesma.
  </p>
  <p style="font-size:13px;color:#5b6660;margin:24px 0 0">Flow · Seu negócio no ritmo certo.</p>
</div>
```

---

Depois de colar, vale enviar um teste para si mesmo (Esqueci a senha no login) e conferir no celular.
