
-- Drop the overly permissive policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- Notifications are only inserted by security definer trigger functions,
-- so no direct user INSERT is needed. Deny direct inserts.
CREATE POLICY "No direct insert on notifications"
ON public.notifications FOR INSERT
WITH CHECK (false);
