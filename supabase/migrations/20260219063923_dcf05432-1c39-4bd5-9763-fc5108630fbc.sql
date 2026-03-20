
-- Track when users last read messages in a session
CREATE TABLE public.message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_message_reads_user ON public.message_reads (user_id);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own read status"
ON public.message_reads FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can upsert their own read status"
ON public.message_reads FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read status"
ON public.message_reads FOR UPDATE
USING (user_id = auth.uid());

-- Notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'new_message', 'session_request', 'session_accepted', 'session_declined', 'new_review'
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function to create notifications on new session
CREATE OR REPLACE FUNCTION public.notify_on_session_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  learner_name TEXT;
  teacher_name TEXT;
BEGIN
  SELECT full_name INTO learner_name FROM public.profiles WHERE user_id = NEW.learner_id;
  SELECT full_name INTO teacher_name FROM public.profiles WHERE user_id = NEW.teacher_id;

  IF TG_OP = 'INSERT' THEN
    -- Notify teacher of new request
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.teacher_id, 'session_request', 'New Session Request',
      learner_name || ' wants to learn ' || NEW.skill || ' from you.',
      '/dashboard');
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.learner_id, 'session_accepted', 'Session Accepted',
        teacher_name || ' accepted your ' || NEW.skill || ' session.',
        '/session/' || NEW.id || '/chat');
    ELSIF NEW.status = 'cancelled' AND OLD.status = 'pending' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.learner_id, 'session_declined', 'Session Declined',
        teacher_name || ' declined your ' || NEW.skill || ' session request.',
        '/dashboard');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER session_notification_trigger
AFTER INSERT OR UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_session_change();

-- Trigger for new message notifications
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
  session_record RECORD;
BEGIN
  SELECT * INTO session_record FROM public.sessions WHERE id = NEW.session_id;
  
  IF session_record.learner_id = NEW.sender_id THEN
    recipient_id := session_record.teacher_id;
  ELSE
    recipient_id := session_record.learner_id;
  END IF;

  SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (recipient_id, 'new_message', 'New Message',
    sender_name || ': ' || LEFT(NEW.content, 80),
    '/session/' || NEW.session_id || '/chat');

  RETURN NEW;
END;
$$;

CREATE TRIGGER message_notification_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_message();
