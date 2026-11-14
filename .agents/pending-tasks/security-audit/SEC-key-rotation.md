# SEC — Rotar claves expuestas públicamente

**Estado:** PENDIENTE
**Origen:** Auditoría de seguridad 2026-11-14
**Owner:** Edward
**Tracker:** ALTERNUN-INTERNAL (proyecto privado GitHub de edcalderon)

## Contexto

Mientras el repo `alternun-development/alternun` fue público, quedaron accesibles
algunos valores que ahora conviene rotar. El historial ya se reescribió para
purgar `security/audits/`, pero **reescribir historial NO des-expone un valor que
ya fue visto** — solo la rotación lo resuelve.

## A rotar

- `DISCORD_PUBLIC_KEY` (clave de verificación de firma; bajo riesgo, pero recomendable).
- Supabase *publishable*/anon key (diseñada para ir en cliente; rotar por higiene).
- Cualquier otro secreto de runtime que haya estado en el repo público (ver A-01).

## Notas

- A-01 (repo público + secretos de runtime → Secrets Manager) es decisión de Santiago
  en #decisiones; esta rotación puede hacerse antes, de forma independiente.
- Al rotar, actualizar el valor en todos los consumidores (env/SSM/Secrets Manager)
  y verificar que no rompe auth ni los webhooks de Discord.

## Resuelto en la misma auditoría

- **C3a (Admin sin MFA):** ✅ MFA habilitado en la cuenta IAM de Edward (2026-11-14).
