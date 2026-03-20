
-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  message TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is a participant
CREATE OR REPLACE FUNCTION public.is_session_participant(session_learner_id UUID, session_teacher_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IN (session_learner_id, session_teacher_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Policies: only participants can see/modify their sessions
CREATE POLICY "Participants can view their sessions"
  ON public.sessions FOR SELECT
  USING (is_session_participant(learner_id, teacher_id));

CREATE POLICY "Authenticated users can create sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Participants can update their sessions"
  ON public.sessions FOR UPDATE
  USING (is_session_participant(learner_id, teacher_id));

CREATE POLICY "Participants can delete their sessions"
  ON public.sessions FOR DELETE
  USING (is_session_participant(learner_id, teacher_id));

-- Updated_at trigger
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_sessions_learner ON public.sessions(learner_id);
CREATE INDEX idx_sessions_teacher ON public.sessions(teacher_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
