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
