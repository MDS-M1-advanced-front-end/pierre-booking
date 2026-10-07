// Données temporaires pour la conception visuelle, reprises de la maquette (écran 01).
import type { Room } from '@room-booking/core';

export const mockRooms: Room[] = [
  {
    id: '3f2b8c1e-7a4d-4e9b-9c1a-2d5e6f7a8b9c',
    name: 'Salle Voltaire',
    capacity: 12,
    location: 'Paris 11e',
    equipment: ['Écran 65"', 'Tableau blanc', 'Wi-Fi'],
    pricePerHour: 45,
    status: 'ACTIVE',
  },
  {
    id: '8a1d4e2f-5b6c-4d7e-8f9a-0b1c2d3e4f5a',
    name: 'Studio Médoc',
    capacity: 4,
    location: 'Bordeaux Chartrons',
    equipment: ['Micros', 'Table de mixage', 'Casques'],
    pricePerHour: 35,
    status: 'INACTIVE',
  },
];
