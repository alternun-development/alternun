# @alternun/i18n

Lean shared i18n package for Alternun apps.

## Approach

- Use plain JSON catalogs as the source of truth.
- Split each locale into `shared`, `mobile`, `web`, and `docs` namespaces.
- Keep the runtime tiny and framework-agnostic.
- Let each app own its adapter layer: React hook, Next middleware, .NET service, etc.

This keeps the catalog portable to non-JavaScript stacks. A .NET app can consume the same JSON files from `dist/catalogs/*.json` without needing the TypeScript runtime.

## Usage

```ts
import { createTranslator, getLocaleLabel } from '@alternun/i18n';

const mobile = createTranslator({
  locale: 'es-MX',
  namespace: 'mobile',
});

mobile.t('settingsScreen.title');
getLocaleLabel('th', 'es');
```

## Recommendation

Use this package as the single source of truth for product copy that is shared across apps.

- Put brand-wide text in `shared`.
- Put app-specific copy in `mobile`, `web`, or `docs`.
- Keep keys domain-based instead of page-based when possible.
- Export the raw JSON catalogs to other stacks instead of reimplementing copy separately.
