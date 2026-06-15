
CREATE POLICY "Users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bird-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'bird-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bird-images' AND (storage.foldername(name))[1] = auth.uid()::text);
