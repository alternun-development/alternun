# Reporte de entregabilidad — alternun.co vía Tláo Mail

**Para:** equipo técnico de Tláo Mail (servidor `mail.xn--tlo-fla.com`, IP `15.204.116.157`)
**De:** Alternun — dominio `alternun.co`, remitente `notifications@alternun.co`
**Fecha:** 2026-11-14
**Síntoma:** correos transaccionales de Alternun (notificaciones, verificación) llegan a la carpeta de spam, sobre todo en Gmail.

## Resumen

El DNS de autenticación de `alternun.co` está casi completo y bien alineado. El problema principal **no es del lado de Alternun**: es que el servidor de Tláo está **firmando DKIM únicamente con una clave `ed25519`** (selector `mail`), un algoritmo que muchos receptores — incluido Gmail — todavía no validan. Para esos receptores el correo cuenta como **sin firma DKIM**, y la evaluación DMARC queda apoyada solo en SPF, lo que empuja a spam.

Ya existe publicada una clave **DKIM RSA** (selector `rsa`) en el DNS de `alternun.co`, lista para usarse. **Pedimos que Tláo firme con RSA** (o con RSA además de ed25519).

## Lo que ya está correcto (lado Alternun)

| Control            | Estado | Valor observado                                                                               |
| ------------------ | ------ | --------------------------------------------------------------------------------------------- |
| SPF                | ✅     | `v=spf1 mx a:mail.xn--tlo-fla.com -all` (incluye el host de Tláo, política estricta `-all`)   |
| DKIM RSA publicado | ✅     | `rsa._domainkey.alternun.co` → `k=rsa; p=MIIBIjANBgkq…` (clave 2048-bit publicada)            |
| DMARC              | ✅     | `v=DMARC1; p=quarantine; rua=mailto:admin@alternun.co`                                        |
| MX                 | ✅     | `10 mail.xn--tlo-fla.com`                                                                     |
| PTR / rDNS         | ✅     | `15.204.116.157` → `mail.xn--tlo-fla.com`, y resuelve de vuelta al mismo IP (FCrDNS correcto) |
| TLS-RPT            | ✅     | `v=TLSRPTv1; rua=mailto:admin@alternun.co`                                                    |
| Alineación         | ✅     | `From: notifications@alternun.co` alinea en dominio con SPF y DKIM                            |

## El problema (lado Tláo) — acción solicitada

**1. (Principal) Firmar DKIM con RSA.**
El servidor firma hoy con el selector `mail` (`k=ed25519`). Gmail y otros no validan ed25519 y tratan el mensaje como sin DKIM.

- **Pedido:** configurar el firmado DKIM saliente para `alternun.co` usando la clave RSA del selector `rsa` que ya está publicada (`rsa._domainkey.alternun.co`), idealmente firmando con **ambos** selectores (`rsa` y `mail`) para cubrir todos los receptores.
- Si Tláo no tiene la clave privada RSA correspondiente a ese registro público, avísennos para regenerar el par y volver a publicar el registro.

**2. Verificar reputación del IP de envío `15.204.116.157`.**

- Confirmar que no esté en listas negras (Spamhaus, Barracuda, etc.).
- Si el IP es compartido entre varios clientes de Tláo, la reputación de otros afecta a Alternun; indicarnos si hay opción de IP dedicado para nuestro volumen.

**3. Confirmar TLS en entrega saliente.**

- Confirmar que el servidor entrega con STARTTLS/TLS hacia los receptores (Gmail penaliza el texto plano).

## Mejoras que hará Alternun de su lado

- Endurecer el contenido de los correos automáticos: parte de texto plano real además del HTML, y cabeceras `Reply-To`, `Date` y `Message-ID` con dominio propio. (Ya aplicado en el generador de notificaciones.)
- Evaluar publicar **MTA-STS** (`_mta-sts.alternun.co` + policy) para forzar TLS entrante — coordinar con Tláo.
- Mantener DMARC en `p=quarantine` y revisar los reportes `rua` unas semanas tras el cambio de DKIM; subir a `p=reject` cuando los reportes salgan limpios.

## Cómo verificar que quedó resuelto

Tras activar el firmado RSA, enviar un correo de prueba a una cuenta Gmail y revisar en el mensaje recibido (Mostrar original):

- `DKIM: PASS` con `d=alternun.co` y un selector **RSA**.
- `DMARC: PASS`.
- Alternativamente, un correo a `check-auth@verifier.port25.com` o una herramienta como mail-tester.com debe mostrar DKIM RSA válido.
