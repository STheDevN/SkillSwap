import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/integrations/supabase/client.js";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { useToast } from "@/hooks/use-toast.js";
import { Sparkles, BookOpen, GraduationCap, X, ArrowRight } from "lucide-react";

const SUGGESTED_SKILLS = [
  "JavaScript",
  "React",
  "Python",
  "Guitar",
  "Piano",
  "Photography",
  "Spanish",
  "Marketing",
  "Drawing",
  "Data Science",
  "CSS",
  "Writing",
  "Cooking",
  "Yoga",
  "Design",
  "SQL",
  "Public Speaking",
  "Music Theory",
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teachSkills, setTeachSkills] = useState([]);
  const [learnSkills, setLearnSkills] = useState([]);
  const [newTeach, setNewTeach] = useState("");
  const [newLearn, setNewLearn] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const addSkill = (list, setList, skill) => {
    const trimmed = skill.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
  };

  const removeSkill = (list, setList, skill) => {
    setList(list.filter((s) => s !== skill));
  };

  const handleFinish = async () => {
    if (teachSkills.length === 0 && learnSkills.length === 0) {
      toast({
        title: "Add at least one skill",
        description: "Pick something you can teach or want to learn.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ teach_skills: teachSkills, learn_skills: learnSkills })
      .eq("user_id", user?.id || "");

    setSaving(false);
    if (error) {
      toast({ title: "Error saving skills", description: error.message, variant: "destructive" });
    } else {
      navigate("/discover");
    }
  };

  const suggestionsFor = (existing) =>
    SUGGESTED_SKILLS.filter((s) => !existing.includes(s) && !teachSkills.includes(s) && !learnSkills.includes(s));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to SkillSwap!</CardTitle>
          <CardDescription>
            {step === 1 ? "What skills can you teach others?" : "What skills do you want to learn?"}
          </CardDescription>
          <div className="mt-3 flex justify-center gap-2">
            <div className={`h-1.5 w-8 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-1.5 w-8 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {step === 1 ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <GraduationCap className="h-4 w-4 text-primary" />
                Skills I can teach
              </div>

              <div className="flex gap-2">
                <Input
                  value={newTeach}
                  onChange={(e) => setNewTeach(e.target.value)}
                  placeholder="Type a skill…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill(teachSkills, setTeachSkills, newTeach);
                      setNewTeach("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    addSkill(teachSkills, setTeachSkills, newTeach);
                    setNewTeach("");
                  }}
                >
                  Add
                </Button>
              </div>

              {teachSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {teachSkills.map((s) => (
                    <Badge key={s} className="gap-1 pl-2.5 pr-1.5">
                      {s}
                      <button onClick={() => removeSkill(teachSkills, setTeachSkills, s)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div>
                <p className="mb-2 text-xs text-muted-foreground">Popular skills — click to add</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestionsFor(teachSkills)
                    .slice(0, 10)
                    .map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => addSkill(teachSkills, setTeachSkills, s)}
                      >
                        + {s}
                      </Badge>
                    ))}
                </div>
              </div>

              <Button className="w-full gap-2" onClick={() => setStep(2)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BookOpen className="h-4 w-4 text-secondary" />
                Skills I want to learn
              </div>

              <div className="flex gap-2">
                <Input
                  value={newLearn}
                  onChange={(e) => setNewLearn(e.target.value)}
                  placeholder="Type a skill…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill(learnSkills, setLearnSkills, newLearn);
                      setNewLearn("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    addSkill(learnSkills, setLearnSkills, newLearn);
                    setNewLearn("");
                  }}
                >
                  Add
                </Button>
              </div>

              {learnSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {learnSkills.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1 pl-2.5 pr-1.5">
                      {s}
                      <button onClick={() => removeSkill(learnSkills, setLearnSkills, s)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div>
                <p className="mb-2 text-xs text-muted-foreground">Popular skills — click to add</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestionsFor(learnSkills)
                    .slice(0, 10)
                    .map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => addSkill(learnSkills, setLearnSkills, s)}
                      >
                        + {s}
                      </Badge>
                    ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleFinish} disabled={saving}>
                  {saving ? "Saving…" : "Get Started"}
                </Button>
              </div>
            </>
          )}

          <button
            onClick={() => navigate("/discover")}
            className="block w-full text-center text-xs text-muted-foreground hover:underline"
          >
            Skip for now
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
