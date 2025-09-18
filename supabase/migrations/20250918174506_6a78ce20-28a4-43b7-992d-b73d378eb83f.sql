-- Create Gemini conversations table
CREATE TABLE public.gemini_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT,
  image_analysis TEXT,
  niche TEXT,
  audience TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Gemini messages table  
CREATE TABLE public.gemini_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES gemini_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  has_image BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gemini_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemini_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for gemini_conversations
CREATE POLICY "Users can view their own gemini conversations"
  ON public.gemini_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own gemini conversations"
  ON public.gemini_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gemini conversations"
  ON public.gemini_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gemini conversations"
  ON public.gemini_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all gemini conversations"
  ON public.gemini_conversations FOR SELECT
  USING (is_admin());

-- RLS policies for gemini_messages
CREATE POLICY "Users can view messages in their own gemini conversations"
  ON public.gemini_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM gemini_conversations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in their own gemini conversations"
  ON public.gemini_messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM gemini_conversations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update messages in their own gemini conversations"
  ON public.gemini_messages FOR UPDATE
  USING (conversation_id IN (
    SELECT id FROM gemini_conversations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete messages in their own gemini conversations"
  ON public.gemini_messages FOR DELETE
  USING (conversation_id IN (
    SELECT id FROM gemini_conversations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all gemini messages"
  ON public.gemini_messages FOR SELECT
  USING (is_admin());

-- Create updated_at trigger for gemini_conversations
CREATE TRIGGER update_gemini_conversations_updated_at
  BEFORE UPDATE ON public.gemini_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();