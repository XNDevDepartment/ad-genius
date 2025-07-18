-- Create an enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_user_id AND role = 'admin'
  );
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (public.is_admin());

-- Insert the initial admin user
INSERT INTO public.user_roles (user_id, role, created_by) 
VALUES ('579588c8-f63e-4ba8-84ec-4419303abf7c', 'admin', '579588c8-f63e-4ba8-84ec-4419303abf7c');

-- Update RLS policies for conversations to allow admin access
CREATE POLICY "Admins can view all conversations" 
ON public.conversations 
FOR SELECT 
USING (public.is_admin());

-- Update RLS policies for conversation_messages to allow admin access
CREATE POLICY "Admins can view all conversation messages" 
ON public.conversation_messages 
FOR SELECT 
USING (public.is_admin());

-- Update RLS policies for profiles to allow admin access
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

-- Update RLS policies for generated_images to allow admin access
CREATE POLICY "Admins can view all generated images" 
ON public.generated_images 
FOR SELECT 
USING (public.is_admin());