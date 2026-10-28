import { InvalidRoomException } from '../exceptions/room-domain.exception.js';

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// Qui agit sur une salle : le domaine ne connaît pas l'authentification, seulement ce qui compte ici
export interface RoomActor {
  id: string;
  isAdmin: boolean;
}

// Champs modifiables par PATCH /rooms/{roomId} ; null efface description et imageUrl
export type RoomChanges = Partial<
  Pick<
    Room,
    | 'name'
    | 'description'
    | 'capacity'
    | 'location'
    | 'pricePerHour'
    | 'equipment'
    | 'status'
    | 'imageUrl'
  >
>;

// Les autres agrégats (propriétaire, disponibilités, réservations) sont référencés par identifiant
export class Room {
  constructor(
    public readonly id: string | undefined,
    public name: string,
    public description: string | null,
    public capacity: number,
    public location: string,
    public pricePerHour: number,
    public equipment: string[],
    public status: RoomStatus,
    public imageUrl: string | null,
    public ownerId: string,
    public createdAt?: Date,
  ) {}

  validate(): void {
    if (this.capacity < 1) {
      throw new InvalidRoomException(
        'La capacité de la salle doit être strictement positive',
      );
    }
    if (this.pricePerHour < 0) {
      throw new InvalidRoomException(
        'Le prix par heure ne peut pas être négatif',
      );
    }
  }

  // Gestionnaire propriétaire ou administrateur
  canBeManagedBy(actor?: RoomActor): boolean {
    return actor !== undefined && (actor.isAdmin || actor.id === this.ownerId);
  }

  // Une salle inactive n'est visible que de ceux qui la gèrent
  isVisibleTo(actor?: RoomActor): boolean {
    return this.status === RoomStatus.ACTIVE || this.canBeManagedBy(actor);
  }

  update(changes: RoomChanges): void {
    for (const [field, value] of Object.entries(changes)) {
      if (value !== undefined) Object.assign(this, { [field]: value });
    }
    this.validate();
  }
}
