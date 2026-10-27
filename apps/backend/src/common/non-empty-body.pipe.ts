import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

// minProperties: 1 du contrat sur les corps de PATCH. S'exécute après le ValidationPipe global :
// les champs inconnus sont déjà refusés, il reste à vérifier qu'au moins un champ est envoyé.
@Injectable()
export class NonEmptyBodyPipe implements PipeTransform {
  transform(value: object): object {
    if (!Object.values(value).some((field) => field !== undefined)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Au moins un champ à modifier est requis.',
      });
    }
    return value;
  }
}
