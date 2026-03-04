UPDATE public.subscribers 
SET credits_balance = 80,
    last_reset_at = now(),
    updated_at = now()
WHERE email IN (
  'geral.patriciavieira@hotmail.com',
  'sapatariatrindade1951@gmail.com',
  'maria.peixoto2000@hotmail.com'
) AND subscribed = true;