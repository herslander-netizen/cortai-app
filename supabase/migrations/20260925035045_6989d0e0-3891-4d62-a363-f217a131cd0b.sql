ALTER TABLE public.fila_de_espera REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='fila_de_espera') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fila_de_espera;
  END IF;
END $$;