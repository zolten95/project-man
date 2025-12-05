"use client";

import { deleteTimeEntry } from "../actions/time-actions";
import { useState } from "react";

interface TimeEntry {
  id: string;
  minutes: number;
  description: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  user: {
    full_name: string;
    user_id: string;
  } | null;
}

interface TimeEntriesListProps {
  entries: TimeEntry[];
  estimatedMinutes: number | null;
  onEntryDeleted?: () => void;
}

export default function TimeEntriesList({
  entries,
  estimatedMinutes,
  onEntryDeleted,
}: TimeEntriesListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const totalTrackedMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);

  async function handleDelete(entryId: string) {
    if (!confirm("Are you sure you want to delete this time entry?")) {
      return;
    }

    setDeletingId(entryId);
    const result = await deleteTimeEntry(entryId);
    setDeletingId(null);

    if (result.error) {
      alert(result.error);
    } else if (onEntryDeleted) {
      onEntryDeleted();
    }
  }

  function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-300">Time Summary</h3>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Estimated:</span>
            <span className="text-white font-medium">
              {estimatedMinutes ? formatMinutes(estimatedMinutes) : "Not set"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Tracked:</span>
            <span className="text-white font-medium">
              {formatMinutes(totalTrackedMinutes)}
            </span>
          </div>
          {estimatedMinutes && estimatedMinutes > 0 && (
            <div className="pt-2 border-t border-zinc-700">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-zinc-400">Progress:</span>
                <span
                  className={`font-medium ${
                    totalTrackedMinutes > estimatedMinutes
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {Math.round((totalTrackedMinutes / estimatedMinutes) * 100)}%
                </span>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    totalTrackedMinutes > estimatedMinutes
                      ? "bg-red-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (totalTrackedMinutes / estimatedMinutes) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entries List */}
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">
          Time Entries ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <div className="text-sm text-zinc-500 text-center py-8 bg-zinc-800 border border-zinc-700 rounded-lg">
            No time entries yet
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">
                      {formatMinutes(entry.minutes)}
                    </div>
                    {entry.description && (
                      <div className="text-zinc-400 text-sm mt-1">
                        {entry.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-zinc-500 text-right">
                      {formatDate(entry.created_at)}
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="p-1.5 hover:bg-red-900/30 text-red-400 rounded transition-colors disabled:opacity-50"
                      title="Delete time entry"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  by {entry.user?.full_name || "Unknown"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
