"use client";

import { useState, useEffect } from "react";
import { addManualTimeEntry, stopTimer } from "../actions/time-actions";

interface TimeTrackerProps {
  taskId: string;
  isAssignee: boolean;
  onTimeAdded?: (taskId: string, addedMinutes: number) => void;
}

export default function TimeTracker({
  taskId,
  isAssignee,
  onTimeAdded,
}: TimeTrackerProps) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load timer state from localStorage
  useEffect(() => {
    const savedTimer = localStorage.getItem(`timer_${taskId}`);
    if (savedTimer) {
      const { startTime } = JSON.parse(savedTimer);
      setTimerStartTime(startTime);
      setIsTimerRunning(true);
    }
  }, [taskId]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        const start = new Date(timerStartTime).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerStartTime]);

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  async function handleStartTimer() {
    const startTime = new Date().toISOString();
    setTimerStartTime(startTime);
    setIsTimerRunning(true);
    localStorage.setItem(
      `timer_${taskId}`,
      JSON.stringify({ startTime, taskId })
    );
  }

  async function handleStopTimer() {
    if (!timerStartTime) return;

    setLoading(true);
    setError(null);

    // Calculate minutes before stopping
    const startTime = new Date(timerStartTime);
    const endTime = new Date();
    const calculatedMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    // Enforce minimum 1 minute - server will also enforce this
    const minutes = calculatedMinutes < 1 ? 1 : calculatedMinutes;

    const result = await stopTimer(taskId, timerStartTime);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setIsTimerRunning(false);
      setTimerStartTime(null);
      setElapsedSeconds(0);
      localStorage.removeItem(`timer_${taskId}`);
      if (onTimeAdded && minutes > 0) {
        onTimeAdded(taskId, minutes);
      }
      setLoading(false);
    }
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 0) {
      setError("Please enter a valid time");
      return;
    }

    setLoading(true);
    const result = await addManualTimeEntry({
      task_id: taskId,
      minutes: totalMinutes,
      description: manualDescription || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setManualHours("");
      setManualMinutes("");
      setManualDescription("");
      setShowManualEntry(false);
      if (onTimeAdded) {
        onTimeAdded(taskId, totalMinutes);
      }
      setLoading(false);
    }
  }

  if (!isAssignee) {
    return (
      <div className="text-sm text-zinc-400">
        Only the assigned team member can track time for this task.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-950/40 border border-red-900 rounded-md px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Timer Section */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-300">Timer</h3>
          {isTimerRunning && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
              Running
            </span>
          )}
        </div>

        <div className="text-center mb-4">
          <div className="text-3xl font-mono font-bold text-white">
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        <div className="flex gap-2">
          {!isTimerRunning ? (
            <button
              onClick={handleStartTimer}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
            >
              Start Timer
            </button>
          ) : (
            <button
              onClick={handleStopTimer}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-md font-medium transition-colors"
            >
              {loading ? "Stopping..." : "Stop Timer"}
            </button>
          )}
        </div>
      </div>

      {/* Manual Entry Section */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
        {!showManualEntry ? (
          <button
            onClick={() => setShowManualEntry(true)}
            className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md font-medium transition-colors"
          >
            + Add Manual Time Entry
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                placeholder="Hours"
                className="flex-1 rounded-md px-3 py-2 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#6295ff]"
              />
              <input
                type="number"
                min="0"
                max="59"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                placeholder="Minutes"
                className="flex-1 rounded-md px-3 py-2 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#6295ff]"
              />
            </div>
            <textarea
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              placeholder="What did you work on? (optional)"
              rows={2}
              className="w-full rounded-md px-3 py-2 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#6295ff] resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowManualEntry(false);
                  setManualHours("");
                  setManualMinutes("");
                  setManualDescription("");
                }}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#6295ff] hover:bg-[#4b7af0] disabled:opacity-60 text-white rounded-md font-medium transition-colors"
              >
                {loading ? "Adding..." : "Add Time"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
