import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client.js";
import { useToast } from "@/hooks/use-toast.js";
import AppNavbar from "@/components/AppNavbar.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { X, Plus, Save, Star, MessageSquare } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState("");
  const [teachSkills, setTeachSkills] = useState([]);
  const [learnSkills, setLearnSkills] = useState([]);
  const [newTeachSkill, setNewTeachSkill] = useState("");
  const [newLearnSkill, setNewLearnSkill] = useState("");
  const [rating, setRating] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

      if (data) {
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAvailability(data.availability || "");
        setTeachSkills(data.teach_skills || []);
        setLearnSkills(data.learn_skills || []);
        setRating(data.rating || 0);
        setSessionCount(data.session_count || 0);
      }

      if (error) console.error(error);

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewee_id", user.id)
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
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        bio,
        availability,
        teach_skills: teachSkills,
        learn_skills: learnSkills,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved!" });
    }
  };

  const saveSkills = async (newTeach, newLearn) => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ teach_skills: newTeach, learn_skills: newLearn })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error saving skills", description: error.message, variant: "destructive" });
    }
  };

  const addSkill = (type) => {
    if (type === "teach" && newTeachSkill.trim()) {
      if (!teachSkills.includes(newTeachSkill.trim())) {
        const updated = [...teachSkills, newTeachSkill.trim()];
        setTeachSkills(updated);
        saveSkills(updated, learnSkills);
      }
      setNewTeachSkill("");
    } else if (type === "learn" && newLearnSkill.trim()) {
      if (!learnSkills.includes(newLearnSkill.trim())) {
        const updated = [...learnSkills, newLearnSkill.trim()];
        setLearnSkills(updated);
        saveSkills(teachSkills, updated);
      }
      setNewLearnSkill("");
    }
  };

  const removeSkill = (type, skill) => {
    if (type === "teach") {
      const updated = teachSkills.filter((s) => s !== skill);
      setTeachSkills(updated);
      saveSkills(updated, learnSkills);
    } else {
      const updated = learnSkills.filter((s) => s !== skill);
      setLearnSkills(updated);
      saveSkills(teachSkills, updated);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-warning" />
              {rating > 0 ? rating.toFixed(1) : "No ratings"}
            </span>
            <span>{sessionCount} sessions</span>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about yourself…"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Input
                  id="availability"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="e.g. Weekday evenings, Sat mornings"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skills I Teach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2">
                {teachSkills.map((skill) => (
                  <Badge key={skill} variant="default" className="gap-1 bg-primary">
                    {skill}
                    <button onClick={() => removeSkill("teach", skill)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTeachSkill}
                  onChange={(e) => setNewTeachSkill(e.target.value)}
                  placeholder="Add a skill…"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("teach"))}
                />
                <Button size="sm" variant="outline" onClick={() => addSkill("teach")}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skills I Want to Learn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2">
                {learnSkills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    {skill}
                    <button onClick={() => removeSkill("learn", skill)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newLearnSkill}
                  onChange={(e) => setNewLearnSkill(e.target.value)}
                  placeholder="Add a skill…"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("learn"))}
                />
                <Button size="sm" variant="outline" onClick={() => addSkill("learn")}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Profile"}
          </Button>

          {reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5" /> My Reviews ({reviews.length})
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
    </div>
  );
};

export default Profile;
