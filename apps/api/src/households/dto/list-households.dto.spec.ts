import { ValidationPipe, type ArgumentMetadata } from '@nestjs/common';
import { ListHouseholdsQueryDto } from './list-households.dto';

// Les mêmes options que `configureApp` pose globalement : la chaîne de requête
// n'arrive qu'en chaînes, c'est `transform` + `@Type` qui en font des nombres.
const pipe = new ValidationPipe({ whitelist: true, transform: true });
const query: ArgumentMetadata = {
  type: 'query',
  metatype: ListHouseholdsQueryDto,
  data: '',
};

describe('ListHouseholdsQueryDto', () => {
  // Le tableau de bord appelle la route sans aucun paramètre et compte sur
  // l'ordre de création : les défauts doivent exister sans être envoyés.
  it('fills the defaults when nothing is sent', async () => {
    await expect(pipe.transform({}, query)).resolves.toEqual(
      expect.objectContaining({
        limit: 100,
        offset: 0,
        sort: 'createdAt',
        order: 'asc',
      }),
    );
  });

  it('turns query-string numbers into numbers', async () => {
    const dto = (await pipe.transform(
      { limit: '25', offset: '50' },
      query,
    )) as ListHouseholdsQueryDto;

    expect(dto.limit).toBe(25);
    expect(dto.offset).toBe(50);
  });

  it('accepts every documented parameter', async () => {
    await expect(
      pipe.transform(
        {
          limit: '500',
          offset: '0',
          q: 'rabe',
          status: 'PENDING',
          sort: 'name',
          order: 'desc',
        },
        query,
      ),
    ).resolves.toEqual({
      limit: 500,
      offset: 0,
      q: 'rabe',
      status: 'PENDING',
      sort: 'name',
      order: 'desc',
    });
  });

  it.each([
    ['limit', '0'],
    ['limit', '501'],
    ['limit', '1.5'],
    ['limit', 'abc'],
    ['offset', '-1'],
    ['offset', 'abc'],
    ['sort', 'displayName'],
    ['order', 'up'],
    ['status', 'MAYBE'],
  ])('rejects %s=%s', async (key, value) => {
    await expect(pipe.transform({ [key]: value }, query)).rejects.toThrow();
  });

  // `?limit=10&limit=20` arrive en tableau : il ne doit pas passer pour un
  // nombre, ni pour une recherche.
  it('rejects a repeated parameter', async () => {
    await expect(
      pipe.transform({ limit: ['10', '20'] }, query),
    ).rejects.toThrow();
    await expect(pipe.transform({ q: ['a', 'b'] }, query)).rejects.toThrow();
  });
});
