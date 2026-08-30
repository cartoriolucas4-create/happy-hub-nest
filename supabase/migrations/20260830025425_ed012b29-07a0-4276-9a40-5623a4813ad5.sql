CREATE POLICY "barbershop media public read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'barbershop-media');

CREATE POLICY "owner upload barbershop media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'barbershop-media'
  AND (storage.foldername(name))[1] = public.current_barbershop_id()::text
);

CREATE POLICY "owner update barbershop media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'barbershop-media'
  AND (storage.foldername(name))[1] = public.current_barbershop_id()::text
);

CREATE POLICY "owner delete barbershop media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'barbershop-media'
  AND (storage.foldername(name))[1] = public.current_barbershop_id()::text
);