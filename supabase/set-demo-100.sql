-- Demo accounts start at $100, not $10,000.
-- Run once; only resets untouched accounts so nobody mid-session loses positions.
ALTER TABLE public.profiles ALTER COLUMN demo_balance SET DEFAULT 100.00;

UPDATE public.profiles SET demo_balance = 100.00
 WHERE demo_balance = 10000.00
   AND id NOT IN (SELECT DISTINCT user_id FROM public.demo_trades);

SELECT count(*) AS accounts_at_100 FROM public.profiles WHERE demo_balance = 100.00;
