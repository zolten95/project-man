'use server';

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

const STUDIO_DIRECTION_TEAM_ID = "92e8f38d-5161-4d70-bbdd-772d23cc7373";

export interface TeamMember {
  user_id: string;
  role: string | null;
  profile: {
    full_name: string;
    user_id: string;
  } | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assignee_id: string;
  estimated_time_minutes?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: string;
}

export async function createTask(input: CreateTaskInput) {
  const supabase = await createSupabaseServerClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Create task auth error:', userError);
    console.error('User:', user);
    return { error: 'Not authenticated' };
  }

  // Create task with default status 'todo'
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      team_id: STUDIO_DIRECTION_TEAM_ID,
      title: input.title,
      description: input.description || null,
      assignee_id: input.assignee_id,
      creator_id: user.id,
      status: 'todo',
      estimated_time_minutes: input.estimated_time_minutes || null,
      priority: input.priority || null,
      due_date: input.due_date || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/all-tasks');
  return { data };
}

export async function updateTaskStatus(taskId: string, status: 'todo' | 'in_progress' | 'in_review' | 'complete') {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  // Check if user is assignee or creator
  const { data: task } = await supabase
    .from('tasks')
    .select('assignee_id, creator_id')
    .eq('id', taskId)
    .single();

  if (!task || (task.assignee_id !== user.id && task.creator_id !== user.id)) {
    return { error: 'Not authorized to update this task' };
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task status:', error);
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/all-tasks');
  return { data };
}

export async function getTaskDetails(taskId: string) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  // Get task first
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    console.error('Error fetching task:', taskError);
    return { error: taskError?.message || 'Task not found' };
  }

  // Get assignee and creator profiles separately
  let assignee = null;
  let creator = null;

  if (task.assignee_id) {
    const { data: assigneeData } = await supabase
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', task.assignee_id)
      .single();
    assignee = assigneeData;
  }

  if (task.creator_id) {
    const { data: creatorData } = await supabase
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', task.creator_id)
      .single();
    creator = creatorData;
  }

  // Get time entries
  const { data: timeEntriesData } = await supabase
    .from('time_entries')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  // Get user profiles for time entries
  const timeEntries = await Promise.all(
    (timeEntriesData || []).map(async (entry) => {
      if (entry.user_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name, user_id')
          .eq('user_id', entry.user_id)
          .single();
        return { ...entry, user: userData };
      }
      return { ...entry, user: null };
    })
  );

  // Get comments
  const { data: commentsData } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  // Get user profiles for comments
  const comments = await Promise.all(
    (commentsData || []).map(async (comment) => {
      if (comment.user_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name, user_id')
          .eq('user_id', comment.user_id)
          .single();
        return { ...comment, user: userData };
      }
      return { ...comment, user: null };
    })
  );

  return {
    data: {
      ...task,
      assignee,
      creator,
      time_entries: timeEntries || [],
      comments: comments || [],
    },
  };
}

export async function getTeamMembers(): Promise<{ data?: TeamMember[]; error?: string }> {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Auth error:', userError);
    return { error: 'Not authenticated' };
  }

  // First, try to get team members from team_members table
  const { data: teamMembersData, error: teamMembersError } = await supabase
    .from('team_members')
    .select(`
      user_id,
      role,
      profile:profiles!team_members_user_id_fkey(full_name, user_id)
    `)
    .eq('team_id', STUDIO_DIRECTION_TEAM_ID)
    .order('created_at', { ascending: true });

  if (teamMembersError) {
    console.error('Error fetching team members:', teamMembersError);
    // Fallback: get all users with profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .not('full_name', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return { error: profilesError.message };
    }

    return { 
      data: (profilesData || []).map(p => ({
        user_id: p.user_id,
        role: null,
        profile: { full_name: p.full_name, user_id: p.user_id }
      }))
    };
  }

  // If we have team members, normalize the data to ensure profile is always an object or null
  if (teamMembersData && teamMembersData.length > 0) {
    return { 
      data: teamMembersData.map(member => {
        // Handle case where profile might be an array or object
        let profile = null;
        if (member.profile) {
          if (Array.isArray(member.profile)) {
            // If profile is an array, take the first element
            profile = member.profile[0] || null;
          } else {
            // If profile is already an object, use it directly
            profile = member.profile;
          }
        }
        
        return {
          user_id: member.user_id,
          role: member.role,
          profile: profile
        };
      })
    };
  }

  // Fallback: if no team members found, get all users with profiles
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .not('full_name', 'is', null);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return { error: profilesError.message };
  }

  return { 
    data: (profilesData || []).map(p => ({
      user_id: p.user_id,
      role: null,
      profile: { full_name: p.full_name, user_id: p.user_id }
    }))
  };
}
