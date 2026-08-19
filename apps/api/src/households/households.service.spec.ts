import { Test } from '@nestjs/testing';
import { HouseholdsService } from './households.service';
import { PrismaService } from '../prisma/prisma.service';

interface CreateArgs {
  data: {
    id: string;
    displayName: string;
    allocatedSeats: number;
    memberNames: string[];
  };
}

describe('HouseholdsService', () => {
  let service: HouseholdsService;
  let prisma: {
    household: {
      create: jest.Mock<Promise<CreateArgs['data']>, [CreateArgs]>;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      household: {
        create: jest.fn<Promise<CreateArgs['data']>, [CreateArgs]>(),
        findMany: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(HouseholdsService);
  });

  it('generates an 8-character id and creates the household', async () => {
    prisma.household.create.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: data.id }),
    );
    const result = await service.create({
      displayName: 'Famille Test',
      allocatedSeats: 3,
    });
    expect(result.id).toHaveLength(8);

    const [[{ data }]] = prisma.household.create.mock.calls;
    expect(data).toEqual(
      expect.objectContaining({
        displayName: 'Famille Test',
        allocatedSeats: 3,
        memberNames: [],
      }),
    );
  });
});
