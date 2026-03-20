import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/integrations/supabase/client.js";
import { Button } from "@/components/ui/button.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications(data || []);
    };

    fetch();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev].slice(0, 20));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClick = (notification) => {
    // Mark as read
    if (!notification.is_read) {
      supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .then(() => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
          );
        });
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const typeIcons = {
    session_request: "📩",
    session_accepted: "✅",
    session_declined: "❌",
    new_message: "💬",
    new_review: "⭐",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                  !n.is_read ? "bg-accent/20" : ""
                }`}
              >
                <span className="mt-0.5 text-lg">{typeIcons[n.type] || "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!n.is_read ? "font-semibold" : ""} text-foreground`}>{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
