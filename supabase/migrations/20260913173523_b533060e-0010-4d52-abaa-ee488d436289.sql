CREATE POLICY "admin le imagens da home" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'home-publica' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin envia imagens da home" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'home-publica' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin atualiza imagens da home" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'home-publica' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'home-publica' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin remove imagens da home" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'home-publica' AND public.has_role(auth.uid(), 'admin'));