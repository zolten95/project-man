'use server';

import { createSupabaseServerClient } from "@/lib/supabaseServer";

export interface TimesheetTaskData {
  task_id: string;
  task_title: string;
  task_status: string;
  assignee_id: string;
  daily_time: { [date: string]: number }; // date string (YYYY-MM-DD) -> minutes
  total_minutes: number;
}

export interface TimesheetData {
  tasks: TimesheetTaskData[];
  daily_totals: { [date: string]: number }; // date string -> total minutes for that day
  week_total: number;
}

export async function getTimesheetData(startDate: string, endDate: string) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  // Fetch all time entries for the user
  // We'll filter by date in JavaScript since we need to check started_at or created_at
  const { data: timeEntries, error: timeEntriesError } = await supabase
    .from('time_entries')
    .select(`
      id,
      task_id,
      minutes,
      started_at,
      created_at
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (timeEntriesError) {
    console.error('Error fetching time entries:', timeEntriesError);
    return { error: timeEntriesError.message };
  }

  // Fetch all tasks assigned to the user
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, status, assignee_id')
    .eq('assignee_id', user.id);

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
    return { error: tasksError.message };
  }

  // Group time entries by task and date
  const taskMap = new Map<string, TimesheetTaskData>();
  const dailyTotals: { [date: string]: number } = {};

  // Initialize task map with all user's tasks
  (tasks || []).forEach(task => {
    taskMap.set(task.id, {
      task_id: task.id,
      task_title: task.title,
      task_status: task.status,
      assignee_id: task.assignee_id,
      daily_time: {},
      total_minutes: 0,
    });
  });

  // Process time entries
  (timeEntries || []).forEach(entry => {
    // Determine the date for this entry
    // Use started_at if available, otherwise use created_at
    const entryDate = entry.started_at 
      ? new Date(entry.started_at).toISOString().split('T')[0]
      : new Date(entry.created_at).toISOString().split('T')[0];

    // Check if entry date is within range
    if (entryDate >= startDate && entryDate <= endDate) {
      const task = taskMap.get(entry.task_id);
      if (task) {
        // Add minutes to the specific day
        if (!task.daily_time[entryDate]) {
          task.daily_time[entryDate] = 0;
        }
        task.daily_time[entryDate] += entry.minutes;
        task.total_minutes += entry.minutes;

        // Add to daily totals
        if (!dailyTotals[entryDate]) {
          dailyTotals[entryDate] = 0;
        }
        dailyTotals[entryDate] += entry.minutes;
      } else {
        // Task not in our map (maybe deleted or reassigned), but we still count the time
        if (!dailyTotals[entryDate]) {
          dailyTotals[entryDate] = 0;
        }
        dailyTotals[entryDate] += entry.minutes;
      }
    }
  });

  // Sort tasks by total minutes (descending), then by title
  const sortedTasks = Array.from(taskMap.values()).sort((a, b) => {
    if (b.total_minutes !== a.total_minutes) {
      return b.total_minutes - a.total_minutes;
    }
    return a.task_title.localeCompare(b.task_title);
  });

  // Calculate week total
  const weekTotal = Object.values(dailyTotals).reduce((sum, minutes) => sum + minutes, 0);

  return {
    data: {
      tasks: sortedTasks,
      daily_totals: dailyTotals,
      week_total: weekTotal,
    } as TimesheetData,
  };
}

export async function getUserAccountDate() {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  // Get user creation date from auth.users
  // The user object from getUser() should have created_at
  if (user.created_at) {
    return { data: user.created_at };
  }

  // Fallback: try to get from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('user_id', user.id)
    .single();

  if (profile?.created_at) {
    return { data: profile.created_at };
  }

  // If no date found, use a default (e.g., 1 year ago)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return { data: oneYearAgo.toISOString() };
}

