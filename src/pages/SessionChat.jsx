import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/integrations/supabase/client.js";
import AppNavbar from "@/components/AppNavbar.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Card } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { ArrowLeft, Send, Video } from "lucide-react";
import { format } from "date-fns";

const SessionChat = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!sessionId || !user) return;

    const fetchSession = async () => {
      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
      if (!data) return;

      const partnerId = data.learner_id === user.id ? data.teacher_id : data.learner_id;
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", partnerId).single();

      setSession({
        ...data,
        meet_link: data.meet_link || null,
        partner_name: profile?.full_name || "Unknown",
        partner_id: partnerId,
      });
    };

    const markAsRead = async () => {
      await supabase
        .from("message_reads")
        .upsert(
          { session_id: sessionId, user_id: user.id, last_read_at: new Date().toISOString() },
          { onConflict: "session_id,user_id" },
        );
    };

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      markAsRead();
    };

    fetchSession();
    fetchMessages();

    const channel = supabase
      .channel(`session-messages-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          markAsRead();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !sessionId) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      session_id: sessionId,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    if (!error) setNewMessage("");
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppNavbar />
      <div className="container mx-auto flex max-w-2xl flex-1 flex-col px-4 py-4">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">
              {session.skill} — {session.partner_name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {session.status}
              </Badge>
              {session.scheduled_at && <span>{format(new Date(session.scheduled_at), "PPP 'at' p")}</span>}
            </div>
          </div>
        </div>

        {session.status !== "cancelled" && (
          <Button className="mb-4 w-full" onClick={() => navigate(`/session/${sessionId}/call`)}>
            <Video className="mr-2 h-4 w-4" /> Start Video Call
          </Button>
        )}

        <Card className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
            )}
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {format(new Date(msg.created_at), "p")}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>

          {session.status !== "cancelled" && (
            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message…"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <Button size="icon" disabled={!newMessage.trim() || sending} onClick={handleSend}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SessionChat;
