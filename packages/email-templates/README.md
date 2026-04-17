# @alternun/email-templates

Shared multilingual email copy and Supabase Auth template generation utilities.

## Email Translation Structure

```text
packages/email-templates/src/
├── locales/
│   ├── en/
│   │   ├── account-delete-email.json
│   │   ├── change-email-email.json
│   │   ├── confirm-signup-email.json
│   │   ├── invite-email.json
│   │   ├── magic-link-email.json
│   │   ├── reauthentication-email.json
│   │   ├── otp-email.json
│   │   └── reset-password-email.json
│   ├── es/
│   │   ├── account-delete-email.json
│   │   ├── change-email-email.json
│   │   ├── confirm-signup-email.json
│   │   ├── invite-email.json
│   │   ├── magic-link-email.json
│   │   ├── reauthentication-email.json
│   │   ├── otp-email.json
│   │   └── reset-password-email.json
│   └── th/
│       ├── account-delete-email.json
│       ├── change-email-email.json
│       ├── confirm-signup-email.json
│       ├── invite-email.json
│       ├── magic-link-email.json
│       ├── otp-email.json
│       ├── reauthentication-email.json
│       └── reset-password-email.json
└── lib/
    └── i18n.ts
```

## Runtime usage

```ts
import { renderEmailTemplateTranslation } from '@alternun/email-templates';

const invite = renderEmailTemplateTranslation({
  locale: 'es-MX',
  template: 'invite-email',
  params: {
    email: 'user@example.com',
  },
});

console.log(invite.subject);
```

## Generate Supabase Auth template payload

This generates one Supabase payload with locale conditionals based on `{{ .Data.locale }}`.

```bash
pnpm --filter @alternun/email-templates run generate:supabase
```

Optional env vars:

- `SUPABASE_EMAIL_TEMPLATE_LOCALES=en,es,th`
- `SUPABASE_EMAIL_TEMPLATE_FALLBACK_LOCALE=en`
- `SUPABASE_EMAIL_TEMPLATE_OUTPUT=/absolute/or/relative/path.json`

Default output:

`packages/auth/infra/email/out/supabase-auth-templates.local.json`
