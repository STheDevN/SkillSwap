import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/integrations/supabase/client.js";
import { Button } from "@/components/ui/button.jsx";
import { toast } from "@/hooks/use-toast.js";
import { ArrowLeft, Phone } from "lucide-react";

const SessionCall = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [roomPassword, setRoomPassword] = useState(null);
  const [callLoading, setCallLoading] = useState(true);
  const [micMuted, setMicMuted] = useState(false);
  const [camMuted, setCamMuted] = useState(false);
  const [jitsiError, setJitsiError] = useState(null);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    if (!sessionId || !user) return;

    const init = async () => {
      const { data, error: sessionError } = await supabase.from("sessions").select("*").eq("id", sessionId).single();

      if (sessionError) {
        toast({
          title: "Could not load session",
          description: sessionError.message,
          variant: "destructive",
        });
        return;
      }

      if (!data) return;

      const partnerId = data.learner_id === user.id ? data.teacher_id : data.learner_id;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", partnerId)
        .single();

      if (profileError) {
        toast({
          title: "Could not load partner profile",
          description: profileError.message,
          variant: "destructive",
        });
      }

      setInfo({ skill: data.skill, partner: profile?.full_name || "Unknown" });

      const { data: functionData, error: functionError } = await supabase.functions.invoke("create-jitsi-room", {
        body: { sessionId },
      });

      if (functionError) {
        toast({
          title: "Could not start video call",
          description: functionError.message,
          variant: "destructive",
        });
        return;
      }

      if (!functionData?.roomName) {
        toast({
          title: "Could not start video call",
          description: "Missing room name from server",
          variant: "destructive",
        });
        return;
      }

      setRoomName(functionData.roomName);
      setRoomPassword(functionData.roomPassword || null);

      const { error: notifyError } = await supabase.rpc("notify_video_call", { p_session_id: sessionId });
      if (notifyError) {
        toast({
          title: "Video call notification failed",
          description: notifyError.message,
          variant: "destructive",
        });
      }
    };

    init();
  }, [sessionId, user]);

  useEffect(() => {
    if (!roomName || !user || !jitsiContainerRef.current) return;

    const domain = (import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si").replace(/^https?:\/\//, "");
    const scriptSrc = `https://${domain}/external_api.js`;

    setCallLoading(true);
    setJitsiError(null);

    const cleanupApi = () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {
          // ignore
        }
        jitsiApiRef.current = null;
      }
    };

    const ensureScript = () => {
      if (window.JitsiMeetExternalAPI) return Promise.resolve();

      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${scriptSrc}"]`);
        if (existing) {
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () => reject(new Error("Failed to load Jitsi script")));
          return;
        }

        const script = document.createElement("script");
        script.src = scriptSrc;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Jitsi script"));
        document.body.appendChild(script);
      });
    };

    const initJitsi = async () => {
      cleanupApi();

      await ensureScript();

      if (!window.JitsiMeetExternalAPI) {
        throw new Error("Jitsi External API not available");
      }

      jitsiContainerRef.current.innerHTML = "";

      const api = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: user.user_metadata?.full_name || user.email || "User",
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [],
        },
      });

      jitsiApiRef.current = api;

      api.addListener("videoConferenceJoined", () => {
        setCallLoading(false);
      });

      api.addListener("readyToClose", () => {
        navigate(`/session/${sessionId}/chat`);
      });

      api.addListener("audioMuteStatusChanged", (payload) => {
        setMicMuted(Boolean(payload?.muted));
      });

      api.addListener("videoMuteStatusChanged", (payload) => {
        setCamMuted(Boolean(payload?.muted));
      });

      api.addListener("passwordRequired", () => {
        if (roomPassword) {
          api.executeCommand("password", roomPassword);
        }
      });

      api.addListener("errorOccurred", (payload) => {
        setJitsiError(payload?.message || "Jitsi error");
      });
    };

    initJitsi().catch((err) => {
      setCallLoading(false);
      setJitsiError(err instanceof Error ? err.message : "Failed to start call");
    });

    return () => {
      cleanupApi();
    };
  }, [roomName, roomPassword, sessionId, user, navigate]);

  const handleToggleMic = () => {
    if (!jitsiApiRef.current) return;
    jitsiApiRef.current.executeCommand("toggleAudio");
  };

  const handleToggleCam = () => {
    if (!jitsiApiRef.current) return;
    jitsiApiRef.current.executeCommand("toggleVideo");
  };

  const handleHangup = () => {
    if (jitsiApiRef.current) {
      try {
        jitsiApiRef.current.executeCommand("hangup");
      } catch {
        // ignore
      }
    }
    navigate(`/session/${sessionId}/chat`);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/session/${sessionId}/chat`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{info ? `${info.skill} — ${info.partner}` : "Loading…"}</p>
        </div>
        <Button variant={micMuted ? "secondary" : "default"} size="sm" onClick={handleToggleMic} disabled={!jitsiApiRef.current}>
          {micMuted ? "Unmute" : "Mute"}
        </Button>
        <Button variant={camMuted ? "secondary" : "default"} size="sm" onClick={handleToggleCam} disabled={!jitsiApiRef.current}>
          {camMuted ? "Start Video" : "Stop Video"}
        </Button>
        <Button variant="destructive" size="sm" onClick={handleHangup}>
          <Phone className="mr-1 h-3 w-3" /> Leave Call
        </Button>
      </div>
      {jitsiError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-destructive">{jitsiError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reconnect
          </Button>
          <Button variant="ghost" asChild>
            <Link to={`/session/${sessionId}/chat`}>Back to chat</Link>
          </Button>
        </div>
      ) : (
        <div className="relative flex-1">
          <div ref={jitsiContainerRef} className="absolute inset-0" />
          {callLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionCall;
