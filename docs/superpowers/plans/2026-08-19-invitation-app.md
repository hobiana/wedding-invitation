# Invitation App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 wedding invitation & guest management app: public link-based RSVP pages, an admin dashboard, and a manual table-seating planner.

**Architecture:** pnpm monorepo with `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (React + Vite + Tailwind + shadcn/ui), and `packages/shared` for cross-cutting TypeScript types. Public invitation routes are unauthenticated (nanoid link = access key); admin routes are protected by JWT (email/password or Google OAuth).

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL 16, Passport (local + jwt + google-oauth20), React 18, Vite, TypeScript, TanStack Query, React Router, Tailwind CSS, shadcn/ui, dnd-kit, Vitest/RTL, Jest.

**Spec:** [docs/superpowers/specs/2026-08-19-invitation-app-design.md](../specs/2026-08-19-invitation-app-design.md)

## Global Constraints

- RSVP deadline (`WeddingSettings.rsvpDeadline`) blocks the **public** RSVP submission endpoint only (`403` after deadline) — admin endpoints are never date-restricted.
- No guest authentication: the household's nanoid link id is the sole access key.
- Member first names are always optional, never required to submit an RSVP.
- Admin auth is email+password **and** Google OAuth; no public registration endpoint; Google login is restricted to emails in `ALLOWED_ADMIN_EMAILS`.
- Table capacity is enforced server-side (`409` on overflow), not just in the UI.
- The seating plan is shown to guests only when `WeddingSettings.seatingPlanActivated = true`, toggled manually by the admin — never date-triggered.
- V1 scope only: no CSV export, no PDF export, no reminder/relance flow, no gift registry, no multi-language, no auto-seating suggestion.
- A household has a single `tableId` — by construction a household can never be split across two tables, so no separate "split household" check is needed beyond the capacity check.

---

## Task 1: Monorepo scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`

**Interfaces:**
- Produces: pnpm workspace containing `apps/*` and `packages/*`, root scripts `dev`, `build`.

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "invitation-app",
  "private": true,
  "scripts": {
    "dev:api": "pnpm --filter @invitation-app/api start:dev",
    "dev:web": "pnpm --filter @invitation-app/web dev",
    "build": "pnpm -r build"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

- [ ] **Step 4: Verify pnpm is available**

Run: `pnpm --version`
Expected: prints a version number (>= 9). If missing, run `corepack enable` first.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore
git commit -m "chore: initialize pnpm monorepo workspace"
```

---

## Task 2: Shared types package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `@invitation-app/shared` package exporting `RsvpStatus`, `HouseholdPublicDto`, `HouseholdAdminDto`, `WeddingInfoDto`, `SeatingPlanDto`, `InvitationResponseDto`, `SubmitRsvpDto`, `CreateHouseholdDto`, `UpdateHouseholdDto`, `TableDto`, `TableHouseholdSummaryDto`, `DashboardStatsDto`, `LoginDto`, `AdminSettingsDto`.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@invitation-app/shared",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create src/index.ts with shared types**

```typescript
export type RsvpStatus = "PENDING" | "CONFIRMED" | "DECLINED";

export interface HouseholdPublicDto {
  id: string;
  displayName: string;
  allocatedSeats: number;
  memberNames: string[];
  status: RsvpStatus;
  confirmedCount: number | null;
  dietaryNotes: string | null;
  message: string | null;
}

export interface HouseholdAdminDto extends HouseholdPublicDto {
  tableId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeddingInfoDto {
  weddingDate: string;
  venueName: string;
  address: string;
  mapUrl: string | null;
  dressCode: string | null;
  parkingInfo: string | null;
  rsvpDeadline: string;
}

export interface SeatingNeighborDto {
  displayName: string;
  confirmedCount: number;
}

export interface SeatingPlanDto {
  tableName: string;
  neighbors: SeatingNeighborDto[];
}

export interface InvitationResponseDto {
  household: HouseholdPublicDto;
  wedding: WeddingInfoDto;
  seatingPlan: SeatingPlanDto | null;
}

export interface SubmitRsvpDto {
  status: "CONFIRMED" | "DECLINED";
  confirmedCount?: number;
  memberNames?: string[];
  dietaryNotes?: string;
  message?: string;
}

export interface CreateHouseholdDto {
  displayName: string;
  allocatedSeats: number;
  memberNames?: string[];
}

export interface UpdateHouseholdDto {
  displayName?: string;
  allocatedSeats?: number;
  memberNames?: string[];
  status?: RsvpStatus;
  confirmedCount?: number;
  dietaryNotes?: string;
  message?: string;
}

export interface TableHouseholdSummaryDto {
  id: string;
  displayName: string;
  allocatedSeats: number;
  confirmedCount: number | null;
  status: RsvpStatus;
}

export interface TableDto {
  id: string;
  name: string;
  capacity: number;
  households: TableHouseholdSummaryDto[];
}

export interface CreateTableDto {
  name: string;
  capacity?: number;
}

export interface UpdateTableDto {
  name?: string;
  capacity?: number;
}

export interface DashboardStatsDto {
  totalHouseholds: number;
  confirmedHouseholds: number;
  declinedHouseholds: number;
  pendingHouseholds: number;
  totalConfirmedGuests: number;
  dietaryNotesCount: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CurrentAdminDto {
  id: string;
  email: string;
}

export interface AdminSettingsDto {
  weddingDate: string;
  venueName: string;
  address: string;
  mapUrl?: string;
  dressCode?: string;
  parkingInfo?: string;
  rsvpDeadline: string;
  seatingPlanActivated: boolean;
}
```

- [ ] **Step 4: Install and typecheck**

Run: `pnpm install && pnpm --filter @invitation-app/shared typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared pnpm-lock.yaml
git commit -m "feat: add shared DTO/type package"
```

---

## Task 3: NestJS API scaffold with health check

**Files:**
- Create: `apps/api/` (via Nest CLI)
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Test: `apps/api/test/health.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /health` → `{ status: "ok" }`, NestJS app bootstrapped on port `process.env.PORT ?? 3000`.

- [ ] **Step 1: Scaffold the Nest app**

Run inside `apps/`:
```bash
cd apps
pnpm dlx @nestjs/cli new api --package-manager pnpm --skip-git --skip-install
cd ..
```

- [ ] **Step 2: Rename package and add workspace dependency**

Edit `apps/api/package.json`: set `"name": "@invitation-app/api"`, add `"@invitation-app/shared": "workspace:*"` to `dependencies`.

- [ ] **Step 3: Write failing e2e test for health check**

```typescript
// apps/api/test/health.e2e-spec.ts
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health (GET) returns ok status", () => {
    return request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect({ status: "ok" });
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/api test:e2e -- health`
Expected: FAIL — `Cannot GET /health` (route not defined).

- [ ] **Step 5: Implement health controller**

```typescript
// apps/api/src/health/health.controller.ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok" };
  }
}
```

Register it in `apps/api/src/app.module.ts` (`controllers: [HealthController]`, remove the generated `AppController`/`AppService` and their test files).

- [ ] **Step 6: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/api test:e2e -- health`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat: scaffold NestJS api with health check"
```

---

## Task 4: Vite React web app scaffold

**Files:**
- Create: `apps/web/` (via Vite CLI)
- Modify: `apps/web/package.json`
- Modify: `apps/web/tailwind.config.ts`, `apps/web/src/index.css`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- Produces: Vite dev server rendering `App` with Tailwind active; `@invitation-app/shared` importable from `apps/web`.

- [ ] **Step 1: Scaffold with Vite**

Run inside `apps/`:
```bash
cd apps
pnpm create vite@latest web -- --template react-ts
cd ..
```

- [ ] **Step 2: Rename package and add dependencies**

Edit `apps/web/package.json`: set `"name": "@invitation-app/web"`, add `"@invitation-app/shared": "workspace:*"`.

Run:
```bash
pnpm --filter @invitation-app/web add tailwindcss @tailwindcss/vite
pnpm --filter @invitation-app/web add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Tailwind**

```typescript
// apps/web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
  },
});
```

```css
/* apps/web/src/index.css */
@import "tailwindcss";
```

```typescript
// apps/web/src/setupTests.ts
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Write failing test for App**

```typescript
// apps/web/src/App.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByText(/notre mariage/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/web test -- run`
Expected: FAIL — text not found (default Vite template content).

- [ ] **Step 6: Replace App.tsx with placeholder shell**

```typescript
// apps/web/src/App.tsx
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-semibold">Notre mariage</h1>
    </div>
  );
}

export default App;
```

- [ ] **Step 7: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/web test -- run`
Expected: PASS.

- [ ] **Step 8: Add test script to package.json**

Ensure `apps/web/package.json` has `"test": "vitest"`.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat: scaffold Vite React web app with Tailwind and Vitest"
```

---

## Task 5: shadcn/ui base setup

**Files:**
- Create: `apps/web/components.json`
- Create: `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/components/ui/button.tsx`

**Interfaces:**
- Produces: `cn()` helper in `src/lib/utils.ts`, `Button` component at `src/components/ui/button.tsx` (used by later admin/RSVP UI tasks).

- [ ] **Step 1: Install shadcn/ui CLI dependencies**

```bash
pnpm --filter @invitation-app/web add class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-slot
```

- [ ] **Step 2: Create the cn() utility**

```typescript
// apps/web/src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Add components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "src/components",
    "utils": "src/lib/utils"
  }
}
```

- [ ] **Step 4: Add Button component**

```typescript
// apps/web/src/components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-neutral-900 text-white hover:bg-neutral-700",
        outline: "border border-neutral-300 hover:bg-neutral-100",
        destructive: "bg-red-600 text-white hover:bg-red-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
```

- [ ] **Step 5: Configure `@` path alias**

Add to `apps/web/tsconfig.json` `compilerOptions`: `"baseUrl": ".", "paths": { "@/*": ["./src/*"] }`. Add matching `resolve.alias` in `apps/web/vite.config.ts`:
```typescript
import path from "path";
// inside defineConfig:
resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
```

- [ ] **Step 6: Verify build**

Run: `pnpm --filter @invitation-app/web build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat: add shadcn/ui base setup with Button component"
```

---

## Task 6: Local Postgres via Docker Compose + Prisma init

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/.env.example`
- Create: `apps/api/.env` (local only, gitignored)

**Interfaces:**
- Produces: local Postgres reachable at `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invitation_app`.

- [ ] **Step 1: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: invitation_app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Start Postgres**

Run: `docker compose up -d`
Expected: `postgres` container running (`docker compose ps` shows state `running`).

- [ ] **Step 3: Install Prisma in apps/api**

```bash
pnpm --filter @invitation-app/api add @prisma/client
pnpm --filter @invitation-app/api add -D prisma
```

- [ ] **Step 4: Init Prisma**

Run: `pnpm --filter @invitation-app/api exec prisma init --datasource-provider postgresql`
This creates `apps/api/prisma/schema.prisma` and `apps/api/.env`.

- [ ] **Step 5: Create .env.example and set local .env**

```
# apps/api/.env.example
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invitation_app"
JWT_SECRET="change-me"
JWT_EXPIRES_IN="7d"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
ALLOWED_ADMIN_EMAILS=""
FRONTEND_URL="http://localhost:5173"
ADMIN_SEED_EMAIL=""
ADMIN_SEED_PASSWORD=""
```

Copy it to `apps/api/.env` with the same `DATABASE_URL` (matches docker-compose above).

- [ ] **Step 6: Verify connection**

Run: `pnpm --filter @invitation-app/api exec prisma db pull`
Expected: connects successfully (reports empty schema, no tables yet — that's fine).

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml apps/api/prisma/schema.prisma apps/api/.env.example apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add local Postgres via docker-compose and Prisma init"
```

---

## Task 7: Prisma schema — data model

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma models `Household`, `Table`, `AdminUser`, `WeddingSettings`, enum `RsvpStatus`; generated `@prisma/client` types used by every later backend task.

- [ ] **Step 1: Write the full schema**

```prisma
// apps/api/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum RsvpStatus {
  PENDING
  CONFIRMED
  DECLINED
}

model Household {
  id             String     @id
  displayName    String
  allocatedSeats Int
  memberNames    String[]   @default([])
  status         RsvpStatus @default(PENDING)
  confirmedCount Int?
  dietaryNotes   String?
  message        String?
  table          Table?     @relation(fields: [tableId], references: [id])
  tableId        String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
}

model Table {
  id         String      @id @default(cuid())
  name       String
  capacity   Int         @default(10)
  households Household[]
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String?
  googleId     String?  @unique
  createdAt    DateTime @default(now())
}

model WeddingSettings {
  id                   String   @id @default("singleton")
  weddingDate          DateTime
  venueName            String
  address              String
  mapUrl               String?
  dressCode            String?
  parkingInfo          String?
  rsvpDeadline         DateTime
  seatingPlanActivated Boolean  @default(false)
}
```

Note: `Household.id` has no `@default` — it is a short nanoid generated in application code (Task 11), not a Prisma-generated id, since Prisma has no built-in nanoid default.

- [ ] **Step 2: Generate the initial migration**

Run: `pnpm --filter @invitation-app/api exec prisma migrate dev --name init`
Expected: creates `apps/api/prisma/migrations/<timestamp>_init/migration.sql`, applies it, generates the client.

- [ ] **Step 3: Verify client generation**

Run: `pnpm --filter @invitation-app/api exec prisma generate`
Expected: `Generated Prisma Client` with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma
git commit -m "feat: define Prisma data model (Household, Table, AdminUser, WeddingSettings)"
```

---

## Task 8: PrismaService + PrismaModule

**Files:**
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/prisma/prisma.service.spec.ts`

**Interfaces:**
- Produces: `PrismaService extends PrismaClient` with `onModuleInit`/`onModuleDestroy` lifecycle hooks; `PrismaModule` is `@Global()` and exports `PrismaService`. Every later service injects `PrismaService`.

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/prisma/prisma.service.spec.ts
import { Test } from "@nestjs/testing";
import { PrismaService } from "./prisma.service";

describe("PrismaService", () => {
  it("connects and disconnects without throwing", async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    const service = moduleRef.get(PrismaService);
    await expect(service.onModuleInit()).resolves.not.toThrow();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/api test -- prisma.service`
Expected: FAIL — module `./prisma.service` not found.

- [ ] **Step 3: Implement PrismaService**

```typescript
// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```typescript
// apps/api/src/prisma/prisma.module.ts
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 4: Register in AppModule**

Add `PrismaModule` to `apps/api/src/app.module.ts` imports.

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/api test -- prisma.service`
Expected: PASS (requires local Postgres running via `docker compose up -d`).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/prisma apps/api/src/app.module.ts
git commit -m "feat: add PrismaService and global PrismaModule"
```

---

## Task 9: ConfigModule + seed script

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 8).
- Produces: `@nestjs/config`'s `ConfigModule` globally available (`ConfigService.get(key)` used by every later task needing env vars); `pnpm --filter @invitation-app/api exec prisma db seed` creates one `AdminUser` (bcrypt-hashed password) and a default `WeddingSettings` singleton row.

- [ ] **Step 1: Install dependencies**

```bash
pnpm --filter @invitation-app/api add @nestjs/config bcrypt
pnpm --filter @invitation-app/api add -D @types/bcrypt ts-node
```

- [ ] **Step 2: Register ConfigModule globally**

In `apps/api/src/app.module.ts`, import `ConfigModule` from `@nestjs/config` and add to `imports`: `ConfigModule.forRoot({ isGlobal: true })`.

- [ ] **Step 3: Write the seed script**

```typescript
// apps/api/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

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
      weddingDate: new Date("2027-06-12T14:00:00Z"),
      venueName: "À définir",
      address: "À définir",
      rsvpDeadline: new Date("2027-05-01T00:00:00Z"),
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
```

- [ ] **Step 4: Wire the seed command into package.json**

Add to `apps/api/package.json`:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

- [ ] **Step 5: Set local seed env vars and run**

Add `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` to `apps/api/.env` (local dev credentials).

Run: `pnpm --filter @invitation-app/api exec prisma db seed`
Expected: prints `Seeded admin user: ...` and `Seeded default WeddingSettings`.

- [ ] **Step 6: Verify rows exist**

Run: `pnpm --filter @invitation-app/api exec prisma studio` (or a quick `psql`/`prisma db execute` query) and confirm one row in `AdminUser` and one in `WeddingSettings` with `id = 'singleton'`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/seed.ts apps/api/package.json apps/api/src/app.module.ts pnpm-lock.yaml
git commit -m "feat: add ConfigModule and admin/settings seed script"
```

---

## Task 10: Admin auth — email/password login with JWT cookie

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/strategies/local.strategy.ts`
- Create: `apps/api/src/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/auth/guards/local-auth.guard.ts`
- Create: `apps/api/src/auth/guards/jwt-auth.guard.ts`
- Modify: `apps/api/src/main.ts` (cookie-parser)
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 8), `ConfigService` (Task 9).
- Produces: `AuthService.validateUser(email, password): Promise<AdminUser | null>`, `AuthService.login(user: AdminUser): { accessToken: string }`; `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; `JwtAuthGuard` used by every `/admin/*` controller from Task 12 onward.

- [ ] **Step 1: Install dependencies**

```bash
pnpm --filter @invitation-app/api add @nestjs/passport @nestjs/jwt passport passport-local passport-jwt cookie-parser
pnpm --filter @invitation-app/api add -D @types/passport-local @types/passport-jwt @types/cookie-parser
```

- [ ] **Step 2: Write failing unit test for AuthService**

```typescript
// apps/api/src/auth/auth.service.spec.ts
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: { adminUser: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      adminUser: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        JwtService,
        { provide: ConfigService, useValue: { get: () => "" } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it("returns null when the email is unknown", async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);
    const result = await service.validateUser("nobody@example.com", "pw");
    expect(result).toBeNull();
  });

  it("returns null when the password does not match", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    prisma.adminUser.findUnique.mockResolvedValue({ id: "1", email: "a@b.com", passwordHash });
    const result = await service.validateUser("a@b.com", "wrong-password");
    expect(result).toBeNull();
  });

  it("returns the user when the password matches", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    const user = { id: "1", email: "a@b.com", passwordHash };
    prisma.adminUser.findUnique.mockResolvedValue(user);
    const result = await service.validateUser("a@b.com", "correct-password");
    expect(result).toEqual(user);
  });
});
```

- [ ] **Step 2b: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/api test -- auth.service`
Expected: FAIL — `./auth.service` not found.

- [ ] **Step 3: Implement AuthService**

```typescript
// apps/api/src/auth/auth.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AdminUser } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<AdminUser | null> {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    const matches = await bcrypt.compare(password, user.passwordHash);
    return matches ? user : null;
  }

  async validateGoogleUser(email: string | undefined, googleId: string): Promise<AdminUser | null> {
    if (!email) return null;
    const allowed = (this.config.get<string>("ALLOWED_ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.includes(email.toLowerCase())) return null;

    const existing = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!existing) {
      return this.prisma.adminUser.create({ data: { email, googleId } });
    }
    if (existing.googleId !== googleId) {
      return this.prisma.adminUser.update({ where: { id: existing.id }, data: { googleId } });
    }
    return existing;
  }

  login(user: AdminUser): { accessToken: string } {
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/api test -- auth.service`
Expected: PASS.

- [ ] **Step 5: Implement Passport strategies and guards**

```typescript
// apps/api/src/auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "../auth.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: "email" });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) throw new UnauthorizedException("Invalid credentials");
    return user;
  }
}
```

```typescript
// apps/api/src/auth/strategies/jwt.strategy.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { Strategy } from "passport-jwt";

function cookieExtractor(req: Request): string | null {
  return req?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET") ?? "dev-secret",
    });
  }

  async validate(payload: { sub: string; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

```typescript
// apps/api/src/auth/guards/local-auth.guard.ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {}
```

```typescript
// apps/api/src/auth/guards/jwt-auth.guard.ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
```

- [ ] **Step 6: Implement AuthController and AuthModule**

```typescript
// apps/api/src/auth/auth.controller.ts
import { Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AdminUser } from "@prisma/client";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setAuthCookie(res: Response, accessToken: string) {
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.get("NODE_ENV") === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @UseGuards(LocalAuthGuard)
  @Post("login")
  login(@Req() req: { user: AdminUser }, @Res({ passthrough: true }) res: Response) {
    const { accessToken } = this.authService.login(req.user);
    this.setAuthCookie(res, accessToken);
    return { email: req.user.email };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("access_token");
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: { user: { userId: string; email: string } }) {
    return { id: req.user.userId, email: req.user.email };
  }
}
```

```typescript
// apps/api/src/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LocalStrategy } from "./strategies/local.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET") ?? "dev-secret",
        signOptions: { expiresIn: config.get<string>("JWT_EXPIRES_IN") ?? "7d" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

Add `AuthModule` to `apps/api/src/app.module.ts` imports.

- [ ] **Step 7: Enable cookie parsing in main.ts**

```typescript
// apps/api/src/main.ts
import cookieParser from "cookie-parser";
// inside bootstrap(), after `const app = await NestFactory.create(AppModule)`:
app.use(cookieParser());
app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });
```

- [ ] **Step 8: Write e2e test for login flow**

```typescript
// apps/api/test/auth.e2e-spec.ts
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = "e2e-admin@example.com";
  const password = "super-secret";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = moduleRef.get(PrismaService);
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash },
    });
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({ where: { email } });
    await app.close();
  });

  it("rejects bad credentials", async () => {
    await request(app.getHttpServer()).post("/auth/login").send({ email, password: "wrong" }).expect(401);
  });

  it("logs in and sets an httpOnly cookie usable on /auth/me", async () => {
    const loginRes = await request(app.getHttpServer()).post("/auth/login").send({ email, password }).expect(201);
    const cookie = loginRes.headers["set-cookie"][0];
    expect(cookie).toContain("access_token=");

    const meRes = await request(app.getHttpServer()).get("/auth/me").set("Cookie", cookie).expect(200);
    expect(meRes.body.email).toBe(email);
  });
});
```

- [ ] **Step 9: Run e2e test, verify it passes**

Run: `pnpm --filter @invitation-app/api test:e2e -- auth`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/api
git commit -m "feat: add admin email/password authentication with JWT cookie"
```

---

## Task 11: Admin auth — Google OAuth

**Files:**
- Create: `apps/api/src/auth/strategies/google.strategy.ts`
- Create: `apps/api/src/auth/guards/google-auth.guard.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/auth.module.ts`
- Test: `apps/api/src/auth/auth.service.google.spec.ts`

**Interfaces:**
- Consumes: `AuthService` (Task 10), `ConfigService`.
- Produces: `GET /auth/google`, `GET /auth/google/callback` → redirects to `${FRONTEND_URL}/admin` with the same `access_token` cookie set by Task 10's login.

- [ ] **Step 1: Install dependency**

```bash
pnpm --filter @invitation-app/api add passport-google-oauth20
pnpm --filter @invitation-app/api add -D @types/passport-google-oauth20
```

- [ ] **Step 2: Write failing unit test for validateGoogleUser whitelist behavior**

```typescript
// apps/api/src/auth/auth.service.google.spec.ts
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AuthService.validateGoogleUser", () => {
  let service: AuthService;
  let prisma: { adminUser: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      adminUser: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        JwtService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === "ALLOWED_ADMIN_EMAILS" ? "allowed@example.com" : "") },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it("rejects an email not on the whitelist", async () => {
    const result = await service.validateGoogleUser("stranger@example.com", "google-1");
    expect(result).toBeNull();
    expect(prisma.adminUser.create).not.toHaveBeenCalled();
  });

  it("creates the admin user on first login for a whitelisted email", async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);
    prisma.adminUser.create.mockResolvedValue({ id: "1", email: "allowed@example.com", googleId: "google-1" });
    const result = await service.validateGoogleUser("allowed@example.com", "google-1");
    expect(result?.email).toBe("allowed@example.com");
    expect(prisma.adminUser.create).toHaveBeenCalledWith({
      data: { email: "allowed@example.com", googleId: "google-1" },
    });
  });
});
```

- [ ] **Step 3: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/api test -- auth.service.google`
Expected: PASS (implementation already exists from Task 10's `validateGoogleUser`; this test just locks the whitelist contract before wiring the strategy).

- [ ] **Step 4: Implement GoogleStrategy and guard**

```typescript
// apps/api/src/auth/strategies/google.strategy.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback, Profile } from "passport-google-oauth20";
import { AuthService } from "../auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>("GOOGLE_CLIENT_ID") ?? "",
      clientSecret: config.get<string>("GOOGLE_CLIENT_SECRET") ?? "",
      callbackURL: config.get<string>("GOOGLE_CALLBACK_URL") ?? "",
      scope: ["email", "profile"],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    const user = await this.authService.validateGoogleUser(email, profile.id);
    if (!user) return done(new UnauthorizedException("Email not authorized"), false);
    done(null, user);
  }
}
```

```typescript
// apps/api/src/auth/guards/google-auth.guard.ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {}
```

- [ ] **Step 5: Add controller routes**

Add to `apps/api/src/auth/auth.controller.ts`:
```typescript
@UseGuards(GoogleAuthGuard)
@Get("google")
googleLogin() {
  // Passport redirects to Google; body never reached.
}

@UseGuards(GoogleAuthGuard)
@Get("google/callback")
googleCallback(@Req() req: { user: AdminUser }, @Res() res: Response) {
  const { accessToken } = this.authService.login(req.user);
  this.setAuthCookie(res, accessToken);
  res.redirect(`${this.config.get("FRONTEND_URL")}/admin`);
}
```

Add `GoogleStrategy` to `AuthModule` providers.

- [ ] **Step 6: Manual verification**

With `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`ALLOWED_ADMIN_EMAILS` set in `apps/api/.env`, run the API and visit `http://localhost:3000/auth/google` in a browser; confirm it redirects to Google's consent screen. (Full OAuth round-trip requires real Google credentials — document this as a manual check, not an automated one.)

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat: add Google OAuth admin login with email whitelist"
```

---

## Task 12: Households — admin CRUD + link generation

**Files:**
- Create: `apps/api/src/households/households.module.ts`
- Create: `apps/api/src/households/households.service.ts`
- Create: `apps/api/src/households/households.controller.ts`
- Create: `apps/api/src/households/dto/create-household.dto.ts`
- Create: `apps/api/src/households/dto/update-household.dto.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/households/households.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 8), `JwtAuthGuard` (Task 10).
- Produces: `HouseholdsService.create/findAll/findOne/update/remove`; `GET/POST/PATCH/DELETE /admin/households` (all behind `JwtAuthGuard`). `HouseholdsService.findOne(id)` is reused by Task 14 (invitation lookup) and Task 17 (table assignment).

- [ ] **Step 1: Install nanoid and class-validator**

```bash
pnpm --filter @invitation-app/api add nanoid class-validator class-transformer
```

Ensure `main.ts` has a global `ValidationPipe`:
```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

- [ ] **Step 2: Write DTOs**

```typescript
// apps/api/src/households/dto/create-household.dto.ts
import { IsArray, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateHouseholdDto {
  @IsString()
  displayName!: string;

  @IsInt()
  @Min(1)
  allocatedSeats!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberNames?: string[];
}
```

```typescript
// apps/api/src/households/dto/update-household.dto.ts
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateHouseholdDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsInt() @Min(1) allocatedSeats?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) memberNames?: string[];
  @IsOptional() @IsIn(["PENDING", "CONFIRMED", "DECLINED"]) status?: "PENDING" | "CONFIRMED" | "DECLINED";
  @IsOptional() @IsInt() @Min(0) confirmedCount?: number;
  @IsOptional() @IsString() dietaryNotes?: string;
  @IsOptional() @IsString() message?: string;
}
```

- [ ] **Step 3: Write failing unit test for HouseholdsService.create**

```typescript
// apps/api/src/households/households.service.spec.ts
import { Test } from "@nestjs/testing";
import { HouseholdsService } from "./households.service";
import { PrismaService } from "../prisma/prisma.service";

describe("HouseholdsService", () => {
  let service: HouseholdsService;
  let prisma: { household: { create: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { household: { create: jest.fn(), findMany: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [HouseholdsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(HouseholdsService);
  });

  it("generates an 8-character id and creates the household", async () => {
    prisma.household.create.mockImplementation(({ data }) => Promise.resolve({ ...data, id: data.id }));
    const result = await service.create({ displayName: "Famille Test", allocatedSeats: 3 });
    expect(result.id).toHaveLength(8);
    expect(prisma.household.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ displayName: "Famille Test", allocatedSeats: 3, memberNames: [] }),
    });
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/api test -- households.service`
Expected: FAIL — `./households.service` not found.

- [ ] **Step 5: Implement HouseholdsService**

```typescript
// apps/api/src/households/households.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { CreateHouseholdDto } from "./dto/create-household.dto";
import { UpdateHouseholdDto } from "./dto/update-household.dto";

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateHouseholdDto) {
    return this.prisma.household.create({
      data: {
        id: nanoid(8),
        displayName: dto.displayName,
        allocatedSeats: dto.allocatedSeats,
        memberNames: dto.memberNames ?? [],
      },
    });
  }

  findAll() {
    return this.prisma.household.findMany({ orderBy: { createdAt: "asc" } });
  }

  async findOne(id: string) {
    const household = await this.prisma.household.findUnique({ where: { id } });
    if (!household) throw new NotFoundException("Household not found");
    return household;
  }

  async update(id: string, dto: UpdateHouseholdDto) {
    await this.findOne(id);
    return this.prisma.household.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.household.delete({ where: { id } });
    return { success: true };
  }
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/api test -- households.service`
Expected: PASS.

- [ ] **Step 7: Implement controller and module**

```typescript
// apps/api/src/households/households.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { HouseholdsService } from "./households.service";
import { CreateHouseholdDto } from "./dto/create-household.dto";
import { UpdateHouseholdDto } from "./dto/update-household.dto";

@UseGuards(JwtAuthGuard)
@Controller("admin/households")
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  create(@Body() dto: CreateHouseholdDto) {
    return this.householdsService.create(dto);
  }

  @Get()
  findAll() {
    return this.householdsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.householdsService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateHouseholdDto) {
    return this.householdsService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.householdsService.remove(id);
  }
}
```

```typescript
// apps/api/src/households/households.module.ts
import { Module } from "@nestjs/common";
import { HouseholdsController } from "./households.controller";
import { HouseholdsService } from "./households.service";

@Module({
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
  exports: [HouseholdsService],
})
export class HouseholdsModule {}
```

Add `HouseholdsModule` to `apps/api/src/app.module.ts` imports.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/households apps/api/src/app.module.ts apps/api/src/main.ts pnpm-lock.yaml
git commit -m "feat: add admin households CRUD with nanoid link generation"
```

---

## Task 13: Frontend — auth context, API client, login page

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/queryClient.ts`
- Create: `apps/web/src/auth/AuthContext.tsx`
- Create: `apps/web/src/auth/ProtectedRoute.tsx`
- Create: `apps/web/src/pages/LoginPage.tsx`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `POST /auth/login`, `GET /auth/me`, `GET /auth/google` (Tasks 10-11).
- Produces: `useAuth(): { admin: CurrentAdminDto | null, isLoading: boolean, login, logout }` from `AuthContext`; `<ProtectedRoute>` wraps every `/admin/*` route added from Task 15 onward.

- [ ] **Step 1: Install dependencies**

```bash
pnpm --filter @invitation-app/web add react-router-dom @tanstack/react-query
```

- [ ] **Step 2: API client**

```typescript
// apps/web/src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export const googleLoginUrl = `${API_URL}/auth/google`;
```

- [ ] **Step 3: Query client and provider wiring**

```typescript
// apps/web/src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
```

- [ ] **Step 4: AuthContext**

```typescript
// apps/web/src/auth/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { CurrentAdminDto, LoginDto } from "@invitation-app/shared";
import { api } from "@/lib/api";

interface AuthContextValue {
  admin: CurrentAdminDto | null;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<CurrentAdminDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<CurrentAdminDto>("/auth/me")
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(credentials: LoginDto) {
    await api.post("/auth/login", credentials);
    const me = await api.get<CurrentAdminDto>("/auth/me");
    setAdmin(me);
  }

  async function logout() {
    await api.post("/auth/logout");
    setAdmin(null);
  }

  return <AuthContext.Provider value={{ admin, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 5: ProtectedRoute**

```typescript
// apps/web/src/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { admin, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-center">Chargement…</div>;
  if (!admin) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

- [ ] **Step 6: Write failing test for LoginPage**

```typescript
// apps/web/src/pages/LoginPage.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { AuthProvider } from "@/auth/AuthContext";
import * as apiModule from "@/lib/api";

vi.spyOn(apiModule.api, "get").mockRejectedValue(new Error("not logged in"));

describe("LoginPage", () => {
  it("calls login with entered credentials on submit", async () => {
    const loginSpy = vi.spyOn(apiModule.api, "post").mockResolvedValue({ email: "a@b.com" });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith("/auth/login", { email: "a@b.com", password: "secret123" });
    });
  });
});
```

- [ ] **Step 7: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/web test -- run LoginPage`
Expected: FAIL — `./LoginPage` not found.

- [ ] **Step 8: Implement LoginPage**

```typescript
// apps/web/src/pages/LoginPage.tsx
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import { googleLoginUrl } from "@/lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
      navigate("/admin");
    } catch {
      setError("Email ou mot de passe incorrect.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 border rounded-lg">
        <h1 className="text-xl font-semibold">Connexion organisateurs</h1>
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full">Se connecter</Button>
        <a href={googleLoginUrl} className="block text-center text-sm underline">
          Se connecter avec Google
        </a>
      </form>
    </div>
  );
}
```

- [ ] **Step 9: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/web test -- run LoginPage`
Expected: PASS.

- [ ] **Step 10: Wire routing in App.tsx and main.tsx**

```typescript
// apps/web/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

```typescript
// apps/web/src/App.tsx
import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<div className="p-8">Dashboard (à venir)</div>} />
      </Route>
    </Routes>
  );
}

export default App;
```

Update `apps/web/src/App.test.tsx` to wrap `<App />` in `<MemoryRouter>` and `<AuthProvider>` (mock `api.get` to reject, same pattern as Step 6), asserting the login form renders at `/login` instead of the old "Notre mariage" placeholder text.

- [ ] **Step 11: Add VITE_API_URL to .env.example**

```
# apps/web/.env.example
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 12: Run full frontend test suite**

Run: `pnpm --filter @invitation-app/web test -- run`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add apps/web
git commit -m "feat: add admin auth context, API client, and login page"
```

---

## Task 14: Public invitation page — read endpoint + RSVP form

**Files:**
- Create: `apps/api/src/invitation/invitation.module.ts`
- Create: `apps/api/src/invitation/invitation.service.ts`
- Create: `apps/api/src/invitation/invitation.controller.ts`
- Create: `apps/api/src/invitation/dto/submit-rsvp.dto.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/invitation/invitation.service.spec.ts`
- Create: `apps/web/src/pages/InvitationPage.tsx`
- Create: `apps/web/src/components/RsvpForm.tsx`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/components/RsvpForm.test.tsx`

**Interfaces:**
- Consumes: `PrismaService` (Task 8).
- Produces: `GET /invitation/:linkId` → `InvitationResponseDto` (with `seatingPlan: null` until Task 18 adds table lookups); `PATCH /invitation/:linkId/rsvp` → updated `HouseholdPublicDto`, `403` past deadline, `400` if `confirmedCount > allocatedSeats`.

- [ ] **Step 1: Write submit-rsvp DTO**

```typescript
// apps/api/src/invitation/dto/submit-rsvp.dto.ts
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class SubmitRsvpDto {
  @IsIn(["CONFIRMED", "DECLINED"])
  status!: "CONFIRMED" | "DECLINED";

  @IsOptional() @IsInt() @Min(0) confirmedCount?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) memberNames?: string[];
  @IsOptional() @IsString() dietaryNotes?: string;
  @IsOptional() @IsString() message?: string;
}
```

- [ ] **Step 2: Write failing unit tests for InvitationService**

```typescript
// apps/api/src/invitation/invitation.service.spec.ts
import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { InvitationService } from "./invitation.service";
import { PrismaService } from "../prisma/prisma.service";

describe("InvitationService.submitRsvp", () => {
  let service: InvitationService;
  let prisma: {
    household: { findUnique: jest.Mock; update: jest.Mock };
    weddingSettings: { findUniqueOrThrow: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      household: { findUnique: jest.fn(), update: jest.fn() },
      weddingSettings: { findUniqueOrThrow: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [InvitationService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(InvitationService);
  });

  it("throws NotFoundException for an unknown linkId", async () => {
    prisma.household.findUnique.mockResolvedValue(null);
    await expect(service.submitRsvp("unknown", { status: "CONFIRMED", confirmedCount: 1 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it("throws ForbiddenException after the RSVP deadline", async () => {
    prisma.household.findUnique.mockResolvedValue({ id: "h1", allocatedSeats: 4 });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({ rsvpDeadline: new Date("2020-01-01") });
    await expect(service.submitRsvp("h1", { status: "CONFIRMED", confirmedCount: 2 })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("throws BadRequestException when confirmedCount exceeds allocatedSeats", async () => {
    prisma.household.findUnique.mockResolvedValue({ id: "h1", allocatedSeats: 2 });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({ rsvpDeadline: new Date("2999-01-01") });
    await expect(service.submitRsvp("h1", { status: "CONFIRMED", confirmedCount: 5 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("sets confirmedCount to 0 when declining", async () => {
    prisma.household.findUnique.mockResolvedValue({ id: "h1", allocatedSeats: 2 });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({ rsvpDeadline: new Date("2999-01-01") });
    prisma.household.update.mockResolvedValue({ id: "h1", status: "DECLINED", confirmedCount: 0 });
    await service.submitRsvp("h1", { status: "DECLINED" });
    expect(prisma.household.update).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: expect.objectContaining({ status: "DECLINED", confirmedCount: 0 }),
    });
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `pnpm --filter @invitation-app/api test -- invitation.service`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement InvitationService**

```typescript
// apps/api/src/invitation/invitation.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubmitRsvpDto } from "./dto/submit-rsvp.dto";

@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService) {}

  async getInvitation(linkId: string) {
    const household = await this.prisma.household.findUnique({ where: { id: linkId } });
    if (!household) throw new NotFoundException("Invitation not found");

    const wedding = await this.prisma.weddingSettings.findUniqueOrThrow({ where: { id: "singleton" } });

    let seatingPlan = null;
    if (wedding.seatingPlanActivated && household.tableId) {
      const table = await this.prisma.table.findUnique({
        where: { id: household.tableId },
        include: { households: true },
      });
      if (table) {
        seatingPlan = {
          tableName: table.name,
          neighbors: table.households
            .filter((h) => h.id !== household.id)
            .map((h) => ({ displayName: h.displayName, confirmedCount: h.confirmedCount ?? 0 })),
        };
      }
    }

    return { household, wedding, seatingPlan };
  }

  async submitRsvp(linkId: string, dto: SubmitRsvpDto) {
    const household = await this.prisma.household.findUnique({ where: { id: linkId } });
    if (!household) throw new NotFoundException("Invitation not found");

    const wedding = await this.prisma.weddingSettings.findUniqueOrThrow({ where: { id: "singleton" } });
    if (new Date() > wedding.rsvpDeadline) {
      throw new ForbiddenException("RSVP deadline has passed");
    }

    if (dto.status === "CONFIRMED") {
      if (dto.confirmedCount === undefined || dto.confirmedCount < 1) {
        throw new BadRequestException("confirmedCount must be at least 1 when confirming");
      }
      if (dto.confirmedCount > household.allocatedSeats) {
        throw new BadRequestException("confirmedCount cannot exceed allocatedSeats");
      }
    }

    return this.prisma.household.update({
      where: { id: linkId },
      data: {
        status: dto.status,
        confirmedCount: dto.status === "DECLINED" ? 0 : dto.confirmedCount,
        memberNames: dto.memberNames ?? household.memberNames,
        dietaryNotes: dto.dietaryNotes,
        message: dto.message,
      },
    });
  }
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm --filter @invitation-app/api test -- invitation.service`
Expected: PASS.

- [ ] **Step 6: Implement controller and module**

```typescript
// apps/api/src/invitation/invitation.controller.ts
import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { InvitationService } from "./invitation.service";
import { SubmitRsvpDto } from "./dto/submit-rsvp.dto";

@Controller("invitation")
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get(":linkId")
  get(@Param("linkId") linkId: string) {
    return this.invitationService.getInvitation(linkId);
  }

  @Patch(":linkId/rsvp")
  submitRsvp(@Param("linkId") linkId: string, @Body() dto: SubmitRsvpDto) {
    return this.invitationService.submitRsvp(linkId, dto);
  }
}
```

```typescript
// apps/api/src/invitation/invitation.module.ts
import { Module } from "@nestjs/common";
import { InvitationController } from "./invitation.controller";
import { InvitationService } from "./invitation.service";

@Module({
  controllers: [InvitationController],
  providers: [InvitationService],
})
export class InvitationModule {}
```

Add `InvitationModule` to `apps/api/src/app.module.ts`.

- [ ] **Step 7: Commit backend**

```bash
git add apps/api/src/invitation apps/api/src/app.module.ts
git commit -m "feat: add public invitation lookup and RSVP submission endpoints"
```

- [ ] **Step 8: Write failing test for RsvpForm**

```typescript
// apps/web/src/components/RsvpForm.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RsvpForm } from "./RsvpForm";

describe("RsvpForm", () => {
  it("caps the confirmed guest count at allocatedSeats", () => {
    const onSubmit = vi.fn();
    render(<RsvpForm allocatedSeats={2} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/nombre de personnes/i) as HTMLInputElement;
    expect(input.max).toBe("2");
  });

  it("submits DECLINED status when clicking the decline button", () => {
    const onSubmit = vi.fn();
    render(<RsvpForm allocatedSeats={2} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /je ne viendrai pas/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: "DECLINED" }));
  });
});
```

- [ ] **Step 9: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/web test -- run RsvpForm`
Expected: FAIL — `./RsvpForm` not found.

- [ ] **Step 10: Implement RsvpForm**

```typescript
// apps/web/src/components/RsvpForm.tsx
import { FormEvent, useState } from "react";
import type { SubmitRsvpDto } from "@invitation-app/shared";
import { Button } from "@/components/ui/button";

interface RsvpFormProps {
  allocatedSeats: number;
  defaultConfirmedCount?: number;
  defaultDietaryNotes?: string;
  onSubmit: (dto: SubmitRsvpDto) => void;
}

export function RsvpForm({ allocatedSeats, defaultConfirmedCount, defaultDietaryNotes, onSubmit }: RsvpFormProps) {
  const [confirmedCount, setConfirmedCount] = useState(defaultConfirmedCount ?? allocatedSeats);
  const [dietaryNotes, setDietaryNotes] = useState(defaultDietaryNotes ?? "");

  function handleConfirm(e: FormEvent) {
    e.preventDefault();
    onSubmit({ status: "CONFIRMED", confirmedCount, dietaryNotes });
  }

  function handleDecline() {
    onSubmit({ status: "DECLINED" });
  }

  return (
    <form onSubmit={handleConfirm} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="confirmedCount" className="text-sm font-medium">Nombre de personnes présentes</label>
        <input
          id="confirmedCount"
          type="number"
          min={1}
          max={allocatedSeats}
          value={confirmedCount}
          onChange={(e) => setConfirmedCount(Number(e.target.value))}
          className="w-full border rounded-md px-3 py-2"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="dietaryNotes" className="text-sm font-medium">Régime alimentaire / allergies</label>
        <textarea
          id="dietaryNotes"
          value={dietaryNotes}
          onChange={(e) => setDietaryNotes(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Je viens</Button>
        <Button type="button" variant="outline" onClick={handleDecline}>Je ne viendrai pas</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 11: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/web test -- run RsvpForm`
Expected: PASS.

- [ ] **Step 12: Implement InvitationPage and wire route**

```typescript
// apps/web/src/pages/InvitationPage.tsx
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InvitationResponseDto, SubmitRsvpDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { RsvpForm } from "@/components/RsvpForm";

export function InvitationPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["invitation", linkId],
    queryFn: () => api.get<InvitationResponseDto>(`/invitation/${linkId}`),
    enabled: !!linkId,
  });

  const rsvpMutation = useMutation({
    mutationFn: (dto: SubmitRsvpDto) => api.patch(`/invitation/${linkId}/rsvp`, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitation", linkId] }),
  });

  if (isLoading) return <div className="p-8 text-center">Chargement…</div>;
  if (error || !data) return <div className="p-8 text-center">Invitation introuvable.</div>;

  const { household, wedding } = data;

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Bonjour {household.displayName} !</h1>
      <p>
        {new Date(wedding.weddingDate).toLocaleDateString("fr-FR", { dateStyle: "long" })} — {wedding.venueName}
      </p>
      <p className="text-sm text-neutral-600">{wedding.address}</p>
      {household.status !== "PENDING" && (
        <p className="text-sm">Statut actuel : {household.status === "CONFIRMED" ? "Confirmé" : "Décliné"}</p>
      )}
      <RsvpForm
        allocatedSeats={household.allocatedSeats}
        defaultConfirmedCount={household.confirmedCount ?? household.allocatedSeats}
        defaultDietaryNotes={household.dietaryNotes ?? ""}
        onSubmit={(dto) => rsvpMutation.mutate(dto)}
      />
    </div>
  );
}
```

Add to `apps/web/src/App.tsx`: `<Route path="/i/:linkId" element={<InvitationPage />} />`.

- [ ] **Step 13: Commit frontend**

```bash
git add apps/web
git commit -m "feat: add public invitation page with RSVP form"
```

---

## Task 15: Admin dashboard — stats endpoint + page

**Files:**
- Create: `apps/api/src/dashboard/dashboard.module.ts`
- Create: `apps/api/src/dashboard/dashboard.service.ts`
- Create: `apps/api/src/dashboard/dashboard.controller.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/dashboard/dashboard.service.spec.ts`
- Create: `apps/web/src/pages/admin/DashboardPage.tsx`
- Create: `apps/web/src/components/StatusBadge.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `PrismaService`, `JwtAuthGuard`, `HouseholdsService.findAll` (Task 12) via a dedicated Prisma `groupBy` in `DashboardService`.
- Produces: `GET /admin/dashboard` → `DashboardStatsDto`; `StatusBadge` component reused by Task 17's tables board.

- [ ] **Step 1: Write failing unit test for DashboardService**

```typescript
// apps/api/src/dashboard/dashboard.service.spec.ts
import { Test } from "@nestjs/testing";
import { DashboardService } from "./dashboard.service";
import { PrismaService } from "../prisma/prisma.service";

describe("DashboardService.getStats", () => {
  it("aggregates households by status", async () => {
    const prisma = {
      household: {
        groupBy: jest.fn().mockResolvedValue([
          { status: "CONFIRMED", _count: { _all: 3 } },
          { status: "DECLINED", _count: { _all: 1 } },
          { status: "PENDING", _count: { _all: 2 } },
        ]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { confirmedCount: 7 } }),
        count: jest.fn().mockResolvedValue(2),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = moduleRef.get(DashboardService);

    const stats = await service.getStats();

    expect(stats).toEqual({
      totalHouseholds: 6,
      confirmedHouseholds: 3,
      declinedHouseholds: 1,
      pendingHouseholds: 2,
      totalConfirmedGuests: 7,
      dietaryNotesCount: 2,
    });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/api test -- dashboard.service`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement DashboardService**

```typescript
// apps/api/src/dashboard/dashboard.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DashboardStatsDto } from "@invitation-app/shared";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStatsDto> {
    const grouped = await this.prisma.household.groupBy({ by: ["status"], _count: { _all: true } });
    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));

    const { _sum } = await this.prisma.household.aggregate({ _sum: { confirmedCount: true } });
    const dietaryNotesCount = await this.prisma.household.count({
      where: { dietaryNotes: { not: null } },
    });

    const confirmedHouseholds = byStatus.CONFIRMED ?? 0;
    const declinedHouseholds = byStatus.DECLINED ?? 0;
    const pendingHouseholds = byStatus.PENDING ?? 0;

    return {
      totalHouseholds: confirmedHouseholds + declinedHouseholds + pendingHouseholds,
      confirmedHouseholds,
      declinedHouseholds,
      pendingHouseholds,
      totalConfirmedGuests: _sum.confirmedCount ?? 0,
      dietaryNotesCount,
    };
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/api test -- dashboard.service`
Expected: PASS.

- [ ] **Step 5: Implement controller and module**

```typescript
// apps/api/src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DashboardService } from "./dashboard.service";

@UseGuards(JwtAuthGuard)
@Controller("admin/dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getStats() {
    return this.dashboardService.getStats();
  }
}
```

```typescript
// apps/api/src/dashboard/dashboard.module.ts
import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

Add `DashboardModule` to `apps/api/src/app.module.ts`.

- [ ] **Step 6: Commit backend**

```bash
git add apps/api/src/dashboard apps/api/src/app.module.ts
git commit -m "feat: add admin dashboard stats endpoint"
```

- [ ] **Step 7: StatusBadge component**

```typescript
// apps/web/src/components/StatusBadge.tsx
import type { RsvpStatus } from "@invitation-app/shared";
import { cn } from "@/lib/utils";

const STYLES: Record<RsvpStatus, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
  PENDING: "bg-amber-100 text-amber-800",
};

const LABELS: Record<RsvpStatus, string> = {
  CONFIRMED: "Confirmé",
  DECLINED: "Décliné",
  PENDING: "En attente",
};

export function StatusBadge({ status }: { status: RsvpStatus }) {
  return (
    <span className={cn("inline-block px-2 py-1 rounded-full text-xs font-medium", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 8: DashboardPage**

```typescript
// apps/web/src/pages/admin/DashboardPage.tsx
import { useQuery } from "@tanstack/react-query";
import type { DashboardStatsDto, HouseholdAdminDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

export function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStatsDto>("/admin/dashboard"),
  });
  const { data: households } = useQuery({
    queryKey: ["households"],
    queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Foyers confirmés" value={stats.confirmedHouseholds} />
          <StatCard label="Foyers déclinés" value={stats.declinedHouseholds} />
          <StatCard label="En attente" value={stats.pendingHouseholds} />
          <StatCard label="Invités confirmés" value={stats.totalConfirmedGuests} />
        </div>
      )}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Foyer</th>
            <th>Places</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {households?.map((h) => (
            <tr key={h.id} className="border-b">
              <td className="py-2">{h.displayName}</td>
              <td>{h.confirmedCount ?? "—"} / {h.allocatedSeats}</td>
              <td><StatusBadge status={h.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
```

Replace the placeholder `/admin` route in `apps/web/src/App.tsx` with `<Route path="/admin" element={<DashboardPage />} />` (nested under `ProtectedRoute`).

- [ ] **Step 9: Commit frontend**

```bash
git add apps/web
git commit -m "feat: add admin dashboard page with stats and household status table"
```

---

## Task 16: Households admin UI — list + create/edit form

**Files:**
- Create: `apps/web/src/pages/admin/HouseholdsPage.tsx`
- Create: `apps/web/src/components/HouseholdFormDialog.tsx`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/components/HouseholdFormDialog.test.tsx`

**Interfaces:**
- Consumes: `GET/POST/PATCH/DELETE /admin/households` (Task 12).
- Produces: `HouseholdFormDialog` used for both create and edit; generated invitation link shown as `${window.location.origin}/i/${household.id}`.

- [ ] **Step 1: Write failing test for HouseholdFormDialog**

```typescript
// apps/web/src/components/HouseholdFormDialog.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HouseholdFormDialog } from "./HouseholdFormDialog";

describe("HouseholdFormDialog", () => {
  it("submits displayName and allocatedSeats", () => {
    const onSubmit = vi.fn();
    render(<HouseholdFormDialog onSubmit={onSubmit} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(/nom du foyer/i), { target: { value: "Famille Rakoto" } });
    fireEvent.change(screen.getByLabelText(/nombre de places/i), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(onSubmit).toHaveBeenCalledWith({ displayName: "Famille Rakoto", allocatedSeats: 4 });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/web test -- run HouseholdFormDialog`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement HouseholdFormDialog**

```typescript
// apps/web/src/components/HouseholdFormDialog.tsx
import { FormEvent, useState } from "react";
import type { CreateHouseholdDto, HouseholdAdminDto } from "@invitation-app/shared";
import { Button } from "@/components/ui/button";

interface HouseholdFormDialogProps {
  initial?: HouseholdAdminDto;
  onSubmit: (dto: CreateHouseholdDto) => void;
  onClose: () => void;
}

export function HouseholdFormDialog({ initial, onSubmit, onClose }: HouseholdFormDialogProps) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [allocatedSeats, setAllocatedSeats] = useState(initial?.allocatedSeats ?? 1);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ displayName, allocatedSeats });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold">{initial ? "Modifier le foyer" : "Nouveau foyer"}</h2>
        <div className="space-y-1">
          <label htmlFor="displayName" className="text-sm font-medium">Nom du foyer</label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="allocatedSeats" className="text-sm font-medium">Nombre de places</label>
          <input
            id="allocatedSeats"
            type="number"
            min={1}
            value={allocatedSeats}
            onChange={(e) => setAllocatedSeats(Number(e.target.value))}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/web test -- run HouseholdFormDialog`
Expected: PASS.

- [ ] **Step 5: Implement HouseholdsPage**

```typescript
// apps/web/src/pages/admin/HouseholdsPage.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateHouseholdDto, HouseholdAdminDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { HouseholdFormDialog } from "@/components/HouseholdFormDialog";

export function HouseholdsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const { data: households } = useQuery({
    queryKey: ["households"],
    queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateHouseholdDto) => api.post("/admin/households", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/households/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["households"] }),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Foyers invités</h1>
        <Button onClick={() => setDialogOpen(true)}>Ajouter un foyer</Button>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Foyer</th>
            <th>Places</th>
            <th>Statut</th>
            <th>Lien</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {households?.map((h) => (
            <tr key={h.id} className="border-b">
              <td className="py-2">{h.displayName}</td>
              <td>{h.allocatedSeats}</td>
              <td><StatusBadge status={h.status} /></td>
              <td>
                <code className="text-xs">{`${window.location.origin}/i/${h.id}`}</code>
              </td>
              <td>
                <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(h.id)}>
                  Supprimer
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isDialogOpen && (
        <HouseholdFormDialog
          onSubmit={(dto) => createMutation.mutate(dto)}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Wire route**

Add to `apps/web/src/App.tsx` under `ProtectedRoute`: `<Route path="/admin/households" element={<HouseholdsPage />} />`.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat: add admin households list page with create/delete"
```

---

## Task 17: Tables — admin CRUD + capacity-checked assignment

**Files:**
- Create: `apps/api/src/tables/tables.module.ts`
- Create: `apps/api/src/tables/tables.service.ts`
- Create: `apps/api/src/tables/tables.controller.ts`
- Create: `apps/api/src/tables/dto/create-table.dto.ts`
- Create: `apps/api/src/tables/dto/update-table.dto.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/tables/tables.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `TablesService.assignHousehold(tableId, householdId)` throwing `ConflictException` (409) on overflow; `TablesService.unassignHousehold(householdId)`; `GET/POST/PATCH/DELETE /admin/tables`, `PATCH /admin/tables/:tableId/assign/:householdId`, `PATCH /admin/tables/unassign/:householdId`.

- [ ] **Step 1: Write DTOs**

```typescript
// apps/api/src/tables/dto/create-table.dto.ts
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateTableDto {
  @IsString() name!: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
}
```

```typescript
// apps/api/src/tables/dto/update-table.dto.ts
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateTableDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
}
```

- [ ] **Step 2: Write failing unit tests for capacity enforcement**

```typescript
// apps/api/src/tables/tables.service.spec.ts
import { Test } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { TablesService } from "./tables.service";
import { PrismaService } from "../prisma/prisma.service";

describe("TablesService.assignHousehold", () => {
  let service: TablesService;
  let prisma: {
    table: { findUnique: jest.Mock };
    household: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      table: { findUnique: jest.fn() },
      household: { findUnique: jest.fn(), update: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [TablesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TablesService);
  });

  it("throws NotFoundException for an unknown table", async () => {
    prisma.table.findUnique.mockResolvedValue(null);
    await expect(service.assignHousehold("t1", "h1")).rejects.toThrow(NotFoundException);
  });

  it("throws ConflictException when the household would overflow capacity", async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: "t1",
      capacity: 10,
      households: [{ id: "existing", confirmedCount: 8, allocatedSeats: 8 }],
    });
    prisma.household.findUnique.mockResolvedValue({ id: "h2", confirmedCount: 4, allocatedSeats: 4, tableId: null });

    await expect(service.assignHousehold("t1", "h2")).rejects.toThrow(ConflictException);
  });

  it("assigns the household when capacity allows it", async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: "t1",
      capacity: 10,
      households: [{ id: "existing", confirmedCount: 4, allocatedSeats: 4 }],
    });
    prisma.household.findUnique.mockResolvedValue({ id: "h2", confirmedCount: 3, allocatedSeats: 3, tableId: null });
    prisma.household.update.mockResolvedValue({ id: "h2", tableId: "t1" });

    await service.assignHousehold("t1", "h2");
    expect(prisma.household.update).toHaveBeenCalledWith({ where: { id: "h2" }, data: { tableId: "t1" } });
  });

  it("excludes the household's own current seats when re-assigning to the same table", async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: "t1",
      capacity: 10,
      households: [{ id: "h2", confirmedCount: 10, allocatedSeats: 10 }],
    });
    prisma.household.findUnique.mockResolvedValue({ id: "h2", confirmedCount: 10, allocatedSeats: 10, tableId: "t1" });
    prisma.household.update.mockResolvedValue({ id: "h2", tableId: "t1" });

    await expect(service.assignHousehold("t1", "h2")).resolves.not.toThrow();
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `pnpm --filter @invitation-app/api test -- tables.service`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement TablesService**

```typescript
// apps/api/src/tables/tables.service.ts
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTableDto } from "./dto/create-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTableDto) {
    return this.prisma.table.create({ data: { name: dto.name, capacity: dto.capacity ?? 10 } });
  }

  findAll() {
    return this.prisma.table.findMany({ include: { households: true }, orderBy: { name: "asc" } });
  }

  async findOne(id: string) {
    const table = await this.prisma.table.findUnique({ where: { id }, include: { households: true } });
    if (!table) throw new NotFoundException("Table not found");
    return table;
  }

  async update(id: string, dto: UpdateTableDto) {
    await this.findOne(id);
    return this.prisma.table.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.table.delete({ where: { id } });
    return { success: true };
  }

  async assignHousehold(tableId: string, householdId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId }, include: { households: true } });
    if (!table) throw new NotFoundException("Table not found");

    const household = await this.prisma.household.findUnique({ where: { id: householdId } });
    if (!household) throw new NotFoundException("Household not found");

    const occupied = table.households
      .filter((h) => h.id !== householdId)
      .reduce((sum, h) => sum + (h.confirmedCount ?? h.allocatedSeats), 0);
    const incoming = household.confirmedCount ?? household.allocatedSeats;

    if (occupied + incoming > table.capacity) {
      throw new ConflictException(
        `Table "${table.name}" only has ${table.capacity - occupied} seat(s) left, this household needs ${incoming}`,
      );
    }

    return this.prisma.household.update({ where: { id: householdId }, data: { tableId } });
  }

  unassignHousehold(householdId: string) {
    return this.prisma.household.update({ where: { id: householdId }, data: { tableId: null } });
  }
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm --filter @invitation-app/api test -- tables.service`
Expected: PASS.

- [ ] **Step 6: Implement controller and module**

```typescript
// apps/api/src/tables/tables.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TablesService } from "./tables.service";
import { CreateTableDto } from "./dto/create-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";

@UseGuards(JwtAuthGuard)
@Controller("admin/tables")
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.create(dto);
  }

  @Get()
  findAll() {
    return this.tablesService.findAll();
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.tablesService.remove(id);
  }

  @Patch(":tableId/assign/:householdId")
  assign(@Param("tableId") tableId: string, @Param("householdId") householdId: string) {
    return this.tablesService.assignHousehold(tableId, householdId);
  }

  @Patch("unassign/:householdId")
  unassign(@Param("householdId") householdId: string) {
    return this.tablesService.unassignHousehold(householdId);
  }
}
```

```typescript
// apps/api/src/tables/tables.module.ts
import { Module } from "@nestjs/common";
import { TablesController } from "./tables.controller";
import { TablesService } from "./tables.service";

@Module({
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule {}
```

Add `TablesModule` to `apps/api/src/app.module.ts`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/tables apps/api/src/app.module.ts
git commit -m "feat: add tables CRUD and capacity-checked household assignment"
```

---

## Task 18: Tables admin UI — configuration + drag-and-drop placement

**Files:**
- Create: `apps/web/src/pages/admin/TablesPage.tsx`
- Create: `apps/web/src/components/TableBoard.tsx`
- Create: `apps/web/src/components/HouseholdChip.tsx`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/components/TableBoard.test.tsx`

**Interfaces:**
- Consumes: `GET /admin/tables`, `GET /admin/households`, `PATCH /admin/tables/:tableId/assign/:householdId`, `PATCH /admin/tables/unassign/:householdId` (Task 17).
- Produces: `TableBoard` renders an "unassigned" pool plus one droppable zone per table; drag-end triggers assign/unassign mutations and surfaces the API's 409 message as an inline alert.

- [ ] **Step 1: Install dnd-kit**

```bash
pnpm --filter @invitation-app/web add @dnd-kit/core
```

- [ ] **Step 2: Write failing test for TableBoard capacity display**

```typescript
// apps/web/src/components/TableBoard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TableDto } from "@invitation-app/shared";
import { TableBoard } from "./TableBoard";

const tables: TableDto[] = [
  {
    id: "t1",
    name: "Table 1",
    capacity: 10,
    households: [
      { id: "h1", displayName: "Famille A", allocatedSeats: 4, confirmedCount: 4, status: "CONFIRMED" },
    ],
  },
];

describe("TableBoard", () => {
  it("shows remaining seats for each table", () => {
    render(<TableBoard tables={tables} unassignedHouseholds={[]} onAssign={() => {}} onUnassign={() => {}} />);
    expect(screen.getByText(/4 \/ 10/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/web test -- run TableBoard`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement HouseholdChip**

```typescript
// apps/web/src/components/HouseholdChip.tsx
import { useDraggable } from "@dnd-kit/core";
import type { TableHouseholdSummaryDto } from "@invitation-app/shared";

export function HouseholdChip({ household }: { household: TableHouseholdSummaryDto }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: household.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="px-3 py-1.5 bg-white border rounded-md shadow-sm text-sm cursor-grab"
    >
      {household.displayName} ({household.confirmedCount ?? household.allocatedSeats})
    </div>
  );
}
```

- [ ] **Step 5: Implement TableBoard**

```typescript
// apps/web/src/components/TableBoard.tsx
import { DndContext, DragEndEvent, useDroppable } from "@dnd-kit/core";
import type { TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import { HouseholdChip } from "./HouseholdChip";

interface TableBoardProps {
  tables: TableDto[];
  unassignedHouseholds: TableHouseholdSummaryDto[];
  onAssign: (tableId: string, householdId: string) => void;
  onUnassign: (householdId: string) => void;
}

function DroppableZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`min-h-24 border-2 border-dashed rounded-lg p-3 ${isOver ? "border-neutral-900" : "border-neutral-300"}`}>
      {children}
    </div>
  );
}

function seatsUsed(households: TableHouseholdSummaryDto[]) {
  return households.reduce((sum, h) => sum + (h.confirmedCount ?? h.allocatedSeats), 0);
}

export function TableBoard({ tables, unassignedHouseholds, onAssign, onUnassign }: TableBoardProps) {
  function handleDragEnd(event: DragEndEvent) {
    const householdId = String(event.active.id);
    const targetId = event.over?.id ? String(event.over.id) : null;
    if (!targetId || targetId === "unassigned") {
      onUnassign(householdId);
    } else {
      onAssign(targetId, householdId);
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <h2 className="font-medium mb-2">Non assignés</h2>
          <DroppableZone id="unassigned">
            <div className="flex flex-col gap-2">
              {unassignedHouseholds.map((h) => (
                <HouseholdChip key={h.id} household={h} />
              ))}
            </div>
          </DroppableZone>
        </div>
        {tables.map((table) => {
          const used = seatsUsed(table.households);
          const over = used > table.capacity;
          return (
            <div key={table.id}>
              <h2 className={`font-medium mb-2 ${over ? "text-red-600" : ""}`}>
                {table.name} — {used} / {table.capacity}
                {over && " ⚠ dépassement"}
              </h2>
              <DroppableZone id={table.id}>
                <div className="flex flex-col gap-2">
                  {table.households.map((h) => (
                    <HouseholdChip key={h.id} household={h} />
                  ))}
                </div>
              </DroppableZone>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/web test -- run TableBoard`
Expected: PASS.

- [ ] **Step 7: Implement TablesPage**

```typescript
// apps/web/src/pages/admin/TablesPage.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTableDto, HouseholdAdminDto, TableDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { TableBoard } from "@/components/TableBoard";

export function TablesPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState("");

  const { data: tables } = useQuery({
    queryKey: ["tables"],
    queryFn: () => api.get<TableDto[]>("/admin/tables"),
  });
  const { data: households } = useQuery({
    queryKey: ["households"],
    queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
  });

  const createTable = useMutation({
    mutationFn: (dto: CreateTableDto) => api.post("/admin/tables", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setNewTableName("");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ tableId, householdId }: { tableId: string; householdId: string }) =>
      api.patch(`/admin/tables/${tableId}/assign/${householdId}`),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const unassignMutation = useMutation({
    mutationFn: (householdId: string) => api.patch(`/admin/tables/unassign/${householdId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });

  const assignedIds = new Set(tables?.flatMap((t) => t.households.map((h) => h.id)) ?? []);
  const unassignedHouseholds = (households ?? []).filter((h) => !assignedIds.has(h.id));

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Plan de table</h1>
      <div className="flex gap-2">
        <input
          value={newTableName}
          onChange={(e) => setNewTableName(e.target.value)}
          placeholder="Nom de la table"
          className="border rounded-md px-3 py-2"
        />
        <Button onClick={() => createTable.mutate({ name: newTableName })} disabled={!newTableName}>
          Ajouter une table
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <TableBoard
        tables={tables ?? []}
        unassignedHouseholds={unassignedHouseholds}
        onAssign={(tableId, householdId) => assignMutation.mutate({ tableId, householdId })}
        onUnassign={(householdId) => unassignMutation.mutate(householdId)}
      />
    </div>
  );
}
```

- [ ] **Step 8: Wire route**

Add to `apps/web/src/App.tsx` under `ProtectedRoute`: `<Route path="/admin/tables" element={<TablesPage />} />`.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat: add table configuration and drag-and-drop seating board"
```

---

## Task 19: Wedding settings — admin endpoint + page + seating plan activation

**Files:**
- Create: `apps/api/src/settings/settings.module.ts`
- Create: `apps/api/src/settings/settings.service.ts`
- Create: `apps/api/src/settings/settings.controller.ts`
- Create: `apps/api/src/settings/dto/update-settings.dto.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/settings/settings.service.spec.ts`
- Create: `apps/web/src/pages/admin/SettingsPage.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `GET /admin/settings` and `PATCH /admin/settings` (behind `JwtAuthGuard`) → `AdminSettingsDto`; toggling `seatingPlanActivated` here is what Task 14's `InvitationService.getInvitation` reads.

- [ ] **Step 1: Write DTO**

```typescript
// apps/api/src/settings/dto/update-settings.dto.ts
import { IsBoolean, IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateSettingsDto {
  @IsOptional() @IsDateString() weddingDate?: string;
  @IsOptional() @IsString() venueName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() mapUrl?: string;
  @IsOptional() @IsString() dressCode?: string;
  @IsOptional() @IsString() parkingInfo?: string;
  @IsOptional() @IsDateString() rsvpDeadline?: string;
  @IsOptional() @IsBoolean() seatingPlanActivated?: boolean;
}
```

- [ ] **Step 2: Write failing unit test for SettingsService**

```typescript
// apps/api/src/settings/settings.service.spec.ts
import { Test } from "@nestjs/testing";
import { SettingsService } from "./settings.service";
import { PrismaService } from "../prisma/prisma.service";

describe("SettingsService", () => {
  it("upserts the singleton settings row on update", async () => {
    const prisma = { weddingSettings: { upsert: jest.fn().mockResolvedValue({ id: "singleton", seatingPlanActivated: true }) } };
    const moduleRef = await Test.createTestingModule({
      providers: [SettingsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = moduleRef.get(SettingsService);

    await service.update({ seatingPlanActivated: true });

    expect(prisma.weddingSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "singleton" } }),
    );
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/api test -- settings.service`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement SettingsService**

```typescript
// apps/api/src/settings/settings.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.weddingSettings.findUniqueOrThrow({ where: { id: "singleton" } });
  }

  update(dto: UpdateSettingsDto) {
    const data = {
      ...dto,
      weddingDate: dto.weddingDate ? new Date(dto.weddingDate) : undefined,
      rsvpDeadline: dto.rsvpDeadline ? new Date(dto.rsvpDeadline) : undefined,
    };
    return this.prisma.weddingSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data } as never,
    });
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/api test -- settings.service`
Expected: PASS.

- [ ] **Step 6: Implement controller and module**

```typescript
// apps/api/src/settings/settings.controller.ts
import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@UseGuards(JwtAuthGuard)
@Controller("admin/settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.get();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}
```

```typescript
// apps/api/src/settings/settings.module.ts
import { Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
```

Add `SettingsModule` to `apps/api/src/app.module.ts`.

- [ ] **Step 7: Commit backend**

```bash
git add apps/api/src/settings apps/api/src/app.module.ts
git commit -m "feat: add wedding settings endpoint with seating plan activation toggle"
```

- [ ] **Step 8: Implement SettingsPage**

```typescript
// apps/web/src/pages/admin/SettingsPage.tsx
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminSettingsDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<AdminSettingsDto>("/admin/settings"),
  });
  const [form, setForm] = useState<AdminSettingsDto | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (dto: Partial<AdminSettingsDto>) => api.patch("/admin/settings", dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  if (!form) return <div className="p-8">Chargement…</div>;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form) updateMutation.mutate(form);
  }

  return (
    <div className="p-8 max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Paramètres du mariage</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Lieu" value={form.venueName} onChange={(v) => setForm({ ...form, venueName: v })} />
        <Field label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <Button type="submit">Enregistrer</Button>
      </form>
      <div className="border-t pt-4 flex items-center justify-between">
        <div>
          <p className="font-medium">Plan de table visible par les invités</p>
          <p className="text-sm text-neutral-500">Activation entièrement manuelle.</p>
        </div>
        <Button
          variant={form.seatingPlanActivated ? "destructive" : "default"}
          onClick={() => updateMutation.mutate({ seatingPlanActivated: !form.seatingPlanActivated })}
        >
          {form.seatingPlanActivated ? "Désactiver" : "Activer"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border rounded-md px-3 py-2" />
    </div>
  );
}
```

- [ ] **Step 9: Wire route**

Add to `apps/web/src/App.tsx` under `ProtectedRoute`: `<Route path="/admin/settings" element={<SettingsPage />} />`.

- [ ] **Step 10: Commit frontend**

```bash
git add apps/web
git commit -m "feat: add admin settings page with seating plan activation toggle"
```

---

## Task 20: Public seating plan display on the invitation page

**Files:**
- Modify: `apps/web/src/pages/InvitationPage.tsx`
- Create: `apps/web/src/components/SeatingPlanSection.tsx`
- Test: `apps/web/src/components/SeatingPlanSection.test.tsx`

**Interfaces:**
- Consumes: `InvitationResponseDto.seatingPlan` (already returned by Task 14's `GET /invitation/:linkId`, populated once tables exist from Task 17 onward).
- Produces: `SeatingPlanSection` — renders nothing when `seatingPlan` is `null`.

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/components/SeatingPlanSection.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeatingPlanSection } from "./SeatingPlanSection";

describe("SeatingPlanSection", () => {
  it("renders nothing when seatingPlan is null", () => {
    const { container } = render(<SeatingPlanSection seatingPlan={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the table name and neighbors when activated", () => {
    render(
      <SeatingPlanSection
        seatingPlan={{ tableName: "Table 3", neighbors: [{ displayName: "Famille B", confirmedCount: 2 }] }}
      />,
    );
    expect(screen.getByText(/table 3/i)).toBeInTheDocument();
    expect(screen.getByText(/famille b/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @invitation-app/web test -- run SeatingPlanSection`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement SeatingPlanSection**

```typescript
// apps/web/src/components/SeatingPlanSection.tsx
import type { SeatingPlanDto } from "@invitation-app/shared";

export function SeatingPlanSection({ seatingPlan }: { seatingPlan: SeatingPlanDto | null }) {
  if (!seatingPlan) return null;

  return (
    <div className="border-t pt-4 space-y-2">
      <h2 className="font-semibold">Votre table : {seatingPlan.tableName}</h2>
      {seatingPlan.neighbors.length > 0 && (
        <ul className="text-sm text-neutral-600 list-disc list-inside">
          {seatingPlan.neighbors.map((n) => (
            <li key={n.displayName}>{n.displayName} ({n.confirmedCount})</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm --filter @invitation-app/web test -- run SeatingPlanSection`
Expected: PASS.

- [ ] **Step 5: Wire into InvitationPage**

In `apps/web/src/pages/InvitationPage.tsx`, import `SeatingPlanSection` and render `<SeatingPlanSection seatingPlan={data.seatingPlan} />` after the `RsvpForm`.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat: display seating plan on the public invitation page once activated"
```

---

## Task 21: Deployment configuration

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/api/.dockerignore`
- Create: `apps/web/vercel.json`
- Modify: `apps/api/.env.example`, `apps/web/.env.example`

**Interfaces:**
- Produces: buildable Docker image for `apps/api` suitable for Railway/Render; Vercel SPA rewrite config for `apps/web`.

- [ ] **Step 1: Write Dockerfile for the API**

```dockerfile
# apps/api/Dockerfile
FROM node:20-slim AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @invitation-app/api exec prisma generate
RUN pnpm --filter @invitation-app/api build

FROM node:20-slim AS runtime
WORKDIR /app
RUN corepack enable
COPY --from=build /app ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @invitation-app/api exec prisma migrate deploy && node apps/api/dist/main.js"]
```

- [ ] **Step 2: Write .dockerignore**

```
# apps/api/.dockerignore
node_modules
dist
.env
```

- [ ] **Step 3: Write Vercel SPA rewrite config**

```json
// apps/web/vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 4: Document required production env vars**

Update `apps/api/.env.example` and `apps/web/.env.example` with a comment noting these must be set in Railway/Render and Vercel project settings respectively (`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_CALLBACK_URL`, `ALLOWED_ADMIN_EMAILS`, `FRONTEND_URL` for the API; `VITE_API_URL` for the web app).

- [ ] **Step 5: Verify the Docker image builds locally**

Run (from repo root): `docker build -f apps/api/Dockerfile -t invitation-app-api .`
Expected: build completes successfully.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Dockerfile apps/api/.dockerignore apps/web/vercel.json apps/api/.env.example apps/web/.env.example
git commit -m "chore: add deployment configuration for Railway/Render and Vercel"
```

---

## Self-Review Notes

- **Spec coverage:** V1 rows from cahier des charges §4.1/§4.2 are all covered — invitation page (Task 14), RSVP form + accompanists + diet (Task 14), practical info (Task 14), seating plan consultation (Task 20), households list + link generation (Task 12/16), response tracking + status colors (Task 15/16), table configuration (Task 17/18), drag-and-drop placement with capacity blocking (Task 17/18), pending-household inclusion (Task 17, no status filter on assignment), consistency alerts (Task 18, over-capacity banner; split-household is structurally impossible per the single-`tableId` model), manual seating activation (Task 19).
- **Explicitly deferred (V2/V3, out of scope for this plan):** CSV export, reminder/relance flow, seating plan PDF export, auto-seating suggestion, free-form guest message field beyond `message`/`dietaryNotes` already modeled, gift registry, multi-language.
- **Type consistency check:** `HouseholdPublicDto`/`HouseholdAdminDto`/`TableDto`/`TableHouseholdSummaryDto`/`DashboardStatsDto`/`AdminSettingsDto` (Task 2) are the only DTO shapes referenced by every later task — no divergent names introduced.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-19-invitation-app.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.
