-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "allocatedSeats" INTEGER NOT NULL,
    "memberNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedCount" INTEGER,
    "dietaryNotes" TEXT,
    "message" TEXT,
    "tableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "weddingDate" TIMESTAMP(3) NOT NULL,
    "venueName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "mapUrl" TEXT,
    "dressCode" TEXT,
    "parkingInfo" TEXT,
    "rsvpDeadline" TIMESTAMP(3) NOT NULL,
    "seatingPlanActivated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WeddingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_googleId_key" ON "AdminUser"("googleId");

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
