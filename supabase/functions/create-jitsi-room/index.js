import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
}

function base64url(bytes) {
  const bin = String.fromCharCode(...bytes);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Base64url(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const JITSI_ROOM_SECRET = Deno.env.get("JITSI_ROOM_SECRET") || "dev-secret";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase environment variables" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, { status: 401 });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await req.json().catch(() => ({}));
    if (!sessionId) {
      return jsonResponse({ error: "Missing sessionId" }, { status: 400 });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: session, error: sessionError } = await adminClient
      .from("sessions")
      .select("id, learner_id, teacher_id, meet_link")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return jsonResponse({ error: sessionError?.message || "Session not found" }, { status: 404 });
    }

    const isParticipant = session.learner_id === user.id || session.teacher_id === user.id;
    if (!isParticipant) {
      return jsonResponse({ error: "Forbidden" }, { status: 403 });
    }

    let roomName = session.meet_link;

    if (!roomName) {
      const rand = crypto.getRandomValues(new Uint8Array(16));
      const suffix = base64url(rand);
      roomName = `skillswap-${sessionId}-${suffix}`;

      const { error: updateError } = await adminClient
        .from("sessions")
        .update({ meet_link: roomName })
        .eq("id", sessionId);

      if (updateError) {
        return jsonResponse({ error: updateError.message }, { status: 500 });
      }
    }

    const passwordHash = await sha256Base64url(`${roomName}:${JITSI_ROOM_SECRET}`);
    const roomPassword = passwordHash.slice(0, 16);

    return jsonResponse({ roomName, roomPassword }, { status: 200 });
  } catch (error) {
    console.error("Error in create-jitsi-room:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: errorMessage }, { status: 500 });
  }
});
