"use client";

import { useState } from "react";
import { addComment } from "../actions/comment-actions";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    full_name: string;
    user_id: string;
  } | null;
}

interface TaskCommentsProps {
  taskId: string;
  comments: Comment[];
  onCommentAdded: () => void;
}

export default function TaskComments({
  taskId,
  comments,
  onCommentAdded,
}: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!newComment.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    setLoading(true);
    const result = await addComment(taskId, newComment);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setNewComment("");
      onCommentAdded();
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return "Just now";
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-300">
        Comments ({comments.length})
      </h3>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-sm text-zinc-500 text-center py-8 bg-zinc-800 border border-zinc-700 rounded-lg">
          No comments yet
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-zinc-800 border border-zinc-700 rounded-lg p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#6295ff] rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {comment.user?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "?"}
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">
                      {comment.user?.full_name || "Unknown"}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {formatDate(comment.created_at)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-zinc-300 text-sm whitespace-pre-wrap">
                {comment.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && (
          <div className="bg-red-950/40 border border-red-900 rounded-md px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full rounded-md px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#6295ff] resize-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="px-4 py-2 bg-[#6295ff] hover:bg-[#4b7af0] disabled:opacity-60 text-white rounded-md text-sm font-medium transition-colors"
          >
            {loading ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}
