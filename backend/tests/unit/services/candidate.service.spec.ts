import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CandidateNotFoundError,
  EmailAlreadyExistsError,
  InvalidPaginationError,
  ValidationError,
} from '../../../src/domain/errors.js';
import { CandidateService } from '../../../src/services/candidate.service.js';
import { FakeCandidateRepository } from '../../fakes/fake-candidate.repository.js';

describe('CandidateService', () => {
  let repository: FakeCandidateRepository;
  let service: CandidateService;

  beforeEach(() => {
    repository = new FakeCandidateRepository();
    service = new CandidateService(repository);
  });

  describe('create', () => {
    it('envia ao repositório o candidato normalizado', async () => {
      const spy = vi.spyOn(repository, 'create');
      const created = await service.create({
        fullName: '  Conceição da Silva ',
        email: ' conceicao@example.com ',
        phone: '(41) 99876-5432',
        areaOfInterest: '   ',
        professionalSummary: 'RH\nRecrutamento',
      });

      expect(spy).toHaveBeenCalledWith({
        fullName: 'Conceição da Silva',
        email: 'conceicao@example.com',
        phone: '41998765432',
        areaOfInterest: null,
        professionalSummary: 'RH\nRecrutamento',
      });
      expect(created.id).toBe(1);
    });

    it('lança ValidationError com os campos inválidos e não chama o repositório', async () => {
      const spy = vi.spyOn(repository, 'create');
      const error = await service.create({ fullName: '', email: 'maria@' }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fields?.map((f) => [f.field, f.code])).toEqual([
        ['fullName', 'REQUIRED'],
        ['email', 'INVALID_EMAIL'],
      ]);
      expect(spy).not.toHaveBeenCalled();
    });

    it('propaga EmailAlreadyExistsError para e-mail repetido com outra caixa', async () => {
      await service.create({ fullName: 'Maria', email: 'maria@email.com' });
      await expect(service.create({ fullName: 'Outra Maria', email: 'Maria@Email.com' })).rejects.toBeInstanceOf(
        EmailAlreadyExistsError,
      );
    });
  });

  describe('list', () => {
    async function seed(count: number) {
      for (let i = 1; i <= count; i++) await service.create({ fullName: `Candidato ${i}`, email: `c${i}@example.com` });
    }

    it('usa por padrão a página 1 com 10 itens, do mais recente para o mais antigo', async () => {
      await seed(12);
      const spy = vi.spyOn(repository, 'list');

      const result = await service.list({});

      expect(spy).toHaveBeenCalledWith({ offset: 0, limit: 10 });
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(12);
      expect(result.items).toHaveLength(10);
      expect(result.items[0]?.fullName).toBe('Candidato 12');
    });

    it('calcula o deslocamento a partir de page e pageSize (vindos da URL como texto)', async () => {
      await seed(12);
      const spy = vi.spyOn(repository, 'list');

      const result = await service.list({ page: '3', pageSize: '5' });

      expect(spy).toHaveBeenCalledWith({ offset: 10, limit: 5 });
      expect(result.items.map((c) => c.fullName)).toEqual(['Candidato 2', 'Candidato 1']);
    });

    it('página além da última devolve items vazio e o total', async () => {
      await seed(3);
      expect(await service.list({ page: '9' })).toEqual({ items: [], page: 9, pageSize: 10, total: 3 });
    });

    it('devolve lista vazia quando não há cadastros', async () => {
      expect(await service.list({})).toEqual({ items: [], page: 1, pageSize: 10, total: 0 });
    });

    it.each([
      { page: '0' },
      { page: '-1' },
      { page: 'abc' },
      { page: '1.5' },
      { page: ['1', '2'] },
      { pageSize: '0' },
      { pageSize: '51' },
      { pageSize: 'dez' },
    ])('parâmetros inválidos %j → InvalidPaginationError, sem consultar o repositório', async (query) => {
      const spy = vi.spyOn(repository, 'list');
      await expect(service.list(query)).rejects.toBeInstanceOf(InvalidPaginationError);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('devolve o candidato pelo id', async () => {
      const created = await service.create({ fullName: 'Maria', email: 'maria@example.com' });
      expect(await service.getById(String(created.id))).toEqual(created);
    });

    it('lança CandidateNotFoundError para id inexistente', async () => {
      await expect(service.getById('999')).rejects.toBeInstanceOf(CandidateNotFoundError);
    });

    it.each(['abc', '0', '-1', '1.5', '01', ''])(
      'lança CandidateNotFoundError para id inválido %j sem consultar o repositório',
      async (rawId) => {
        const spy = vi.spyOn(repository, 'findById');
        await expect(service.getById(rawId)).rejects.toBeInstanceOf(CandidateNotFoundError);
        expect(spy).not.toHaveBeenCalled();
      },
    );
  });
});
