import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/integrations/supabase/client.js";
import AppNavbar from "@/components/AppNavbar.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Search, Star, Clock, ArrowRight } from "lucide-react";

const Discover = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [myLearnSkills, setMyLearnSkills] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("*")
        .neq("user_id", user?.id || "");

      if (user) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("learn_skills")
          .eq("user_id", user.id)
          .single();
        setMyLearnSkills(myProfile?.learn_skills || []);
      }

      setProfiles(allProfiles || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const scoredProfiles = profiles.map((p) => {
    const teachSkills = p.teach_skills || [];
    const matchCount = teachSkills.filter((s) =>
      myLearnSkills.some((ls) => ls.toLowerCase() === s.toLowerCase()),
    ).length;
    return { ...p, matchCount };
  });

  const filtered = scoredProfiles.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = (p.full_name || "").toLowerCase().includes(q);
    const skillMatch = (p.teach_skills || []).some((s) => s.toLowerCase().includes(q));
    return nameMatch || skillMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return (b.rating || 0) - (a.rating || 0);
  });

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Discover</h1>
          <p className="mt-1 text-muted-foreground">Find people who teach skills you want to learn</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or skill…"
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            {search ? "No results found." : "No users to discover yet. Check back soon!"}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p) => (
              <Card key={p.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{p.full_name || "Unnamed"}</h3>
                      {p.availability && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {p.availability}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-sm font-medium text-warning">
                      <Star className="h-4 w-4" />
                      {(p.rating || 0) > 0 ? (p.rating || 0).toFixed(1) : "—"}
                    </span>
                  </div>

                  {p.bio && <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{p.bio}</p>}

                  {(p.teach_skills || []).length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Teaches</p>
                      <div className="flex flex-wrap gap-1">
                        {(p.teach_skills || []).map((s) => {
                          const isMatch = myLearnSkills.some((ls) => ls.toLowerCase() === s.toLowerCase());
                          return (
                            <Badge key={s} variant={isMatch ? "default" : "secondary"} className={isMatch ? "bg-primary" : ""}>
                              {s}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {p.matchCount > 0 && (
                    <p className="mb-3 text-xs font-medium text-primary">
                      {p.matchCount} skill{p.matchCount > 1 ? "s" : ""} match your learning goals
                    </p>
                  )}

                  <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                    <Link to={`/user/${p.user_id}`}>
                      View Profile <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;
