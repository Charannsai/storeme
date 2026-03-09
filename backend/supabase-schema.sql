-- ============================================
-- StoreMe Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GitHub Accounts table
CREATE TABLE IF NOT EXISTS public.github_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  repo_name TEXT NOT NULL DEFAULT 'gallery-storage',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Media Files table
CREATE TYPE media_status AS ENUM ('pending', 'uploading', 'synced', 'failed');

CREATE TABLE IF NOT EXISTS public.media_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  size BIGINT DEFAULT 0,
  github_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  hash TEXT NOT NULL,
  status media_status DEFAULT 'pending'
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_media_files_user_id ON public.media_files(user_id);
CREATE INDEX idx_media_files_hash ON public.media_files(user_id, hash);
CREATE INDEX idx_media_files_status ON public.media_files(user_id, status);
CREATE INDEX idx_github_accounts_user_id ON public.github_accounts(user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- Users: can only read own data
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- GitHub Accounts: can only access own connections
CREATE POLICY "Users can view own GitHub accounts"
  ON public.github_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own GitHub accounts"
  ON public.github_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own GitHub accounts"
  ON public.github_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own GitHub accounts"
  ON public.github_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Media Files: can only access own files
CREATE POLICY "Users can view own media files"
  ON public.media_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media files"
  ON public.media_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media files"
  ON public.media_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media files"
  ON public.media_files FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Service role bypass (for backend API)
-- The service role key bypasses RLS by default
-- ============================================
