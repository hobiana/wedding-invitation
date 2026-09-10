import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.adminUser.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash },
    });
    console.log(`Seeded admin user: ${email}`);
  } else {
    console.log("ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set, skipping admin seed");
  }

  await prisma.weddingSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      weddingDate: new Date("2027-01-02T06:00:00Z"), // samedi 2 janvier 2027, 9 h à Antananarivo
      venueName: "Espace Ny Akanintsika",
      address: "Antananarivo, Madagascar",
      rsvpDeadline: new Date("2026-12-01T20:59:59Z"), // fin du 1er décembre à Antananarivo
      seatingPlanActivated: false,
    },
  });
  console.log("Seeded default WeddingSettings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
