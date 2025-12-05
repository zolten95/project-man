'use server';

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export interface AddManualTimeEntryInput {
  task_id: string;
  minutes: number;
  description?: string;
}

export async function addManualTimeEntry(input: AddManualTimeEntryInput) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  // Verify user is assigned to the task
  const { data: task } = await supabase
    .from('tasks')
    .select('assignee_id')
    .eq('id', input.task_id)
    .single();

  if (!task || task.assignee_id !== user.id) {
    return { error: 'Not authorized to track time for this task' };
  }

  // Enforce minimum 1 minute
  const minutes = input.minutes < 1 ? 1 : input.minutes;

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      task_id: input.task_id,
      user_id: user.id,
      minutes: minutes,
      description: input.description || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding time entry:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/all-tasks');
  return { data };
}

export async function stopTimer(taskId: string, startedAt: string) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  // Verify user is assigned to the task
  const { data: task } = await supabase
    .from('tasks')
    .select('assignee_id')
    .eq('id', taskId)
    .single();

  if (!task || task.assignee_id !== user.id) {
    return { error: 'Not authorized to track time for this task' };
  }

  const startTime = new Date(startedAt);
  const endTime = new Date();
  const calculatedMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  
  // Enforce minimum 1 minute - if less than 1 minute, count as 1 minute
  const minutes = calculatedMinutes < 1 ? 1 : calculatedMinutes;

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      task_id: taskId,
      user_id: user.id,
      minutes,
      started_at: startTime.toISOString(),
      ended_at: endTime.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error stopping timer:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/all-tasks');
  return { data };
}

export async function getTimeEntries(taskId: string) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      user:profiles!time_entries_user_id_fkey(full_name, user_id)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching time entries:', error);
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function deleteTimeEntry(timeEntryId: string) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  // Verify the time entry belongs to the user
  const { data: timeEntry, error: fetchError } = await supabase
    .from('time_entries')
    .select('user_id, task_id')
    .eq('id', timeEntryId)
    .single();

  if (fetchError || !timeEntry) {
    return { error: 'Time entry not found' };
  }

  if (timeEntry.user_id !== user.id) {
    return { error: 'Not authorized to delete this time entry' };
  }

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', timeEntryId);

  if (error) {
    console.error('Error deleting time entry:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/all-tasks');
  revalidatePath('/timesheet');
  return { data: { success: true } };
}
