import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import AppNavbar from "@/components/AppNavbar.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Calendar } from "@/components/ui/calendar.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.jsx";
import { Star, Clock, ArrowLeft, CalendarIcon, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast.js";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PublicProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [date, setDate] = useState(undefined);
  const [time, setTime] = useState("10:00");
  const [message, setMessage] = useState("");
  const [meetLinkInput, setMeetLinkInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
      setProfile(data);

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewee_id", userId)
        .order("created_at", { ascending: false });

      if (reviewsData && reviewsData.length > 0) {
        const reviewerIds = [...new Set(reviewsData.map((r) => r.reviewer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", reviewerIds);
        const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

        setReviews(
          reviewsData.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment || "",
            created_at: r.created_at,
            reviewer_name: nameMap.get(r.reviewer_id) || "Anonymous",
          })),
        );
      }

      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const handleRequestSession = async () => {
    if (!user || !profile || !selectedSkill || !date) return;

    setSending(true);

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    const { error } = await supabase.from("sessions").insert({
      learner_id: user.id,
      teacher_id: profile.user_id,
      skill: selectedSkill,
      scheduled_at: scheduledAt.toISOString(),
      message,
      meet_link: meetLinkInput || "",
    });

    setSending(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Session requested!", description: `Waiting for ${profile.full_name} to accept.` });
      setDialogOpen(false);
      setSelectedSkill("");
      setDate(undefined);
      setMessage("");
      setMeetLinkInput("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">User not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/discover">Back to Discover</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.user_id;
  const teachSkills = profile.teach_skills || [];

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-4 gap-2" asChild>
          <Link to="/discover">
            <ArrowLeft className="h-4 w-4" /> Back to Discover
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{profile.full_name || "Unnamed"}</CardTitle>
                {profile.availability && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> {profile.availability}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 font-medium text-warning">
                  <Star className="h-4 w-4" />
                  {(profile.rating || 0) > 0 ? (profile.rating || 0).toFixed(1) : "No ratings"}
                </span>
                <span className="text-muted-foreground">{profile.session_count || 0} sessions</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {profile.bio && <p className="text-foreground">{profile.bio}</p>}

            {teachSkills.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Skills they teach</h3>
                <div className="flex flex-wrap gap-2">
                  {teachSkills.map((s) => (
                    <Badge key={s} className="bg-primary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(profile.learn_skills || []).length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Skills they want to learn</h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.learn_skills || []).map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!isOwnProfile && teachSkills.length > 0 && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2">
                    <Send className="h-4 w-4" /> Request Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request a session with {profile.full_name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Skill</Label>
                      <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a skill to learn" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachSkills.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !date && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            disabled={(d) => d < new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label>Google Meet Link (optional)</Label>
                      <Input
                        value={meetLinkInput}
                        onChange={(e) => setMeetLinkInput(e.target.value)}
                        placeholder="https://meet.google.com/..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Message (optional)</Label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="What would you like to learn?"
                        rows={2}
                      />
                    </div>

                    <Button
                      className="w-full"
                      disabled={!selectedSkill || !date || sending}
                      onClick={handleRequestSession}
                    >
                      {sending ? "Sending…" : "Send Request"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {reviews.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" /> Reviews ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-foreground">{review.reviewer_name}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating ? "fill-warning text-warning" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{format(new Date(review.created_at), "PPP")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
