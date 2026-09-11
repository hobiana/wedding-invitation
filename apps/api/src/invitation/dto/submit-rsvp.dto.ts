import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import type { SubmitRsvpDto as SubmitRsvpContract } from '@invitation-app/shared';

/**
 * `implements` sans effet à l'exécution, et c'est tout l'intérêt : la classe
 * reste la seule chose que `class-validator` regarde, mais le compilateur
 * refuse désormais qu'elle s'écarte du corps de requête que le front envoie.
 * Un champ ajouté d'un côté et oublié de l'autre était jusqu'ici silencieux —
 * la liste blanche de validation le retirait sans rien dire.
 */
export class SubmitRsvpDto implements SubmitRsvpContract {
  @IsIn(['CONFIRMED', 'DECLINED'])
  status!: 'CONFIRMED' | 'DECLINED';


  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberNames?: string[];

  @IsOptional()
  @IsString()
  dietaryNotes?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
