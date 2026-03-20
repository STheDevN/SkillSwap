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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase environment variables" }, { status: 500 });
    }

    if (!DAILY_API_KEY) {
      return jsonResponse(
        {
          error:
            "Missing DAILY_API_KEY secret. Add it in Supabase project settings (Edge Functions secrets) before calling this function.",
        },
        { status: 500 },
      );
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

    if (session.meet_link) {
      return jsonResponse({ roomUrl: session.meet_link }, { status: 200 });
    }

    const roomName = `skillswap-${sessionId}`;

    const createResp = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          enable_prejoin_ui: false,
          enable_screenshare: true,
          enable_chat: false,
        },
      }),
    });

    let room;

    if (createResp.ok) {
      room = await createResp.json();
    } else if (createResp.status === 409) {
      const getResp = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
      });

      if (!getResp.ok) {
        const txt = await getResp.text();
        return jsonResponse({ error: `Failed to fetch existing room: ${txt}` }, { status: 500 });
      }

      room = await getResp.json();
    } else {
      const txt = await createResp.text();
      return jsonResponse({ error: `Failed to create room: ${txt}` }, { status: 500 });
    }

    const roomUrl = room?.url;
    if (!roomUrl) {
      return jsonResponse({ error: "Daily room URL missing in response" }, { status: 500 });
    }

    const { error: updateError } = await adminClient
      .from("sessions")
      .update({ meet_link: roomUrl })
      .eq("id", sessionId);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, { status: 500 });
    }

    return jsonResponse({ roomUrl }, { status: 200 });
  } catch (error) {
    console.error("Error in create-daily-room:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: errorMessage }, { status: 500 });
  }
});
