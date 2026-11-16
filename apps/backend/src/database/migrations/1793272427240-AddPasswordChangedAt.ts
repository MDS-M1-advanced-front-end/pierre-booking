import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ajoute `password_changed_at` aux utilisateurs : les jetons (accès et rafraîchissement) émis
 * avant un changement de mot de passe sont alors rejetés (révocation). Les comptes existants sont
 * initialisés à leur date de création, pour ne pas invalider les jetons déjà en circulation.
 */
export class AddPasswordChangedAt1793272427240 implements MigrationInterface {
  name = 'AddPasswordChangedAt1793272427240';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "password_changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      UPDATE "users" SET "password_changed_at" = "created_at"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "password_changed_at"
    `);
  }
}
