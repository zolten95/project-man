'use server';

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function addComment(taskId: string, content: string) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  if (!content.trim()) {
    return { error: 'Comment cannot be empty' };
  }

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: user.id,
      content: content.trim(),
    })
    .select(`
      *,
      user:profiles!task_comments_user_id_fkey(full_name, user_id)
    `)
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/all-tasks');
  return { data };
}

export async function getComments(taskId: string) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('task_comments')
    .select(`
      *,
      user:profiles!task_comments_user_id_fkey(full_name, user_id)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return { error: error.message };
  }

  return { data: data || [] };
}
