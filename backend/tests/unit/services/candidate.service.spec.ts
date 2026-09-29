import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CandidateNotFoundError, EmailAlreadyExistsError, ValidationError } from '../../../src/domain/errors.js';
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
    it('devolve os candidatos na ordem do repositório (mais recente primeiro)', async () => {
      await service.create({ fullName: 'Primeira', email: 'a@example.com' });
      await service.create({ fullName: 'Segunda', email: 'b@example.com' });

      const items = await service.list();
      expect(items.map((c) => c.fullName)).toEqual(['Segunda', 'Primeira']);
    });

    it('devolve lista vazia quando não há cadastros', async () => {
      expect(await service.list()).toEqual([]);
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
