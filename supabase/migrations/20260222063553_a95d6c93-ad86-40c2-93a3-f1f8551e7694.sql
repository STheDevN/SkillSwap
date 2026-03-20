
-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- Allow users to delete their own message read status
CREATE POLICY "Users can delete their own read status"
ON public.message_reads
FOR DELETE
USING (user_id = auth.uid());
