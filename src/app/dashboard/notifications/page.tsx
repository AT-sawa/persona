"use client";

import { useEffect, useState, useCallback } from "react";
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

type FilterTab = "all" | "unread" | "matching" | "entry";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "unread", label: "未読" },
  { key: "matching", label: "マッチング" },
  { key: "entry", label: "エントリー" },
];

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        return;
      }
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
    if (notification.link) {
      router.push(notification.link);
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.is_read;
    return n.type === activeTab;
  });

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-sm text-[#888]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Page header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-blue tracking-[0.18em] uppercase mb-1">
          NOTIFICATIONS
        </p>
        <h1 className="text-xl font-black text-navy">通知</h1>
        <p className="text-[12px] text-[#888] mt-1">
          {unreadCount > 0
            ? `${unreadCount}件の未読通知`
            : "未読の通知はありません"}
        </p>
      </div>

      {/* Tabs + Mark all read */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-[12px] font-bold rounded-full transition-colors ${
                activeTab === tab.key
                  ? "bg-navy text-white"
                  : "bg-[#f5f5f5] text-[#666] hover:bg-[#eaeaea]"
              }`}
            >
              {tab.label}
              {tab.key === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] bg-[#E15454] text-white text-[10px] font-bold rounded-full px-1">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-[12px] text-blue font-bold hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-rounded text-[16px]">
              done_all
            </span>
            すべて既読にする
          </button>
        )}
      </div>

      {/* Notification list */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <span className="material-symbols-rounded text-[48px] text-[#ccc] block mb-3">
            notifications_off
          </span>
          <p className="text-[14px] font-bold text-navy mb-2">
            {activeTab === "all"
              ? "通知はありません"
              : activeTab === "unread"
              ? "未読の通知はありません"
              : activeTab === "matching"
              ? "マッチング通知はありません"
              : "エントリー通知はありません"}
          </p>
          <p className="text-[12px] text-[#888]">
            新しい通知が届くとここに表示されます
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredNotifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`w-full text-left bg-white border rounded-2xl px-5 py-4 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all flex items-start gap-4 ${
                !n.is_read
                  ? "border-blue/30 bg-[#f7faff]"
                  : "border-[#e8e8ed]"
              }`}
            >
              {/* Type icon */}
              <span
                className={`material-symbols-rounded text-[22px] shrink-0 w-10 h-10 flex items-center justify-center rounded-full ${
                  TYPE_COLORS[n.type] || TYPE_COLORS.info
                }`}
              >
                {TYPE_ICONS[n.type] || TYPE_ICONS.info}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={`text-[14px] leading-snug ${
                      !n.is_read
                        ? "font-bold text-navy"
                        : "font-medium text-[#555]"
                    }`}
                  >
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E15454] mt-1.5 shrink-0" />
                  )}
                </div>
                {n.message && (
                  <p className="text-[12px] text-[#888] mt-1 line-clamp-2">
                    {n.message}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-[#aaa]">
                    {relativeTime(n.created_at)}
                  </span>
                  <span className="text-[11px] text-[#ccc]">
                    {formatDate(n.created_at)}
                  </span>
                </div>
              </div>

              {/* Link indicator */}
              {n.link && (
                <span className="material-symbols-rounded text-[18px] text-[#ccc] mt-1 shrink-0">
                  chevron_right
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
