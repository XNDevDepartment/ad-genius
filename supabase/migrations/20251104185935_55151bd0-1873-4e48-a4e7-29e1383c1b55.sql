-- Create outfit_swap_ecommerce_photos table
CREATE TABLE outfit_swap_ecommerce_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result_id uuid NOT NULL REFERENCES outfit_swap_results(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'canceled')),
  progress integer DEFAULT 0,
  public_url text,
  storage_path text,
  prompt_used text,
  error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX idx_ecommerce_photos_user ON outfit_swap_ecommerce_photos(user_id);
CREATE INDEX idx_ecommerce_photos_result ON outfit_swap_ecommerce_photos(result_id);
CREATE INDEX idx_ecommerce_photos_status ON outfit_swap_ecommerce_photos(status);

-- Add RLS policies
ALTER TABLE outfit_swap_ecommerce_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on ecommerce photos"
  ON outfit_swap_ecommerce_photos
  FOR ALL
  USING (is_admin());

CREATE POLICY "Service role can manage ecommerce photos"
  ON outfit_swap_ecommerce_photos
  FOR ALL
  USING (true);

CREATE POLICY "Users can view own ecommerce photos"
  ON outfit_swap_ecommerce_photos
  FOR SELECT
  USING (user_id = auth.uid());

-- Add back_image columns to outfit_swap_photoshoots
ALTER TABLE outfit_swap_photoshoots
ADD COLUMN back_image_url text,
ADD COLUMN back_image_path text;

-- Update trigger for updated_at
CREATE TRIGGER update_ecommerce_photos_updated_at
  BEFORE UPDATE ON outfit_swap_ecommerce_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();