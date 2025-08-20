-- Enable leaked password protection
UPDATE auth.config 
SET leaked_password_protection_enabled = true;