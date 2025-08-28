import { supabase } from './supabase';

const ATTACHMENTS_BUCKET = 'attachments';

export async function uploadAttachmentForPost(postId, file, userId) {
  if (!file || !postId || !userId) throw new Error('Missing file/postId/userId');
  const ext = file.name.split('.').pop();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${postId}/${Date.now()}-${safeName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
  if (uploadError) throw uploadError;

  // Insert DB record
  const { data: record, error: insertError } = await supabase
    .from('attachments')
    .insert({
      post_id: postId,
      user_id: userId,
      bucket: ATTACHMENTS_BUCKET,
      path: filePath,
      name: file.name,
      mime_type: file.type || null,
      size: file.size || null,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  return record;
}

export async function listAttachmentsForPost(postId) {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAttachmentSignedUrl(path, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl;
}

export async function deleteAttachment(attachment) {
  const { path, id } = attachment;
  if (path) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
  }
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

