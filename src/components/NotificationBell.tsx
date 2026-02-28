"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/types";

const TYPE_ICONS: Record<string, string> = {
  matching: "auto_awesome",
  entry: "send",
  info: "info",
  system: "settings",
};

const TYPE_COLORS: Record<string, string> = {
  matching: "text-[#8b5cf6] bg-[#f5f3ff]",
  entry: "text-blue bg-[#EBF7FD]",
  info: "text-[#555] bg-[#f5f5f5]",
  system: "text-[#888] bg-[#f5f5f5]",
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}時間前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}日前`;
  const diffM = Math.floor(diffD / 30);
  if (diffM < 12) return `${diffM}ヶ月前`;
  return `${Math.floor(diffM / 12)}年前`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }

  async function handleNotificationClick(notification: Notification) {
    // Mark as read
    if (!notification.is_read) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notification.id] }),
        });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silently fail
      }
    }
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  const displayNotifications = notifications.slice(0, 10);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#f5f7fa] transition-colors"
        aria-label="通知"
      >
        <span className="material-symbols-rounded text-[22px] text-[#555]">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#E15454] text-white text-[10px] font-bold rounded-full px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] w-[360px] max-h-[480px] bg-white rounded-2xl border border-[#e8e8ed] shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden z-[300]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e8e8ed]">
            <h3 className="text-[14px] font-bold text-navy">通知</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-blue font-medium hover:underline"
              >
                すべて既読にする
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto max-h-[360px]">
            {displayNotifications.length === 0 ? (
              <div className="py-12 text-center">
                <span className="material-symbols-rounded text-[36px] text-[#ccc] block mb-2">
                  notifications_off
                </span>
                <p className="text-[13px] text-[#999]">通知はありません</p>
              </div>
            ) : (
              displayNotifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-5 py-3.5 border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#f7faff] transition-colors ${
                    !n.is_read ? "bg-[#f7faff]" : ""
                  }`}
                >
                  <span
                    className={`material-symbols-rounded text-[20px] mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${
                      TYPE_COLORS[n.type] || TYPE_COLORS.info
                    }`}
                  >
                    {TYPE_ICONS[n.type] || TYPE_ICONS.info}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] leading-snug ${
                        !n.is_read
                          ? "font-bold text-navy"
                          : "font-medium text-[#555]"
                      }`}
                    >
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-[11px] text-[#888] mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    )}
                    <p className="text-[10px] text-[#aaa] mt-1">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#E15454] mt-2 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#e8e8ed] px-5 py-3">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-[12px] font-bold text-blue hover:underline"
            >
              すべての通知を見る
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
