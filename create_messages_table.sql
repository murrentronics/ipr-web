-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own messages
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy: Only authenticated users can insert messages (for admin/system use)
CREATE POLICY "Authenticated users can insert messages" ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Admins can insert messages for any user
CREATE POLICY "Admins can insert messages" ON messages
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  ));

-- Create RLS policy: Users can update their own messages (mark as read)
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
