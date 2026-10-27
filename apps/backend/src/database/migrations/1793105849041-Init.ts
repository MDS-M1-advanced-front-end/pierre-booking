import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1793105849041 implements MigrationInterface {
  name = 'Init1793105849041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."payments_payment_method_enum" AS ENUM('CARD', 'PAYPAL')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED')
        `);
    await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "reservation_id" uuid NOT NULL,
                "external_transaction_id" character varying(255),
                "amount" numeric(10, 2) NOT NULL,
                "currency" character(3) NOT NULL DEFAULT 'EUR',
                "payment_method" "public"."payments_payment_method_enum" NOT NULL,
                "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING',
                "payment_url" character varying(2048),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "REL_9ed5ff4942e09edfd44ee0ccf0" UNIQUE ("reservation_id"),
                CONSTRAINT "CHK_17bd8ef2f9e614df00ab8bc95f" CHECK ("amount" >= 0),
                CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."users_role_enum" AS ENUM('CLIENT', 'GESTIONNAIRE', 'ADMINISTRATEUR')
        `);
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "first_name" character varying(100) NOT NULL,
                "last_name" character varying(100) NOT NULL,
                "email" character varying(255) NOT NULL,
                "password_hash" character varying(255) NOT NULL,
                "role" "public"."users_role_enum" NOT NULL DEFAULT 'CLIENT',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."reservations_status_enum" AS ENUM(
                'PENDING',
                'CONFIRMED',
                'REJECTED',
                'CANCELLED',
                'COMPLETED'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "reservations" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "room_id" uuid NOT NULL,
                "start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'PENDING',
                "number_of_participants" integer,
                "comment" text,
                "total_amount" numeric(10, 2) NOT NULL,
                "currency" character(3) NOT NULL DEFAULT 'EUR',
                "rejection_reason" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_836e750d3822940686a616768d" CHECK ("total_amount" >= 0),
                CONSTRAINT "CHK_f8e3d4df3e3bbc16db86b0e772" CHECK ("number_of_participants" >= 1),
                CONSTRAINT "CHK_e0700261eb5b99a20fd04b88cd" CHECK ("end_at" > "start_at"),
                CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_4af5055a871c46d011345a255a" ON "reservations" ("user_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_7358c8517644db24f455b18811" ON "reservations" ("room_id", "start_at")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."rooms_status_enum" AS ENUM('ACTIVE', 'INACTIVE')
        `);
    await queryRunner.query(`
            CREATE TABLE "rooms" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_id" uuid NOT NULL,
                "name" character varying(100) NOT NULL,
                "description" text,
                "capacity" integer NOT NULL,
                "location" character varying(255) NOT NULL,
                "equipment" text array NOT NULL DEFAULT '{}',
                "price_per_hour" numeric(10, 2) NOT NULL,
                "status" "public"."rooms_status_enum" NOT NULL DEFAULT 'ACTIVE',
                "image_url" character varying(2048),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_caf9e307d620e6fe8993db0ef0" CHECK ("price_per_hour" >= 0),
                CONSTRAINT "CHK_35fa0c92deebb5e20635a86ee9" CHECK ("capacity" >= 1),
                CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "availabilities" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "room_id" uuid NOT NULL,
                "date" date NOT NULL,
                "start_time" TIME NOT NULL,
                "end_time" TIME NOT NULL,
                "is_available" boolean NOT NULL DEFAULT true,
                CONSTRAINT "CHK_552887f89f793b5528fb326d64" CHECK ("end_time" > "start_time"),
                CONSTRAINT "PK_9562bd8681d40361b1a124ea52c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3b938ad533eec322504afb25c7" ON "availabilities" ("room_id", "date")
        `);
    await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_9ed5ff4942e09edfd44ee0ccf01" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD CONSTRAINT "FK_4af5055a871c46d011345a255a6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations"
            ADD CONSTRAINT "FK_6aef3a04f7c96611e75d2db10fb" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "rooms"
            ADD CONSTRAINT "FK_9f38c339cb7a6e33b02f9d2c743" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "availabilities"
            ADD CONSTRAINT "FK_5c2a31145060ad0733c1ddebd51" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "availabilities" DROP CONSTRAINT "FK_5c2a31145060ad0733c1ddebd51"
        `);
    await queryRunner.query(`
            ALTER TABLE "rooms" DROP CONSTRAINT "FK_9f38c339cb7a6e33b02f9d2c743"
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP CONSTRAINT "FK_6aef3a04f7c96611e75d2db10fb"
        `);
    await queryRunner.query(`
            ALTER TABLE "reservations" DROP CONSTRAINT "FK_4af5055a871c46d011345a255a6"
        `);
    await queryRunner.query(`
            ALTER TABLE "payments" DROP CONSTRAINT "FK_9ed5ff4942e09edfd44ee0ccf01"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3b938ad533eec322504afb25c7"
        `);
    await queryRunner.query(`
            DROP TABLE "availabilities"
        `);
    await queryRunner.query(`
            DROP TABLE "rooms"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."rooms_status_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_7358c8517644db24f455b18811"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_4af5055a871c46d011345a255a"
        `);
    await queryRunner.query(`
            DROP TABLE "reservations"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."reservations_status_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."users_role_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "payments"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."payments_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."payments_payment_method_enum"
        `);
  }
}
