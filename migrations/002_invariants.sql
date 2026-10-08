-- 002: інваріант I2 на рівні БД (аудит Лаби 2, знахідка №1).
-- Майстер не може мати двох речей in_repair — навіть якщо дві транзакції перевірили це одночасно.
CREATE UNIQUE INDEX tickets_one_in_repair_per_volunteer
  ON tickets (volunteer_id)
  WHERE status = 'in_repair';
