import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { PrismaService } from '../prisma/prisma.service';

// Des lignes Prisma complètes, pas des bribes. Un mock partiel laisse passer
// un service qui oublie un champ du contrat — le champ manque dans la sortie
// comme il manquait dans le mock, et le test reste vert.
function householdRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'h1',
    displayName: 'Famille A',
    allocatedSeats: 4,
    memberNames: ['Anna', 'Bob'],
    status: 'CONFIRMED',
    confirmedCount: 2,
    dietaryNotes: null,
    message: null,
    tableId: null,
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-02T11:00:00.000Z'),
    ...overrides,
  };
}

function weddingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'singleton',
    weddingDate: new Date('2027-06-12T11:00:00.000Z'),
    venueName: 'Domaine des Roses',
    address: 'Lot II M 12, Antananarivo',
    mapUrl: null,
    dressCode: null,
    parkingInfo: null,
    rsvpDeadline: new Date('2027-05-01T00:00:00.000Z'),
    seatingPlanActivated: false,
    ...overrides,
  };
}

describe('InvitationService.getInvitation', () => {
  let service: InvitationService;
  let prisma: {
    household: { findUnique: jest.Mock };
    weddingSettings: { findUniqueOrThrow: jest.Mock };
    table: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      household: { findUnique: jest.fn() },
      weddingSettings: { findUniqueOrThrow: jest.fn() },
      table: { findUnique: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvitationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(InvitationService);
  });

  it('throws NotFoundException for an unknown linkId', async () => {
    prisma.household.findUnique.mockResolvedValue(null);
    await expect(service.getInvitation('unknown')).rejects.toThrow(
      NotFoundException,
    );
  });

  // The seating plan is revealed manually by the admin and never by date, so
  // an assigned table must stay invisible until the toggle is flipped.
  it('hides the seating plan while seatingPlanActivated is false, even for a seated household', async () => {
    prisma.household.findUnique.mockResolvedValue(
      householdRow({ tableId: 't1' }),
    );
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue(
      weddingRow({ seatingPlanActivated: false }),
    );

    const result = await service.getInvitation('h1');

    expect(result.seatingPlan).toBeNull();
    expect(prisma.table.findUnique).not.toHaveBeenCalled();
  });

  it('returns no seating plan for a household that has not been seated yet', async () => {
    prisma.household.findUnique.mockResolvedValue(
      householdRow({ tableId: null }),
    );
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue(
      weddingRow({ seatingPlanActivated: true }),
    );

    const result = await service.getInvitation('h1');

    expect(result.seatingPlan).toBeNull();
    expect(prisma.table.findUnique).not.toHaveBeenCalled();
  });

  it('returns the table name and neighbours, excluding the household itself', async () => {
    prisma.household.findUnique.mockResolvedValue(
      householdRow({ tableId: 't1' }),
    );
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue(
      weddingRow({ seatingPlanActivated: true }),
    );
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      name: "Table d'honneur",
      households: [
        householdRow({ id: 'h1', tableId: 't1' }),
        householdRow({
          id: 'h2',
          displayName: 'Famille B',
          confirmedCount: 3,
          tableId: 't1',
        }),
      ],
    });

    const result = await service.getInvitation('h1');

    // `toEqual` sur l'objet entier, et pas un `objectContaining` : l'`id` d'un
    // voisin EST son lien d'accès. Le contrat ne porte que le nom et le
    // nombre ; ce test échoue si un jour quelqu'un renvoie le foyer entier.
    expect(result.seatingPlan).toEqual({
      tableName: "Table d'honneur",
      neighbors: [{ displayName: 'Famille B', confirmedCount: 3 }],
    });
    expect(
      result.seatingPlan?.neighbors.map((n) => n.displayName),
    ).not.toContain('Famille A');
  });

  // The whole point of the nullable confirmedCount: `null` means "has not
  // answered yet", `0` means "answered that nobody is coming". Collapsing the
  // first onto the second tells a guest that their neighbour declined when in
  // fact nobody has heard from them. This has now broken three times.
  it('reports a PENDING neighbour as null and a DECLINED one as 0', async () => {
    prisma.household.findUnique.mockResolvedValue(
      householdRow({ tableId: 't1' }),
    );
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue(
      weddingRow({ seatingPlanActivated: true }),
    );
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      name: "Table d'honneur",
      households: [
        householdRow({ id: 'h1', tableId: 't1' }),
        householdRow({
          id: 'h2',
          displayName: 'Famille Sans-Reponse',
          status: 'PENDING',
          confirmedCount: null,
          tableId: 't1',
        }),
        householdRow({
          id: 'h3',
          displayName: 'Famille Absente',
          status: 'DECLINED',
          confirmedCount: 0,
          tableId: 't1',
        }),
      ],
    });

    const result = await service.getInvitation('h1');

    expect(result.seatingPlan?.neighbors).toEqual([
      { displayName: 'Famille Sans-Reponse', confirmedCount: null },
      { displayName: 'Famille Absente', confirmedCount: 0 },
    ]);
  });

  it('returns the household and wedding settings alongside the plan', async () => {
    prisma.household.findUnique.mockResolvedValue(householdRow());
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue(weddingRow());

    await expect(service.getInvitation('h1')).resolves.toEqual({
      household: {
        id: 'h1',
        displayName: 'Famille A',
        allocatedSeats: 4,
        memberNames: ['Anna', 'Bob'],
        status: 'CONFIRMED',
        confirmedCount: 2,
        dietaryNotes: null,
        message: null,
      },
      wedding: {
        weddingDate: '2027-06-12T11:00:00.000Z',
        venueName: 'Domaine des Roses',
        address: 'Lot II M 12, Antananarivo',
        mapUrl: null,
        dressCode: null,
        parkingInfo: null,
        rsvpDeadline: '2027-05-01T00:00:00.000Z',
      },
      seatingPlan: null,
    });
  });

  // La route publique n'a aucune garde : ce qu'elle renvoie, n'importe qui
  // muni d'un lien le lit. Renvoyer la ligne Prisma telle quelle, c'est
  // publier tout ce qu'une future colonne y ajoutera — sans que personne
  // ait à le décider.
  it('publishes only the contract fields, never the internal columns', async () => {
    prisma.household.findUnique.mockResolvedValue(householdRow());
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue(weddingRow());

    const result = await service.getInvitation('h1');

    expect(Object.keys(result.household).sort()).toEqual([
      'allocatedSeats',
      'confirmedCount',
      'dietaryNotes',
      'displayName',
      'id',
      'memberNames',
      'message',
      'status',
    ]);
    expect(Object.keys(result.wedding).sort()).toEqual([
      'address',
      'dressCode',
      'mapUrl',
      'parkingInfo',
      'rsvpDeadline',
      'venueName',
      'weddingDate',
    ]);
  });

  // Le contrat annonce des chaînes ISO et le front les relit avec
  // `new Date(...)`. Prisma rend des objets Date ; c'est `JSON.stringify` qui
  // rattrape l'écart aujourd'hui, hors de portée du compilateur et de tout
  // test qui appelle le service directement.
  it('renders the wedding dates as ISO strings, not Date objects', async () => {
    prisma.household.findUnique.mockResolvedValue(householdRow());
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue(weddingRow());

    const { wedding } = await service.getInvitation('h1');

    expect(typeof wedding.weddingDate).toBe('string');
    expect(typeof wedding.rsvpDeadline).toBe('string');
    expect(wedding.weddingDate).toBe('2027-06-12T11:00:00.000Z');
  });
});

describe('InvitationService.submitRsvp', () => {
  let service: InvitationService;
  let prisma: {
    household: { findUnique: jest.Mock; update: jest.Mock };
    weddingSettings: { findUniqueOrThrow: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      household: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(householdRow()),
      },
      weddingSettings: { findUniqueOrThrow: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvitationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(InvitationService);
  });

  it('throws NotFoundException for an unknown linkId', async () => {
    prisma.household.findUnique.mockResolvedValue(null);
    await expect(
      service.submitRsvp('unknown', { status: 'CONFIRMED', confirmedCount: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException after the RSVP deadline', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 4,
    });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({
      rsvpDeadline: new Date('2020-01-01'),
    });
    await expect(
      service.submitRsvp('h1', { status: 'CONFIRMED', confirmedCount: 2 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when confirmedCount exceeds allocatedSeats', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 2,
    });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({
      rsvpDeadline: new Date('2999-01-01'),
    });
    await expect(
      service.submitRsvp('h1', { status: 'CONFIRMED', confirmedCount: 5 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sets confirmedCount to 0 when declining', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 2,
    });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({
      rsvpDeadline: new Date('2999-01-01'),
    });
    prisma.household.update.mockResolvedValue({
      id: 'h1',
      status: 'DECLINED',
      confirmedCount: 0,
    });
    await service.submitRsvp('h1', { status: 'DECLINED' });

    const [[updateArgs]] = prisma.household.update.mock.calls as [
      [
        {
          where: { id: string };
          data: { status: string; confirmedCount: number };
        },
      ],
    ];
    expect(updateArgs.where).toEqual({ id: 'h1' });
    expect(updateArgs.data).toEqual(
      expect.objectContaining({ status: 'DECLINED', confirmedCount: 0 }),
    );
  });

  // Même route publique, même règle que le GET : la réponse au RSVP renvoyait
  // la ligne Prisma entière, `tableId` et horodatages compris.
  it('answers the RSVP with the public contract fields only', async () => {
    prisma.household.findUnique.mockResolvedValue(
      householdRow({ status: 'PENDING', confirmedCount: null }),
    );
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue(
      weddingRow({ rsvpDeadline: new Date('2999-01-01') }),
    );
    prisma.household.update.mockResolvedValue(
      householdRow({ status: 'CONFIRMED', confirmedCount: 2 }),
    );

    const result = await service.submitRsvp('h1', {
      status: 'CONFIRMED',
      confirmedCount: 2,
    });

    expect(result).toEqual({
      id: 'h1',
      displayName: 'Famille A',
      allocatedSeats: 4,
      memberNames: ['Anna', 'Bob'],
      status: 'CONFIRMED',
      confirmedCount: 2,
      dietaryNotes: null,
      message: null,
    });
  });
});
