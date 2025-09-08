-- Add completion tracking for activity stores
ALTER TABLE public.activity_stores 
ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;