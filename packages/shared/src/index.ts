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
  confirmedCount: number;
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

export interface SubmitRsvpDto {
  status: "CONFIRMED" | "DECLINED";
  confirmedCount?: number;
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
  mapUrl?: string;
  dressCode?: string;
  parkingInfo?: string;
  rsvpDeadline: string;
  seatingPlanActivated: boolean;
}
