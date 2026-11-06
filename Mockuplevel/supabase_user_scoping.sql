-- Run after the base schema. This migration makes private materials and
-- progress records belong to the authenticated Supabase user.

ALTER TABLE public.document_chunks
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id
    ON public.document_chunks(user_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_user_scope
    ON public.document_chunks(user_id, tenant_id, course_id, source_id);

CREATE TABLE IF NOT EXISTS public.user_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    storage_path TEXT,
    file_size_bytes BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'ready',
    chunks_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_user_materials_user_id
    ON public.user_materials(user_id);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own chunks" ON public.document_chunks;
CREATE POLICY "Users read own chunks"
    ON public.document_chunks FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users insert own chunks" ON public.document_chunks;
CREATE POLICY "Users insert own chunks"
    ON public.document_chunks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own materials" ON public.user_materials;
CREATE POLICY "Users manage own materials"
    ON public.user_materials FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own mastery" ON public.learner_mastery;
CREATE POLICY "Users manage own mastery"
    ON public.learner_mastery FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own events" ON public.learning_events;
CREATE POLICY "Users manage own events"
    ON public.learning_events FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Do not use auth.user_id(id); auth.users(id) is the Supabase Auth table.
