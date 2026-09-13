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
  /**
   * Nullable, et il doit le rester. `null` dit « ce foyer n'a pas encore
   * répondu », `0` dit « il a répondu que personne ne vient ». Les écraser
   * l'un sur l'autre ici détruit l'information avant qu'elle atteigne le
   * front, qui n'a alors plus aucun moyen de la rattraper.
   */
  confirmedCount: number | null;
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

/**
 * Ce qu'un **invité** peut dire en répondant.
 *
 * Il n'y a pas de `confirmedCount`, et ce n'est pas un oubli. Confirmer veut
 * dire « nous venons tous » (décision du commanditaire, 2026-09-10) : le
 * serveur pose le nombre depuis `allocatedSeats`, que l'organisateur a
 * lui-même accordées. Un invité ne peut donc pas annoncer un chiffre, pas
 * même avec un corps de requête fabriqué à la main.
 *
 * Un foyer qui ne vient qu'en partie se corrige depuis l'admin, par
 * `UpdateHouseholdDto` — qui, lui, porte bien le champ.
 */
export interface SubmitRsvpDto {
  status: "CONFIRMED" | "DECLINED";
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
  /**
   * Ces trois-là sont `string | null`, et non `?: string`. Les colonnes sont
   * nullables, `WeddingInfoDto` les déclare déjà ainsi : les laisser
   * facultatifs ici faisait dire au contrat admin l'inverse du contrat invité
   * pour les mêmes colonnes.
   *
   * `null` dit « l'organisateur n'a rien renseigné ». Une chaîne vide n'est
   * pas la même chose : elle traverse le contrat comme une valeur, et la page
   * invité affiche une ligne blanche au lieu de ne rien afficher. C'est le
   * serveur qui referme la porte — `SettingsService.update` ramène à `null`
   * un champ vidé — parce qu'un champ dont la nullabilité se perd en route
   * est perdu pour de bon : le front ne peut plus la reconstituer.
   */
  mapUrl: string | null;
  dressCode: string | null;
  parkingInfo: string | null;
  rsvpDeadline: string;
  seatingPlanActivated: boolean;
}
