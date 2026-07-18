import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use file storage');
  }

  client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  return client;
}

function bucketName(): string {
  return process.env.SUPABASE_PHOTOS_BUCKET || 'candidate-photos';
}

function extensionFor(mimetype: string): string {
  switch (mimetype) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

/**
 * Uploads a candidate's photo to a deterministic path (`candidates/{candidateId}.{ext}`) with
 * upsert so re-uploading naturally replaces the previous file — no orphaned versions to clean up.
 * Returns the public URL to store on `candidate.photoUrl`.
 */
export async function uploadCandidatePhoto(candidateId: string, buffer: Buffer, mimetype: string): Promise<string> {
  const path = `candidates/${candidateId}.${extensionFor(mimetype)}`;

  const { error } = await getClient()
    .storage.from(bucketName())
    .upload(path, buffer, { contentType: mimetype, upsert: true });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = getClient().storage.from(bucketName()).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort delete of every possible extension for this candidate — the caller doesn't track which one is live. */
export async function removeCandidatePhoto(candidateId: string): Promise<void> {
  const paths = ['jpg', 'png', 'webp'].map((ext) => `candidates/${candidateId}.${ext}`);
  await getClient().storage.from(bucketName()).remove(paths);
}
