
-- Add meet_link to sessions
ALTER TABLE public.sessions ADD COLUMN meet_link TEXT DEFAULT '';

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_messages_session ON public.messages (session_id, created_at);
CREATE INDEX idx_messages_sender ON public.messages (sender_id);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only session participants can view messages
CREATE POLICY "Participants can view session messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_id
    AND is_session_participant(s.learner_id, s.teacher_id)
  )
);

-- Only session participants can send messages
CREATE POLICY "Participants can send session messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_id
    AND is_session_participant(s.learner_id, s.teacher_id)
  )
);

-- Senders can delete their own messages
CREATE POLICY "Senders can delete own messages"
ON public.messages FOR DELETE
USING (sender_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
