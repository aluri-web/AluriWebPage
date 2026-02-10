-- Create a new storage bucket for property photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('properties', 'properties', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'properties');

-- Policy to allow public to view property photos
CREATE POLICY "Public can view property photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'properties');

-- Policy to allow authenticated users to delete their own uploads (optional but good)
-- For simplicity in this admin context, we allow authenticated users to delete from this bucket
CREATE POLICY "Authenticated users can delete property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'properties');
