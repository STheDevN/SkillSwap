
CREATE OR REPLACE FUNCTION public.notify_video_call(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_id uuid;
  v_skill text;
  v_caller_name text;
BEGIN
  -- Get session info
  SELECT skill,
    CASE WHEN learner_id = auth.uid() THEN teacher_id ELSE learner_id END
  INTO v_skill, v_other_id
  FROM sessions
  WHERE id = p_session_id
    AND is_session_participant(learner_id, teacher_id);

  IF v_other_id IS NULL THEN
    RAISE EXCEPTION 'Session not found or not a participant';
  END IF;

  -- Get caller name
  SELECT full_name INTO v_caller_name
  FROM profiles WHERE user_id = auth.uid();

  -- Insert notification for the other participant
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    v_other_id,
    'video_call',
    'Video Call Started',
    COALESCE(v_caller_name, 'Someone') || ' started a video call for ' || v_skill,
    '/session/' || p_session_id::text || '/call'
  );
END;
$$;
