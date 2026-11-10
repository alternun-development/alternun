# Email delivery

Alternun sends every email through **Tláo Mail** (`mail.xn--tlo-fla.com`, which is
`mail.tláo.com`). **Postmark is retired** and must not be reintroduced.

## Why Tláo only

`alternun.co` publishes this SPF record:

```text
v=spf1 mx a:mail.xn--tlo-fla.com -all
```

and DMARC `p=quarantine`. Only Tláo is allowed to send for the domain, so mail sent
through another provider (Postmark included) fails SPF alignment and is quarantined or
rejected by the receiving server. That is why Airs notifications sent through Postmark
never reached `support@alternun.co`.

## Mailboxes

| Mailbox                     | Used for                                                              | Configured in                                                                                                    |
| --------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `notifications@alternun.co` | Airs API emails: welcome, Airs reports, client invitations, referrals | Secrets Manager `alternun/tlao/smtp`; locally `ALTERNUN_NOTIFICATIONS_EMAIL` / `ALTERNUN_NOTIFICATIONS_PASSWORD` |
| `transactional@alternun.co` | Supabase Auth emails (sign-up confirmation, password reset)           | Supabase SMTP settings (`SUPABASE_SMTP_*`)                                                                       |

Tláo only relays mail from the authenticated mailbox, so the `From` address is always
that mailbox.

## Configuration

- **Deployed API (testnet and production):** the Lambda reads the JSON secret named by
  `AIRS_SMTP_SECRET_ARN` (default `alternun/tlao/smtp`):

  ```json
  {
    "host": "mail.xn--tlo-fla.com",
    "port": 587,
    "username": "notifications@alternun.co",
    "password": "…",
    "from": "notifications@alternun.co",
    "senderName": "Alternun",
    "secure": false,
    "requireTls": true,
    "useTls": true
  }
  ```

  Create or rotate it with the Alternun AWS account:

  ```bash
  bash scripts/validate-aws-account.sh enforce && \
    bash packages/infra/scripts/setup-smtp-secret.sh dev
  ```

  The script reads `ALTERNUN_NOTIFICATIONS_EMAIL` and `ALTERNUN_NOTIFICATIONS_PASSWORD`
  from the root `.env` and builds the JSON without printing the password.

- **Local API:** without a secret ARN, the API uses `ALTERNUN_NOTIFICATIONS_EMAIL`,
  `ALTERNUN_NOTIFICATIONS_PASSWORD` and `NODEMAILER_HOST_INFO` / `NODEMAILER_PORT_INFO`
  from `.env`, so emails sent while testing locally are real.

## Guards against Postmark

- `apps/api/src/modules/airs/airs.email.ts` refuses to send when the SMTP host is a
  Postmark host (`smtp_provider_retired`) and logs the refusal.
- `packages/infra/modules/identity.ts` throws for any identity email provider other
  than `tlao`.
- `packages/infra/scripts/setup-smtp-secret.sh` refuses a Postmark host.
- Tests fail if Postmark reappears: `apps/api/test/project-client.test.ts` scans the API
  and infrastructure sources, and `packages/infra/test/bootstrap-ssm-parameters.test.ts`
  and `identity-email-provider.test.ts` check the scripts and identity module.

The old `alternun/postmark/smtp` secret and the `POSTMARK_*` variables in local `.env`
files are no longer read. They can be removed once the Tláo secret is in place.

## Troubleshooting

- A send failure is logged by the API (`Client invitation email failed …`) without the
  recipient address.
- Check SMTP login without sending:
  `nodemailer.createTransport({ host, port: 587, requireTLS: true, auth }).verify()`.
- Delivery problems for `@alternun.co` recipients are handled in the Tláo panel (the
  domain's MX is `mail.xn--tlo-fla.com`).
