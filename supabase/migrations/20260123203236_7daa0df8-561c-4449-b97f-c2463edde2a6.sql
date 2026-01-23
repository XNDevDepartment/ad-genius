-- Compensate users for missed monthly credit allocations
-- This adds the missed credits and logs the transaction

-- 1. mariarosa.lojabraga@gmail.com - Pro - missed 800 credits
SELECT refund_user_credits('ce835465-83c8-48ae-b5dc-a00ad11cd5e7'::uuid, 800, 'compensation_missed_monthly_resets');

-- 2. geral@pura-ecoconcept.pt - Founders - missed 320 credits  
SELECT refund_user_credits('5bc9eedd-ca9b-4ff8-9521-62c20c81a1c8'::uuid, 320, 'compensation_missed_monthly_resets');

-- 3. geral@ogatodasfraldas.pt - Founders - missed 240 credits
SELECT refund_user_credits('9bffbf71-5bd1-4716-8345-60ba699e5443'::uuid, 240, 'compensation_missed_monthly_resets');

-- 4. yonos@yonos.pt - Founders - missed 240 credits
SELECT refund_user_credits('9bab8631-5403-4001-8c3d-3995ead7c58e'::uuid, 240, 'compensation_missed_monthly_resets');

-- 5. info@bughug.com - Founders - missed 240 credits
SELECT refund_user_credits('1f967410-9f0a-42f6-8356-ab5b385cb427'::uuid, 240, 'compensation_missed_monthly_resets');

-- 6. seletivedeta@gmail.com - Founders - missed 160 credits
SELECT refund_user_credits('b69b7033-870d-41fe-9200-67476af40898'::uuid, 160, 'compensation_missed_monthly_resets');

-- 7. marta.paula2@gmail.com - Founders - missed 160 credits
SELECT refund_user_credits('490c1ed9-44e2-40c6-b823-4536dd4cd7e5'::uuid, 160, 'compensation_missed_monthly_resets');

-- 8. mgs.sandra77@gmail.com - Founders - missed 160 credits
SELECT refund_user_credits('01c373a8-f590-4674-b1da-9ee489ec36bc'::uuid, 160, 'compensation_missed_monthly_resets');

-- 9. goncalosuka@gmail.com - Founders - missed 160 credits
SELECT refund_user_credits('29acd7aa-a140-4498-9044-37937c8e252a'::uuid, 160, 'compensation_missed_monthly_resets');

-- 10. sofiamec@gmail.com - Founders - missed 160 credits
SELECT refund_user_credits('a4023454-9e9b-4892-a3cc-c99230f92c2a'::uuid, 160, 'compensation_missed_monthly_resets');

-- 11. rui149@gmail.com - Founders - missed 80 credits
SELECT refund_user_credits('329f9483-6cc6-4908-acd9-78146a400e35'::uuid, 80, 'compensation_missed_monthly_resets');

-- 12. simokas.okas@gmail.com - Founders - missed 80 credits
SELECT refund_user_credits('41a1149c-b239-4a91-969c-b713b56bcf44'::uuid, 80, 'compensation_missed_monthly_resets');

-- 13. contasdarafa@gmail.com - Founders - missed 80 credits
SELECT refund_user_credits('7b400211-ef11-48b5-8223-914abd1e92d1'::uuid, 80, 'compensation_missed_monthly_resets');

-- 14. geral@alojadacerveja.com - Founders - missed 80 credits
SELECT refund_user_credits('1393dc51-2c17-4483-a643-197ef666e9ef'::uuid, 80, 'compensation_missed_monthly_resets');

-- 15. tinanogueira1969@gmail.com - Founders - missed 80 credits
SELECT refund_user_credits('b257a6e8-c17b-4c7e-aaca-0a259ee11c48'::uuid, 80, 'compensation_missed_monthly_resets');

-- 16. mkarinagonzalez@gmail.com - Founders - missed 80 credits
SELECT refund_user_credits('471a41e8-f1ff-4e75-aea9-0aef7aca87d9'::uuid, 80, 'compensation_missed_monthly_resets');