
-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one review per reviewer per session
CREATE UNIQUE INDEX idx_reviews_session_reviewer ON public.reviews (session_id, reviewer_id);

-- Indexes
CREATE INDEX idx_reviews_reviewee ON public.reviews (reviewee_id);
CREATE INDEX idx_reviews_session ON public.reviews (session_id);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Participants of the session can view reviews
CREATE POLICY "Session participants can view reviews"
ON public.reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_id
    AND is_session_participant(s.learner_id, s.teacher_id)
  )
  OR reviewee_id = auth.uid()
);

-- Only session participants can insert a review for completed sessions
CREATE POLICY "Participants can review completed sessions"
ON public.reviews FOR INSERT
WITH CHECK (
  reviewer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_id
    AND s.status = 'completed'
    AND is_session_participant(s.learner_id, s.teacher_id)
  )
);

-- Reviewers can update their own review
CREATE POLICY "Reviewers can update own review"
ON public.reviews FOR UPDATE
USING (reviewer_id = auth.uid());

-- Reviewers can delete their own review
CREATE POLICY "Reviewers can delete own review"
ON public.reviews FOR DELETE
USING (reviewer_id = auth.uid());

-- Function to recalculate profile rating after review changes
CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id UUID;
  avg_rating NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.reviewee_id;
  ELSE
    target_user_id := NEW.reviewee_id;
  END IF;

  SELECT COALESCE(AVG(r.rating), 0) INTO avg_rating
  FROM public.reviews r
  WHERE r.reviewee_id = target_user_id;

  UPDATE public.profiles
  SET rating = ROUND(avg_rating, 1)
  WHERE user_id = target_user_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update rating
CREATE TRIGGER update_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_rating();

-- Allow anyone authenticated to see reviews on profiles they can view
CREATE POLICY "Authenticated users can view reviews for any user"
ON public.reviews FOR SELECT
USING (auth.role() = 'authenticated');
