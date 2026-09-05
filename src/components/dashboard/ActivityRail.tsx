import { Link } from "react-router-dom";
import { Bell, Bug, UserPlus, RadioTower, Activity } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useUsers, type AdminUser } from "@/hooks/useAdmin";

/* ─────────────────────────────── Helpers ─────────────────────────────── */

/** "Just now" / "59 minutes ago" / "12 hours ago" / "Feb 2, 2024". */
function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Notification types are free-form strings, so fall back to a generic mark. */
function iconFor(type: string) {
  const t = (type || "").toLowerCase();
  const props = { size: 16, strokeWidth: 1.75 };
  if (t.includes("user") || t.includes("follow")) return <UserPlus {...props} />;
  if (t.includes("trade") || t.includes("signal")) return <RadioTower {...props} />;
  if (t.includes("error") || t.includes("fail")) return <Bug {...props} />;
  return <Activity {...props} />;
}

/* ────────────────────────────── Sections ─────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-gray-500 text-sm font-medium px-4 sm:px-5 mb-3">{children}</h3>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-4 sm:px-5 text-sm text-gray-600 py-2">{children}</p>;
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="px-4 sm:px-5 space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-white/5 rounded animate-pulse" />
            <div className="h-2.5 w-20 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationRow({ item }: { item: Notification }) {
  return (
    <div className="flex items-start gap-3 px-4 sm:px-5 py-2.5 hover:bg-white/[0.03] transition-colors">
      <span
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          item.is_read ? "bg-white/5 text-gray-500" : "bg-[#a3e635]/10 text-[#a3e635]"
        }`}
      >
        {iconFor(item.type)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-200 leading-snug truncate">{item.title}</p>
        {item.body && (
          <p className="text-xs text-gray-500 leading-snug truncate">{item.body}</p>
        )}
        <p className="text-xs text-gray-600 mt-0.5">{relativeTime(item.created_at)}</p>
      </div>
    </div>
  );
}

function NewUserRow({ user }: { user: AdminUser }) {
  const initial = (user.userName || "?").charAt(0).toUpperCase();
  return (
    <Link
      to="/users"
      className="flex items-center gap-3 px-4 sm:px-5 py-2.5 min-h-[44px] hover:bg-white/[0.03] transition-colors"
    >
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: user.profileColor || "#1f2937" }}
      >
        {user.userEmoji || initial}
      </span>
      <span className="text-sm text-gray-200 truncate">{user.userName}</span>
    </Link>
  );
}

/* ──────────────────────────────── Rail ───────────────────────────────── */

export function ActivityRail() {
  const { data: notifications, isLoading: loadingFeed } = useNotifications(8);
  const { data: userPage, isLoading: loadingUsers } = useUsers(1, "");

  const feed = notifications?.notifications ?? [];
  const unread = notifications?.unreadCount ?? 0;
  // The users endpoint already sorts newest first.
  const newUsers = (userPage?.users ?? []).slice(0, 6);

  return (
    // Below xl the rail is not a rail — it falls under the dashboard as a
    // final section, so it takes a top border instead of a left one.
    <aside className="w-full border-t border-white/5 xl:border-t-0 xl:w-[320px] xl:flex-shrink-0 xl:border-l xl:border-white/5 xl:h-full xl:overflow-y-auto touch-scroll py-6">
      <div className="flex items-center gap-2 px-4 sm:px-5 mb-5 sm:mb-6">
        <h2 className="text-white text-lg font-semibold">Notifications</h2>
        {unread > 0 && (
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-[#a3e635] text-black">
            {unread}
          </span>
        )}
      </div>

      {/* Activity */}
      <SectionLabel>Activity</SectionLabel>
      {loadingFeed ? (
        <SkeletonRows />
      ) : feed.length === 0 ? (
        <div className="px-4 sm:px-5 py-4 flex items-center gap-3 text-gray-600">
          <Bell size={18} strokeWidth={1.75} />
          <span className="text-sm">No activity yet</span>
        </div>
      ) : (
        <div>
          {feed.map((n) => (
            <NotificationRow key={n.id} item={n} />
          ))}
        </div>
      )}

      {/* New users */}
      <div className="mt-8">
        <SectionLabel>New Users</SectionLabel>
        {loadingUsers ? (
          <SkeletonRows count={4} />
        ) : newUsers.length === 0 ? (
          <EmptyRow>No users yet</EmptyRow>
        ) : (
          <div>
            {newUsers.map((u) => (
              <NewUserRow key={u.userId} user={u} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default ActivityRail;
