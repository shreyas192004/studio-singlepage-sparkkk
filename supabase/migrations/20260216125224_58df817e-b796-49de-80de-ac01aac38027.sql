
INSERT INTO storage.buckets (id, name, public) VALUES ('ai-inputs', 'ai-inputs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload to ai-inputs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ai-inputs');
CREATE POLICY "Anyone can view ai-inputs" ON storage.objects FOR SELECT USING (bucket_id = 'ai-inputs');
