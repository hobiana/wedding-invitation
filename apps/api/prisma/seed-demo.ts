import "dotenv/config";
import { PrismaClient, RsvpStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { nanoid } from "nanoid";
import * as bcrypt from "bcrypt";

/**
 * Development dataset. Not the production seed — `seed.ts` stays minimal on
 * purpose, because it runs against the real wedding.
 *
 * This one exists so nobody has to work blind. The design audit had to stub 40
 * households by hand to find out the seating board collapses at that size; a
 * frontend change to an empty database shows empty states and nothing else.
 *
 * Every row here respects the invariants the API enforces, so the dataset can
 * never be the reason a bug looks reproduced:
 *   PENDING   -> confirmedCount null   (never 0: 0 means "answered, nobody comes")
 *   DECLINED  -> confirmedCount 0
 *   CONFIRMED -> confirmedCount between 1 and allocatedSeats
 * A table never holds more than its capacity, counting `confirmedCount ??
 * allocatedSeats` per household — the same maths as common/seating.ts.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FAMILIES = [
  "Famille Rakotomalala", "Famille Andrianarison", "Jean & Marie Rabe",
  "Famille Razafindrakoto", "Hery Rakotoarisoa", "Famille Randrianasolo",
  "Famille Ravelojaona", "Nirina & Tiana", "Famille Rasoanaivo",
  "Famille Andriamahefa", "Fanja Rakotobe", "Famille Ratsimbazafy",
  "Famille Raharimanana", "Lova & Mamy", "Famille Andrianjafy",
  "Famille Rakotondrabe", "Soa Razanamparany", "Famille Ranaivoson",
  "Famille Rabemananjara", "Voahangy & Fidy", "Famille Andriamanana",
  "Famille Rakotonirina", "Haja Randriamampionona", "Famille Rasolofoson",
  "Famille Ravoninahitra", "Miora & Toky", "Famille Andrianaivo",
  "Famille Rajaonarivelo", "Fara Rakotomavo", "Famille Randriamihaja",
  "Famille Raveloson", "Onja & Sitraka", "Famille Andriantsitohaina",
  "Famille Rakotoson", "Bodo Rafanomezantsoa", "Famille Ramanantsoa",
  "Famille Rabetokotany", "Zo & Hanta", "Famille Andriambelo",
  "Famille Rakotovao",
];

const DIETS = [
  "Une personne végétarienne",
  "Allergie aux fruits de mer",
  "Sans gluten pour un adulte",
  "Un repas enfant",
];

const MESSAGES = [
  "Nous avons hâte d'y être !",
  "Félicitations à vous deux, quel bonheur.",
  "Merci pour l'invitation, ce sera un plaisir.",
  "Désolés, nous serons à l'étranger ce week-end.",
];

/** Deterministic pseudo-random, so two runs give the same dataset. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

async function main() {
  const random = makeRandom(20260823);

  await prisma.household.deleteMany();
  await prisma.table.deleteMany();

  const email = process.env.ADMIN_SEED_EMAIL || "admin@invitation-app.local";
  const password = process.env.ADMIN_SEED_PASSWORD || "motdepasse-de-dev";
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: await bcrypt.hash(password, 10) },
  });

  // Every optional field filled in, so the invitation page can be looked at
  // with all of it rendered rather than half of it conditionally hidden.
  await prisma.weddingSettings.upsert({
    where: { id: "singleton" },
    update: {
      weddingDate: new Date("2027-06-12T15:00:00Z"),
      venueName: "Domaine d'Ambohimanga",
      address: "Route d'Ambohimanga, Antananarivo",
      mapUrl: "https://maps.google.com/?q=Ambohimanga",
      dressCode: "Tenue de cocktail — teintes claires appréciées",
      parkingInfo: "Parking gratuit sur place, entrée par le portail sud",
      rsvpDeadline: new Date("2027-05-01T00:00:00Z"),
      seatingPlanActivated: false,
    },
    create: {
      id: "singleton",
      weddingDate: new Date("2027-06-12T15:00:00Z"),
      venueName: "Domaine d'Ambohimanga",
      address: "Route d'Ambohimanga, Antananarivo",
      mapUrl: "https://maps.google.com/?q=Ambohimanga",
      dressCode: "Tenue de cocktail — teintes claires appréciées",
      parkingInfo: "Parking gratuit sur place, entrée par le portail sud",
      rsvpDeadline: new Date("2027-05-01T00:00:00Z"),
      seatingPlanActivated: false,
    },
  });

  const tables = await Promise.all(
    ["Vanille", "Ravinala", "Baobab", "Jacaranda", "Flamboyant", "Orchidée"].map(
      (name) => prisma.table.create({ data: { name, capacity: 10 } }),
    ),
  );

  const remaining = tables.map((t) => ({ id: t.id, left: 10 }));
  let confirmed = 0;
  let declined = 0;
  let seated = 0;

  for (const displayName of FAMILIES) {
    const allocatedSeats = 1 + Math.floor(random() * 4);
    const draw = random();

    let status: RsvpStatus = "PENDING";
    let confirmedCount: number | null = null;
    if (draw < 0.55) {
      status = "CONFIRMED";
      confirmedCount = 1 + Math.floor(random() * allocatedSeats);
      confirmed += 1;
    } else if (draw < 0.75) {
      status = "DECLINED";
      confirmedCount = 0;
      declined += 1;
    }

    // Same maths as seatsFor(): an unanswered household still holds its whole
    // allocation, because a late yes must not land on a seat given away.
    //
    // Declined households are left unseated even though they cost zero seats.
    // Letting them through piles every decline onto the first table with room
    // and produces sixteen chips on a table of ten — valid, and nothing an
    // organiser would ever do. The seating board is the screen being
    // redesigned, so its dataset has to look like real planning: two thirds
    // placed, the rest still waiting.
    const seats = confirmedCount ?? allocatedSeats;
    const table =
      status === "DECLINED" || random() < 0.35
        ? undefined
        : remaining.find((t) => t.left >= seats);
    if (table) {
      table.left -= seats;
      seated += 1;
    }

    await prisma.household.create({
      data: {
        id: nanoid(8),
        displayName,
        allocatedSeats,
        memberNames:
          random() < 0.5 ? displayName.replace(/^Famille /, "").split(" & ") : [],
        status,
        confirmedCount,
        dietaryNotes: random() < 0.25 ? DIETS[Math.floor(random() * DIETS.length)] : null,
        message: random() < 0.3 ? MESSAGES[Math.floor(random() * MESSAGES.length)] : null,
        tableId: table?.id ?? null,
      },
    });
  }

  const links = await prisma.household.findMany({
    select: { id: true, displayName: true },
    take: 3,
  });

  console.log(`${FAMILIES.length} foyers — ${confirmed} confirmés, ${declined} déclinés, ${FAMILIES.length - confirmed - declined} en attente`);
  console.log(`${tables.length} tables, ${seated} foyers placés, ${FAMILIES.length - seated} à placer`);
  console.log(`Admin : ${email} / ${password}`);
  console.log("Quelques liens d'invitation à ouvrir :");
  for (const l of links) console.log(`  http://localhost:5173/i/${l.id}   (${l.displayName})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
