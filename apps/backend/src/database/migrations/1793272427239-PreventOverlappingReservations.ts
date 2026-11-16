import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Empêche deux réservations actives (PENDING ou CONFIRMED) de se chevaucher sur la même salle,
 * au niveau de la base : la vérification applicative (`hasOverlap`) laisse passer deux requêtes
 * concurrentes sur le même créneau. La contrainte d'exclusion garantit l'unicité même en course.
 */
export class PreventOverlappingReservations1793272427239 implements MigrationInterface {
  name = 'PreventOverlappingReservations1793272427239';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await queryRunner.query(`
      ALTER TABLE "reservations"
      ADD CONSTRAINT "EXC_reservations_no_overlap"
      EXCLUDE USING gist (
        "room_id" WITH =,
        tstzrange("start_at", "end_at") WITH &&
      )
      WHERE ("status" IN ('PENDING', 'CONFIRMED'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"
      DROP CONSTRAINT "EXC_reservations_no_overlap"
    `);
  }
}
