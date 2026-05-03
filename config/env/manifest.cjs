const targets = {
  mobile: {
    path: 'apps/mobile',
    envFile: '.env',
    exampleFile: '.env.example',
    description: 'Shared mobile runtime env',
  },
  mobileDev: {
    path: 'apps/mobile',
    envFile: '.env.development',
    exampleFile: '.env.development.example',
    description: 'Testnet mobile stage env',
  },
  api: {
    path: 'apps/api',
    envFile: '.env',
    exampleFile: '.env.example',
    description: 'API runtime env',
  },
  admin: {
    path: 'apps/admin',
    envFile: '.env',
    exampleFile: '.env.example',
    description: 'Admin runtime env',
  },
  web: {
    path: 'apps/web',
    envFile: '.env',
    exampleFile: '.env.example',
    description: 'Web runtime env',
  },
};

const variables = {
  ALTERNUN_TESTNET_MODE: {
    description: 'Repo-wide delivery mode flag',
    example: 'on',
    required: true,
  },
  AWS_KEY_ID: {
    description: 'AWS access key ID for local tooling',
    secret: true,
    required: true,
  },
  AWS_SECRET_ACCESS_KEY: {
    description: 'AWS secret access key for local tooling',
    secret: true,
    required: true,
  },
  SUPABASE_PROJECT_REF: {
    description: 'Primary Supabase project ref',
    example: 'aznfyazjndfniwsocdka',
    required: true,
  },
  SUPABASE_ACCESS_TOKEN: {
    description: 'Supabase management token',
    secret: true,
    required: true,
  },
  POSTMARK_API_TOKEN: {
    description: 'Postmark API token',
    secret: true,
  },
  FOSSA_API_KEY: {
    description: 'FOSSA API key',
    secret: true,
  },
  DISCORD_APP_ID: {
    description: 'Discord app identifier',
  },
  DISCORD_AUTH_CLIENT_ID: {
    description: 'Discord OAuth client id',
  },
  DISCORD_PUBLIC_KEY: {
    description: 'Discord application public key',
  },
  DISCORD_AUTH_CLIENT_SECRET: {
    description: 'Discord OAuth client secret',
    secret: true,
  },
  GOOGLE_AUTH_CLIENT_ID: {
    description: 'Google OAuth client id',
    required: true,
  },
  GOOGLE_AUTH_CLIENT_SECRET: {
    description: 'Google OAuth client secret',
    secret: true,
    required: true,
  },
  DATABASE_URL_PROD: {
    description: 'Production PostgreSQL connection string',
    secret: true,
    required: true,
  },
  DATABASE_URL_DEV: {
    description: 'Development PostgreSQL connection string',
    secret: true,
    required: true,
    targets: {
      api: 'DATABASE_URL_DEV',
    },
  },
  DATABASE_URL_DEV_IPV4: {
    description: 'Development PostgreSQL connection string that prefers IPv4-safe routing',
    secret: true,
    targets: {
      api: 'DATABASE_URL_DEV_IPV4',
    },
  },
  DATABASE_URL_DEV_NOIPV4: {
    description: 'Development PostgreSQL connection string without pooler IPv4 routing',
    secret: true,
    targets: {
      api: 'DATABASE_URL_DEV_NOIPV4',
    },
  },
  NODE_ENV: {
    description: 'Node runtime mode',
    example: 'development',
  },
  CLAUDE_ALLOW_DEFAULT_AWS: {
    description: 'Allow default AWS credentials during local work',
    example: 'false',
  },
  EXPO_PUBLIC_API_URL: {
    description: 'Public API base URL',
    example: 'http://localhost:8082',
    required: true,
    targets: {
      mobile: 'EXPO_PUBLIC_API_URL',
      mobileDev: 'EXPO_PUBLIC_API_URL',
      api: 'EXPO_PUBLIC_API_URL',
    },
  },
  EXPO_PUBLIC_SUPABASE_URL: {
    description: 'Supabase project URL',
    example: 'https://aznfyazjndfniwsocdka.supabase.co',
    required: true,
    targets: {
      mobile: 'EXPO_PUBLIC_SUPABASE_URL',
      mobileDev: 'EXPO_PUBLIC_SUPABASE_URL',
      api: 'SUPABASE_URL',
    },
  },
  EXPO_PUBLIC_SUPABASE_KEY: {
    description: 'Supabase publishable key',
    secret: true,
    required: true,
    targets: {
      mobile: 'EXPO_PUBLIC_SUPABASE_KEY',
      mobileDev: 'EXPO_PUBLIC_SUPABASE_KEY',
      api: 'SUPABASE_ANON_KEY',
    },
  },
  EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID: {
    description: 'WalletConnect project id',
    required: true,
    targets: {
      mobile: 'EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID',
      mobileDev: 'EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID',
      api: 'EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID',
    },
  },
  EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER: {
    description: 'Default public OAuth provider',
    example: 'google',
    targets: {
      mobile: 'EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER',
      mobileDev: 'EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER',
      api: 'EXPO_PUBLIC_PRIMARY_OAUTH_PROVIDER',
    },
  },
  EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH: {
    description: 'Enable mock wallet auth fallback',
    example: 'false',
    targets: {
      mobile: 'EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH',
      mobileDev: 'EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH',
      api: 'EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH',
    },
  },
  EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH: {
    description: 'Allow wallet-only auth sessions',
    example: 'false',
    targets: {
      mobile: 'EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH',
      mobileDev: 'EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH',
      api: 'EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH',
    },
  },
  EXPO_PUBLIC_ENABLE_SOCIAL_AUTH: {
    description: 'Enable social auth buttons in the mobile auth screen',
    example: 'true',
    targets: {
      mobile: 'EXPO_PUBLIC_ENABLE_SOCIAL_AUTH',
      mobileDev: 'EXPO_PUBLIC_ENABLE_SOCIAL_AUTH',
    },
  },
  EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: {
    description: 'Auth execution provider selector',
    example: 'supabase',
    required: true,
    targets: {
      mobile: 'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER',
      mobileDev: 'EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER',
      api: 'AUTH_EXECUTION_PROVIDER',
    },
  },
  AUTH_EXECUTION_PROVIDER: {
    description: 'Runtime auth execution provider',
    example: 'supabase',
    required: true,
    targets: {
      mobile: 'AUTH_EXECUTION_PROVIDER',
      mobileDev: 'AUTH_EXECUTION_PROVIDER',
      api: 'AUTH_EXECUTION_PROVIDER',
    },
  },
  AUTH_SIGNUP_PROVIDER: {
    description: 'Runtime signup provider selector',
    example: 'supabase',
    targets: {
      api: 'AUTH_SIGNUP_PROVIDER',
    },
  },
  EXPO_PUBLIC_RELEASE_UPDATE_MODE: {
    description: 'Release update banner mode',
    example: 'off',
    required: true,
    targets: {
      mobile: 'EXPO_PUBLIC_RELEASE_UPDATE_MODE',
      mobileDev: 'EXPO_PUBLIC_RELEASE_UPDATE_MODE',
      api: 'EXPO_PUBLIC_RELEASE_UPDATE_MODE',
    },
  },
  NEXT_PUBLIC_RELEASE_UPDATE_MODE: {
    description: 'Next.js release update banner mode',
    example: 'off',
    targets: {
      web: 'NEXT_PUBLIC_RELEASE_UPDATE_MODE',
    },
  },
  EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE: {
    description: 'Authentik social-login mode',
    example: 'supabase',
    required: true,
    targets: {
      mobile: 'EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE',
      mobileDev: 'EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE',
      api: 'EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE',
    },
  },
  EXPO_PUBLIC_BETTER_AUTH_URL: {
    description: 'Public Better Auth base URL',
    example: 'http://localhost:8082/auth',
    targets: {
      mobile: 'EXPO_PUBLIC_BETTER_AUTH_URL',
      mobileDev: 'EXPO_PUBLIC_BETTER_AUTH_URL',
      api: 'BETTER_AUTH_URL',
    },
  },
  AUTH_BETTER_AUTH_URL: {
    description: 'Internal Better Auth base URL',
    example: 'http://localhost:8082/auth',
    targets: {
      mobile: 'AUTH_BETTER_AUTH_URL',
      mobileDev: 'AUTH_BETTER_AUTH_URL',
      api: 'AUTH_BETTER_AUTH_URL',
    },
  },
  EXPO_PUBLIC_AUTH_EXCHANGE_URL: {
    description: 'Public auth exchange endpoint',
    example: 'http://localhost:8082/auth/exchange',
    targets: {
      mobile: 'EXPO_PUBLIC_AUTH_EXCHANGE_URL',
      mobileDev: 'EXPO_PUBLIC_AUTH_EXCHANGE_URL',
      api: 'EXPO_PUBLIC_AUTH_EXCHANGE_URL',
    },
  },
  AUTH_EXCHANGE_URL: {
    description: 'Internal auth exchange endpoint',
    example: 'http://localhost:8082/auth/exchange',
    targets: {
      mobile: 'AUTH_EXCHANGE_URL',
      mobileDev: 'AUTH_EXCHANGE_URL',
      api: 'AUTH_EXCHANGE_URL',
    },
  },
  EXPO_PUBLIC_AUTHENTIK_ISSUER: {
    description: 'Authentik issuer URL',
    example: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/',
    required: true,
    targets: {
      mobile: 'EXPO_PUBLIC_AUTHENTIK_ISSUER',
      mobileDev: 'EXPO_PUBLIC_AUTHENTIK_ISSUER',
      api: 'AUTHENTIK_ISSUER',
    },
  },
  EXPO_PUBLIC_AUTHENTIK_CLIENT_ID: {
    description: 'Authentik client id',
    example: 'alternun-mobile',
    required: true,
    targets: {
      mobile: 'EXPO_PUBLIC_AUTHENTIK_CLIENT_ID',
      mobileDev: 'EXPO_PUBLIC_AUTHENTIK_CLIENT_ID',
      api: 'AUTHENTIK_CLIENT_ID',
    },
  },
  EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI: {
    description: 'Authentik redirect URI',
    targets: {
      mobile: 'EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI',
      mobileDev: 'EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI',
    },
  },
  EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE: {
    description: 'Authentik login entry mode',
    example: 'source',
    targets: {
      mobile: 'EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE',
      mobileDev: 'EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE',
      api: 'EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE',
    },
  },
  EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS: {
    description: 'Custom Authentik provider flow slugs',
    targets: {
      mobile: 'EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS',
      mobileDev: 'EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS',
    },
  },
  EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS: {
    description: 'Enable custom Authentik provider flow slugs',
    example: 'false',
    targets: {
      mobile: 'EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS',
      mobileDev: 'EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS',
    },
  },
  EXPO_PUBLIC_AIRS_VIDEO_EN_URL: {
    description: 'Override English landing video URL',
    targets: {
      mobile: 'EXPO_PUBLIC_AIRS_VIDEO_EN_URL',
      mobileDev: 'EXPO_PUBLIC_AIRS_VIDEO_EN_URL',
    },
  },
  EXPO_PUBLIC_AIRS_VIDEO_ES_URL: {
    description: 'Override Spanish landing video URL',
    targets: {
      mobile: 'EXPO_PUBLIC_AIRS_VIDEO_ES_URL',
      mobileDev: 'EXPO_PUBLIC_AIRS_VIDEO_ES_URL',
    },
  },
  EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS: {
    description: 'Mobile release check interval',
    example: '60000',
    targets: {
      mobile: 'EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS',
      mobileDev: 'EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS',
    },
  },
  PORT: {
    description: 'API port',
    example: '8082',
    targets: {
      api: 'PORT',
    },
  },
  HOST: {
    description: 'API host binding',
    example: 'localhost',
    targets: {
      api: 'HOST',
    },
  },
  SUPABASE_ANON_KEY: {
    description: 'Supabase anon key',
    secret: true,
    targets: {
      api: 'SUPABASE_ANON_KEY',
    },
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    description: 'Supabase service role key for backend operations',
    secret: true,
    required: true,
    targets: {
      api: 'SUPABASE_SERVICE_ROLE_KEY',
    },
  },
  AUTHENTIK_WEBHOOK_SECRET: {
    description: 'Authentik webhook secret',
    secret: true,
    targets: {
      api: 'AUTHENTIK_WEBHOOK_SECRET',
    },
  },
  VITE_APP_ENV: {
    description: 'Admin app environment name',
    example: 'development',
    targets: {
      admin: 'VITE_APP_ENV',
    },
  },
  VITE_API_URL: {
    description: 'Public API base URL',
    example: 'http://localhost:8082',
    required: true,
    targets: {
      admin: 'VITE_API_URL',
    },
  },
  VITE_AUTH_ISSUER: {
    description: 'Admin Authentik issuer URL',
    example: 'https://testnet.sso.alternun.co/application/o/alternun-admin/',
    required: true,
    targets: {
      admin: 'VITE_AUTH_ISSUER',
    },
  },
  VITE_AUTH_CLIENT_ID: {
    description: 'Admin Authentik client id',
    example: 'alternun-admin',
    required: true,
    targets: {
      admin: 'VITE_AUTH_CLIENT_ID',
    },
  },
  VITE_AUTH_AUDIENCE: {
    description: 'Admin auth audience',
    example: 'alternun-app',
    required: true,
    targets: {
      admin: 'VITE_AUTH_AUDIENCE',
    },
  },
  VITE_ALLOWED_ADMIN_EMAIL_DOMAIN: {
    description: 'Allowed admin email domain',
    example: 'alternun.io',
    targets: {
      admin: 'VITE_ALLOWED_ADMIN_EMAIL_DOMAIN',
    },
  },
};

module.exports = {
  sources: ['.env'],
  rootExampleFile: '.env.example',
  variables,
  targets,
};
