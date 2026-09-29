-- Fixture de demonstração: habilita Pix na barbearia de teste para validar o fluxo do cliente.
INSERT INTO public.configuracoes_financeiras (tenant_id, pix_ativo, pix_chave, pix_tipo, pix_whatsapp)
VALUES ('0de00000-0000-4000-8000-000000000001', true, 'demonstracao@cortai.dev', 'email', '5511999990000')
ON CONFLICT (tenant_id) DO UPDATE
  SET pix_ativo = EXCLUDED.pix_ativo,
      pix_chave = EXCLUDED.pix_chave,
      pix_tipo = EXCLUDED.pix_tipo,
      pix_whatsapp = EXCLUDED.pix_whatsapp;