-- Configure auth settings for 7-day session duration
-- This will set the JWT expiry to 7 days (604800 seconds)
UPDATE auth.config 
SET jwt_exp = 604800 
WHERE parameter = 'jwt_exp';

-- If the parameter doesn't exist, insert it
INSERT INTO auth.config (parameter, value) 
SELECT 'jwt_exp', '604800' 
WHERE NOT EXISTS (
  SELECT 1 FROM auth.config WHERE parameter = 'jwt_exp'
);