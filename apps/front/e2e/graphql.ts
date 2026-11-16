// Le mock Prism ne sert que le contrat REST : les requêtes GraphQL du back-office sont simulées
// ici, avec les données du jeu d'essai (`pnpm seed`) vues par Nadia Benali (gestionnaire-1).
import type { Page } from '@playwright/test';
import type { ReservationRequestsQuery } from '@room-booking/core/graphql';

const GRAPHQL_URL = 'http://localhost:4010/graphql';

/** Demandes de Nadia Benali : une en attente (Auditorium Bastille), trois traitées. */
export const NADIA_REQUESTS: ReservationRequestsQuery = {
  reservationRequests: {
    pending: [
      {
        id: '00000000-0000-4000-8000-300000000002',
        room: {
          id: '00000000-0000-4000-8000-100000000002',
          name: 'Auditorium Bastille',
        },
        requester: {
          id: '00000000-0000-4000-8000-200000000001',
          firstName: 'Léa',
          lastName: 'Martin',
        },
        startAt: '2026-10-20T14:00:00.000Z',
        endAt: '2026-10-20T18:00:00.000Z',
        status: 'PENDING',
        numberOfParticipants: 90,
        comment: 'Conférence annuelle',
        totalAmount: 1000,
        currency: 'EUR',
      },
    ],
    handled: [
      {
        id: '00000000-0000-4000-8000-300000000003',
        room: {
          id: '00000000-0000-4000-8000-100000000004',
          name: 'Salle Rhône',
        },
        requester: {
          id: '00000000-0000-4000-8000-200000000002',
          firstName: 'Hugo',
          lastName: 'Bernard',
        },
        startAt: '2026-10-14T09:00:00.000Z',
        endAt: '2026-10-14T17:00:00.000Z',
        status: 'CONFIRMED',
        numberOfParticipants: 18,
        comment: null,
        totalAmount: 480,
        currency: 'EUR',
      },
      {
        id: '00000000-0000-4000-8000-300000000001',
        room: {
          id: '00000000-0000-4000-8000-100000000001',
          name: 'Salle Voltaire',
        },
        requester: {
          id: '00000000-0000-4000-8000-200000000001',
          firstName: 'Léa',
          lastName: 'Martin',
        },
        startAt: '2026-10-12T09:00:00.000Z',
        endAt: '2026-10-12T12:00:00.000Z',
        status: 'CONFIRMED',
        numberOfParticipants: 8,
        comment: 'Atelier UX',
        totalAmount: 135,
        currency: 'EUR',
      },
      {
        id: '00000000-0000-4000-8000-300000000008',
        room: {
          id: '00000000-0000-4000-8000-100000000003',
          name: 'Bureau Oberkampf',
        },
        requester: {
          id: '00000000-0000-4000-8000-200000000003',
          firstName: 'Chloé',
          lastName: 'Dubois',
        },
        startAt: '2026-10-09T15:00:00.000Z',
        endAt: '2026-10-09T16:00:00.000Z',
        status: 'CONFIRMED',
        numberOfParticipants: 2,
        comment: 'Entretien de recrutement',
        totalAmount: 20,
        currency: 'EUR',
      },
    ],
  },
};

/** Répond à la requête `ReservationRequests` de l'écran 11 (POST /graphql). */
export async function mockReservationRequests(
  page: Page,
  data: ReservationRequestsQuery = NADIA_REQUESTS,
): Promise<void> {
  await page.route(GRAPHQL_URL, (route) => route.fulfill({ json: { data } }));
}
