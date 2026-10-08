-- AlterTable
-- Le DEFAULT amorce la ligne `singleton` existante avec les deux numéros
-- jusque-là écrits en dur dans la page invité (wedding-content.ts).
ALTER TABLE "WeddingSettings" ADD COLUMN     "contactPhones" TEXT[] DEFAULT ARRAY['+261 34 64 314 02', '+261 34 29 682 30']::TEXT[];
