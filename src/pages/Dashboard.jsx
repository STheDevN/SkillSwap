import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/integrations/supabase/client.js";
import { useToast } from "@/hooks/use-toast.js";
import AppNavbar from "@/components/AppNavbar.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Calendar, CheckCircle, XCircle, Clock, User, ArrowRight, Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) return;

    const { data: rawSessions } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!rawSessions || rawSessions.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const partnerIds = rawSessions.map((s) => (s.learner_id === user.id ? s.teacher_id : s.learner_id));
    const uniqueIds = [...new Set(partnerIds)];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", uniqueIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

    const completedIds = rawSessions.filter((s) => s.status === "completed").map((s) => s.id);

    let reviewedSessionIds = new Set();
    if (completedIds.length > 0) {
      const { data: reviews } = await supabase
        .from("reviews")
        .select("session_id")
        .eq("reviewer_id", user.id)
        .in("session_id", completedIds);
      reviewedSessionIds = new Set((reviews || []).map((r) => r.session_id));
    }

    const allSessionIds = rawSessions.map((s) => s.id);
    const { data: readData } = await supabase
      .from("message_reads")
      .select("session_id, last_read_at")
      .eq("user_id", user.id)
      .in("session_id", allSessionIds);

    const readMap = new Map((readData || []).map((r) => [r.session_id, r.last_read_at]));

    const unreadCounts = new Map();
    for (const sid of allSessionIds) {
      const lastRead = readMap.get(sid);
      let query = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sid)
        .neq("sender_id", user.id);

      if (lastRead) {
        query = query.gt("created_at", lastRead);
      }

      const { count } = await query;
      unreadCounts.set(sid, count || 0);
    }

    const enriched = rawSessions.map((s) => {
      const isTeacher = s.teacher_id === user.id;
      const partnerId = isTeacher ? s.learner_id : s.teacher_id;
      return {
        ...s,
        partner_name: profileMap.get(partnerId) || "Unknown",
        partner_id: partnerId,
        role: isTeacher ? "teacher" : "learner",
        hasReviewed: reviewedSessionIds.has(s.id),
        unreadCount: unreadCounts.get(s.id) || 0,
      };
    });

    setSessions(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const updateStatus = async (sessionId, status) => {
    const { error } = await supabase.from("sessions").update({ status }).eq("id", sessionId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Session ${status}` });
      fetchSessions();
    }
  };

  const pending = sessions.filter((s) => s.status === "pending");
  const upcoming = sessions.filter((s) => s.status === "confirmed");
  const past = sessions.filter((s) => s.status === "completed" || s.status === "cancelled");

  const ReviewDialog = ({ session }) => {
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!user || rating === 0) return;
      setSubmitting(true);
      const { error } = await supabase.from("reviews").insert({
        session_id: session.id,
        reviewer_id: user.id,
        reviewee_id: session.partner_id,
        rating,
        comment,
      });
      setSubmitting(false);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Review submitted!" });
        setOpen(false);
        fetchSessions();
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1">
            <Star className="h-3 w-3" /> Leave Review
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review {session.partner_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="transition-colors"
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= (hovered || rating)
                          ? "fill-warning text-warning"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comment (optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the session?"
                rows={3}
              />
            </div>
            <Button className="w-full" disabled={rating === 0 || submitting} onClick={handleSubmit}>
              {submitting ? "Submitting…" : "Submit Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const SessionCard = ({ session }) => {
    const statusColors = {
      pending: "bg-warning/10 text-warning",
      confirmed: "bg-primary/10 text-primary",
      completed: "bg-success/10 text-success",
      cancelled: "bg-destructive/10 text-destructive",
    };

    return (
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{session.skill}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                {session.role === "teacher" ? "Teaching" : "Learning from"}{" "}
                <Link to={`/user/${session.partner_id}`} className="text-primary hover:underline">
                  {session.partner_name}
                </Link>
              </p>
            </div>
            <Badge variant="outline" className={statusColors[session.status] || ""}>
              {session.status}
            </Badge>
          </div>

          {session.scheduled_at && (
            <p className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(session.scheduled_at), "PPP 'at' p")}
            </p>
          )}

          {session.message && <p className="mb-3 text-sm text-muted-foreground italic">"{session.message}"</p>}

          <div className="flex flex-wrap gap-2">
            {session.status === "pending" && session.role === "teacher" && (
              <>
                <Button size="sm" className="gap-1" onClick={() => updateStatus(session.id, "confirmed")}>
                  <CheckCircle className="h-3 w-3" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => updateStatus(session.id, "cancelled")}
                >
                  <XCircle className="h-3 w-3" /> Decline
                </Button>
              </>
            )}

            {session.status === "pending" && session.role === "learner" && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" /> Waiting for response…
              </p>
            )}

            {session.status === "confirmed" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => updateStatus(session.id, "completed")}
              >
                <CheckCircle className="h-3 w-3" /> Mark Complete
              </Button>
            )}

            {(session.status === "pending" || session.status === "confirmed") && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-destructive"
                onClick={() => updateStatus(session.id, "cancelled")}
              >
                <XCircle className="h-3 w-3" /> Cancel
              </Button>
            )}

            {session.status === "completed" && !session.hasReviewed && <ReviewDialog session={session} />}

            {session.status === "completed" && session.hasReviewed && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <CheckCircle className="h-3 w-3" /> Reviewed
              </p>
            )}

            {session.status !== "cancelled" && (
              <Button size="sm" variant="secondary" className="relative gap-1" asChild>
                <Link to={`/session/${session.id}/chat`}>
                  <MessageSquare className="h-3 w-3" /> Chat
                  {session.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {session.unreadCount}
                    </span>
                  )}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Manage your skill exchange sessions</p>
          </div>
          <Button asChild>
            <Link to="/discover" className="gap-2">
              Find Skills <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList className="mb-6">
              <TabsTrigger value="pending" className="gap-2">
                Pending{" "}
                {pending.length > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                    {pending.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="gap-2">
                Upcoming{" "}
                {upcoming.length > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                    {upcoming.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pending.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">No pending requests.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pending.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upcoming">
              {upcoming.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">No upcoming sessions.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past">
              {past.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">No past sessions yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
