BEGIN;
ALTER TABLE "usuarios" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "usuarios" ADD COLUMN "login_email_habilitado" BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN "login_usuario_habilitado" BOOLEAN NOT NULL DEFAULT true;
-- Os dois acessos permanecem habilitados para contas existentes.
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_algum_login_check"
 CHECK ("login_email_habilitado" OR "login_usuario_habilitado");
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_login_email_exige_email_check"
 CHECK (NOT "login_email_habilitado" OR ("email" IS NOT NULL AND length(trim("email")) > 0));
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_login_usuario_exige_identidade_check"
 CHECK (NOT "login_usuario_habilitado" OR "usuario_login" IS NOT NULL OR ("login_email_habilitado" AND "email" IS NOT NULL));
COMMIT;
