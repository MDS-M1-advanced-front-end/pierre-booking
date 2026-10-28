import { InvalidRoomException } from '../exceptions/room-domain.exception.js';

/** Statut d'une salle : une salle INACTIVE n'est ni visible des clients ni réservable. */
export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Qui agit sur une salle : le domaine ne connaît pas l'authentification, seulement ce qui compte ici.
 */
export interface RoomActor {
  id: string;
  isAdmin: boolean;
}

/** Champs modifiables par PATCH /rooms/{roomId} ; null efface description et imageUrl. */
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

/**
 * Salle réservable. Les autres agrégats (propriétaire, disponibilités, réservations) sont
 * référencés par identifiant.
 */
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

  /**
   * Vérifie les règles de la salle.
   * @throws {InvalidRoomException} Capacité inférieure à 1 ou prix horaire négatif.
   */
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

  /**
   * Indique si l'acteur peut gérer la salle (modifier, supprimer, définir ses disponibilités) :
   * gestionnaire propriétaire ou administrateur.
   * @param actor - Utilisateur connecté, ou undefined pour un visiteur.
   * @returns true si l'acteur gère la salle.
   */
  canBeManagedBy(actor?: RoomActor): boolean {
    return actor !== undefined && (actor.isAdmin || actor.id === this.ownerId);
  }

  /**
   * Indique si l'acteur voit la salle : une salle inactive n'est visible que de ceux qui la gèrent.
   * @param actor - Utilisateur connecté, ou undefined pour un visiteur.
   * @returns true si la salle est visible.
   */
  isVisibleTo(actor?: RoomActor): boolean {
    return this.status === RoomStatus.ACTIVE || this.canBeManagedBy(actor);
  }

  /**
   * Applique une modification partielle, puis revérifie les règles de la salle.
   * @param changes - Champs à modifier ; les champs absents (undefined) sont laissés tels quels.
   * @throws {InvalidRoomException} Capacité inférieure à 1 ou prix négatif après modification.
   */
  update(changes: RoomChanges): void {
    for (const [field, value] of Object.entries(changes)) {
      if (value !== undefined) Object.assign(this, { [field]: value });
    }
    this.validate();
  }
}
