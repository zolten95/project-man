"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [taskCount, setTaskCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchTaskCount() {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();
      if (user) {
        const { count } = await supabaseBrowser
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("assignee_id", user.id)
          .neq("status", "complete");
        setTaskCount(count);
      }
    }
    fetchTaskCount();
  }, []);

  const menuItems = [
    {
      name: "My Tasks",
      href: "/",
      icon: "📋",
      badge: taskCount !== null && taskCount > 0 ? taskCount : null,
    },
    {
      name: "All Tasks",
      href: "/all-tasks",
      icon: "📝",
    },
    {
      name: "Timesheet",
      href: "/timesheet",
      icon: "⏱️",
    },
    {
      name: "Projects",
      href: "/projects",
      icon: "📁",
    },
    {
      name: "Team",
      href: "/team",
      icon: "👥",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: "⚙️",
    },
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen">
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white">StudioDirection</h2>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#6295ff] text-white"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

