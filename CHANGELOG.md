## 1.2.7 (2026-11-17)

### Bug Fixes

- **achievements:** fix RPC function column names and SQL syntax ([227b126](https://github.com/alternun-development/alternun/commit/227b1267ee970369828ad9ac79777deae8072e5d))
- **achievements:** handle array responses from get_user_achievements RPC ([f51970e](https://github.com/alternun-development/alternun/commit/f51970eb822b9fac7e73a6c9bceb5b25aa230e0d))
- add build scripts to all packages to ignore turbo filter arguments ([860e20d](https://github.com/alternun-development/alternun/commit/860e20d183cb4bb8be501cdcc21644d5e78811e3))
- add clean script to UI package ([d614e14](https://github.com/alternun-development/alternun/commit/d614e143254eeff218f108f1cf640e57c291accd))
- add empty args array to turbo build pipeline ([26fd842](https://github.com/alternun-development/alternun/commit/26fd84262d22ffa9310f96697dec679eff475ec8))
- add explicit authentik social login mode ([6dcf23f](https://github.com/alternun-development/alternun/commit/6dcf23f449c7eae06b362858783d04e537a3a18c))
- add i18n translations to FooterCopyright component ([3a50e5a](https://github.com/alternun-development/alternun/commit/3a50e5a19339a5c70386a244246a12ea605ab764))
- add INFRA_ROUTE53_HOSTED_ZONE_ID to buildspec env vars ([9683877](https://github.com/alternun-development/alternun/commit/9683877e548726fceaaa6f154647e63dc595c7bb))
- add NODE_ENV to turbo build pipeline ([ba59ebb](https://github.com/alternun-development/alternun/commit/ba59ebb177c346e27316816234628f43bdadb31b))
- add ReactNode import to web app layout ([7898f7e](https://github.com/alternun-development/alternun/commit/7898f7e2bc1cd5d7da49538ab33f454c15c602c9))
- add root tsconfig.json for ESLint compatibility ([466125f](https://github.com/alternun-development/alternun/commit/466125f9ea168e040b54662659bef1144840ef9c))
- add sst unlock before deploy to clear stale locks ([3dd3087](https://github.com/alternun-development/alternun/commit/3dd3087d6078fe1c7eaf01b95966c7c715777717))
- adjust tooltip position closer to icon view ([b9d6ca5](https://github.com/alternun-development/alternun/commit/b9d6ca5dc9811a6cb02ae258fa60822304239172))
- **admin-auth:** accept tokens without nbf (Authentik never sets it) ([917db6e](https://github.com/alternun-development/alternun/commit/917db6e1a0142959bc33d2f1c797e2cb5c5b3708))
- **admin,api,docs:** app, build, release, version.development ([26e8f80](https://github.com/alternun-development/alternun/commit/26e8f8064f87d14a729fae5acf1e7509f58d73ba))
- **admin,api,docs:** pnpm-lock, release, version-sync, version-files ([7ff5789](https://github.com/alternun-development/alternun/commit/7ff578931bd5d4b83c7f5c6c7437dc9688875c85))
- **admin,docs,infra:** README, authProvider, authentication-and-session-flow, .env ([b8c2faa](https://github.com/alternun-development/alternun/commit/b8c2faab6cb5a3ea701bc92b99b7c90ba2a661ad))
- **admin,docs,mobile:** README, authProvider, page, router ([cc51e99](https://github.com/alternun-development/alternun/commit/cc51e9973034b41a82b9128eda801941a3dbf4c3))
- **admin:** align marketplace permissions with the API role limits ([b7d7a38](https://github.com/alternun-development/alternun/commit/b7d7a38fff06151382a0a787ebe7b11149780a9b)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **admin:** harden authentik sign-in flow ([92dc2fb](https://github.com/alternun-development/alternun/commit/92dc2fb83889523b0d008240f5583cde7594ca15))
- **admin:** isolate browser authentik relay ([1bee594](https://github.com/alternun-development/alternun/commit/1bee594109c54dd277f9c31d014ac52086f8b213))
- **admin:** let sub-admins and moderators open their notification inbox ([9c94774](https://github.com/alternun-development/alternun/commit/9c9477447d3eb7d9e14afa499a38e448b53c2635)), closes [#309](https://github.com/alternun-development/alternun/issues/309)
- **admin:** open report cards use the full width and keep the date on its own line ([bd4e4ce](https://github.com/alternun-development/alternun/commit/bd4e4ce6077e215a7c20bf5fe656e9988fa14d77)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **admin:** sign-in screen without technical details ([68a660f](https://github.com/alternun-development/alternun/commit/68a660f921a3661ac8cd624646e68c812347ccff)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- **admin:** stop userinfo cors failures ([a4a36e4](https://github.com/alternun-development/alternun/commit/a4a36e4d3f15f37b8cc5bb3dab4a7cae54ca5e3b))
- **admin:** use direct Google source login in production ([fe4ce08](https://github.com/alternun-development/alternun/commit/fe4ce08f59838d226ed2a8c6697b5f42f0531e47))
- **admin:** use provider-specific oidc issuer ([fb122c2](https://github.com/alternun-development/alternun/commit/fb122c29cb3bf5e41819e361c493b18f64e3ba54))
- **admin:** wire authentik oidc login ([963f599](https://github.com/alternun-development/alternun/commit/963f599f98290b1e0d0c2fe48443abf6eb3968e6))
- adopt retained identity secrets before deploy ([ac3739c](https://github.com/alternun-development/alternun/commit/ac3739c6ad6847dba40fd63c2d5fb0ce527a20aa))
- AIRS auth 500s, collapsible referral, country/city pickers, dark mode help modal ([9c0d27f](https://github.com/alternun-development/alternun/commit/9c0d27fc8c5aa87567c3e25eb24de5ee7a4a6714))
- **airs-reports:** link review emails to the admin report; no self-approval ([89eff5c](https://github.com/alternun-development/alternun/commit/89eff5c75db606e3e3ffd7c27c4ecdbc9901df60))
- **airs-reports:** never auto-approve a report to the submitter ([d6ea808](https://github.com/alternun-development/alternun/commit/d6ea808cdc05678a29b62a7547d8f14703d7e80d)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **airs-reports:** require a document number on every report ([c00baeb](https://github.com/alternun-development/alternun/commit/c00baebe325f270bd030ecc7efd8a2afe0f4139b)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **airs,mobile:** award registration bonus after email verification ([9769922](https://github.com/alternun-development/alternun/commit/9769922ece1459a69bf10c2633ff167f0f4ef691))
- **airs:** avoid duplicate links in mobile sharing ([2ead127](https://github.com/alternun-development/alternun/commit/2ead12750f2a8c7934d17416d7fdc5e70e587ee4))
- **airs:** fix null app_user_id in JWTs and backfill prod airs_balance ([fa6ede0](https://github.com/alternun-development/alternun/commit/fa6ede0a65da7f9765ec48105a15ec5e847a355b))
- **airs:** polish badge journeys and personalize milestone sharing ([b3c3dd4](https://github.com/alternun-development/alternun/commit/b3c3dd43a918e262b535cf949a516e0f0f02db10))
- **airs:** streamline mobile milestone sharing ([e8918a7](https://github.com/alternun-development/alternun/commit/e8918a7b007ecd33df37248da86ac7c15b47480f))
- align Docusaurus theme version with core ([ef19e63](https://github.com/alternun-development/alternun/commit/ef19e63b5795d8dc887c3c05117e5404970b2ddf))
- **api,auth,repo:** apply-migrations, runtimeSignIn, 20260422_0012_create_referrals_table, 20260422_0013_auth_users_source_of_truth ([b4b90b3](https://github.com/alternun-development/alternun/commit/b4b90b32f7a43eed79472b9428dd3819ea19652a))
- **api,auth:** route email confirmation through backend ([4aa4a73](https://github.com/alternun-development/alternun/commit/4aa4a7379438b4be53d09a109928770afb065ef9))
- **api,db:** harden referral email delivery ([01f849a](https://github.com/alternun-development/alternun/commit/01f849ab2fd446e9eda5f52bfe4ebb1af3bae16a))
- **api,db:** make AIRS snapshot user ID comparison stage-safe ([b308219](https://github.com/alternun-development/alternun/commit/b30821982c8ddcc97aedd32e3ed8aafeb14f09bc))
- **api,email,repo:** airs.email, referrals.service, referral-reward, referral-reward.test ([6d362ca](https://github.com/alternun-development/alternun/commit/6d362cad6e2b11beb19a2b624868048eaf5ca6d3))
- **api,i18n,repo:** th, pnpm-lock ([123974d](https://github.com/alternun-development/alternun/commit/123974d8ec42d9641eee1c2cd5ba2f0564b13006))
- **api,i18n:** legacy referral fallback and locale sync ([cc9c6c0](https://github.com/alternun-development/alternun/commit/cc9c6c0b3c26f9522eb96e5dd34be2dde8c68831))
- **api,infra:** better-auth-cors, infra.config ([c1357a7](https://github.com/alternun-development/alternun/commit/c1357a7914dfb8578757de935f34638835139277))
- **api,infra:** enable embedded Better Auth with native Google OAuth on testnet ([fa67181](https://github.com/alternun-development/alternun/commit/fa671815da150ae745b82cbc521bb4c378650ccf))
- **api,mobile,i18n:** airs.controller, airs.repository, airs.service, airs-registration-bonus.controller ([1c37d73](https://github.com/alternun-development/alternun/commit/1c37d73fc00a2e29972606f40561b315dc3a6eaa))
- **api,mobile,repo:** .env, build, apply-migrations, empty-module ([6e6f65e](https://github.com/alternun-development/alternun/commit/6e6f65ea46ea5d9f11c709a5fdb72cac4b146aff))
- **api,mobile:** add social sign-in endpoint, fix lint errors ([49a088b](https://github.com/alternun-development/alternun/commit/49a088bbbefeb8a46e1c7cb3b3d10220a142e781))
- **api,mobile:** unified signup response format for proper error handling ([9191fe9](https://github.com/alternun-development/alternun/commit/9191fe9d4e0afb815ac0d8bcaea6a5c0a622c9c6))
- **api,repo:** better-auth-dev.server, pnpm-lock ([f30761a](https://github.com/alternun-development/alternun/commit/f30761a8a361b915be054769cc29d9a9d3650745))
- **api:** accept legacy exchange fields and ignore them (refs [#100](https://github.com/alternun-development/alternun/issues/100)) ([cda9a20](https://github.com/alternun-development/alternun/commit/cda9a203041e281dc20c6355271967dfbf948fff))
- **api:** add in-memory database adapter to Better Auth ([f7d3c77](https://github.com/alternun-development/alternun/commit/f7d3c778756c865033b6174de0ec948e2415680c))
- **api:** add proper typing and eslint-disable comments to Lambda handler ([1065367](https://github.com/alternun-development/alternun/commit/10653677b8074b543efd945adef78ba809d3c6d2))
- **api:** address CodeQL alerts from release v1.1.101 ([9037de6](https://github.com/alternun-development/alternun/commit/9037de652251cb0609dc1af39630ae97022d3d96))
- **api:** airs.email, airs-welcome.email, auth-confirmation.email, signup-welcome.email ([7ef48e1](https://github.com/alternun-development/alternun/commit/7ef48e10a7a1e576bcad7955c5d1a678005f1595))
- **api:** airs.email, auth-confirmation.email ([d461f74](https://github.com/alternun-development/alternun/commit/d461f7428b88b08fa99ad8bdf44f8f5bbba87893))
- **api:** airs.service ([a099938](https://github.com/alternun-development/alternun/commit/a099938bf1c9d0ee57bebf52934cea21ed16d2f9))
- **api:** align fastify 5 runtime stack ([58a40b0](https://github.com/alternun-development/alternun/commit/58a40b0e2d5b8d0a73c402d6c2d2666dddea72e8))
- **api:** auto-enable testnet oauth proxy ([1336ebe](https://github.com/alternun-development/alternun/commit/1336ebedbf38685b87f7ec9868524885e1b46762))
- **api:** better-auth-signup.provider, better-auth-dev.server ([bf8cf13](https://github.com/alternun-development/alternun/commit/bf8cf138af604eb73cac972ecd526351488c2f6f))
- **api:** bootstrap legacy migrations on dev ([688374c](https://github.com/alternun-development/alternun/commit/688374c8c251b70af93904a3c5c69faafef23a5f))
- **api:** build @alternun/i18n before compiling the API ([cfbaab7](https://github.com/alternun-development/alternun/commit/cfbaab7fde64c7911eec3b1d1ebba74f2e88b867))
- **api:** build, app-metadata, dist-lambda ([3279d40](https://github.com/alternun-development/alternun/commit/3279d4051837e824c8c46686dfc1ed76f30d584c))
- **api:** bundle swagger ui assets ([852dac3](https://github.com/alternun-development/alternun/commit/852dac36667c395c71eeb4f6abcc9f762668e352))
- **api:** correct milestone card counters and patch security audit ([f0230ea](https://github.com/alternun-development/alternun/commit/f0230ea98f52aca11d8ec3edc3363cbc57019f9a))
- **api:** ensure CORS headers sent for all responses including errors ([4ffde75](https://github.com/alternun-development/alternun/commit/4ffde752adf92ca12370eeff107cdbaaf738179c))
- **api:** fix airs verifySessionToken return type ([40d7905](https://github.com/alternun-development/alternun/commit/40d79057f029037cc1ea9831b5cd7cde20ea79db))
- **api:** guard null status before comparison in signup error handler ([5e9a1a9](https://github.com/alternun-development/alternun/commit/5e9a1a96ec1715552ab0ef3e60ee58473eb42dea))
- **api:** hardcode version with file system fallback ([7f925f1](https://github.com/alternun-development/alternun/commit/7f925f1f5b456a6617ce7da4cd117fdeff237333))
- **api:** harden decap oauth popup bridge ([88a084d](https://github.com/alternun-development/alternun/commit/88a084df52cc8d2f5d60fbd99108ad5a42dc7785))
- **api:** improve package.json path resolution with multiple fallbacks ([0b21e6c](https://github.com/alternun-development/alternun/commit/0b21e6c508397faf227226b019e2e5ba82167ac8))
- **api:** improve social sign-in endpoint error handling ([26cbce3](https://github.com/alternun-development/alternun/commit/26cbce332613175221e6daa6669e5ea0d5c65351))
- **api:** include package.json in Lambda bundle for runtime version loading ([ee4b420](https://github.com/alternun-development/alternun/commit/ee4b4201b22ff9bae9b9e9855670176bb82b8ffa))
- **api:** initialize lambda proxy before fastify ready ([37781bb](https://github.com/alternun-development/alternun/commit/37781bb499f6a813866395ee4ced0d5a05b2d740))
- **api:** key each Airs report submission by a client key, not the request counter ([74bb35d](https://github.com/alternun-development/alternun/commit/74bb35d7df5783508ccaeb33f9c5fbcf7efdbd1a))
- **api:** listen on 0.0.0.0 to resolve localhost CORS null-status errors ([291af71](https://github.com/alternun-development/alternun/commit/291af7181a2cad0ec6a9f4e0a7e7b4426b10ab17))
- **api:** load app environment for repository-root startup ([22e1275](https://github.com/alternun-development/alternun/commit/22e127502cc218427f2827ad4791251c41369b84))
- **api:** referral-response.dto, referrals.controller ([33fa5e4](https://github.com/alternun-development/alternun/commit/33fa5e406b00da7b9d3fb885d3ef5867de0df134))
- **api:** referrals.service ([6c30165](https://github.com/alternun-development/alternun/commit/6c30165234f51e3bf4f8333a82c6656da1384b86))
- **api:** remove hardcoded version, improve package.json detection ([82fd88d](https://github.com/alternun-development/alternun/commit/82fd88de86934ea8cb05f496e7476d9f395082b9))
- **api:** require a verified session for /auth/exchange (refs [#100](https://github.com/alternun-development/alternun/issues/100)) ([416540e](https://github.com/alternun-development/alternun/commit/416540ea9ece0da8629198b635d1a0a3702a59ce))
- **api:** resolve referral type and update mobile dashboard tests ([bba9ca8](https://github.com/alternun-development/alternun/commit/bba9ca8791a8e935d2db9773015344b9f4d37c65))
- **api:** resolve startup migrations and explain inactive tenants ([f3decc5](https://github.com/alternun-development/alternun/commit/f3decc58cbadb8603f562f4b691d1ae84362f213))
- **api:** restrict CORS to trusted origins (refs [#100](https://github.com/alternun-development/alternun/issues/100)) ([238ff2a](https://github.com/alternun-development/alternun/commit/238ff2a9fc13bba2a72bd21f5f470b3ce78269b5))
- **api:** return error responses instead of throwing to avoid 500 errors ([130994c](https://github.com/alternun-development/alternun/commit/130994caaa0fdde7ec4edd7e9f2d77107ff14fd5))
- **api:** satisfy better auth dev build types ([b1621b4](https://github.com/alternun-development/alternun/commit/b1621b4e4b0cfebd4edd05436e9f45cc0de6fe7a))
- **api:** stabilize decap oauth state crypto helpers ([77a1f61](https://github.com/alternun-development/alternun/commit/77a1f611041d8169587f08b8aca1bf8b0b5b935d))
- **api:** suppress Buffer.isBuffer eslint error with safe cast ([b23c0b1](https://github.com/alternun-development/alternun/commit/b23c0b12a9f555dc19ac8352a1e55c53d5817ceb))
- **api:** trust the testnet admin origin for CORS ([ebcf0d3](https://github.com/alternun-development/alternun/commit/ebcf0d3301b23dc3c3730ea7cbdb66ab0311add5))
- **api:** use fs.readFileSync for runtime version loading in Lambda ([e0485b4](https://github.com/alternun-development/alternun/commit/e0485b49860d60be1ced1e33446a016c450e7071))
- **api:** use stage-aware referral email links ([4101f2c](https://github.com/alternun-development/alternun/commit/4101f2c66b4caf0e7920883659829e6d99d1c3e6))
- **auth,infra:** migrate SMTP delivery to Tlao ([f576d59](https://github.com/alternun-development/alternun/commit/f576d5966bf41a7cda5fc0c5df902e9423f7541b))
- **auth,mobile:** stabilize oauth and airs ui ([6b7cdc4](https://github.com/alternun-development/alternun/commit/6b7cdc4856dde33bc640f0e88b731283a3db57da))
- **auth,update,repo:** research_prompt_20260407_011629 ([e1f3125](https://github.com/alternun-development/alternun/commit/e1f31250f7be00ef00b887a94f96d6c7d6f75e9f))
- **auth+ui:** fix testnet pointing to production APIs + sign-out redirect ([33bbdfa](https://github.com/alternun-development/alternun/commit/33bbdfa7360fce51a19530fb01b9698f46b27207))
- **auth:** address SMTP migration review ([7eb7ca6](https://github.com/alternun-development/alternun/commit/7eb7ca6c4200d5e0981da165f5ac1f88e8991f3a))
- **auth:** allow testnet origin in better-auth trusted origins ([e8f5647](https://github.com/alternun-development/alternun/commit/e8f564767ed0b6a8ca580387320e25b268a097a4))
- **auth:** bootstrap identity pipelines on release ([e125cd3](https://github.com/alternun-development/alternun/commit/e125cd3737b5967424ac8ab7e38be3930120cdc6))
- **auth:** bypass Authentik login page for Google/Discord OAuth ([6f43e24](https://github.com/alternun-development/alternun/commit/6f43e2455a856305f15aee923351eb5ff7c1770c))
- **auth:** bypass legacy Google flow in production ([d8ef1c0](https://github.com/alternun-development/alternun/commit/d8ef1c064be254f9fe75596ac4a9ae4e91e9f9fa))
- **auth:** capture OIDC callback search at module load time ([ae3f594](https://github.com/alternun-development/alternun/commit/ae3f594de28e3e2bd597e44ac48427da30b109e6))
- **auth:** Correct logo selection for light and dark modes ([053b0c6](https://github.com/alternun-development/alternun/commit/053b0c67d353eebba03110bd8a21393b70ab659c))
- **auth:** deploy API with DATABASE_URL environment variable ([e72a6d0](https://github.com/alternun-development/alternun/commit/e72a6d0d9e6f1daefcd9d3a28736fdc4768aca47))
- **auth:** establish consistent signup routing standard ([83edd6a](https://github.com/alternun-development/alternun/commit/83edd6ad095c98c7a44baf830769a61f5c569074))
- **auth:** fix settings dropdown z-index stacking over card content ([a01ad26](https://github.com/alternun-development/alternun/commit/a01ad2665d58d415c52a52f6c7cc919ad8b83849))
- **auth:** fix Supabase setSession this-binding and inject Authentik env into CI ([e30f9d2](https://github.com/alternun-development/alternun/commit/e30f9d25749f705f467a27c55e5b51437a4844c5))
- **auth:** handle Better Auth endpoint discovery ([00568a7](https://github.com/alternun-development/alternun/commit/00568a701b2e0a189201e1f7dfb964a89a8eb7a0))
- **auth:** hide layout footer on auth route ([0078b52](https://github.com/alternun-development/alternun/commit/0078b52bfee4e5c8a37447caff28f25f2e951304))
- **auth:** Hide private views and menu items from unauthenticated users ([ea729f5](https://github.com/alternun-development/alternun/commit/ea729f53e3e13022a464a0968b7af48ef64da340))
- **auth:** improve settings dropdown — solid bg, no chevron, active gear state ([2816594](https://github.com/alternun-development/alternun/commit/2816594b1bc082e8467513e9b36b7790939d05fa))
- **auth:** improve signup error handling with proper typing ([8592e21](https://github.com/alternun-development/alternun/commit/8592e21ac497cfb61b4bd752e96789cf014cd1ea))
- **auth:** infer better-auth signup on testnet ([c6cc431](https://github.com/alternun-development/alternun/commit/c6cc431818c5554f1baad38c3f25c748224163c4))
- **auth:** initialize database migrations on API startup ([6a0509b](https://github.com/alternun-development/alternun/commit/6a0509b5ca00d840201e62e75c4aa89b8dfa1859))
- **auth:** keep Better Auth callback errors on the auth route ([340d7f4](https://github.com/alternun-development/alternun/commit/340d7f44ac637667c2e2392be07efa2ad1baf52b))
- **auth:** keep signup on Supabase ([2af03a2](https://github.com/alternun-development/alternun/commit/2af03a2cc37ed32614b7247f5a6d17822ba408f1))
- **auth:** keep testnet on direct callback flow ([0f1a0ed](https://github.com/alternun-development/alternun/commit/0f1a0edbbce2bc2f0505c9b24a5ff1a5e5409d6c))
- **auth:** let the backend own email auth for both Better Auth and Supabase ([df24734](https://github.com/alternun-development/alternun/commit/df2473404a6a1aa37ba53bd8b855768c15b1032f))
- **auth:** pass supabase env via app provider options ([9b912ca](https://github.com/alternun-development/alternun/commit/9b912cafbff0efcc9c4be0c81f0b55be7d997f45))
- **auth:** persist Better Auth email login sessions in localStorage ([6e21d91](https://github.com/alternun-development/alternun/commit/6e21d91fb7941720f64fd6e59ad7303c8e5cc87d))
- **auth:** preserve legacy OIDC user identities ([61bc656](https://github.com/alternun-development/alternun/commit/61bc6569f802fd9f8b43ff1daa15b4cfb0e1050b))
- **auth:** preserve metadata after email verification ([792fe64](https://github.com/alternun-development/alternun/commit/792fe64f0860e5fda4cc71144a452ccdf89e7956))
- **auth:** provision Authentik callbacks through API ([1dfefe0](https://github.com/alternun-development/alternun/commit/1dfefe02a21a442f4af8da5154faf6a03609ff50))
- **auth:** referral code hidden by default, back button, fix sessionStorage pre-fill ([77fec9c](https://github.com/alternun-development/alternun/commit/77fec9ccf95c7e5d287495786cf54a1dff1a92a4))
- **auth:** refuse retired SMTP provider for verification emails ([d79147d](https://github.com/alternun-development/alternun/commit/d79147d5fff05b4a529a93e9d491924dfad8be3a))
- **auth:** remove better-auth and server-only exports to prevent web bundling ([6484f39](https://github.com/alternun-development/alternun/commit/6484f394a5998cd36bcb5b030ccae39fc88e7810))
- **auth:** remove Google source authentication_flow + keep spinner during OIDC callback ([28d0ed8](https://github.com/alternun-development/alternun/commit/28d0ed86c19590d689d0609b68fcabe7b0ade0ad))
- **auth:** remove server-only and better-auth exports from main index ([0e44ed1](https://github.com/alternun-development/alternun/commit/0e44ed1ae8d4b62424410338416bf3467eb47b8d))
- **auth:** remove server-only and better-auth exports from main index ([de91649](https://github.com/alternun-development/alternun/commit/de91649f54ce8bf9c1b2672c500791aa98586ece))
- **auth:** remove server-only exports from main package to fix web bundling ([c9e6550](https://github.com/alternun-development/alternun/commit/c9e6550d7b3eb9e2b6785c4405f864dbbc64f0fb))
- **auth:** repair admin authentik sign-in ([9ab6aad](https://github.com/alternun-development/alternun/commit/9ab6aad6c290d9e3f69e781141acc7e8aa241337))
- **auth:** repair production signup provisioning ([e2fe7a3](https://github.com/alternun-development/alternun/commit/e2fe7a31c58182b009073ce2d349260718c3a069))
- **auth:** resolve @edcalderon/auth/authentik via local re-export ([ed522a5](https://github.com/alternun-development/alternun/commit/ed522a555999afe3fe9b2ca1c5882675b53a32c5))
- **auth:** resolve DATABASE_URL from AWS Secrets Manager for Better Auth ([784815a](https://github.com/alternun-development/alternun/commit/784815aa18f964e52fd26d448b423790298a3041))
- **auth:** resolve signup 500 error and add social login to signup flow ([d0a37cd](https://github.com/alternun-development/alternun/commit/d0a37cdf0288c99d07b4bca8c37801d6dfcd38dd))
- **auth:** restore generated artifacts ([93cc2da](https://github.com/alternun-development/alternun/commit/93cc2da87385a12a7325c7e538d0363709a7dc01))
- **auth:** restore local Better Auth social flow ([307514a](https://github.com/alternun-development/alternun/commit/307514af79d8ff871c204389bf6cdaba8ba82fc8))
- **auth:** scope better auth cookies to stage domains ([996225f](https://github.com/alternun-development/alternun/commit/996225f57681f6fe9325083e36ae14fe92dcf7ad))
- **auth:** send 6-digit email code and keep email auth on Better Auth ([c77dd45](https://github.com/alternun-development/alternun/commit/c77dd45f4ac0e172ce0fc5ed6a118c8edb58c4df))
- **auth:** send credentials and drop legacy exchange fields (refs [#100](https://github.com/alternun-development/alternun/issues/100)) ([4da2a71](https://github.com/alternun-development/alternun/commit/4da2a71a746c1d778a55f3cf28969979c7beb792))
- **auth:** settings menu Language/Theme clicks no longer close the dropdown ([5ad39a8](https://github.com/alternun-development/alternun/commit/5ad39a82ca0fb1bbf4ee1966bee8367f5120e35d))
- **auth:** simplify session token sync to prevent infinite refresh loops ([be02ffd](https://github.com/alternun-development/alternun/commit/be02ffd5168ea6e8c4b811f65712229bf4ef8d37))
- **auth:** simplify to rely on Better Auth HTTP-only cookies only ([96fb147](https://github.com/alternun-development/alternun/commit/96fb147fa43d6941e6e39309f42e42e2017cec95))
- **auth:** sync canonical docs and mobile build ([1f152c8](https://github.com/alternun-development/alternun/commit/1f152c88ce86436995832b2f602190b2ab308c4e))
- **auth:** use better-auth for Google social login on testnet dev stage ([8f5fdc8](https://github.com/alternun-development/alternun/commit/8f5fdc80b0e3e6264a9a787e546ac16d4b4edf50))
- build tracked artifacts during release ([a652143](https://github.com/alternun-development/alternun/commit/a6521436e0d24d4997a888cc485d86a1248a8dac))
- canonicalize better auth public base url ([4c2770c](https://github.com/alternun-development/alternun/commit/4c2770cd2e87f4acb6a8691b39ddeb4d5fbff388))
- canonicalize expo app path for ci asset deploys ([42d40ea](https://github.com/alternun-development/alternun/commit/42d40ea9ba6524414f8c67aa7da5885ce5acbfbc))
- center align mobile landing footer bottom bar in compact mode ([a7a416d](https://github.com/alternun-development/alternun/commit/a7a416d773b909065051c5107b8e17c58427877f))
- **ci,release,infra:** add Codecov coverage and idempotent promote ([6ea7921](https://github.com/alternun-development/alternun/commit/6ea79213b58a4a90f2e2631d02e0d96e53346b17))
- **ci:** add sanitize-html types ([6932d69](https://github.com/alternun-development/alternun/commit/6932d69effb993a6c0c9e714ac96d6b88d46b7af))
- **ci:** address codeql alerts in auth helpers ([ac7d393](https://github.com/alternun-development/alternun/commit/ac7d393f9478df23b635e08fcfe720e96b73890f))
- **ci:** align identity dev pipeline database mode ([3774f43](https://github.com/alternun-development/alternun/commit/3774f43a9aa93cd245994bc2bbca6f5d3b3fdc9e))
- **ci:** enforce primary reachability and make redirect checks configurable ([2f4e9b7](https://github.com/alternun-development/alternun/commit/2f4e9b79ec1ed37836df397671fabcf20046c653))
- **ci:** generate mobile icons with sharp ([c681ae4](https://github.com/alternun-development/alternun/commit/c681ae4d787571da8f61abc3f375de36e064783b))
- **ci:** invoke turbo directly for build matrix ([1dc86d0](https://github.com/alternun-development/alternun/commit/1dc86d056c14d8cefbb3468f70eafc5bdded2c1a))
- **ci:** make mobile env test deterministic ([2c386d4](https://github.com/alternun-development/alternun/commit/2c386d4a07bab2a270771ac72bc85319a4e7a2be))
- **ci:** reduce duplicate and slow checks ([20ba5b3](https://github.com/alternun-development/alternun/commit/20ba5b362da3c208947c6a4e2771c2e704f17cd9))
- **ci:** refresh audit pin and mobile env tests ([bc2c2e5](https://github.com/alternun-development/alternun/commit/bc2c2e52f432d81bc4d9ecee0eb48e0b2c271077))
- **ci:** refresh pnpm lockfile for wallet package ([5acce33](https://github.com/alternun-development/alternun/commit/5acce336a30ea3f0373d1f6a52dd531439ff6c00))
- **ci:** repair Footer.shared tests and CodeQL regex injection alert ([8405013](https://github.com/alternun-development/alternun/commit/84050135a9e2e4c5a9fee4832bf332ac295fef4a))
- **ci:** require reachability script when check is enabled ([3af6939](https://github.com/alternun-development/alternun/commit/3af6939b4effd20de18f062322be7df1938d4fbc))
- **ci:** run reachability checks inline to avoid source artifact drift ([63b8b2c](https://github.com/alternun-development/alternun/commit/63b8b2c99b92fd54d58f1a7550b051378bc1a608))
- **ci:** source AWS env credentials from secrets manager ([4a0d47f](https://github.com/alternun-development/alternun/commit/4a0d47fbfdef7de2dc8d2704d962fce5b230e6ae))
- **ci:** sync changelog parser and lockfile ([a2a0ca1](https://github.com/alternun-development/alternun/commit/a2a0ca1e54210c6be9649ca52874e85303b545de))
- **ci:** sync lockfile and fix CodeQL insecure-randomness alert ([b9c7347](https://github.com/alternun-development/alternun/commit/b9c7347e6a5cef80dda6166183fd9b7923b20b4a))
- **ci:** target workspace packages in build matrix ([b88a262](https://github.com/alternun-development/alternun/commit/b88a2626c067bfb9f57c4176b2d2dd775601c2bc))
- **ci:** unblock release checks and code scanning ([a144967](https://github.com/alternun-development/alternun/commit/a14496744c062c0b9d8dce1a022e7e6674cde7bf))
- **ci:** update lockfile for api sanitize-html ([bbaade7](https://github.com/alternun-development/alternun/commit/bbaade71a32b007162edf97327e9b49b8b281e04))
- **ci:** use codebuild iam role instead of static aws keys ([4ff81af](https://github.com/alternun-development/alternun/commit/4ff81af6a11b1c3ef54934831f1c4910c25435c6))
- clear stale api url in ci builds ([4e080d7](https://github.com/alternun-development/alternun/commit/4e080d75077925e6b51987ff345e17cf967761dd))
- consolidate ts-expect-error comment ([ee229fb](https://github.com/alternun-development/alternun/commit/ee229fb9e1f98f1f67e7e1df93d90a802a61dd3f))
- correct docs status badge URL in README ([663e6b6](https://github.com/alternun-development/alternun/commit/663e6b622d4371f34337b3c38c387654bb7db860))
- correct import path for migrations module ([8183d90](https://github.com/alternun-development/alternun/commit/8183d906305721373d5831dfd5ef028ce4359e63))
- correct versioning commands and update Node.js requirements ([9f6437b](https://github.com/alternun-development/alternun/commit/9f6437b9c4d0ec13bbf18dde76693a48e2168d0c))
- create build script to ignore turbo filter arguments ([a95e123](https://github.com/alternun-development/alternun/commit/a95e123124e38f40010de24bdc8fe832aa9c2216))
- dashboard footer layout - align copyright and controls on same line ([2a8f950](https://github.com/alternun-development/alternun/commit/2a8f950cdb9d1fdb6991d2d01f3af6c7fd553893))
- **dashboard:** correct welcome bonus endpoint URL and cleanup unused state ([fff8f4f](https://github.com/alternun-development/alternun/commit/fff8f4f239c16cd6ca47d72156eb4b65f55e9103))
- **db:** close moderator media reorder and sub_admin approval in SQL ([cca5d3a](https://github.com/alternun-development/alternun/commit/cca5d3aa42c211158445f662be30e135cd0e3dd8)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **db:** force-drop stale AIRS uuid overloads causing PGRST203 ambiguity ([d7c099d](https://github.com/alternun-development/alternun/commit/d7c099df665310c47b469ecde73c03ebb390f6f3))
- **deps:** bump better-auth to 1.7.14 for GHSA-965c-763c-88jm ([88b2775](https://github.com/alternun-development/alternun/commit/88b2775fd2d88514a603b422fb072d97d56303fe))
- **deps:** bump shell-quote to 1.8.4 ([c59937b](https://github.com/alternun-development/alternun/commit/c59937b7807d46c8724b6928cddc2693c2df59b0))
- derive authentik redirect uri ([e8347a7](https://github.com/alternun-development/alternun/commit/e8347a7efe9cbfd220d9a5de64b2e230ed0c8454))
- disable passThruArgs in turbo build pipeline ([ef2576b](https://github.com/alternun-development/alternun/commit/ef2576b2e6e09dd71f48aa25752b529ebb79404a))
- **docs,mobile,auth:** CHANGELOG, changelogData ([5dc23ac](https://github.com/alternun-development/alternun/commit/5dc23ac92d81ecbccc0f6bf6c57026878f94b6c9))
- **docs,mobile,auth:** CHANGELOG, PublicLandingPage, AirsIntroExperience, changelogData ([b04ff17](https://github.com/alternun-development/alternun/commit/b04ff17bde8c70a451a2b0c1143c4c51c8e94d13))
- **docs,mobile,auth:** mi-perfil, ProfileStyles ([849d670](https://github.com/alternun-development/alternun/commit/849d670ef013fb3fabd85cdd50b27895b207d2de))
- **docs,repo,auth:** authentication-and-session-flow, CHANGELOG, alternun-better-auth-testnet-execution-plan, .env ([46222f8](https://github.com/alternun-development/alternun/commit/46222f8ee4a453fbfe44da3e4e77699c354d53e6))
- **docs,repo,infra:** authentication-and-session-flow, alternun-authentik-social-login-incident-2026-04, README, bootstrap-authentik-integrations ([c9b7566](https://github.com/alternun-development/alternun/commit/c9b756646d9f217ae0911361bb243a65088b37e6))
- **docs,web:** build ([4b402ba](https://github.com/alternun-development/alternun/commit/4b402ba180d46738d65a4bdc456c32473998292f))
- **docs:** repair localized terms Markdown rendering ([c951daa](https://github.com/alternun-development/alternun/commit/c951daa1c6fb93b258b4c672da486b1119ca1d6f))
- **docs:** tags ([c648a53](https://github.com/alternun-development/alternun/commit/c648a532ee3fdf2fd2ca04f4c0fcd6046b8312db))
- **email:** 28 files updated ([86fe21e](https://github.com/alternun-development/alternun/commit/86fe21e31b8ce81d63db09e58e5f6237199c90ec))
- exclude apps/web from root ESLint configuration ([98111ba](https://github.com/alternun-development/alternun/commit/98111bae59e07d26cf899b1bac23ec90de9ae452))
- exclude footer from vortex animation ([38cd39c](https://github.com/alternun-development/alternun/commit/38cd39c2ffd2ace620ea8f6246d98071e76bc26b))
- **explore:** city instead of country code, plurals and placeholder values ([2c4dd65](https://github.com/alternun-development/alternun/commit/2c4dd6540471b44341b66bda5d8f5efc82aa7faa)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- fail closed on activity write config ([9338c6c](https://github.com/alternun-development/alternun/commit/9338c6c515a3f33519d29610c32b436cab5e362a))
- force canonical cert overrides in ci ([3b530bd](https://github.com/alternun-development/alternun/commit/3b530bdc2d7ee24ad17320b395d0916f252d746a))
- force canonical infra domains in ci ([f95550e](https://github.com/alternun-development/alternun/commit/f95550e175432a5e0a9ae19edeb52872ff3296d5))
- format code with Prettier ([d53a67e](https://github.com/alternun-development/alternun/commit/d53a67ebc042f605370a63c839c7f21f514b5fbe))
- gate retained secret adoption to recovery ([b96c31f](https://github.com/alternun-development/alternun/commit/b96c31fd1dc6fbe7bad33d265992eced3d863699))
- **gitignore:** ignore i18n dist folder ([a3759db](https://github.com/alternun-development/alternun/commit/a3759dbad0395e81c7360516704ef4fbc86171a8))
- harden AIRS database privileges ([2a3b4d6](https://github.com/alternun-development/alternun/commit/2a3b4d64cdda950f86ee2b9b07483acd13c3dc48))
- harden infra deploy DNS and cert checks ([4651d6f](https://github.com/alternun-development/alternun/commit/4651d6fe3acf0f44e7854de709aa2518b8bb4e72))
- hide scroll arrows when not needed in horizontal scroller ([5aa5a72](https://github.com/alternun-development/alternun/commit/5aa5a7240ea0c6d3741ef4da2b8d1b534bd8107e))
- **i18n:** runtime.test ([6cfccb3](https://github.com/alternun-development/alternun/commit/6cfccb3b168b9d07dbb3ce510b8e99a2fb53ad67))
- **i18n:** sync landing copy across locales ([65ef862](https://github.com/alternun-development/alternun/commit/65ef862006b3f43c4e1f988fdd970937197419c6))
- **i18n:** translate referral QR labels to Thai ([fe209e4](https://github.com/alternun-development/alternun/commit/fe209e4ff17950e6351a990aa21c5d760f14a38a))
- **identity:** admin logout redirects to admin login, not Authentik screen ([d204823](https://github.com/alternun-development/alternun/commit/d2048239a9ce44f8ad3c3be5620f414a36d723bc))
- **identity:** align production google flow ([5c33e45](https://github.com/alternun-development/alternun/commit/5c33e45a6a944756ebfe9e40b2659bd6ee17d19d))
- **identity:** complete admin release integration ([b3ada97](https://github.com/alternun-development/alternun/commit/b3ada9710cbec4eb76a1ff85f3976a30886d676f))
- **identity:** fix container IP lookup and increase verify script timeout ([8152b5a](https://github.com/alternun-development/alternun/commit/8152b5a2d61b4d78394fe5c8af5c61a473430235))
- **identity:** harden ec2 bootstrap and traefik host rule ([16ab353](https://github.com/alternun-development/alternun/commit/16ab3539b034f76efe292241a92763887d441a74))
- **identity:** keep admin policy bootstrap app-scoped ([58e5930](https://github.com/alternun-development/alternun/commit/58e5930f08d67ac2ffa1e6f45c25d5ba33c48e99))
- **identity:** promote [@alternun](https://github.com/alternun).io users to internal and add shared dev admin ([923ba28](https://github.com/alternun-development/alternun/commit/923ba2821242483f6282b4187ccbf844c68c19d4))
- **identity:** promote internal google admins ([3c00d85](https://github.com/alternun-development/alternun/commit/3c00d859f9b381e87b4332df5399f7de41716a0c))
- **identity:** repair admin SSO redirect loop and add monthly DB backups ([bc4aaea](https://github.com/alternun-development/alternun/commit/bc4aaea9b927a4ca3c95729e2bfab673e47c3e10))
- **identity:** replace manage.py shell readiness check with HTTP health endpoint ([9236796](https://github.com/alternun-development/alternun/commit/9236796171f38adc38297879c9c92b969a742dea))
- **identity:** wait for SSM agent online before dispatching runtime sync ([51a8a06](https://github.com/alternun-development/alternun/commit/51a8a06d37a43bacf6188a11df10e481687c7b3b))
- improve hero section styling and light mode support ([25592b1](https://github.com/alternun-development/alternun/commit/25592b156ce7c76e16d335b6d5fc42c147d64510))
- improve mobile PWA behavior and show full app name on topbar ([5871d49](https://github.com/alternun-development/alternun/commit/5871d49ee8a8f4ba01001a29cacaa0e8b4625471))
- improve notification badge styling with circular container and overlay badge ([3354976](https://github.com/alternun-development/alternun/commit/335497622cebc724796f796926bdab3b49d1ca6c))
- improve tooltip positioning, z-index layering, and last-update timestamp ([5080448](https://github.com/alternun-development/alternun/commit/50804481b096fa72de676d2c73f3fffa286c6a40))
- increase tooltip width while maintaining center positioning, add return type ([b00527b](https://github.com/alternun-development/alternun/commit/b00527b2a0a484654487d473bfe8e677af7c2a72))
- **infra,scripts:** buildspec, resolve-secrets-manager-env, setup-aws-account ([b39ec0f](https://github.com/alternun-development/alternun/commit/b39ec0fc465ebdd700bf1c35aebb05052d515e28))
- **infra:** .env, buildspec, redirects, sst-deploy ([2a41ee2](https://github.com/alternun-development/alternun/commit/2a41ee29942c1f430aa880b8b6532ba20f7a056a))
- **infra:** add --kill-after to exec timeouts and extend SSM poll budget ([2a6ad3a](https://github.com/alternun-development/alternun/commit/2a6ad3afb0dc32e4eb17ca62c57eb9f1d96ef8d7))
- **infra:** address code review findings on OAuth SSM resolution ([7decad4](https://github.com/alternun-development/alternun/commit/7decad4d179bc65cc606a82867872e9625e9fc01))
- **infra:** admin auth settings from the admin panel's Authentik provider ([045ae68](https://github.com/alternun-development/alternun/commit/045ae688353203b8311b53b92cb6a6a34f4b2fd1)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- **infra:** adopt existing identity secrets ([fac6906](https://github.com/alternun-development/alternun/commit/fac69065d34aa6c351a660c1fd1413a065f47c51))
- **infra:** adopt retained identity secrets for identity-prod and identity-dev ([cb02d10](https://github.com/alternun-development/alternun/commit/cb02d10d62a1660d58ea4f08f3e607fa9489b2e9))
- **infra:** allow certificateArn reassignment ([02981c3](https://github.com/alternun-development/alternun/commit/02981c317da9958d8b03c42fe43dd18a40d86e88))
- **infra:** allow dedicated non-expo stack deploys ([424f781](https://github.com/alternun-development/alternun/commit/424f78118294a72ff6944821932f247b4b3dcd1a))
- **infra:** apply dashboard migrations before deploy ([063dcfc](https://github.com/alternun-development/alternun/commit/063dcfca92de0ff58f9fe19650c56dadd86ebb79))
- **infra:** apply production RDS protections to identity-prod stage ([aad6e2d](https://github.com/alternun-development/alternun/commit/aad6e2d7ab5b96ec5e28e7b93b9a8ad4703750cb))
- **infra:** auto-allow protected instance replacement when deployment changes require it ([5d0fab4](https://github.com/alternun-development/alternun/commit/5d0fab4a9cafece3d5550e2158bc27f6908d95eb))
- **infra:** auto-invalidate CloudFront cache after deployments ([dc8eb3c](https://github.com/alternun-development/alternun/commit/dc8eb3c64e5605893ff025abafddd2c6db0aa950))
- **infra:** auto-provision api custom domain certs ([bcf9e4e](https://github.com/alternun-development/alternun/commit/bcf9e4ee7802423d4b21f8d3a531def7ede0e187))
- **infra:** auto-recover identity RDS drift via sst refresh ([654f372](https://github.com/alternun-development/alternun/commit/654f3722e9cf0ee89a24707ad47d22bbae9e9047))
- **infra:** build expo site before sync ([04b7ea1](https://github.com/alternun-development/alternun/commit/04b7ea19adc1d6b4378bfbeccc76fd09e75ae943))
- **infra:** bump SSM env cache to v3 for the stage-path fix ([dea0a7b](https://github.com/alternun-development/alternun/commit/dea0a7b3445efa8de56238a3c26585a096b573b7))
- **infra:** bypass sst-deploy.sh wrapper with direct npx sst deploy ([0cf09b8](https://github.com/alternun-development/alternun/commit/0cf09b80e99c9e69904681f9e780386830885f87))
- **infra:** correct misleading 'reset to false' comment on identity secret adoption ([c867b3b](https://github.com/alternun-development/alternun/commit/c867b3b97ca5b0d00cea07906daa3a9a779741f7)), closes [#243](https://github.com/alternun-development/alternun/issues/243) [#244](https://github.com/alternun-development/alternun/issues/244)
- **infra:** degrade source-stage hotfix gracefully when pattern not found ([c505f9b](https://github.com/alternun-development/alternun/commit/c505f9bd504c9c251a8eb3fa261e314f9b041fe4))
- **infra:** derive testnet api URLs from api host ([c3a951e](https://github.com/alternun-development/alternun/commit/c3a951e62185e2081fcc5226c9eeb1d706ee08f8))
- **infra:** enable AUTO_REMOVE_CONFLICTING_DNS for dev DNS cleanup ([752ee97](https://github.com/alternun-development/alternun/commit/752ee97f7a12ee7b27d19ca58f3387546d3118a0))
- **infra:** ensure sst-deploy.sh loads correct AWS account credentials ([4476bbd](https://github.com/alternun-development/alternun/commit/4476bbdf63713704ee0550873d1f7abefffa38f1))
- **infra:** export APPROVE to sst-deploy script using explicit export ([730735e](https://github.com/alternun-development/alternun/commit/730735e67e1fd29bc114e81d38db0a34122c8239))
- **infra:** export resolved route53 zone for deploys ([f9696eb](https://github.com/alternun-development/alternun/commit/f9696eb7c290f4fab6e850976a8989a6dcec8ba1))
- **infra:** fail build on SSM errors, warn only on ParameterNotFound ([e00d2f6](https://github.com/alternun-development/alternun/commit/e00d2f617ed35d34973c2db2c308aa237e67ad78))
- **infra:** force managed cert mode in CI runtime ([f77c9e8](https://github.com/alternun-development/alternun/commit/f77c9e82b7425b7fc818d51a97f6a88b1439b9a2))
- **infra:** force SSM_SHARED_STAGE for prod Google/Discord OAuth lookup ([ba49d18](https://github.com/alternun-development/alternun/commit/ba49d180535e27fedbbfef8f72a5c0c6c7185161))
- **infra:** guard identity stacks from accidental disable ([7537c8d](https://github.com/alternun-development/alternun/commit/7537c8d3d031fa6f434cd8c58e8313c67ae2248c))
- **infra:** guard managed pipeline reconciliation ([9042442](https://github.com/alternun-development/alternun/commit/9042442c42753de454faee9c590d64e5523dea1b))
- **infra:** guard production identity migration ([d85038f](https://github.com/alternun-development/alternun/commit/d85038f24a59f89ca23e2e681a4810c5f716b73d))
- **infra:** harden Authentik startup cleanup ([a7b3773](https://github.com/alternun-development/alternun/commit/a7b3773d5d53b8abf69cfdb54e9847eef8409382))
- **infra:** harden dev deploy and redirect certificate handling ([549e136](https://github.com/alternun-development/alternun/commit/549e136cfa80d3b0ce2b926ebe878977d4dd6b89))
- **infra:** ignore orphaned pending operations in cert state guard ([d26e87a](https://github.com/alternun-development/alternun/commit/d26e87a2570653b9cf6e3b68bed314342132f081))
- **infra:** ignore stale completed pending operations in cert state guard ([ee313cb](https://github.com/alternun-development/alternun/commit/ee313cbb331220c85938714d7f8694f70d2a6f44))
- **infra:** implement true 308 redirects via route-level edge injection ([2f006c7](https://github.com/alternun-development/alternun/commit/2f006c745146eb0979316f356e8e11adb2332d9b))
- **infra:** inject Authentik OIDC env vars into Expo SST build ([f64369d](https://github.com/alternun-development/alternun/commit/f64369dfcbb0063594499e4f5959a0000c65e81e))
- **infra:** isolate identity provisioning to dedicated stacks ([2f3cffb](https://github.com/alternun-development/alternun/commit/2f3cffbe60801eac03a15c1f9786ad2647562471))
- **infra:** keep identity runtime sync logs off stdout ([a84f895](https://github.com/alternun-development/alternun/commit/a84f895d08c18b24a52157e74768528b19a5fc59))
- **infra:** lift identity RDS protection during drift-recovery refresh ([c68e64d](https://github.com/alternun-development/alternun/commit/c68e64d3511adb3bcce342a93a02491d2a015d50))
- **infra:** make SMTP secret adoption opt-in ([e8cc910](https://github.com/alternun-development/alternun/commit/e8cc910e2a3abeeb52f89a54be8f6a1168fdd73b))
- **infra:** make static-site invalidation non-blocking ([ed662dd](https://github.com/alternun-development/alternun/commit/ed662dd37556811a0bdce71128cb0c3d8678e4e7))
- **infra:** make the pipeline-parity guard actually run and actually work ([089954c](https://github.com/alternun-development/alternun/commit/089954c31e9a827e1da7997d5589d9f265b0546f))
- **infra:** migrate identity runtime sync templates ([5c22634](https://github.com/alternun-development/alternun/commit/5c2263495b225f7be77d0167404bebf59fb06d47))
- **infra:** monitor TLS for air.alternun.co and alternun.co redirects ([efadfaf](https://github.com/alternun-development/alternun/commit/efadfaf0f6253c7a716f28e57d8f2e3b66abd933))
- **infra:** point dashboard-prod at the -v2 identity integration-config secret ([#228](https://github.com/alternun-development/alternun/issues/228)) ([7c9f1e6](https://github.com/alternun-development/alternun/commit/7c9f1e6ba27608de18a60c79f38a34bd1f6452b8)), closes [#220](https://github.com/alternun-development/alternun/issues/220)
- **infra:** preserve adopted database password on import ([11835ce](https://github.com/alternun-development/alternun/commit/11835ce015a72af0fff393e705f3ef937ee233eb))
- **infra:** preserve identity recovery aliases ([85f9a73](https://github.com/alternun-development/alternun/commit/85f9a734dec92533e080226cf5d68240bdc15288))
- **infra:** preserve in-use ACM certs ([d45f764](https://github.com/alternun-development/alternun/commit/d45f7648187af294a653067cccdb9b9a33d55845))
- **infra:** prevent docker exec hangs in identity runtime sync ([1862663](https://github.com/alternun-development/alternun/commit/18626638622623f914b14b5fca21575275ee730c))
- **infra:** prevent secret sync from breaking codebuild ([cacd9d9](https://github.com/alternun-development/alternun/commit/cacd9d98460626611bec176dcf6b855d66c71157))
- **infra:** protect dashboard deploys and bootstrap admin oidc ([4d93038](https://github.com/alternun-development/alternun/commit/4d9303878ecb5c7309527b7b719b5984264a2791))
- **infra:** qualify production identity secret with its stage ([1a14cde](https://github.com/alternun-development/alternun/commit/1a14cdea805873a6bb570fbf05975908bf6e971a))
- **infra:** README, shared, identity-resources, bootstrap-authentik-integrations ([68ba117](https://github.com/alternun-development/alternun/commit/68ba11789a110c2222f92412db9e94313be5d296))
- **infra:** rebuild backend api before deploy ([7cd290f](https://github.com/alternun-development/alternun/commit/7cd290f04954bad16cfc83f9d4375d6c2f1873b4))
- **infra:** reconcile adopted identity recovery state ([3ffff34](https://github.com/alternun-development/alternun/commit/3ffff34b88df3db58514eebf0ac19fda3255ae42))
- **infra:** rename expo site bucket ([332c10a](https://github.com/alternun-development/alternun/commit/332c10a409af9a8af640dcf4a1d1034109da942c))
- **infra:** reset viewer cert when cloudfront alias list is emptied ([7f5c25a](https://github.com/alternun-development/alternun/commit/7f5c25a76980d90c8cca8f8c200f389a679f21ad))
- **infra:** resolve admin site path from infra root ([afa16fa](https://github.com/alternun-development/alternun/commit/afa16fac793756cbbbce3db38c0e48da5d59589c))
- **infra:** resolve Authentik OIDC config per-stage from SSM ([912f9d5](https://github.com/alternun-development/alternun/commit/912f9d5bd9b25d99cfb9c766c46ce45644651107))
- **infra:** resolve authentik templates in sst runtime ([466020a](https://github.com/alternun-development/alternun/commit/466020aa37819942f08490b8f365740ade855f15))
- **infra:** resolve Google/Discord OAuth creds from SSM for production stages ([c7bf6ae](https://github.com/alternun-development/alternun/commit/c7bf6ae130d2dfd23a59cb61bd36fc9e9f2084c1))
- **infra:** resolve-ssm-env ([352a43e](https://github.com/alternun-development/alternun/commit/352a43e7116b2c336a3df77524f7d8b608ea02f1))
- **infra:** resolve-ssm-env ([e9ccb45](https://github.com/alternun-development/alternun/commit/e9ccb45d12b329fa82a821754bd4c698f0245061))
- **infra:** restore sourcing invocation in certificate-env-rotation test ([2b794fa](https://github.com/alternun-development/alternun/commit/2b794fa713fb7df32fc707886157a5506faf5d28))
- **infra:** route CodeBuild deploys through wrapper ([85c71c2](https://github.com/alternun-development/alternun/commit/85c71c2a64c8b5ccab9b48c961a3abdc7866f47d))
- **infra:** shorten admin pipeline resource names ([267221a](https://github.com/alternun-development/alternun/commit/267221a525c7e7c7fda660c26e82204dd5e9f7ed))
- **infra:** shorten dashboard pipeline resource names ([27ed249](https://github.com/alternun-development/alternun/commit/27ed2496ac2b30958defa2563e2aba6d2205f323))
- **infra:** sst-deploy ([8c742c0](https://github.com/alternun-development/alternun/commit/8c742c0f7637082810ea9d0cc5a2c48e7a3e17dd))
- **infra:** sst-deploy ([353a670](https://github.com/alternun-development/alternun/commit/353a67089fb890eb3ade65f28566fa6aef82d6a8))
- **infra:** stage-aware authentik social login mode in SSM resolver ([94f0759](https://github.com/alternun-development/alternun/commit/94f0759b1663284509cdba297262304d8cdddb37))
- **infra:** stop recreating retired identity-dev/identity-prod pipelines ([8f9fbaf](https://github.com/alternun-development/alternun/commit/8f9fbaf728451343c95970aa81af4ca361d32fbc))
- **infra:** sync adopted identity secrets ([02e04f5](https://github.com/alternun-development/alternun/commit/02e04f51f6be97504b96081a51a28bebe04cde61))
- **infra:** sync renamed identity domains safely ([5b4f654](https://github.com/alternun-development/alternun/commit/5b4f654f155356863bf7bc3b1fe4f4a919b8af61))
- **infra:** treat backend API Google OAuth as optional like Discord ([c40a770](https://github.com/alternun-development/alternun/commit/c40a77026e059cd679fa576a8bdd98584363d02f))
- **infra:** unblock production identity deploy ([5af78ac](https://github.com/alternun-development/alternun/commit/5af78accc8306e5f05c4a94f22e90ab784d0534b))
- **infra:** widen cert-preservation test fixture type to allow outputs field ([8e9f752](https://github.com/alternun-development/alternun/commit/8e9f75283237494ef94ffb566d41700a4bae119b)), closes [#243](https://github.com/alternun-development/alternun/issues/243)
- **infra:** wire testnet to Better Auth in release deploy path ([212a256](https://github.com/alternun-development/alternun/commit/212a2562a597e2d7430d6ba4364571b1b8a434b1)), closes [#100](https://github.com/alternun-development/alternun/issues/100)
- isolate production provider source flows ([277ff8d](https://github.com/alternun-development/alternun/commit/277ff8d6022b15f9562833718e934d1d1f01503a))
- **landing:** refine desktop hero typography and CTA sizing ([b8465b7](https://github.com/alternun-development/alternun/commit/b8465b7e763984801f6cb4391f4eeae16509baae))
- **landing:** remove duplicated AIRS word from overview/kicker copy, sync all locales ([4ab37cd](https://github.com/alternun-development/alternun/commit/4ab37cd18afb0282fd5416cab2c24b7e3955634d)), closes [alternun-development/alternun#224](https://github.com/alternun-development/alternun/issues/224) [#225](https://github.com/alternun-development/alternun/issues/225)
- **lint:** add .d.ts to lint-staged pattern ([972077e](https://github.com/alternun-development/alternun/commit/972077e92e205625ea0959037427b8d77eab1e5d))
- make cert pruning non-interactive ([632987c](https://github.com/alternun-development/alternun/commit/632987c7ce775889da25d135400ef6b3ac38213f))
- make component type guard parser tolerant ([829b746](https://github.com/alternun-development/alternun/commit/829b74663285f61b98b8d4c6a1ccb29dc7708205))
- make legacy state pruning non-fatal ([8b69807](https://github.com/alternun-development/alternun/commit/8b698075243e9c1b9f13586cd7337d4cf6009990))
- **manage:** enterprise client search, proof viewer and web import.meta ([2a6152b](https://github.com/alternun-development/alternun/commit/2a6152b33ead891d0acc67a89bea0e3ccbf56cbe))
- **manage:** feedback and live lists in project and enterprise admin ([bf4a1fb](https://github.com/alternun-development/alternun/commit/bf4a1fb082470e390a4b64bdea71dd0dea8fb9b6)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- **manage:** one moderation reason per comment, shown on hidden ones ([a82f324](https://github.com/alternun-development/alternun/commit/a82f3248de43434bf65ac3ba22f34010c26d9930)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- **marketplace:** allow image hosts for project logo, cover and gallery ([7379024](https://github.com/alternun-development/alternun/commit/7379024cdacb63c1b9b90c58b12e1d254dc94d8e)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **marketplace:** archive the Hotel Piloto placeholder enterprise (refs [#249](https://github.com/alternun-development/alternun/issues/249)) ([c026bd5](https://github.com/alternun-development/alternun/commit/c026bd594e70cb7bc623b5f6650c476718fa91ae))
- **marketplace:** count admins from every related enterprise on project access ([1fad191](https://github.com/alternun-development/alternun/commit/1fad191c88639fd244ffb4a1675b08c02dc85c09))
- **marketplace:** match panel identities to webhook-synced accounts ([92485cf](https://github.com/alternun-development/alternun/commit/92485cf12b8fbfdc87ac61632ec5cfe2f29ce7d9)), closes [#299](https://github.com/alternun-development/alternun/issues/299) [#249](https://github.com/alternun-development/alternun/issues/249)
- **marketplace:** stop global moderator from approving activities and protect brand media ([944a3c5](https://github.com/alternun-development/alternun/commit/944a3c5472f905c35bb2860b60867f2d5b1005f4)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **marketplace:** stop global moderator from pausing activities ([fa5a134](https://github.com/alternun-development/alternun/commit/fa5a1349bd860ad326e2692cd32abca8e71d5bdc)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **mobile-web:** pin metro react resolution for single runtime ([3f4d35d](https://github.com/alternun-development/alternun/commit/3f4d35df2970bc51169ac54581c0f651f5393b60))
- **mobile,admin:** address react-doctor warnings ([7427431](https://github.com/alternun-development/alternun/commit/74274315d879b3e6f9b8420f432d468af8ae9a99))
- **mobile,auth,i18n:** \_layout, AppInfoFooter, Dashboard, HeroStats ([1d60825](https://github.com/alternun-development/alternun/commit/1d60825eed8bfb21be6cf3d61fb6f37e3e1d5c7a))
- **mobile,auth,i18n:** AuthSignInScreen, en, es, th ([5878aa9](https://github.com/alternun-development/alternun/commit/5878aa92856f92f5b529c3ca114818a827e5e861))
- **mobile,auth,i18n:** changelogData ([6335624](https://github.com/alternun-development/alternun/commit/633562442a5539d7b8acefbf71f06cefb7e3b99b))
- **mobile,auth,ui:** AppInfoFooter, Footer.shared, LandingFooter, Tooltip ([1f344ac](https://github.com/alternun-development/alternun/commit/1f344acda9db925edc2c8937f815dba40c2b4d61))
- **mobile,auth,update:** \_layout, HorizontalCardScroller, Dashboard, NotificationDropdown ([def1a29](https://github.com/alternun-development/alternun/commit/def1a29874c8194d86366d91d003a6dd4a7101a5))
- **mobile,auth,update:** build, mobile-env, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY ([022fd99](https://github.com/alternun-development/alternun/commit/022fd9963362160b1523c5ad5134113cf779e1ff))
- **mobile,auth,update:** Dashboard, DashboardSummaryCards, TopNav ([1b21fbf](https://github.com/alternun-development/alternun/commit/1b21fbfc321a82aa7694b3cd6b6fac2707c3ecc9))
- **mobile,auth,update:** mobile-env ([9a354b9](https://github.com/alternun-development/alternun/commit/9a354b90ddefc2ad1a13ce27821ccf7a34e34f86))
- **mobile,auth:** AirsIntroExperience, AlternunMobileAuthClient ([85c0eed](https://github.com/alternun-development/alternun/commit/85c0eed3abcdfb694552a3d740c6d6dec560e81b))
- **mobile,auth:** build ([970b8da](https://github.com/alternun-development/alternun/commit/970b8dacca84223ae654852204832f1136d6b5c9))
- **mobile,auth:** build ([19cc14d](https://github.com/alternun-development/alternun/commit/19cc14d300a1028913681eb3251454603c6fdbfd))
- **mobile,auth:** build ([92dd311](https://github.com/alternun-development/alternun/commit/92dd311c6ee4b04d57e024a17f64968744d27cc5))
- **mobile,auth:** build ([d2e5f0c](https://github.com/alternun-development/alternun/commit/d2e5f0cfc63be2f8b8031a76ad7fe3e0fed56350))
- **mobile,auth:** derive better-auth URL at runtime if not in environment ([7d64ce1](https://github.com/alternun-development/alternun/commit/7d64ce1a04bc445f08950c8c6972f04ba222dd1c))
- **mobile,auth:** PublicLandingPage ([660936e](https://github.com/alternun-development/alternun/commit/660936e9a5c9fd18b57b77f58c6a93f5e94a2009))
- **mobile,i18n,repo:** LandingFooter, PublicLandingPage, AirsIntroExperience, en ([a4281c4](https://github.com/alternun-development/alternun/commit/a4281c4648960d3f3718fd397941711e49dd3e62))
- **mobile,i18n,ui:** HeroStats, HeroPanel ([2c9e84d](https://github.com/alternun-development/alternun/commit/2c9e84d92586f60d91d42acd1bf5dfe0c2e2b897))
- **mobile,i18n,ui:** Update footer tagline and styling ([c2a6c90](https://github.com/alternun-development/alternun/commit/c2a6c90d1df27d420667bbdb680e63058ea9db8c))
- **mobile,i18n:** AirsIntroExperience ([b2c9993](https://github.com/alternun-development/alternun/commit/b2c9993c82145ec6cc5c926385472feb57ae4631))
- **mobile,i18n:** build ([b38d622](https://github.com/alternun-development/alternun/commit/b38d62206cc886af13c30c1e57b14b02b0970d52))
- **mobile,i18n:** Dashboard, PublicLandingPage, en, es ([b9b8cf4](https://github.com/alternun-development/alternun/commit/b9b8cf4c1c5abbe44f56aa4a6cbaa394e2a94f2a))
- **mobile,i18n:** DynamicMessageBar, PublicLandingPage, AirsIntroExperience, en ([2bcd791](https://github.com/alternun-development/alternun/commit/2bcd791ab701424dff273c592eb67c81a180d9a1))
- **mobile,i18n:** normalize profile translations and clipboard handling ([514aaa6](https://github.com/alternun-development/alternun/commit/514aaa65915b93a945849c2b5991b60f6c75ba51))
- **mobile,i18n:** PublicLandingPage, AirsIntroExperience, en, es ([5a4095f](https://github.com/alternun-development/alternun/commit/5a4095fb539d10bfaf1e6d106284b30240c32415))
- **mobile,repo:** AppAuthProvider, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY, LOCAL_DEV_SETUP ([a48fff9](https://github.com/alternun-development/alternun/commit/a48fff9d53230ef308e186f017e2a00da3e6dc7b))
- **mobile,repo:** build ([db7216b](https://github.com/alternun-development/alternun/commit/db7216b106b9d67c8408a4d413e7a7304c1d465c))
- **mobile,root:** env resolver and discord placeholder ([e3c7f5f](https://github.com/alternun-development/alternun/commit/e3c7f5f5af128e17c9c4b7fb97c2831e2fb0160c))
- **mobile,ui:** \_layout, AppInfoFooter, Dashboard, ParticleBubbles ([a6e6a58](https://github.com/alternun-development/alternun/commit/a6e6a587acf58e410613bf4bd19f983712a515a9))
- **mobile,ui:** \_layout.web, beneficios, compensaciones, mis-atn ([9322b57](https://github.com/alternun-development/alternun/commit/9322b57fbab6ad2cb58ad9ac3716a0f97fc7ca03))
- **mobile,ui,repo:** app, HeroPanel, .versioning ([a5ac33d](https://github.com/alternun-development/alternun/commit/a5ac33db0948155015de7e327833c599fe6352ec))
- **mobile,ui:** add ShieldCheckIcon, enhance cards, and fix tooltip z-index ([0fdb1ff](https://github.com/alternun-development/alternun/commit/0fdb1ff68982aafb5bf859732fae79b6ce0a0780))
- **mobile,ui:** AppInfoFooter, BackToTopButton, ScreenShell, Dashboard ([ef5916b](https://github.com/alternun-development/alternun/commit/ef5916b89ed86f9499852310740813c73d9745d1))
- **mobile,ui:** AppInfoFooter, Footer.shared, LandingFooter, DashboardSummaryCards ([86eb7c0](https://github.com/alternun-development/alternun/commit/86eb7c0c39f5b28247bedb27f7dc1a5149641293))
- **mobile:** add missing Pressable import in AuthSignInScreen ([4a59626](https://github.com/alternun-development/alternun/commit/4a596262830e14dab457472ae00a4d2873389532))
- **mobile:** add textAlign center to confirmation button text ([65d72fd](https://github.com/alternun-development/alternun/commit/65d72fde40d6875d92aefe3b2f3534a8ed9149ac))
- **mobile:** add timeout to OAuth redirect to prevent stalling UI ([7aa807a](https://github.com/alternun-development/alternun/commit/7aa807a716261b18648105920bbafe6baaf4210a))
- **mobile:** Adjust dashboard background image to fit better on all screen sizes ([a4a8acf](https://github.com/alternun-development/alternun/commit/a4a8acfb1078972e26fccad2caeb5b4f907ef162))
- **mobile:** AIRS-logo-dark-2x, AIRS-logo-dark, AIRS-logo-light-2x, AIRS-logo-light ([c1b7665](https://github.com/alternun-development/alternun/commit/c1b7665f23bb5a2ee6c8156a1445b88000e8906a))
- **mobile:** AirsIntroExperience ([9a5573e](https://github.com/alternun-development/alternun/commit/9a5573e34d84cec0602ea698b32b15a03082fb7a))
- **mobile:** align deploy auth env and audit pins ([cc7fc12](https://github.com/alternun-development/alternun/commit/cc7fc12f64d0c4b9238347bbc22cdbb760ead6c4))
- **mobile:** allow stage-specific env files to override .env values ([cf09f5c](https://github.com/alternun-development/alternun/commit/cf09f5c37f72b8f5bd2c6c0278c2cf19bb452c35))
- **mobile:** center AIRS community counter ([49d1d8b](https://github.com/alternun-development/alternun/commit/49d1d8bce8dcce59ec011f4f91f2f36128c85ffb))
- **mobile:** center footer bottom bar content layout ([19b4597](https://github.com/alternun-development/alternun/commit/19b4597bb5787d96cbc79a43f0961b4e9102d7e2))
- **mobile:** center landing cards and fix wallet link routing on mobile ([63e52ab](https://github.com/alternun-development/alternun/commit/63e52ab1d2c1ec66092cea3409dc425a9ffd9c22))
- **mobile:** changelogData ([f985cc0](https://github.com/alternun-development/alternun/commit/f985cc0ccf0497fc951a19a839d234af00bb7c5e))
- **mobile:** changelogData ([0a2856f](https://github.com/alternun-development/alternun/commit/0a2856fb7c84f826a876b704dcdbecf12bd2e8a7))
- **mobile:** changelogData ([0fe2e93](https://github.com/alternun-development/alternun/commit/0fe2e932dde70df6dfc241d08b749298421f83a8))
- **mobile:** changelogData ([655ccfc](https://github.com/alternun-development/alternun/commit/655ccfce0ab8b9ba202ea7b38d07332dc80283b9))
- **mobile:** changelogData ([44f21ec](https://github.com/alternun-development/alternun/commit/44f21ec420e4079d31a5caef6069af9f14b84f45))
- **mobile:** clean up TopNav — remove top-bar pills, move wallet into dropdown ([e63fdd2](https://github.com/alternun-development/alternun/commit/e63fdd286bfdb4edfd684ebcd9f892287e04ec5f))
- **mobile:** clear error message when user types in any input field ([9b6a3c6](https://github.com/alternun-development/alternun/commit/9b6a3c633eac5cc67de09d4b339b235f12690559))
- **mobile:** collapse video controls to icon-only on narrow cards ([09f05b1](https://github.com/alternun-development/alternun/commit/09f05b1ca185131baf35b0c49b5f2d15c338d84a))
- **mobile:** compact phone top bar, notifications under the pill, accurate time ago ([365274c](https://github.com/alternun-development/alternun/commit/365274cf30e347078bd3f72a7f10f6603d0e7465))
- **mobile:** correct Pexels video poster URL path ([d123f7e](https://github.com/alternun-development/alternun/commit/d123f7eacfe285132d48c45045e9e563876088bc))
- **mobile:** DashboardSummaryCards ([756a316](https://github.com/alternun-development/alternun/commit/756a316ec4fac5e4444707a86382dc4e5d029eaf))
- **mobile:** DashboardSummaryCards ([e036f4e](https://github.com/alternun-development/alternun/commit/e036f4eae69d1fc11f65390798635166812eda08))
- **mobile:** embed changelog data for reliable loading in all environments ([8f73265](https://github.com/alternun-development/alternun/commit/8f73265f75801a4c4450a8d1a6ee3ebc559192b0))
- **mobile:** embed the Canva presentation on the web project detail ([e1fb3b2](https://github.com/alternun-development/alternun/commit/e1fb3b2b99ac4f935781637ef8d76ee6fbd92097))
- **mobile:** enable testnet social auth ([dbba354](https://github.com/alternun-development/alternun/commit/dbba354c2f835d5a7630c1a68192b6db8f3c6d83))
- **mobile:** ENV_SETUP.QUICK_REFERENCE, ENV_SETUP, docs ([49b4f63](https://github.com/alternun-development/alternun/commit/49b4f63b50ea3888663d5595b00fb9540a3e793b))
- **mobile:** fix auth modal dropdown closing on click ([271d338](https://github.com/alternun-development/alternun/commit/271d3384a6fa49f30761afbd105888571a632500))
- **mobile:** fix auth modal scroll clipping on narrow screens ([569187d](https://github.com/alternun-development/alternun/commit/569187d5073862ef47f8efaea9ca7bac4fe1d23e))
- **mobile:** fix footer overflow on narrow/mobile screens ([1ae7356](https://github.com/alternun-development/alternun/commit/1ae7356c21780a00223111f67c44da2e1d04795f))
- **mobile:** Fix logo selection across dashboard, footer, and notifications ([c519c6b](https://github.com/alternun-development/alternun/commit/c519c6b536735db3d5ef9df9cb6eb391b79100c0))
- **mobile:** fix settings dropdown menu not responding to clicks ([76dde1f](https://github.com/alternun-development/alternun/commit/76dde1fef9d2b069f6ada77a0808722b9a729fe1))
- **mobile:** fix settings dropdown not changing language/theme on click ([106b05a](https://github.com/alternun-development/alternun/commit/106b05ab879cd7339592775160eb1031b03c9df0))
- **mobile:** force set correct auth URLs before Expo export to prevent localhost ([52e8e13](https://github.com/alternun-development/alternun/commit/52e8e13c05ccea74f6bef23b214771f52d4e64c3))
- **mobile:** hide native scrollbars on detail, manage and menu views ([4bd536f](https://github.com/alternun-development/alternun/commit/4bd536fdf272579cab19d3725c373a9e1641cd3e))
- **mobile:** honor the app motion level in the participation factor bar ([6bf6594](https://github.com/alternun-development/alternun/commit/6bf6594abf9efccab8cdeca4205beb51410b73f7)), closes [#279](https://github.com/alternun-development/alternun/issues/279)
- **mobile:** implement stage-aware environment configuration loading ([1f6a596](https://github.com/alternun-development/alternun/commit/1f6a596a76af089f5f26f50e3e361f21fb78a974))
- **mobile:** improve changelog loading fallback for all environments ([3562f1e](https://github.com/alternun-development/alternun/commit/3562f1ea1d53395d322fba7457059d9075986290))
- **mobile:** improve email confirmation button styling and interactions ([f4762be](https://github.com/alternun-development/alternun/commit/f4762be5fd2b862a38e08b8c8e71ac45a8a05bb5))
- **mobile:** improve error message styling and clear on mode switch ([a3fced1](https://github.com/alternun-development/alternun/commit/a3fced1161bc5ab835d33a354bcf99a477174640))
- **mobile:** improve navbar dropdown positioning and closing behavior on desktop ([d295a91](https://github.com/alternun-development/alternun/commit/d295a91dd0243c21285f140f07f11c542f05f570))
- **mobile:** improve tooltip visibility and layering ([e7c8bf2](https://github.com/alternun-development/alternun/commit/e7c8bf29babef8ee80d401441dd13c98a79ef988))
- **mobile:** keep dropdown open after language/theme change ([6d5df2e](https://github.com/alternun-development/alternun/commit/6d5df2eac2c75ec7f0b2f29284463e71969c255d))
- **mobile:** keep hero wordmark consistent in dark mode ([fbcc88f](https://github.com/alternun-development/alternun/commit/fbcc88fdf519f51e05ddbf061cff6d56d2349e5f))
- **mobile:** landing extra sections and header nav ([9ae3625](https://github.com/alternun-development/alternun/commit/9ae36254eb53e97d028b0aff17ca468c490305c9))
- **mobile:** landing nav bar styles and restore extra sections correctly ([cdc5f4f](https://github.com/alternun-development/alternun/commit/cdc5f4fe38c4cffc8b3d8a61a574fb634c11eda2))
- **mobile:** light mode and contrast in manage and explore views ([7ce8a7b](https://github.com/alternun-development/alternun/commit/7ce8a7b4e3867eb6205ac3924e4bc4efcbbccd53))
- **mobile:** load stage-specific env files in mobile-env.cjs ([1b0c94a](https://github.com/alternun-development/alternun/commit/1b0c94af9b56604ccb701aee0954e3ca5830dc92))
- **mobile:** localize the web tab title and link the FP note to the docs ([a45d1d5](https://github.com/alternun-development/alternun/commit/a45d1d58bb117f8a1f5f5906bc57459ae4d4d411))
- **mobile:** make footer links test-safe ([a368dc0](https://github.com/alternun-development/alternun/commit/a368dc086fad37a815ab87ffda12bff7ac581053))
- **mobile:** make tooltip surface opaque to match hero ([b796b54](https://github.com/alternun-development/alternun/commit/b796b54db345720c38b7a812e8f3627cb78e0c11)), closes [#050F0](https://github.com/alternun-development/alternun/issues/050F0)
- **mobile:** open a full-screen menu from the hamburger on extra small screens ([a16ea40](https://github.com/alternun-development/alternun/commit/a16ea4081835275d7bad5b4a79bb85da1e55e94a))
- **mobile:** open settings dropdown by default in TopNav ([643f820](https://github.com/alternun-development/alternun/commit/643f820f62608ca4634a6c656e5d5c327a4dff15))
- **mobile:** polish ATN card and add metric tooltips ([875256b](https://github.com/alternun-development/alternun/commit/875256b444975e061b52020e95a2da2d52262fc8))
- **mobile:** prevent ATN/RBI card value overflow on small screens ([a482125](https://github.com/alternun-development/alternun/commit/a4821250ee2f161f402901930ed63d35613e5fdb))
- **mobile:** prevent stale auth errors from persisting after mode switch ([bfe5690](https://github.com/alternun-development/alternun/commit/bfe569088af6c9dc85ee56d7758fb8897d94489c))
- **mobile:** production version display and auth form spacing ([019e300](https://github.com/alternun-development/alternun/commit/019e30005c8be07324057b27a6d6a2160ac2ae71))
- **mobile:** PublicLandingPage ([00411f9](https://github.com/alternun-development/alternun/commit/00411f9fda57f68a64d63ba860ea766b4dcb814b))
- **mobile:** PublicLandingPage, AirsIntroExperience, AirsIntroSettingsMenu ([52d6ee5](https://github.com/alternun-development/alternun/commit/52d6ee5f4f308b2fc93076556a7deb9a92039246))
- **mobile:** ReferralCard ([776906c](https://github.com/alternun-development/alternun/commit/776906c785f26012a0bd57a578f63c60dfa096ea))
- **mobile:** refine AIRS community total card ([eedea40](https://github.com/alternun-development/alternun/commit/eedea40004d1c0da8d019933326916dca9fba04e))
- **mobile:** refresh user state after email verification ([57a4fc7](https://github.com/alternun-development/alternun/commit/57a4fc7bb2bff6ff951a8d649f3c0258891801f9))
- **mobile:** refresh user state periodically for email verification ([f9e0583](https://github.com/alternun-development/alternun/commit/f9e0583e2d8173fe50014c18e45498e8993fa0c6))
- **mobile:** relax Expo bundle version check ([90ec75e](https://github.com/alternun-development/alternun/commit/90ec75ece460bc9bbd2da83e14c95412b8d72ae8))
- **mobile:** relax legacy export validation ([d07d6eb](https://github.com/alternun-development/alternun/commit/d07d6ebdedfe1f7a9a6ac706f2930bc3022cf796))
- **mobile:** remove deleted authSession.ts import from auth.tsx ([9d11807](https://github.com/alternun-development/alternun/commit/9d1180716f9159c9f31959b2282350cc03c7bc15))
- **mobile:** remove duplicate auth import ([bc491a8](https://github.com/alternun-development/alternun/commit/bc491a86269159a7b30fc4cb4eae756add907a88))
- **mobile:** remove duplicate resend cooldown message ([e0b7a9f](https://github.com/alternun-development/alternun/commit/e0b7a9f1dca334e9f3ab1af101200ccbcda3c676))
- **mobile:** remove Mi perfil heading, reorder tabs, tighten top spacing ([c1324ef](https://github.com/alternun-development/alternun/commit/c1324efbb0bed7b7baf16ec4d2a6edd408faa7bd))
- **mobile:** remove redundant error box from email confirmation section only ([04c132b](https://github.com/alternun-development/alternun/commit/04c132bf63fe1b79f7fd44449906e7863e24f7bf))
- **mobile:** rename Sculpin font files to remove spaces ([c963846](https://github.com/alternun-development/alternun/commit/c963846fb9848a1d9b22d5b8425baee0f96b25df))
- **mobile:** resolve @alternun/auth mock in CI test environment ([7b08efa](https://github.com/alternun-development/alternun/commit/7b08efaa661ab59ad6d2999bffdc9b9db051b19f))
- **mobile:** resolve all lint and type-check build failures ([0155ffd](https://github.com/alternun-development/alternun/commit/0155ffd7091da6223f46a137652ab5d924b5ef2d))
- **mobile:** restore BackToTopButton and fix forwardRef export in AirsIntroExperience ([993075f](https://github.com/alternun-development/alternun/commit/993075f0ac77533a803e7ec063884fba4a8dce6f))
- **mobile:** restore BackToTopButton and properly type forwardRef export ([3502dc9](https://github.com/alternun-development/alternun/commit/3502dc985483ff2cc3dbbe311bfe6feb4f73272c))
- **mobile:** restore overlay text and badge on landing video card ([acec3d5](https://github.com/alternun-development/alternun/commit/acec3d59642ced8f62364353b7e97568224e1901))
- **mobile:** restore testnet social auth ([dee65e2](https://github.com/alternun-development/alternun/commit/dee65e29cf04063a66de1c30a65af47352fc3be6))
- **mobile:** restore testnet social auth ([a073a50](https://github.com/alternun-development/alternun/commit/a073a50343887ae56c6a7a2af95a04a34339e84f))
- **mobile:** restore v1.0.166 PublicLandingPage with simplified cards ([20bc60f](https://github.com/alternun-development/alternun/commit/20bc60f13f4d23430171c6e89067cae39641f37d))
- **mobile:** revert membership logos to use PNG assets instead of SVGs ([2e0ebe7](https://github.com/alternun-development/alternun/commit/2e0ebe7a4107f75ddad84e1e8b4f7def50b00e1a))
- **mobile:** SearchFilterBar, ActivityFeed ([4fbf031](https://github.com/alternun-development/alternun/commit/4fbf031a11e180edfec814a33e4e49859dd12f9b))
- **mobile:** show footer copyright and version+help badge on same line ([136e307](https://github.com/alternun-development/alternun/commit/136e3076593563fcb78b1dbf92f20ff3b5142fdd))
- **mobile:** show the Airs title, description and logo in link previews ([b4dffe5](https://github.com/alternun-development/alternun/commit/b4dffe55dbd2dd8193a4151acd801cf66fa533bd))
- **mobile:** show underline on hover only for privacy & terms links ([403d0e6](https://github.com/alternun-development/alternun/commit/403d0e648e238bac1bfe2e1ed13514c2bef0d33f))
- **mobile:** show version number on changelog drawer trigger pill ([64103c1](https://github.com/alternun-development/alternun/commit/64103c1670b6a350f7cfe0cb7d0ddf1c22ae14dd))
- **mobile:** single-line page header with safe tooltip positioning ([4dece49](https://github.com/alternun-development/alternun/commit/4dece49e9700eba9e9cc32b5466e7809e1d65470))
- **mobile:** size Explorer hero slides to the inset content width ([1d07256](https://github.com/alternun-development/alternun/commit/1d072565b47eb984834b19ac8ce292c74bec1366))
- **mobile:** size the top bar pill and controls to the Airs logo mark ([0bd3423](https://github.com/alternun-development/alternun/commit/0bd342373fa2e11e80ac8186a559abfaede0ea62))
- **mobile:** smooth AIRS ranking transitions ([912a9ea](https://github.com/alternun-development/alternun/commit/912a9ead448ad8c255f6b2c47a18074e933057ed))
- **mobile:** stage-aware social login mode fallback in build.sh ([76e7037](https://github.com/alternun-development/alternun/commit/76e7037a9907845d91816823b203da9b9475976c))
- **mobile:** stop DynamicMessageBar marquee from stalling and going stale ([7d9c39f](https://github.com/alternun-development/alternun/commit/7d9c39fc6f36e596f812ae2b68dc83841a1d9543)), closes [#229](https://github.com/alternun-development/alternun/issues/229)
- **mobile:** stop infinite reload loop on Google auth callback ([85ad71c](https://github.com/alternun-development/alternun/commit/85ad71c4972afb22af902e0ae9e85b45759b2ebd))
- **mobile:** stop RBI/ATN card content overflowing the card border on mobile ([47416cd](https://github.com/alternun-development/alternun/commit/47416cdb3df8f150be218bcd0b34fc9df9492965))
- **mobile:** theme support modal and narrow cards ([6ecfdb8](https://github.com/alternun-development/alternun/commit/6ecfdb8b38704ffc3649e4f9f296b560f95df882))
- **mobile:** tighten dashboard cards and brand pwa icons ([f16fbcf](https://github.com/alternun-development/alternun/commit/f16fbcf273d9d2404b9a3b3a9cabf659e3b5305f))
- **mobile:** TopNav dropdown animations and layout width ([391d76d](https://github.com/alternun-development/alternun/commit/391d76dcc3f70f75b1f7d2b10a9dc6b42c942a3c))
- **mobile:** transform valtio through Babel to eliminate import.meta SES error ([2751718](https://github.com/alternun-development/alternun/commit/2751718c096d9807f546250e9a52f88b1b886a49))
- **mobile:** unify tooltip icon and modal to hero style ([2e8faf4](https://github.com/alternun-development/alternun/commit/2e8faf44efbcdfba4198b5a3bf9ba179dc825e4d))
- **mobile:** update .env files BEFORE @alternun/auth build to prevent localhost ([959073c](https://github.com/alternun-development/alternun/commit/959073c88a16f52270925612896d44374a14ac4b))
- **mobile:** update .env files BEFORE load_env_vars to ensure correct stage URLs ([aea44ae](https://github.com/alternun-development/alternun/commit/aea44ae3bed506257b263893aa299a465c5411d3))
- **mobile:** update AppInfoFooter.links test to match current 3-link definitions ([5a42586](https://github.com/alternun-development/alternun/commit/5a425863364f6e5edaba9d52cadcc9208358635e))
- **mobile:** update membership logos to use realistic SVGs and SVG folder logos ([eb73b7f](https://github.com/alternun-development/alternun/commit/eb73b7f696ff50baef3207b788805c364e382ea8))
- **mobile:** use Alternun logo for social media meta images ([3de72b0](https://github.com/alternun-development/alternun/commit/3de72b01174f991fed178b5a05c24a0b737c4c44))
- **mobile:** use hero info icons on dashboard metrics ([c32a571](https://github.com/alternun-development/alternun/commit/c32a57130796cd71b4edc268fd5674011c3ff002))
- **mobile:** use localhost URLs for docs and project links in development ([d2ae7ed](https://github.com/alternun-development/alternun/commit/d2ae7edfd7bb390b63fa2a4fe5590bb938f0ca43))
- **mobile:** use SVGs from main assets folder for membership logos ([e57c3d2](https://github.com/alternun-development/alternun/commit/e57c3d2a5bb67d486eaddca3b73edcf9da021694))
- **mobile:** use width 100% for confirmation button to ensure full stretch ([c54c6df](https://github.com/alternun-development/alternun/commit/c54c6df989a8bb6d359ec03fc65ec0b3c78c96e5))
- **mobile:** validate bundle version from package manifest ([b3af07a](https://github.com/alternun-development/alternun/commit/b3af07ae1d59fc6f7881079e7fd039187fd18a89))
- **mobile:** verify exported web bundle version ([307b019](https://github.com/alternun-development/alternun/commit/307b0194148015baeb443dc2f6f786414283c412))
- **mobile:** verify the bundled package release version ([bf3e076](https://github.com/alternun-development/alternun/commit/bf3e0761adfe314c65acc7d88f7f8b109880947d))
- **mobile:** wrap button content in View for proper style application ([ea73f70](https://github.com/alternun-development/alternun/commit/ea73f702dc2a63004d3aa2e439b2642a3287e86f))
- **mobile:** write stage-specific .env files before Expo export to ensure correct URLs ([a4946b3](https://github.com/alternun-development/alternun/commit/a4946b3dae9eb4fd711eb5f52d10efff178f8659))
- move layout.tsx to app directory for Next.js app router ([99e90f3](https://github.com/alternun-development/alternun/commit/99e90f3e3a7d2c99010d9f1651486e066075b5d3))
- move tooltip above icon, closer to top ([131d447](https://github.com/alternun-development/alternun/commit/131d44707297047ecf6ae9059f46757adf3f3a50))
- move tooltip closer to info icon with float animation ([47c19a2](https://github.com/alternun-development/alternun/commit/47c19a222d9433368c47bb3c283fb19063682380))
- move tooltip inside card bounds, near icon ([af6bb0a](https://github.com/alternun-development/alternun/commit/af6bb0a64f70261cefafd8a3491eff68d43fb0dd))
- normalize parser filenames ([e9f0b8e](https://github.com/alternun-development/alternun/commit/e9f0b8e956d18b071f56f30d03d1cf729aca3b5c))
- **onboarding:** prevent overlapping intro video audio ([40f7ad3](https://github.com/alternun-development/alternun/commit/40f7ad325ea9729da75e22c439084e95ad3c5a59))
- optimize mobile UI layout and fix responsive issues ([f3ba01e](https://github.com/alternun-development/alternun/commit/f3ba01e99295ca94660e70b0be1b390caa2619b5))
- pass google auth creds to identity pipelines ([25da53a](https://github.com/alternun-development/alternun/commit/25da53a0e4c0844404515f97ce14050cbb133fda))
- patch Next.js critical security vulnerability ([ea5a404](https://github.com/alternun-development/alternun/commit/ea5a4045cd00fc0b03a50b624382421e60307511))
- polish mobile auth and landing transitions ([ac2cc57](https://github.com/alternun-development/alternun/commit/ac2cc5708c97df5888bfbe6c9af640d7b3c88b48))
- position tooltip top-right of icon, tighter ([a77f0a5](https://github.com/alternun-development/alternun/commit/a77f0a526c3e6f2120d1913cd3178ce767e22645))
- **predeploy:** warn instead of fail when dns auto-remove is disabled ([5eb2979](https://github.com/alternun-development/alternun/commit/5eb2979f75106d683c614884cc7b26b6adab6ab9))
- prevent discord source flow recursion ([14559bc](https://github.com/alternun-development/alternun/commit/14559bcfaca5a4cc540be2d2589fd5a5f857c9ae))
- prevent footer icon overlap and improve consistency ([73890d6](https://github.com/alternun-development/alternun/commit/73890d6dbc3a3d030ea76e81da6e6914d29e63b5))
- **profile:** remove duplicate Animated import ([b946d91](https://github.com/alternun-development/alternun/commit/b946d91f9ed09ff6b0e24354c3946d9995f1e23b))
- **profile:** remove unsupported boxShadow causing square artifact in tier badge ([48b2df5](https://github.com/alternun-development/alternun/commit/48b2df5161781cead5285f4cbea37e20df040179))
- **profile:** show the stored Google photo in the top bar when the session lacks it ([59e967f](https://github.com/alternun-development/alternun/commit/59e967f93fa236bc8a001954ca69c997629e4780))
- prune legacy cert state before deploy ([64173de](https://github.com/alternun-development/alternun/commit/64173def1e7ab1a4df2f8df40132953b6223abd3))
- **referrals:** allow user_id in POST body and always show referred-by in profile card ([2a34b31](https://github.com/alternun-development/alternun/commit/2a34b31fe288f3ecf5c40d2fac7a85b91ca4bca0))
- **referrals:** award AIRS bonus to both referrer and referee on signup ([487c53c](https://github.com/alternun-development/alternun/commit/487c53cb46127688ca2501b63559ffff4cebc2cf))
- **referrals:** skip attribution on invalid/self referral code instead of 400 ([3896b71](https://github.com/alternun-development/alternun/commit/3896b712b7d1175b782e9e3992760b1336322a18))
- **release:** allow autogenerated promote commits ([4a07153](https://github.com/alternun-development/alternun/commit/4a0715387d3f6ee70c0506b09a37fc63c997dec5))
- **release:** allow empty promote release commit ([41941ad](https://github.com/alternun-development/alternun/commit/41941ad61461edde36d5cb7fd1edb781671dfcbc))
- **release:** dedupe v1.0.27 changelog ([1db79aa](https://github.com/alternun-development/alternun/commit/1db79aade702edb0e0445828d4935a3f766bb857))
- **release:** dedupe v1.0.28 changelog ([6269dda](https://github.com/alternun-development/alternun/commit/6269ddac41a30c7e364003c32471eef62eb424e6))
- **release:** fail fast when promote PR creation fails ([d2c1bfa](https://github.com/alternun-development/alternun/commit/d2c1bfa3e405dbd5c029d59e16e49e8e00a13ac2))
- **release:** keep changelog version headings at "##" for minor releases ([fa80072](https://github.com/alternun-development/alternun/commit/fa800729568bc9dedccf57145f2a2450e1315da1))
- **release:** preserve consumer startup and update staging ([72965ad](https://github.com/alternun-development/alternun/commit/72965ad9fa2f95211b84d6379078c07e7d8afa2a))
- **release:** promote develop and update open pr ([8f09069](https://github.com/alternun-development/alternun/commit/8f09069ec664bcd89a2376f83ef4267558aea34b))
- **release:** retag promoted release ([80dc433](https://github.com/alternun-development/alternun/commit/80dc4332406c42b4846d56b323d37ebfbaff5b53))
- **release:** stage develop production manifest ([b996dc5](https://github.com/alternun-development/alternun/commit/b996dc5d2416e2af671c5e038b012cd29cca1e78))
- **release:** stage generated release manifests ([af6b343](https://github.com/alternun-development/alternun/commit/af6b34373b0d98f8eca52632b157a108189d38c0))
- **release:** stage root package version ([03194b5](https://github.com/alternun-development/alternun/commit/03194b538291016e8ec5552f18cba06053b8cfc2))
- **release:** sync mobile changelog data ([40ca6ad](https://github.com/alternun-development/alternun/commit/40ca6ad5fe638bc757b918838714bb719e12a711))
- **release:** sync mobile changelog data ([70b72ac](https://github.com/alternun-development/alternun/commit/70b72ac52a4d2dc15a0b8ba9d16d55d7206b6358))
- remove default Docusaurus footer ([9bb818e](https://github.com/alternun-development/alternun/commit/9bb818e94a75fa4372da87acc820f58cbcce07f3))
- remove duplicate v1.0.56 changelog entry ([5a9ce11](https://github.com/alternun-development/alternun/commit/5a9ce112a3f83c35f8312ba7a2d0667b8de429bf))
- remove invalid args key from turbo.json ([c0ef1d0](https://github.com/alternun-development/alternun/commit/c0ef1d087595e8c765c4f5fb7b9bbf5980fe9269))
- remove invalid passThruArgs from turbo.json ([d008e07](https://github.com/alternun-development/alternun/commit/d008e07afc10d30d5ea9052637e2a25922c5e363))
- remove license link from footer ([c63a2ce](https://github.com/alternun-development/alternun/commit/c63a2ce1689bba97b528fe132015e21c4a29df8f))
- reorder footer buttons and unify styling ([5318728](https://github.com/alternun-development/alternun/commit/5318728161a2a5d99875bec388a729b11bbd03fa))
- reorder footer icons (version first) and ensure consistent 32px heights ([bdfc983](https://github.com/alternun-development/alternun/commit/bdfc98376880546eaee9841a4f7f6f9605dff54e))
- reorder pnpm and Node.js setup in deploy workflow ([a3a321b](https://github.com/alternun-development/alternun/commit/a3a321bba51ec578bbaa79168fbbaf320e2cd656))
- reorder pnpm setup before Node.js in GitHub Actions ([9aff937](https://github.com/alternun-development/alternun/commit/9aff9370802cb4543d63bac0cd4f4d9426dbe7a4))
- repair pnpm lockfile for audit ([160afda](https://github.com/alternun-development/alternun/commit/160afda58348abd9889eda34afff5d2b0cc480f5))
- **repo,admin,api:** 6cd210d32ef36442-turbo.log, dff0bbe77b072a66-turbo.log, CHANGELOG, app ([da5ea5d](https://github.com/alternun-development/alternun/commit/da5ea5dc6a6d689d33c890efb9bab19c8f78987e))
- **repo,admin,api:** artifact, graph.db, CHANGELOG, README ([a23f768](https://github.com/alternun-development/alternun/commit/a23f76894e35aae568abf2274ad6ec7467a2ef65))
- **repo,admin,api:** CHANGELOG, app ([49acca4](https://github.com/alternun-development/alternun/commit/49acca41e6f6a0447757c3bce0582c43bd866dc4))
- **repo,admin,api:** CHANGELOG, app ([bad0aaa](https://github.com/alternun-development/alternun/commit/bad0aaa4142cd410d10cf4d39d7ec082c1004da0))
- **repo,admin,api:** CHANGELOG, app, build ([0142197](https://github.com/alternun-development/alternun/commit/0142197522bfcf9f717f803d0a96cee8f7825749))
- **repo,admin,api:** CHANGELOG, app, build ([87a5227](https://github.com/alternun-development/alternun/commit/87a5227723911595cf9f1d5fa0ee97d6f26110f1))
- **repo,admin,api:** CHANGELOG, app, build, changelogData ([e1099b6](https://github.com/alternun-development/alternun/commit/e1099b6b69f4cf8fd06dfd27043fedd0bb3ebc32))
- **repo,admin,api:** CHANGELOG, app, callback, explorar ([70f9123](https://github.com/alternun-development/alternun/commit/70f9123aaf78820847a37b40c6b47a2ec4ac7f89))
- **repo,admin,api:** CHANGELOG, app, changelogData ([c4d901c](https://github.com/alternun-development/alternun/commit/c4d901c76a1467e515880a1ca45ff3a3f9bbe856))
- **repo,admin,api:** CHANGELOG, app, changelogData ([a4938b9](https://github.com/alternun-development/alternun/commit/a4938b9ed7a7486dac8985f3095b3a7df57547fe))
- **repo,admin,api:** CHANGELOG, app, changelogData ([970e69e](https://github.com/alternun-development/alternun/commit/970e69e8aac7c27fc1b10dfa22813efc3af2a939))
- **repo,admin,api:** CHANGELOG, app, changelogData ([dd3c142](https://github.com/alternun-development/alternun/commit/dd3c14299eb43277ef4b5213a8c4b3e8b4e79126))
- **repo,admin,api:** CHANGELOG, app, mobile-env ([023b7a3](https://github.com/alternun-development/alternun/commit/023b7a32ba388f3b88ba8d26d2a4a293e6eba9ac))
- **repo,admin,api:** CHANGELOG, app, tsconfig ([0be5790](https://github.com/alternun-development/alternun/commit/0be5790d861c84c7c5759f0ad6c899d2b7011730))
- **repo,api,mobile:** .env, manifest ([ebf1fab](https://github.com/alternun-development/alternun/commit/ebf1fabee2e394c295e33818ca6cf5ee460097fc))
- **repo,api,mobile:** .gitignore, airs.repository, AppInfoFooter, Dashboard ([4a7fef2](https://github.com/alternun-development/alternun/commit/4a7fef2a60870b38046c650cdda756eeb6948861))
- **repo,api,scripts:** README, build, release-and-deploy-testnet, release-deployment-flow ([90dd1af](https://github.com/alternun-development/alternun/commit/90dd1af5c07e18fefe20d6b59a0cc5521d2a90b3))
- **repo,docs,mobile:** AGENTS, CLAUDE, README, authentication-and-session-flow ([ac4c3b7](https://github.com/alternun-development/alternun/commit/ac4c3b769f058625ce28a48fd36811cec99c095e))
- **repo,docs,mobile:** CHANGELOG, changelogData ([ec96f59](https://github.com/alternun-development/alternun/commit/ec96f59a0a83f86da899261cf34dd25042f287e6))
- **repo,docs,mobile:** CHANGELOG, changelogData, check-changelog ([8ee1e70](https://github.com/alternun-development/alternun/commit/8ee1e70f96de75e3a4ca6b951238d87a698e3a44))
- **repo,docs:** .gitignore, auth ([45702ab](https://github.com/alternun-development/alternun/commit/45702ab8777efe77cf55c82d231e195408f2c4d3))
- **repo,infra,scripts:** pre-commit, CLAUDE, bootstrap-ssm-parameters, release ([a286f7a](https://github.com/alternun-development/alternun/commit/a286f7a87c31fa5248ea368ebbd9f28d9c893f94))
- **repo,infra,scripts:** release-and-deploy-testnet, release-deployment-flow, buildspec, release ([de31757](https://github.com/alternun-development/alternun/commit/de317572cbe4a5aeec292be1b65002f39a7b1daf))
- **repo,mobile,auth:** settings, airs, atn, rbi ([456176b](https://github.com/alternun-development/alternun/commit/456176bb1b5b2392d6efcff3fa4f0038d22b0abd))
- **repo,scripts:** pre-commit, CLAUDE, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY ([f82200d](https://github.com/alternun-development/alternun/commit/f82200d83da2dbad421fef967b9034c5f1451f2b))
- **repo,web:** .gitignore, Sidebar, ReleaseUpdateBanner, pnpm-lock ([69c2cfc](https://github.com/alternun-development/alternun/commit/69c2cfc6203c0f3bd8e735e6509b321b9a7b9ccd))
- **repo:** artifact, graph.db ([350ca31](https://github.com/alternun-development/alternun/commit/350ca31805fb767c0bfaeacbeb7acb05e84bdab2))
- **repo:** artifact, graph.db ([ec3dd2d](https://github.com/alternun-development/alternun/commit/ec3dd2de05abfd671781902514d4abdc974966fd))
- **repo:** artifact, graph.db ([31981d9](https://github.com/alternun-development/alternun/commit/31981d93bcca79cc6eb620f132b404f0eabab452))
- **repo:** artifact, graph.db ([38d9cd3](https://github.com/alternun-development/alternun/commit/38d9cd3258737ff9794e02d0f511214ae1d07073))
- **repo:** artifact, graph.db ([fc92882](https://github.com/alternun-development/alternun/commit/fc92882831b8849de474832ea48764d62f4cc5b8))
- **repo:** artifact, graph.db ([faaf6c7](https://github.com/alternun-development/alternun/commit/faaf6c7d7f8b6d8b75c08c2c63056209deee0a5e))
- **repo:** artifact, graph.db ([e00453f](https://github.com/alternun-development/alternun/commit/e00453f132d9e4f7f3ed926080f9d41f548d636b))
- **repo:** artifact, graph.db ([a9d7c92](https://github.com/alternun-development/alternun/commit/a9d7c92bb929afe829b1593fe73e32c6693fe952))
- **repo:** artifact, graph.db ([190c9ea](https://github.com/alternun-development/alternun/commit/190c9ead2b2ff450f15f2f3c72515618447bfb55))
- **repo:** artifact, graph.db ([f742eb6](https://github.com/alternun-development/alternun/commit/f742eb63ae843d08d7355185326e9143b535ef7f))
- **repo:** artifact, graph.db ([bab0291](https://github.com/alternun-development/alternun/commit/bab0291c810e1c4508b2f01a2559673f9dd761d9))
- **repo:** artifact, graph.db ([ebf02f9](https://github.com/alternun-development/alternun/commit/ebf02f98642379563c69deed99aa7648c3d9859e))
- **repo:** artifact, graph.db ([174e713](https://github.com/alternun-development/alternun/commit/174e713f4db064dff56e6206c050c8e609712291))
- **repo:** artifact, graph.db ([b1ca22d](https://github.com/alternun-development/alternun/commit/b1ca22dd155be7562af815d8ad7d4e919611bf5f))
- **repo:** artifact, graph.db ([952ba0a](https://github.com/alternun-development/alternun/commit/952ba0a84c2beb04c57d299a9277e6222f4f3533))
- **repo:** artifact, graph.db, config, specs ([782aeea](https://github.com/alternun-development/alternun/commit/782aeea0fade20de080d96ae8b0820ce3a6154a1))
- **repo:** artifact, graph.db, todo ([6916aba](https://github.com/alternun-development/alternun/commit/6916abada5bcfda1cc2a11a5ecb6138cab3c90b2))
- **repo:** keep master sync manual on develop ([6bad40e](https://github.com/alternun-development/alternun/commit/6bad40e5dddaca13706aed5419726acec2a65e75))
- **repo:** replace deprecated audit endpoint ([1fc6932](https://github.com/alternun-development/alternun/commit/1fc6932065debcf150b3bf556539e39300003887))
- **repo:** sync auth exports and footer drawers ([c2d8df9](https://github.com/alternun-development/alternun/commit/c2d8df96ceac9dfbf71444cf25cf4c12a90b0a7c))
- resolve @alternun/update in Metro and fix auth callback loop ([e5d2133](https://github.com/alternun-development/alternun/commit/e5d2133431a52a1fcd33797c4a87b63a45a2bfd0))
- resolve build failures and move SupportButton to mobile app ([995b1a1](https://github.com/alternun-development/alternun/commit/995b1a135f80065322a0c05c61a48eec5f3cf559))
- resolve CI/CD failures for pnpm migration ([9aab08d](https://github.com/alternun-development/alternun/commit/9aab08d251149e7772eaad42919f3555d1fbccb5))
- resolve eslint errors with trailing commas and type safety ([04246da](https://github.com/alternun-development/alternun/commit/04246da470b81c8caf11296012387d84e535a091))
- resolve legal paths and sanitize media URLs ([c40d4db](https://github.com/alternun-development/alternun/commit/c40d4db988fd1988c50ffd91239657c0eb366b5d))
- resolve pnpm workspace dependency issues ([d560941](https://github.com/alternun-development/alternun/commit/d560941a49f398b38731f9d5e13c2e0b3eabfac7))
- restore auth package build compatibility ([22f3d85](https://github.com/alternun-development/alternun/commit/22f3d85447d360909b383d76765d84c5eb644b0a))
- restore authentication_flow on Google Authentik source ([be05a46](https://github.com/alternun-development/alternun/commit/be05a46cce5838e34e91f5e9528ca7f719e25c76))
- restore direct source auth login stages ([84f2ed7](https://github.com/alternun-development/alternun/commit/84f2ed72d1dddbe15dd4f01efbf804e3946e786a))
- restore footer copyright text with hover underline on Alternun link ([3d37ef1](https://github.com/alternun-development/alternun/commit/3d37ef1c8b21b7c3cb044a945d5bbf76c4462683))
- restore relative expo app path for sst ([50836ff](https://github.com/alternun-development/alternun/commit/50836ffe28fb82ce8aa3e2375b1eec19d9d32a9f))
- restore SSM Supabase precedence in CI ([cba0fc5](https://github.com/alternun-development/alternun/commit/cba0fc52da834fc781bf2d90935948e2dce311be))
- restore trailing commas and formatting after prettier ([1af7d25](https://github.com/alternun-development/alternun/commit/1af7d25cda10e08a5fe6e8d2ab904d7ddcd5c100))
- reuse explicit certs in ci deploys ([8187b7b](https://github.com/alternun-development/alternun/commit/8187b7bfc23214127f0e934f5903568cd44fe688))
- **root:** correct Node version engine constraint ([f56ed2d](https://github.com/alternun-development/alternun/commit/f56ed2d0a4616fb168cdcd9b1bc3542e4e01cd3b))
- run sst deploy from repo infra root ([d4bffcb](https://github.com/alternun-development/alternun/commit/d4bffcb7e1ca8cd8bfdf8fa038d6b3a20f408cac))
- **scripts:** upsert release PR via REST ([de3fd33](https://github.com/alternun-development/alternun/commit/de3fd33299e83f7be9b2f71b5732bc6c459dbd4f))
- **secret-scan:** remove bootstrap key fragments ([fc67d27](https://github.com/alternun-development/alternun/commit/fc67d2777196588d5e3c551ec778ab4e6fe3465c))
- **secret-scan:** remove publishable key literals ([fe52e33](https://github.com/alternun-development/alternun/commit/fe52e33814574446f301d62ab4e68039a08cc015))
- **secrets:** remove discord public key from env example ([5320774](https://github.com/alternun-development/alternun/commit/532077405cc4b34d0a60dde58e1d2fa773ae888d))
- **security:** bump proxy-addr, shell-quote, simple-git past critical advisories ([0bb5aec](https://github.com/alternun-development/alternun/commit/0bb5aec174ad6dec8b8a356438afb5776fdd6b23))
- **security:** clear remaining codeql alerts ([10232aa](https://github.com/alternun-development/alternun/commit/10232aa01422f90c1b8181434d1b92ece3030d69))
- **security:** exclude audit's own files from git-history leak scan ([2055c24](https://github.com/alternun-development/alternun/commit/2055c247403c777b7aa9510f97ecc12c7d6c4184))
- **security:** marketplace access regression tests and review evidence ([1dc69f2](https://github.com/alternun-development/alternun/commit/1dc69f2aac4c1ff2f36b7aa5c608418da0b22924))
- **security:** patch Next.js and retain CI audit evidence ([94f5851](https://github.com/alternun-development/alternun/commit/94f5851cb879af480391d825633bd0fa83127541))
- **security:** patch simple-git critical advisory ([285e074](https://github.com/alternun-development/alternun/commit/285e0744a1f5af43e1956ef72088e3e0fd72df61))
- **security:** remove regex from browser origin normalization ([3e465f8](https://github.com/alternun-development/alternun/commit/3e465f8eb96fdaad7cc1a559c296629d4b31438a))
- **security:** resolve CodeQL clear-text logging and bad tag filter alerts ([d252a3b](https://github.com/alternun-development/alternun/commit/d252a3bf374927c69dd43ef3ceed96bc9bc92efc))
- **security:** resolve CodeQL findings on the release PR ([0f0a8cb](https://github.com/alternun-development/alternun/commit/0f0a8cbada2713d165d8ca521104772cea2dd580)), closes [#74](https://github.com/alternun-development/alternun/issues/74) [#75](https://github.com/alternun-development/alternun/issues/75) [#76](https://github.com/alternun-development/alternun/issues/76) [#77](https://github.com/alternun-development/alternun/issues/77) [#67](https://github.com/alternun-development/alternun/issues/67) [#315](https://github.com/alternun-development/alternun/issues/315)
- **security:** resolve critical dependency advisories ([314aec3](https://github.com/alternun-development/alternun/commit/314aec3d89617c26c5ea257cf9083a61d973bcc3))
- speed up ci deploy and prune cert state correctly ([ab03de1](https://github.com/alternun-development/alternun/commit/ab03de19e44d4248a5dd29f9ec0a72e69a68b8ff))
- split authentik web callback flow ([6364462](https://github.com/alternun-development/alternun/commit/6364462d1900b7ed3eb25b773f357ed29cf88e22))
- stabilize ci install and infra env resolution ([ed31d97](https://github.com/alternun-development/alternun/commit/ed31d972ffbe0b338ae7795624f4021fced7c3c6))
- stack dashboard summary cards on mobile ([218ae38](https://github.com/alternun-development/alternun/commit/218ae38707d53b5963352b1226c8d7bf89974886))
- support route filenames in type guard ([183561b](https://github.com/alternun-development/alternun/commit/183561bec57ef18120ce55edf0b19bd30abb1188))
- sync web media assets without internal sst imports ([e448de8](https://github.com/alternun-development/alternun/commit/e448de8185689baa5e706ae5053ab10a7c540181))
- **ui,mobile:** Improve background image visibility with minimal opacity ([185ecb2](https://github.com/alternun-development/alternun/commit/185ecb29dd571c495c95503acdfaa4487b217079))
- **ui:** align footer version with drawer and clean up changelog noise ([ff143e3](https://github.com/alternun-development/alternun/commit/ff143e3679dd89a0923f02e2b87e5a61d566a357))
- **ui:** fix modal expansion and add direct GitHub tag links ([c01d467](https://github.com/alternun-development/alternun/commit/c01d4679682ffafc715dbc2d5472a44288382655))
- **ui:** improve ChangelogDrawer sheet expansion and header display ([effdf50](https://github.com/alternun-development/alternun/commit/effdf50ca25f860cde02bf637a121c452a03c8ee))
- **ui:** Improve version pill text contrast by using accent color ([1c1f6c1](https://github.com/alternun-development/alternun/commit/1c1f6c1e17eb19ab9ead6a441f5a1615edc1948f))
- **ui:** Make HeroPanel background fully transparent with text shadows for contrast ([2f8a91b](https://github.com/alternun-development/alternun/commit/2f8a91b90f2547b971352f145e708ee2901663b7))
- **ui:** move profile tab pills below title, fix ATN/RBI card overlap on small screens ([655b38b](https://github.com/alternun-development/alternun/commit/655b38b2ff8bf430d1f3726f97dbf9e4723693b8))
- **ui:** never show a negative progress to the next tier ([3b2b016](https://github.com/alternun-development/alternun/commit/3b2b0161ae2d0444ffe8a6ab3471c4f67176541b))
- **ui:** Remove all background colors from HeroPanel for full image transparency ([fdfdf17](https://github.com/alternun-development/alternun/commit/fdfdf1794b9bf81c32d7a906fc9fcedf74b2d6be))
- unify authentik web auth flow ([c7b89e2](https://github.com/alternun-development/alternun/commit/c7b89e2c0ad58b9994cf3e1a3a0cf0af87fccafa))
- update .gitleaksignore to properly ignore public API keys ([73eb6a2](https://github.com/alternun-development/alternun/commit/73eb6a27b9a8589a853e172b7389932083689ef0))
- update branch protection to support both main and master ([e8b366b](https://github.com/alternun-development/alternun/commit/e8b366bcd0046afafd3ead8f008f401dc26dfe1b))
- update deploy workflow to use pnpm and v4 actions ([46f4b7c](https://github.com/alternun-development/alternun/commit/46f4b7c671e811933536f64dd257cf8a5c1d92f2))
- update GitHub Actions cache to use pnpm instead of npm ([a8123be](https://github.com/alternun-development/alternun/commit/a8123beeab06bfe36e00831fd21e351483c3bc05))
- update Next.js and adjust security audit level ([9d5c499](https://github.com/alternun-development/alternun/commit/9d5c49991d1b17cffb53d909058c6236e81b607b))
- update Node.js requirement to 22.22.0 and fix package-lock sync ([d12b709](https://github.com/alternun-development/alternun/commit/d12b709ddbba4494d922da54f42a23bc0403146d))
- update test-deploy workflow to use pnpm ([04cc2ff](https://github.com/alternun-development/alternun/commit/04cc2ff17590dcbf77ac74c31ff01fd9367ffb24))
- update upload-artifact to v4 ([de51f7c](https://github.com/alternun-development/alternun/commit/de51f7c7978562974b98e1694d4bc04b8ed3fee5))
- update versioning and handlebars override ([91ca2a9](https://github.com/alternun-development/alternun/commit/91ca2a9888d42d775bbd08d3de226ef40d847a06))
- **update:** only notify for newer versions, not downgrades ([1ca72fd](https://github.com/alternun-development/alternun/commit/1ca72fda86b616bc8635adf772abd5ca1f1cdb66))
- upgrade mobile footer layout with improved spacing and smaller social icons ([7aa05a8](https://github.com/alternun-development/alternun/commit/7aa05a8a84381bb7510945b50d2c450b3aa75a3d))
- use infra wrapper in codebuild deploy ([3a7e62d](https://github.com/alternun-development/alternun/commit/3a7e62d6e5e121d639aac2c5c9bcd048ce59dcb2))
- use localhost admin oidc in identity dev pipeline ([4551173](https://github.com/alternun-development/alternun/commit/45511732ea6b487bbf3d0466a7d40674776aaaad))
- **versioning:** accept promoted mobile app version mirror ([e709ce9](https://github.com/alternun-development/alternun/commit/e709ce9e718318d7db2e58b29aa36be0b343d43c))
- **versioning:** enforce root README sync ([8424c77](https://github.com/alternun-development/alternun/commit/8424c77e4aca3d6a57baaa63fd1b32d67a02f86d))
- **video-studio:** use port 3003 by default ([9aeeeff](https://github.com/alternun-development/alternun/commit/9aeeeff65f7169cdcb9215e198cf0387f0e755b6))
- **wallet:** card UI + routing fix + vault detection + PIN change flow ([51dd040](https://github.com/alternun-development/alternun/commit/51dd040b758f273e1d60f766b15f17777e991c6f))
- **wallet:** eliminate layout gap in manage wallets screen ([c48ea98](https://github.com/alternun-development/alternun/commit/c48ea98e5fa07acb9e1258af7dabee11e0f242ac))
- **wallet:** make pin digest key extractable ([5c8d4d2](https://github.com/alternun-development/alternun/commit/5c8d4d26c3170f698b7250ebc4f7c27d30739bea))
- **wallet:** MetaMask body error, PIN false-positive, progressive image loading ([57ac5e0](https://github.com/alternun-development/alternun/commit/57ac5e03866bae787e1622bc2bd8d36b2794447e))
- **wallet:** remove flex:1 from title style causing layout gap ([0ba6a1d](https://github.com/alternun-development/alternun/commit/0ba6a1d8f667809a690e75c13130bada080882a8))
- **wallet:** resolve 2 high-severity CodeQL alerts in packages/wallet ([754f775](https://github.com/alternun-development/alternun/commit/754f775de8c028b01c462ace2cbf6931cafbdb08)), closes [#62](https://github.com/alternun-development/alternun/issues/62) [#61](https://github.com/alternun-development/alternun/issues/61)
- **web:** build ([93846ba](https://github.com/alternun-development/alternun/commit/93846ba9bdbc1824628264dee0b417d380ac2d26))
- **web:** bump next to 15.5.28 for GHSA-2464-fhr4-w9xw ([ff98a77](https://github.com/alternun-development/alternun/commit/ff98a77bd17e807b310b4d487f3f94611c308386))
- **web:** center landing footer content ([745f19f](https://github.com/alternun-development/alternun/commit/745f19fc013d7d7871b88a72c6ffc1edcca37d8b))
- **web:** hard-pin react runtime in metro resolver ([1943cc6](https://github.com/alternun-development/alternun/commit/1943cc61b2b06dde6bd100e943401ae0931ae28d))
- **web:** next-env.d, \_document ([b70b4cb](https://github.com/alternun-development/alternun/commit/b70b4cbd2ee55a872330f099212bbcaf04e68504))
- **web:** pages ([85150f7](https://github.com/alternun-development/alternun/commit/85150f732a304ac99556bd2bd9dde26fbc6f5e12))
- **web:** properly center landing footer and add accessibility labels ([8f3e359](https://github.com/alternun-development/alternun/commit/8f3e3596d4f2c4ff1d6b74af98190cbec4845395))
- **web:** share only the square Airs logosymbol in link previews ([8c4e3f0](https://github.com/alternun-development/alternun/commit/8c4e3f035809ff2e3c9425394af3c1d61d865f8a))
- **web:** Sidebar ([2c9ac51](https://github.com/alternun-development/alternun/commit/2c9ac5115f678221cb4eaf798539e5e6e77678d6))
- **web:** StaticErrorPage ([549c29c](https://github.com/alternun-development/alternun/commit/549c29c0ad3f62e2c50c504dcbff64110f79aefd))
- **web:** widen Anek Latin globally ([4b6f880](https://github.com/alternun-development/alternun/commit/4b6f88098aeab127e4628f1f508b5720a5be1e90))

### Features

- **achievements:** expand to 16 total achievements ([86f95a0](https://github.com/alternun-development/alternun/commit/86f95a093d58efee92b2481e134c6c6ce5b83a26))
- **achievements:** implement user achievement tracking system ([93c9aa8](https://github.com/alternun-development/alternun/commit/93c9aa8763120495487b8364b61372a9d5a53833))
- add alternun ECC bundle (.agents/skills/alternun/agents/openai.yaml) ([f7200e6](https://github.com/alternun-development/alternun/commit/f7200e6678a51d66d1fedb295e5985fc654d22b2))
- add alternun ECC bundle (.agents/skills/alternun/SKILL.md) ([5df1d07](https://github.com/alternun-development/alternun/commit/5df1d07ca938871a84f6e86923765f35e3f4a1c3))
- add alternun ECC bundle (.claude/ecc-tools.json) ([1fd2597](https://github.com/alternun-development/alternun/commit/1fd2597187db3aff4eb795f0218622986f07ed11))
- add alternun ECC bundle (.claude/homunculus/instincts/inherited/alternun-instincts.yaml) ([4fabf98](https://github.com/alternun-development/alternun/commit/4fabf98c63996289b80572e1a79d460fe9c19ffc))
- add alternun ECC bundle (.claude/identity.json) ([5132344](https://github.com/alternun-development/alternun/commit/5132344b484c334263b76a415083cf84ea58969e))
- add alternun ECC bundle (.claude/skills/alternun/SKILL.md) ([62d7c66](https://github.com/alternun-development/alternun/commit/62d7c667be6b242ca2ed0aadccd7e3bfb7b46350))
- add alternun ECC bundle (.codex/AGENTS.md) ([e4cfa9a](https://github.com/alternun-development/alternun/commit/e4cfa9a64cd260974e59e28100bfb61113b4e288))
- add alternun ECC bundle (.codex/agents/docs-researcher.toml) ([992573f](https://github.com/alternun-development/alternun/commit/992573f92aae012ae6c7384b2d814578e7c62e99))
- add alternun ECC bundle (.codex/agents/explorer.toml) ([c490396](https://github.com/alternun-development/alternun/commit/c4903964c0cea315105c6273f4cde0ccc77fff82))
- add alternun ECC bundle (.codex/agents/reviewer.toml) ([9207178](https://github.com/alternun-development/alternun/commit/9207178c290defd6306ddcffa0f8c6ae4d37fb7c))
- add alternun ECC bundle (.codex/config.toml) ([2ed84d2](https://github.com/alternun-development/alternun/commit/2ed84d2dd4ac3f5c5ef220918c619151176dd4e2))
- Add animated counters and wallet navigation to dashboard cards ([8585afd](https://github.com/alternun-development/alternun/commit/8585afd09a80a60ca3715c7f923eadeee53d6148))
- add animated features section and futuristic footer ([9f414f3](https://github.com/alternun-development/alternun/commit/9f414f389788b45dd6a10d1b7ed9fb5156f246ca))
- add animated hero landing page foundation ([3a0e26e](https://github.com/alternun-development/alternun/commit/3a0e26e837a3e58ee33176b242826f413878e229))
- add authentik redirect preservation and v1.4.2 exports ([d87a1ee](https://github.com/alternun-development/alternun/commit/d87a1ee297c71ba8a9cf87fd956759ab1afd7ce7))
- add comprehensive database migration system with environment detection ([8a9ca3c](https://github.com/alternun-development/alternun/commit/8a9ca3c99cbb300f219c978166c286f57fb58a6d))
- add comprehensive documentation and development infrastructure ([25b9474](https://github.com/alternun-development/alternun/commit/25b94741b7427dc8389a24217a9dcc5dc0186045))
- add comprehensive support and legal pages infrastructure ([51754a0](https://github.com/alternun-development/alternun/commit/51754a0c5a02e012e39417c30d2b346cd84825c9))
- add internationalization for footer and legal pages ([5120367](https://github.com/alternun-development/alternun/commit/51203679ef2a2a1ed1b84549654c01282dadbd5d))
- add landing page footer with version and help icon ([3b28ed2](https://github.com/alternun-development/alternun/commit/3b28ed231d2858943eb6158168dc72d4e3b404bc))
- add mark as unread functionality to notifications ([c672e25](https://github.com/alternun-development/alternun/commit/c672e25f79987e30b9222335bc762f8143657ceb))
- add modern KPI card component and update copyright link ([b7ff73e](https://github.com/alternun-development/alternun/commit/b7ff73ea7f24b34fb4eefd9371c670edb95c1f68))
- add privacy, terms, and cookies policy pages ([a64140f](https://github.com/alternun-development/alternun/commit/a64140fc5ed70c911e2f3753ee55e903671abfb1))
- add reload icon and skeleton loading to HeroPanel ([a8a0855](https://github.com/alternun-development/alternun/commit/a8a0855e87907646d113c5f7ea5c6b6b2449c603))
- add standalone notification center page ([5aa1f10](https://github.com/alternun-development/alternun/commit/5aa1f104580bd484fa61a822e03fe9e0fec41249))
- add tooltip info to notification badge ([94ed212](https://github.com/alternun-development/alternun/commit/94ed212a42da48b6f32b19fd22ee1782df8620bf))
- Add view-transition effects and system theme detection to web app ([62bade7](https://github.com/alternun-development/alternun/commit/62bade765abbd08aeae09bd55bd4d4d9df9658b9))
- add web hover tooltip trigger for info icon ([0c87395](https://github.com/alternun-development/alternun/commit/0c87395c71488c0daad5ac9a10952309d9ab7fa9))
- add web3 login feature flag to hide connect wallet option ([b2f9995](https://github.com/alternun-development/alternun/commit/b2f9995a2075cc6e818fdd2ae3d2d4828f811074))
- **admin:** improve mobile navigation and profile menu ([99744f0](https://github.com/alternun-development/alternun/commit/99744f064b2a1cf818bb6a756ad7e6cba00e3b51))
- **admin:** manage enterprises from the marketplace panel (refs [#249](https://github.com/alternun-development/alternun/issues/249)) ([9095b2d](https://github.com/alternun-development/alternun/commit/9095b2d60c5aecb067d7a341088173753769d7c6))
- **admin:** report Airs to a guest and review reports over the limits ([8b9652c](https://github.com/alternun-development/alternun/commit/8b9652cb987f9e1a190d8d6e585e40b3554f0f06)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **admin:** secure hosted authentik sign-in ([d7350c0](https://github.com/alternun-development/alternun/commit/d7350c00b9a8bcabec6c8297060a32f353582415))
- **admin:** show deployed release on login ([c5e0a6b](https://github.com/alternun-development/alternun/commit/c5e0a6b72efadf4d7bbf2a70b2b2c1cd729ef325))
- **admin:** summary strip and status accents on the Airs reports list ([e17a13e](https://github.com/alternun-development/alternun/commit/e17a13e9eefe5af99946627f44f88d8bb5c5004b)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **airs-report:** show each report's history and reward status ([9958eab](https://github.com/alternun-development/alternun/commit/9958eabfac366463d9408d1d3b567b11100e50a9)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **airs:** paginate activity and secure referral rewards ([47bd3e8](https://github.com/alternun-development/alternun/commit/47bd3e873665210581afe1e3e545623d98cf196a))
- **api:** accept marketplace project proposals and notify by email ([83c57da](https://github.com/alternun-development/alternun/commit/83c57dae43d750b91e9494101f186b8b3bd17918))
- **api:** add global activity feed module ([510df6f](https://github.com/alternun-development/alternun/commit/510df6f903eb68f2e838bbd1a9b118fe4397d3bc))
- **api:** add the User Airs Report admin endpoints ([5f157c1](https://github.com/alternun-development/alternun/commit/5f157c13420daa8217e086ca74c7c215da2c1fb2)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **api:** add the User Airs Report API contract ([ac207b8](https://github.com/alternun-development/alternun/commit/ac207b8405273ee0c254b6b63d0dff285556e5bd)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **api:** claim waiting Airs reports when a confirmed user signs in ([308aa8f](https://github.com/alternun-development/alternun/commit/308aa8fd992b0eb0cc3de2a61d20637a2cc75b77)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **api:** email approvers, submitters and support about report approvals ([63e8d77](https://github.com/alternun-development/alternun/commit/63e8d7790601e043c9a69a93ef24eb1ffba829d5)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **api:** email the recipient and support when Airs are issued ([d40d407](https://github.com/alternun-development/alternun/commit/d40d40713c9d84678b595813f1c521f08ded76b5)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **api:** return provisional participation factor from /v1/airs/me ([d4ee955](https://github.com/alternun-development/alternun/commit/d4ee9550d7f167cef8f56366703b966eb6d7d5f1))
- **api:** script to link each project with its Airs account ([09da978](https://github.com/alternun-development/alternun/commit/09da9788873e8240cc0f357564ecad605a927b73)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **auth,infra:** use authentik v1.4.2 preset helpers and fix mobile redirect URIs ([2e5ae45](https://github.com/alternun-development/alternun/commit/2e5ae4537069ceb4bdcc4d7d499c8a6d5d320b35))
- **auth:** add Enter key submit support to sign-in and sign-up email forms ([7700100](https://github.com/alternun-development/alternun/commit/77001004546c5b2516c86bc958b3c2a6449fd3df))
- **auth:** add runtime footer with version source and auth host ([5b18564](https://github.com/alternun-development/alternun/commit/5b1856470fc8c9be5b2b951469cfabdc7fc8807e))
- **auth:** add settings dropdown to auth modal header, fix password icon overflow ([007e536](https://github.com/alternun-development/alternun/commit/007e536c2c0775ebb16032d4a21d99a195786198))
- **auth:** add wrapper package and mobile web3 auth foundation ([880247c](https://github.com/alternun-development/alternun/commit/880247cd24fddf5d7761ff8bdd8095891cb93f0f))
- **auth:** Authentik OIDC + vendor-independent Supabase user sync — v1.0.5 ([c5d6418](https://github.com/alternun-development/alternun/commit/c5d64187f7d634d2aacb4aa56c940bef7c14966b))
- **auth:** extract AuthentikOidcClient into @alternun/auth package ([f22d84a](https://github.com/alternun-development/alternun/commit/f22d84ab2dc2b8cceee07d0577166c75cf627200))
- **auth:** improve signup UI and fix referral flow for social logins ([62991a4](https://github.com/alternun-development/alternun/commit/62991a4aad11d602df7b117010ba297101515e49))
- **auth:** integrate Better Auth with Supabase PostgreSQL database ([7bf7d05](https://github.com/alternun-development/alternun/commit/7bf7d05e4a35c789c16e11e56700f60328d06a92))
- **auth:** refactor signup flow into two-path selection UI ([12caeef](https://github.com/alternun-development/alternun/commit/12caeef8fddb47058622f3083445e0250d6d84a5))
- **auth:** remind users to check their spam folder while awaiting the code ([13d779a](https://github.com/alternun-development/alternun/commit/13d779a24fc55fb90f8df2383440b7a5d9296b4a))
- **auth:** support signup confirmation code + localized email guidance ([0d11fd9](https://github.com/alternun-development/alternun/commit/0d11fd99dd9cb54bb3efbad749c4f75d582657b4))
- **auth:** upgrade to @edcalderon/auth 1.3.0 with canonical AuthentikOidcClient ([b918404](https://github.com/alternun-development/alternun/commit/b918404a5937f0dff7890dac5065be58acf23e29))
- **ci:** enforce post-deploy reachability and reconcile infra drift ([9efd38e](https://github.com/alternun-development/alternun/commit/9efd38e7be95d6219d6bf04af72235f51bb8d6bc))
- Complete notification system upgrade with context, search filters, and actions ([129da87](https://github.com/alternun-development/alternun/commit/129da87882c1cc35781fb81b0a8953fb2a9a95f6))
- dashboard UI redesign, shared UI design system, and Metro fix ([d643a7a](https://github.com/alternun-development/alternun/commit/d643a7a39c74fb89a7b70d6e56fe2372a92f62a4))
- **dashboard:** Airs symbol loader, resizable column lanes and sortable activity ([3a4f993](https://github.com/alternun-development/alternun/commit/3a4f9930e01dec73a69f9c24c3450607cc10e5a9))
- **db:** add the airs_reports schema ([318aba5](https://github.com/alternun-development/alternun/commit/318aba5ca770f6bdec0f03fec04cf4247702a2b6)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **db:** add the User Airs Report transition functions ([08948f7](https://github.com/alternun-development/alternun/commit/08948f7ea981848e1faf1c00fccf879c5f5edf75)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **db:** claim User Airs Reports and link a project account ([9af1a30](https://github.com/alternun-development/alternun/commit/9af1a309b16e7bb0ec294a560168964105ed730e)), closes [#249](https://github.com/alternun-development/alternun/issues/249) [#249](https://github.com/alternun-development/alternun/issues/249)
- **db:** publish eco-turismo as marketplace project 1 ([64c5c98](https://github.com/alternun-development/alternun/commit/64c5c98cc2cf952861729a3fc0ba8290fba5be28))
- **db:** store marketplace project proposals ([90e69d3](https://github.com/alternun-development/alternun/commit/90e69d3b28404fbc2671ded970dc907e08b0bda2))
- **docs:** add decap cms admin auth ([8b2b399](https://github.com/alternun-development/alternun/commit/8b2b399378294691ab25972c61a3f0b378456db9))
- **docs:** add testnet api fallback flag for decap ([81b9824](https://github.com/alternun-development/alternun/commit/81b98242ba6da156e17842151cfea856ef707c6a))
- **docs:** enable production decap github oauth ([a50be13](https://github.com/alternun-development/alternun/commit/a50be13ca1ee855156652efe67edc6fa524bef04))
- **docs:** integrate ChangelogDrawer into Docusaurus footer ([273bb6f](https://github.com/alternun-development/alternun/commit/273bb6fe9b10b23c2273da559a8eec2ee423c5bc))
- **email,marketplace:** send through Tláo only, auth-style form fields, client history ([4bed9b7](https://github.com/alternun-development/alternun/commit/4bed9b723d65b281d224671b62209cf4db019343))
- **email:** add multilingual Supabase auth templates ([8ecd5f3](https://github.com/alternun-development/alternun/commit/8ecd5f3664c1c6de2823e24bf72093d8c1b2b9f9))
- enforce authentik redisless version baseline ([72314f6](https://github.com/alternun-development/alternun/commit/72314f69e4e837242a7be02ab4b1c4dd8049b0b1))
- enforce branch protection workflow requiring PR to develop ([9fe1fae](https://github.com/alternun-development/alternun/commit/9fe1fae9a55ec58bfcb497f2af5c394edc7334d4))
- faqs ([a74be82](https://github.com/alternun-development/alternun/commit/a74be82a3bd2ce0164741675427471b3dec15b9d))
- **geo:** server-side IP geolocation proxy via ipapi.co ([6f7933f](https://github.com/alternun-development/alternun/commit/6f7933fe9b9fb631d8c4a12895a5cfe6301ad0e2))
- github actions ([f4e4eb4](https://github.com/alternun-development/alternun/commit/f4e4eb4b9deec8fec509a0bae5f9d420bec9f600))
- github actions ([5544a27](https://github.com/alternun-development/alternun/commit/5544a2797d6f056fc469a3ac8415132a08bc34c3))
- github actions ([5f89a6c](https://github.com/alternun-development/alternun/commit/5f89a6ca53bd988087293fd840614f741974c0a7))
- github actions ([13116fd](https://github.com/alternun-development/alternun/commit/13116fd7168f14c02add1c349eae486d4d433062))
- github actions ([330c046](https://github.com/alternun-development/alternun/commit/330c046d8d5e0d7e3fc6cbbcb0648acce651fbd5))
- github actions ([9403ddd](https://github.com/alternun-development/alternun/commit/9403ddddefc96e2d57e77f777d1015c1ac40ca12))
- github actions ([fd82e6b](https://github.com/alternun-development/alternun/commit/fd82e6bf8963e344469f677eae79c084624b34ee))
- github actions ([93b5133](https://github.com/alternun-development/alternun/commit/93b51339a3672d8c0ccb7650cbca3e9886e443db))
- github actions ([db2276c](https://github.com/alternun-development/alternun/commit/db2276c35ea591e29218632e77ec96eee612161e))
- github actions ([ac18e39](https://github.com/alternun-development/alternun/commit/ac18e39e7509fa37c0dbeb825ef9f3adc1922e18))
- github actions ([0701d57](https://github.com/alternun-development/alternun/commit/0701d57b426eae797b41b9333d7e21197391a991))
- github actions ([cf52c3a](https://github.com/alternun-development/alternun/commit/cf52c3a1be0fff4960cf94df667dd1eb989570cd))
- github actions ([c7df9f2](https://github.com/alternun-development/alternun/commit/c7df9f2707256fbd33f6fae82ac134d91e557cfb))
- **honor-awards:** Galardones de honor for people and allies ([9342e95](https://github.com/alternun-development/alternun/commit/9342e95b2a970c31e85559d1cf3b0ce000c2a382))
- **honor-awards:** medal art, info, demo and per-stay ally medals ([ac72491](https://github.com/alternun-development/alternun/commit/ac72491b88f1e6c30b9dc3b098c5fcff81a12000))
- **honor-awards:** medals and cards matching the design templates ([0e7999a](https://github.com/alternun-development/alternun/commit/0e7999aff15b955535eaee33f5f67308310070ce))
- i18n ([056f4c5](https://github.com/alternun-development/alternun/commit/056f4c57bcb2ac0b3d43e14af193eeef9b00623d))
- i18n ([9f1ca23](https://github.com/alternun-development/alternun/commit/9f1ca234d6d167122af63e8885b90184d506ea73))
- i18n ([d8727a4](https://github.com/alternun-development/alternun/commit/d8727a4d27097fbd81a318c5ec87e0ba2de31eb1))
- **i18n,web:** add footer translations to web i18n catalogs ([24e9448](https://github.com/alternun-development/alternun/commit/24e94483980c5d1a6654cc33269e9cc97184e02a))
- **i18n:** add accessible title for the project presentation embed ([d84485c](https://github.com/alternun-development/alternun/commit/d84485c9510fccc3d0be499e3d0cc7ca965bd1db))
- **i18n:** add enterprise directory view and pagination labels ([13ec48e](https://github.com/alternun-development/alternun/commit/13ec48ee78f137a081468e5314738023a0122833))
- **i18n:** add missing wallet.changePin and addAccount.noVault translations to es/th ([70dce25](https://github.com/alternun-development/alternun/commit/70dce2569b9a5182f15c3d4476cf874c9f9caeb8))
- **identity:** back up acme state to s3 ([e1c17c5](https://github.com/alternun-development/alternun/commit/e1c17c52ac2b4390c98e226267a7058c2fbb3929))
- **identity:** harden partner admin access ([1fcf8f3](https://github.com/alternun-development/alternun/commit/1fcf8f38f218d570b340772b892c027749826338))
- **identity:** rename auth host to sso ([4aab296](https://github.com/alternun-development/alternun/commit/4aab2960db6b5f276ad152c8665f87168cb71d6a))
- **identity:** rename dev auth domain and normalize instance naming ([7142b93](https://github.com/alternun-development/alternun/commit/7142b93409dc7bfbfb4e2011aa4142539588a707))
- **identity:** split testnet dns01 and prod alb tls ([ac971cf](https://github.com/alternun-development/alternun/commit/ac971cfdcb9d5a1c64ce8ee09ce88a5da526d0c7))
- implement complete reload system with pull-to-refresh and visible reload button ([3227c0f](https://github.com/alternun-development/alternun/commit/3227c0ff32c96d3a5441a6f48ff017e9f515737f))
- implement cross-platform tooltip system with status update info ([823de65](https://github.com/alternun-development/alternun/commit/823de65579adfd9bfac7900780f324a95cd04963))
- implement proper i18n for interactive neural vortex hero ([995ebf7](https://github.com/alternun-development/alternun/commit/995ebf7ee96013b3b0d749f5ef9ee1c5cacd13a7))
- **infra:** add dedicated identity pipeline target ([39b5f30](https://github.com/alternun-development/alternun/commit/39b5f30a8ec8cdaf766b8c59c08e0ac40ee2f7eb))
- **infra:** bootstrap authentik runtime on identity host ([e4fc859](https://github.com/alternun-development/alternun/commit/e4fc8591d81c412c68aaae07cb4c5d306b7dcfa4))
- **infra:** harden identity deploy safety guards ([cc9c7b2](https://github.com/alternun-development/alternun/commit/cc9c7b28c176da71f02f494d27f31aa16b8281d8))
- **infra:** make alternun.co internal admins, only for verified addresses ([df9f78c](https://github.com/alternun-development/alternun/commit/df9f78ca485befc8d909887842bfdc50f8aab8dd)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **infra:** map one Authentik group to each admin role ([3e8d1c3](https://github.com/alternun-development/alternun/commit/3e8d1c385d5b3ba4ab62be4f6a320807f8119200)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **infra:** move dev domain to testnet and add redirect stack ([8e626ba](https://github.com/alternun-development/alternun/commit/8e626ba51dcc036c3b3bd84c2ecc2970f4496616))
- **infra:** pass Airs report and Authentik sync settings to the API from SSM ([f2b4f25](https://github.com/alternun-development/alternun/commit/f2b4f258f47a6436c4d0111060f3a907af3fb261)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **infra:** scope identity deploys by stage ([2803e10](https://github.com/alternun-development/alternun/commit/2803e10c9498e6bd3ee726072c5d91f415f54638))
- **infra:** support ec2-local postgres mode for identity-dev ([551ee6d](https://github.com/alternun-development/alternun/commit/551ee6d96dc877d09d73136f5212a9a5c175542d))
- initialize versioning configuration for monorepo ([58f8e8c](https://github.com/alternun-development/alternun/commit/58f8e8c9cc68ab690b52d9b25d088b24ab343035))
- integrate wallet auth, onboarding, and infra changes ([f668e36](https://github.com/alternun-development/alternun/commit/f668e3600b357fd375038bdeaed00ade85f6fad5))
- make migrations optional (opt-in) by default ([05c7cbd](https://github.com/alternun-development/alternun/commit/05c7cbd317d9a50b9bffb1a5096c67957dda1751))
- **manage:** edit project content per language; fall back to English ([0bd4fce](https://github.com/alternun-development/alternun/commit/0bd4fcebdcfdee33ce5d4291e5b5f650597ffd89))
- **marketplace:** admin notices for new clients, resends and client pagination ([3897439](https://github.com/alternun-development/alternun/commit/38974395f8f917d7701e1125bf8ff73323b91c10))
- **marketplace:** admin-controlled order for enterprises and projects (refs [#249](https://github.com/alternun-development/alternun/issues/249)) ([2cde59a](https://github.com/alternun-development/alternun/commit/2cde59a500fb405cbb33f72e98ce43b2cab5f706))
- **marketplace:** assign project admins and moderators by email ([febcbdd](https://github.com/alternun-development/alternun/commit/febcbdd800549a7bba1bbca531d98ea15142397f)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **marketplace:** cancelled invitations cancel their waiting Airs ([737a936](https://github.com/alternun-development/alternun/commit/737a936dcb6a4a2c7a08ae90291d1082903c4ab4))
- **marketplace:** client form feedback and invitation emails with Airs details ([464c891](https://github.com/alternun-development/alternun/commit/464c891255457eb0288f7ba93694155b3b869417))
- **marketplace:** clients tab, intent guides and compact page headers ([b6dd500](https://github.com/alternun-development/alternun/commit/b6dd5004ef5c8db223a4f41fdbfd359515420487))
- **marketplace:** console inbox for Airs report notifications ([8c20066](https://github.com/alternun-development/alternun/commit/8c20066ae6b9b2af2f2bdea40593d68f61c2f8f7)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **marketplace:** deliver scoped marketplace and Explorer workflows ([#260](https://github.com/alternun-development/alternun/issues/260)) ([6768c97](https://github.com/alternun-development/alternun/commit/6768c9721f8bb2a144ce4b163cb6f6402f795c94)), closes [#257](https://github.com/alternun-development/alternun/issues/257)
- **marketplace:** domain project admins and demo role accounts ([c787916](https://github.com/alternun-development/alternun/commit/c7879161054b0596810354c64f4f6b0b786d7562))
- **marketplace:** in-app project and enterprise management, enrolment and explorer refresh ([353c40a](https://github.com/alternun-development/alternun/commit/353c40a46659c5da8cd04cef2a53a74303333a8a))
- **marketplace:** medal catalog for each project ([81bfdf6](https://github.com/alternun-development/alternun/commit/81bfdf63743a9d6cc39c65a1ba8dcf69d02e88f8)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **marketplace:** private in-app proof viewer, visible labels, discard changes ([97e6383](https://github.com/alternun-development/alternun/commit/97e6383b9849ea1c99d531fab5f234ded91e5c78))
- **marketplace:** project access screen for Super Admins ([7f41518](https://github.com/alternun-development/alternun/commit/7f415184b9ebc87e6d4acbff93540b65ec6e0aa2)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **marketplace:** project types decide the document number for Airs reports ([b79195a](https://github.com/alternun-development/alternun/commit/b79195a9ea93e823f974cf37a5cee418e026352d)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- migrate from npm to pnpm as main package manager ([ce111d6](https://github.com/alternun-development/alternun/commit/ce111d604a95a34e22046a77a5a2cf41f8452a79))
- **mobile, update:** PWA compliance, icon assets, SEO, and robust update detection ([293da6e](https://github.com/alternun-development/alternun/commit/293da6eb47061566ce696aca609ff199445e24f7))
- **mobile,api:** add auth footer with policy & help drawers ([eff8c8f](https://github.com/alternun-development/alternun/commit/eff8c8fa253a7ed6d68e55e52a0357a2af32bfc0))
- **mobile:** add AIRS intro experience and app scaffolding ([e24749e](https://github.com/alternun-development/alternun/commit/e24749e90b230c9f998c08a986a1f3e306e5cfd6))
- **mobile:** add animated liquid ParticipationFactorBar ([1d74a6e](https://github.com/alternun-development/alternun/commit/1d74a6e130caf310f1bf7f5bf0a9a35996872c00))
- **mobile:** Add dashboard background image to HeroStats card ([80b4448](https://github.com/alternun-development/alternun/commit/80b44486ef15e87b3a97885cee51f05dd58ba84f))
- **mobile:** add dynamic message bar with interactive pause/resume ([55b2870](https://github.com/alternun-development/alternun/commit/55b2870eb760bb4dcd2582ea932d2cfac6726449)), closes [#333480](https://github.com/alternun-development/alternun/issues/333480)
- **mobile:** add liquid progress palette tokens for dark and light themes ([b0a9b18](https://github.com/alternun-development/alternun/commit/b0a9b188b0982ca43d783382e08aa2212b77b19f))
- **mobile:** add navbar-consistent icons to page headers ([e3800eb](https://github.com/alternun-development/alternun/commit/e3800eb1deff175c07c9d5ddaf3e138ab5e11763))
- **mobile:** add referral QR modal ([fd2ae77](https://github.com/alternun-development/alternun/commit/fd2ae771e6414c44fab93c3820dbb981e8f671a3)), closes [#254](https://github.com/alternun-development/alternun/issues/254)
- **mobile:** add reusable app footer and wire into global layout ([1732a2a](https://github.com/alternun-development/alternun/commit/1732a2a65cd9aee036b163bee7fadb8c7956e165))
- **mobile:** add subtle floating animation to footer glow orbs ([a0bf145](https://github.com/alternun-development/alternun/commit/a0bf145a4b92c7a732d7f1eb605717408388fdb4))
- **mobile:** add THREE.js aurora animation and navbar to referral page ([4554470](https://github.com/alternun-development/alternun/commit/4554470507cecd6f42f24e1adf44c14292d2b276))
- **mobile:** add underline effect to privacy & terms links ([4614e03](https://github.com/alternun-development/alternun/commit/4614e0301b07429d054921def415a8bf8142eadd))
- **mobile:** apply Sculpin font to navbar links ([a306217](https://github.com/alternun-development/alternun/commit/a30621738f09884c62e0fd60127b91644610e0d6))
- **mobile:** center content column with max width and gutters on large screens ([5c668d8](https://github.com/alternun-development/alternun/commit/5c668d808a0dd65bc79eb311025b52559fb4806c))
- **mobile:** comprehensive responsive design improvements ([5f07888](https://github.com/alternun-development/alternun/commit/5f078887264a3c8d52fc055ad70c0fcdf9bd72c7))
- **mobile:** consolidate navigation into 3 tab-based views ([f597d15](https://github.com/alternun-development/alternun/commit/f597d155d4bac11141d3f731a35bfe1063728cd7))
- **mobile:** enhance referral navbar with theme toggle, language selector, and avatar dropdown ([fc709e8](https://github.com/alternun-development/alternun/commit/fc709e8214ceda1862531b32f8196dd51bf3d703))
- **mobile:** increase logo and navigation bar size on desktop view ([b4fc917](https://github.com/alternun-development/alternun/commit/b4fc91749337e716d40d2a044cc889cca5193f90))
- **mobile:** integrate ChangelogDrawer into landing and app footers ([f8e0092](https://github.com/alternun-development/alternun/commit/f8e00928bc2bd9361dc6b0a7b4ba07d645c58381))
- **mobile:** label provisional FP as estimated and clarify RBI help texts ([e1aa358](https://github.com/alternun-development/alternun/commit/e1aa35856e34e1a3c0d5add0d4b320fb855e90c9))
- **mobile:** load Sculpin font and apply to landing overlay text ([86b9aaa](https://github.com/alternun-development/alternun/commit/86b9aaa1ee5d83744ab1c0c02f948023b9709ae1))
- **mobile:** make referral page publicly accessible as standalone page ([cbf70c2](https://github.com/alternun-development/alternun/commit/cbf70c2d6ac36cd5ef9a6943140aa19b8d4af77d))
- **mobile:** make the account badge chevron a visible chip and let the pill fill the nav ([44959d6](https://github.com/alternun-development/alternun/commit/44959d6a066fece2faf6a1fd6c0f3d330710a6a3))
- **mobile:** migrate logo assets from PNG to SVG format ([6ebde09](https://github.com/alternun-development/alternun/commit/6ebde0957ceb18f439dd0198f7d5aee9ba5d3149))
- **mobile:** neutral Explorer palette, banner video/Canva, PiP, normalized footer ([696bc16](https://github.com/alternun-development/alternun/commit/696bc165cbe1d597f8d0d8abfd88095fceae636b))
- **mobile:** open the profile from the account badge avatar and name ([5de2ffb](https://github.com/alternun-development/alternun/commit/5de2ffbd4fad8db5fda972bc0724628c425abe29))
- **mobile:** paginate the Explorer enterprise directory with three views ([f427970](https://github.com/alternun-development/alternun/commit/f427970c7f2ae4dcd21026e4e15ac5733bbd55d6))
- **mobile:** redesign ATN and RBI projection dashboard cards ([#261](https://github.com/alternun-development/alternun/issues/261)) ([d33d757](https://github.com/alternun-development/alternun/commit/d33d757569cfab9b96e0e125505b88cdbed5c176)), closes [#257](https://github.com/alternun-development/alternun/issues/257)
- **mobile:** replace AIRS-logotipo with new AIRS-logo in landing page, add 2x desktop sizing ([7a43e76](https://github.com/alternun-development/alternun/commit/7a43e7604eb68481ebb6f43d5a61526e27167a1f))
- **mobile:** replace AIRS-logotipo with new AIRS-logo in TopNav, add 2x desktop sizing ([92288e5](https://github.com/alternun-development/alternun/commit/92288e5a48e97f7e82852407b40eb83d7cd3ff41))
- **mobile:** scroll back to the enterprise list on page or view change ([b597212](https://github.com/alternun-development/alternun/commit/b597212ce6efcd33c26ed294787117a72fd4df00))
- **mobile:** send Explorer project proposals to the API ([c520a78](https://github.com/alternun-development/alternun/commit/c520a780a1561dd8d6327338c8b032ee572fe073))
- **mobile:** shared search and view controls for the Explorer directories ([ec66380](https://github.com/alternun-development/alternun/commit/ec6638089d63d81ed6314b43995084f2ae7f6819)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **mobile:** show PublicLandingPage for unauthenticated users with header nav ([7ef304c](https://github.com/alternun-development/alternun/commit/7ef304c863383a0b554cece93d25b37c928bfe1b))
- **mobile:** upgrade explorer experience ([3e80b51](https://github.com/alternun-development/alternun/commit/3e80b51e43faf9fcc0c9c56a6fa262b729bc3caf))
- **mobile:** use PNG AIRS-logo assets with responsive 2x desktop sizing ([dd27caf](https://github.com/alternun-development/alternun/commit/dd27cafb6c3decf7a6743baebd033a6848a59901))
- **mobile:** use the liquid progress bar in the RBI projection card ([8d08865](https://github.com/alternun-development/alternun/commit/8d08865f1c42caa7b4b6e8f801286dc9c11c6c96))
- move support component to shared library and integrate into docusaurus footer ([9186fc2](https://github.com/alternun-development/alternun/commit/9186fc27e0fe508c77318c9e67630659415dac4b))
- optimize deploy assets and web media delivery ([faf6e90](https://github.com/alternun-development/alternun/commit/faf6e907a56c888a9c286bfb7261db5cabc6e3cc))
- **platform:** add dashboard api admin pipelines ([0f8f872](https://github.com/alternun-development/alternun/commit/0f8f8722d70847c81e5c540be5badc6935b9ae56))
- polish mobile experience and release tooling ([ab61684](https://github.com/alternun-development/alternun/commit/ab6168446da1f3649c7726f2f393f34bf73c25c7))
- **profile:** add AIRS badge artwork and tier detail modals ([27355ec](https://github.com/alternun-development/alternun/commit/27355ec7a522f9ebc78f0911c72ebfaf90e32b3e))
- **profile:** add animated floating circles to profile hero background ([1cb5447](https://github.com/alternun-development/alternun/commit/1cb544767cc08cbf0911149ef051d9b1debb9ea8))
- **profile:** choose an avatar from the social photo, illustrations or held badges ([2ac1d51](https://github.com/alternun-development/alternun/commit/2ac1d513849a9f8c356fad3719ab41edffc3a2a4))
- **profile:** collapsible invited users section with pagination in referral card ([7e1a7cd](https://github.com/alternun-development/alternun/commit/7e1a7cd2edb14c8f283733f8fa57805b328b8ff4))
- **profile:** explain the Airs, projects and CO₂ figures with info buttons ([cff64d4](https://github.com/alternun-development/alternun/commit/cff64d4dbd47622e0bf38c5e8b2b1779b3b13cee))
- **profile:** flip the avatar to the tier badge on hover and ease notification polling ([6175902](https://github.com/alternun-development/alternun/commit/6175902bc73bab7c243d0c68f9f361a7bb6e032e))
- **profile:** reveal the metal tier badge with the honor award animation ([17774eb](https://github.com/alternun-development/alternun/commit/17774eb20a94e937d1454d49e52b74b9ff90ae0c))
- provision identity infrastructure resources ([f3eb956](https://github.com/alternun-development/alternun/commit/f3eb956587d69249731c1a79dc61a736c1a0929f))
- refresh AIRS experience and release workflow ([81cd3af](https://github.com/alternun-development/alternun/commit/81cd3af0fe5c4091707379843807467da4cd728b))
- **release:** add promotion wrapper ([3467659](https://github.com/alternun-development/alternun/commit/3467659675de283f59190ac1df6799275fd0e419))
- **release:** auto-create promotion PR ([baab826](https://github.com/alternun-development/alternun/commit/baab826be02b20165cd7ab0667d5430e4fc468d2))
- scaffold identity infrastructure config ([f6af8f8](https://github.com/alternun-development/alternun/commit/f6af8f8d81a56d07f50a3be0c200e718b34925e3))
- **scripts:** auto-commit pending changes before release ([03ffdca](https://github.com/alternun-development/alternun/commit/03ffdcab67419d4d24138060c2a0fc26e34b5b72))
- **security:** infra topology status in reports + live tracker ([852c287](https://github.com/alternun-development/alternun/commit/852c287b703bfe8f1f1bf7d3be134093968bc592))
- **status:** scheduled Lambda handler + deploy notes ([5649e04](https://github.com/alternun-development/alternun/commit/5649e047c7cf9a2461a5d43df09c177f0f0ab608))
- **status:** standalone infra status-checker service (no third-party deps) ([f987269](https://github.com/alternun-development/alternun/commit/f9872697c2f6b50c1bc253f9c3ccb4532f68cbbf))
- **supabase:** unlock the Airs report rewards at 20 paid Airs ([5b0ddb4](https://github.com/alternun-development/alternun/commit/5b0ddb48f859c67ba16a2e318e30fd82e6bb5414)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- th 18n ([b848b89](https://github.com/alternun-development/alternun/commit/b848b8930ce251e3dcd0f969e811490f3f437505))
- th 18n ([eb729a1](https://github.com/alternun-development/alternun/commit/eb729a1274a6faf4cc1b0877965fe88c0cac4d13))
- **theme:** centralized palette tokens + full light/dark mode on auth card ([d4fc0af](https://github.com/alternun-development/alternun/commit/d4fc0af35e7bc4e0c517b7ca465f712ee8f1f8a1))
- **ui,release:** add ChangelogDrawer component and empty-changelog guard ([202347f](https://github.com/alternun-development/alternun/commit/202347fc21d7b8f0365d503b83a3fadd8d0d4bc5))
- **ui:** add elegant spring animations to StatCard ([d22daa1](https://github.com/alternun-development/alternun/commit/d22daa10f7d982b9f9acb26dece29f478c7fd514))
- **ui:** Update HeroPanel greeting text color to gold (#CBAB35) ([0b68ba1](https://github.com/alternun-development/alternun/commit/0b68ba139681f379fecc5ecce6787da50be5f986)), closes [#CBAB35](https://github.com/alternun-development/alternun/issues/CBAB35) [#CBAB35](https://github.com/alternun-development/alternun/issues/CBAB35)
- **update:** make release check interval configurable via EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS ([7768d8a](https://github.com/alternun-development/alternun/commit/7768d8a60d50af9091b056f4934ce3bd038e9d14))
- **wallet:** full wallet management — add/delete/import + MetaMask linking + layout fix ([9438606](https://github.com/alternun-development/alternun/commit/94386060c1b8936db63d09ba6e4fce73de175b52))
- **wallet:** non-custodial multi-chain wallet (EVM/Bitcoin/Solana) for web ([f3bc0e4](https://github.com/alternun-development/alternun/commit/f3bc0e4ce1a7ea513e15a650ea7f593550151982))
- **wallet:** scaffold phase-1 non-custodial HD wallet core ([5fbaf19](https://github.com/alternun-development/alternun/commit/5fbaf190b3529aad32cab04982355fecefe6ce40))
- **web:** use proper translations in landing footer ([70d7955](https://github.com/alternun-development/alternun/commit/70d7955b15379ce2ab459fa68792fc7f17ae5af3))
- wire DATABASE_URL to Lambda and make migrations optional ([cf06d67](https://github.com/alternun-development/alternun/commit/cf06d67fb7165233d426ec4e9876d9ae41890a4d))
- Wire up notification center navigation from dropdown ([60a18c1](https://github.com/alternun-development/alternun/commit/60a18c1dea00f814b227be975ac4e728d500682c))

### Performance Improvements

- **ci:** skip slow post-deploy dns sync by default ([ef38aff](https://github.com/alternun-development/alternun/commit/ef38affdf64407c37573f062a9ff17d71e4819d3))
- **infra:** optimize CodePipeline buildspec for faster dev iterations ([1839a21](https://github.com/alternun-development/alternun/commit/1839a21a3182450bcb69c37fc0c2e35b4f84da2c))

### Reverts

- Revert "chore: release v1.1.43-dev.0" ([0d21bce](https://github.com/alternun-development/alternun/commit/0d21bced002403b16f246b7cf818f77bc4e90c7e))
- disable AUTO_REMOVE_CONFLICTING_DNS for dev ([98f777e](https://github.com/alternun-development/alternun/commit/98f777e933653d7e4779b524fd75ae2d8ff2aa4d))
- **mobile:** PublicLandingPage to v1.0.57 layout ([871cb8c](https://github.com/alternun-development/alternun/commit/871cb8cc1a36644ab98cc50a8720e95459b668a3))

## [1.2.6](https://github.com/alternun-development/alternun/compare/v1.2.5...v1.2.6) (2026-11-14)

### Features

- **status:** standalone infra status-checker service (no third-party deps) ([6b565ac](https://github.com/alternun-development/alternun/commit/6b565acc6f3248a5be7ea3837808ed29e58106f3))
- **security:** infra topology status in reports + live tracker ([b1d2c63](https://github.com/alternun-development/alternun/commit/b1d2c63bc5a8a8869d199699d4edacbefe3924d2))

### Changes

- **security:** gitleaks config + make history scan non-blocking ([8a32cf9](https://github.com/alternun-development/alternun/commit/8a32cf9f766b730d1397bff316e3760a708a844a))
- **security:** email deliverability report for Tláo + mailer hygiene ([342197f](https://github.com/alternun-development/alternun/commit/342197f2143a738532eb59a8cc2da0268b1f55c7))
- **security:** weekly AWS audit loop, reports and reviewer IAM ([1c523e6](https://github.com/alternun-development/alternun/commit/1c523e61f3be206c113d838f49f44cbf99af20e6))

### Security

- **repo:** remove recipient emails and tracker URL from public repo ([03fc286](https://github.com/alternun-development/alternun/commit/03fc286b4deb1ce5b0e5d4ce35474fd7c93452a8))

### Bug Fixes

- **security:** exclude audit's own files from git-history leak scan ([57b41ef](https://github.com/alternun-development/alternun/commit/57b41ef790acc403ea4c1283277ba9e0b873e2fb))

## [1.2.5](https://github.com/alternun-development/alternun/compare/v1.2.4...v1.2.5) (2026-11-14)

### Features

- **profile:** flip the avatar to the tier badge on hover and ease notification polling ([cab4942](https://github.com/alternun-development/alternun/commit/cab4942b00c6c1f831e4cbe6f49ac30530de1676))

### Bug Fixes

- **profile:** show the stored Google photo in the top bar when the session lacks it ([c1fb55e](https://github.com/alternun-development/alternun/commit/c1fb55eac69d50a741d159139762eb2d2eacb3cb))

## [1.2.4](https://github.com/alternun-development/alternun/compare/v1.2.3...v1.2.4) (2026-11-14)

### Features

- **profile:** choose an avatar from the social photo, illustrations or held badges ([0a7e89f](https://github.com/alternun-development/alternun/commit/0a7e89f5afc54e920dde50c4575b771446699941))

## [1.2.3](https://github.com/alternun-development/alternun/compare/v1.2.2...v1.2.3) (2026-11-14)

### Features

- **profile:** reveal the metal tier badge with the honor award animation ([655fbfc](https://github.com/alternun-development/alternun/commit/655fbfc7cb925e5bba28136fafe68598fb601f4e))

## [1.2.2](https://github.com/alternun-development/alternun/compare/v1.2.1...v1.2.2) (2026-11-14)

### Features

- **honor-awards:** medals and cards matching the design templates ([0fe2681](https://github.com/alternun-development/alternun/commit/0fe2681983d76f426273f3c1c827508b38b04c6e))

## [1.2.1](https://github.com/alternun-development/alternun/compare/v1.2.0...v1.2.1) (2026-11-14)

### Features

- **profile:** explain the Airs, projects and CO₂ figures with info buttons ([17ebb73](https://github.com/alternun-development/alternun/commit/17ebb738104f637e92eb402f998e64a8fc1a62dc))

## [1.2.0](https://github.com/alternun-development/alternun/compare/v1.1.142...v1.2.0) (2026-11-14)

### Features

- **honor-awards:** medal art, info, demo and per-stay ally medals ([3dbc85f](https://github.com/alternun-development/alternun/commit/3dbc85f45561d6c1ada0443f85f41f3a39a33f7a))
- **honor-awards:** Galardones de honor for people and allies ([3a84228](https://github.com/alternun-development/alternun/commit/3a84228224db44199f295b0d7c8acdc850208c4e))

### Bug Fixes

- **release:** keep changelog version headings at "##" for minor releases ([79db85b](https://github.com/alternun-development/alternun/commit/79db85bb7426bd45005ff6b90a457c947e5d9949))

## [1.1.142](https://github.com/alternun-development/alternun/compare/v1.1.141...v1.1.142) (2026-11-13)

### Features

- **auth:** remind users to check their spam folder while awaiting the code ([bbb1e72](https://github.com/alternun-development/alternun/commit/bbb1e72ffe449c0dad5d7d6459d6b8ed922e072e))

## [1.1.141](https://github.com/alternun-development/alternun/compare/v1.1.140...v1.1.141) (2026-11-13)

### Bug Fixes

- **auth:** let the backend own email auth for both Better Auth and Supabase ([0f52230](https://github.com/alternun-development/alternun/commit/0f5223045c8109ad06d40fa318d156b1e1c0f530))

## [1.1.140](https://github.com/alternun-development/alternun/compare/v1.1.139...v1.1.140) (2026-11-13)

### Bug Fixes

- **auth:** send 6-digit email code and keep email auth on Better Auth ([652e9e7](https://github.com/alternun-development/alternun/commit/652e9e74905ce5aeb96c04a46dc9c474c77adbe2))

## [1.1.139](https://github.com/alternun-development/alternun/compare/v1.1.138...v1.1.139) (2026-11-13)

### Changes

- **repo:** update reentry status ([af675ac](https://github.com/alternun-development/alternun/commit/af675acf529e6bc1367bcaa95d1b7771d477fe1c))

### Bug Fixes

- **auth:** refuse retired SMTP provider for verification emails ([7a52cd1](https://github.com/alternun-development/alternun/commit/7a52cd1cc2c876c5fabe83b289c7ae67734033ca))

## [1.1.138](https://github.com/alternun-development/alternun/compare/v1.1.137...v1.1.138) (2026-11-10)

### Changes

- **repo:** update reentry status ([b382611](https://github.com/alternun-development/alternun/commit/b382611887f98b964a6d9575cab553fcb7ec06cc))

### Features

- **dashboard:** Airs symbol loader, resizable column lanes and sortable activity ([d1f9ead](https://github.com/alternun-development/alternun/commit/d1f9eade99ed23e248129740518aaacb944a9cd3))

## [1.1.137](https://github.com/alternun-development/alternun/compare/v1.1.136...v1.1.137) (2026-11-10)

### Changes

- **repo:** update reentry status ([e7677e6](https://github.com/alternun-development/alternun/commit/e7677e608089ee0bc5a41a68ec1e91a8e120529c))

### Bug Fixes

- **mobile:** compact phone top bar, notifications under the pill, accurate time ago ([2e592df](https://github.com/alternun-development/alternun/commit/2e592df77aeb4a14d1302a07772f658ad7858fd6))

## [1.1.136](https://github.com/alternun-development/alternun/compare/v1.1.135...v1.1.136) (2026-11-10)

### Changes

- **repo:** update reentry status ([6e35144](https://github.com/alternun-development/alternun/commit/6e351447b52b40753550725eefd5b2c69236f4d9))

### Features

- **marketplace:** cancelled invitations cancel their waiting Airs ([3bfab51](https://github.com/alternun-development/alternun/commit/3bfab51999f51df68feea4e0f361e40f134a1347))

## [1.1.135](https://github.com/alternun-development/alternun/compare/v1.1.134...v1.1.135) (2026-11-10)

### Changes

- **repo:** update reentry status ([760249f](https://github.com/alternun-development/alternun/commit/760249f6fb85d7dbc09c1ec5604096caf22ae2ab))

### Features

- **marketplace:** admin notices for new clients, resends and client pagination ([e02f936](https://github.com/alternun-development/alternun/commit/e02f936740bfde3f5330320112a874f4f309cd67))

## [1.1.134](https://github.com/alternun-development/alternun/compare/v1.1.133...v1.1.134) (2026-11-09)

### Changes

- **repo:** update reentry status ([754e8aa](https://github.com/alternun-development/alternun/commit/754e8aad13c88ff415f7a1d1857a46dd6138c4b6))

### Features

- **marketplace:** private in-app proof viewer, visible labels, discard changes ([7c575be](https://github.com/alternun-development/alternun/commit/7c575be3b0d8e73403ede55c674413ee3e6f854a))

## [1.1.133](https://github.com/alternun-development/alternun/compare/v1.1.132...v1.1.133) (2026-11-09)

### Changes

- **repo:** update reentry status ([3bf2d41](https://github.com/alternun-development/alternun/commit/3bf2d410cb54dd055346d2997df0c903599bf37e))

### Features

- **email,marketplace:** send through Tláo only, auth-style form fields, client history ([c02931d](https://github.com/alternun-development/alternun/commit/c02931df00cade60a16e915f30b39b95a4125179))

## [1.1.132](https://github.com/alternun-development/alternun/compare/v1.1.131...v1.1.132) (2026-11-09)

### Bug Fixes

- **security:** marketplace access regression tests and review evidence ([cfe509c](https://github.com/alternun-development/alternun/commit/cfe509c07c50344ab6ece3605c2a84b1a7df5203))

## [1.1.131](https://github.com/alternun-development/alternun/compare/v1.1.130...v1.1.131) (2026-11-09)

### Changes

- **repo:** update reentry status ([fc905b6](https://github.com/alternun-development/alternun/commit/fc905b6fd21a07d6f3914bc17cb273b1a5035b02))

### Features

- **marketplace:** client form feedback and invitation emails with Airs details ([01d7700](https://github.com/alternun-development/alternun/commit/01d7700b3e99c91cd5b08ab5d6b90beb2b69689c))

## [1.1.130](https://github.com/alternun-development/alternun/compare/v1.1.129...v1.1.130) (2026-11-09)

### Bug Fixes

- **mobile:** size the top bar pill and controls to the Airs logo mark ([c6f3669](https://github.com/alternun-development/alternun/commit/c6f36698b19006c1831325553779776558c79781))

## [1.1.129](https://github.com/alternun-development/alternun/compare/v1.1.128...v1.1.129) (2026-11-09)

### Bug Fixes

- **mobile:** hide native scrollbars on detail, manage and menu views ([0313ccd](https://github.com/alternun-development/alternun/commit/0313ccd1608d1e3cecb28c414483260bb09f705b))

## [1.1.128](https://github.com/alternun-development/alternun/compare/v1.1.127...v1.1.128) (2026-11-09)

### Changes

- **repo:** sync reentry status for v1.1.128-dev.0 ([ab9ac08](https://github.com/alternun-development/alternun/commit/ab9ac083fe08ff02c6a4f8e15261116d65577d71))

### Features

- **marketplace:** domain project admins and demo role accounts ([3a358de](https://github.com/alternun-development/alternun/commit/3a358de2a3dabb2ebef7f493df96d85c6ffa42e8))
- **marketplace:** clients tab, intent guides and compact page headers ([1c4c073](https://github.com/alternun-development/alternun/commit/1c4c073592b9ca2fbda0f4106669338d751e59d7))
- **marketplace:** in-app project and enterprise management, enrolment and explorer refresh ([546678f](https://github.com/alternun-development/alternun/commit/546678fd6fc60514d062b57c82126ff46b3fbe4c))

## [1.1.127](https://github.com/alternun-development/alternun/compare/v1.1.124...v1.1.127) (2026-11-09)

### Changes

- **admin,api,mobile:** oidc-client, api, copy, permissions ([5f44adb](https://github.com/alternun-development/alternun/commit/5f44adb2b73e0b697a0ebff35524c1790e3711af))
- **api,docs,mobile:** admin-access.controller, admin-access.service, admin-access.types, marketplace.module ([3db6574](https://github.com/alternun-development/alternun/commit/3db65745ef111d7350d64cb89f1cad7da92fd4c7))
- **repo,admin,api:** .gitignore, AGENTS, CLAUDE, api ([449dbf9](https://github.com/alternun-development/alternun/commit/449dbf904fcb9c2bb20c85bc115e4dc6a5c16f41))

## [1.1.126](https://github.com/alternun-development/alternun/compare/v1.1.125-dev.0...v1.1.126) (2026-11-09)

### Bug Fixes

- **repo:** test(api,docs,mobile): admin-access.controller, admin-access.service, admin-access.types, marketplace.module

## [1.1.125](https://github.com/alternun-development/alternun/compare/v1.1.124...v1.1.125) (2026-11-09)

### Bug Fixes

- **repo:** test(repo,admin,api): .gitignore, AGENTS, CLAUDE, api

## [1.1.124](https://github.com/alternun-development/alternun/compare/v1.1.123...v1.1.124) (2026-10-28)

### Bug Fixes

- **marketplace:** count admins from every related enterprise on project access ([a526360](https://github.com/alternun-development/alternun/commit/a526360c862a1b66b7cceb3e3330ac08084ce577))

## [1.1.123](https://github.com/alternun-development/alternun/compare/v1.1.122...v1.1.123) (2026-10-27)

### Changes

- **repo:** sync reentry after #310 and docs update ([0890c44](https://github.com/alternun-development/alternun/commit/0890c447bdaa18b19aa6c4dac4065c687d711bf7))
- **infra:** default AUTHENTIK_API_URL per stage for the group sync ([f5db1ec](https://github.com/alternun-development/alternun/commit/f5db1ec19fc6e0c9b79976a758429c8d30ea5812))
- **repo:** sync reentry for the project access screen ([8923933](https://github.com/alternun-development/alternun/commit/892393357b56481cea6135f47d4f3acff4a2267b))

### Documentation

- **marketplace:** bring #249 docs up to the released state ([2ab64bb](https://github.com/alternun-development/alternun/commit/2ab64bb96b96ecae0b2eb68c09a5255ef1b10ca3))

### Features

- **marketplace:** project access screen for Super Admins ([67f604f](https://github.com/alternun-development/alternun/commit/67f604f517558054518c0a69debb921b98ac72f7))

## [1.1.122](https://github.com/alternun-development/alternun/compare/v1.1.121...v1.1.122) (2026-10-27)

### Changes

- **repo:** sync reentry ([e9e9482](https://github.com/alternun-development/alternun/commit/e9e9482e9fd4b46a1141f98d992a55992fbce62a))

### Bug Fixes

- **admin:** let sub-admins and moderators open their notification inbox ([5121adc](https://github.com/alternun-development/alternun/commit/5121adc3e84280c0edbd157e58eeb209ee50c019))

## [1.1.121](https://github.com/alternun-development/alternun/compare/v1.1.120...v1.1.121) (2026-10-27)

### Changes

- **repo:** sync reentry after integrating #300-#308 ([29dc96b](https://github.com/alternun-development/alternun/commit/29dc96b440b51e8ca7f48c50791a83f1a6ecdcb6))
- **repo:** sync reentry for pilot ownership fix (refs #249) ([f76183d](https://github.com/alternun-development/alternun/commit/f76183d5c8d57119cea2ad98d8376b6f6c5039f2))
- **repo:** sync reentry for marketplace ordering (refs #249) ([9644875](https://github.com/alternun-development/alternun/commit/9644875f3a34ea5ee166c520f6dd8d4c2aa907f6))
- **repo:** sync reentry for project medals ([521d58a](https://github.com/alternun-development/alternun/commit/521d58aeb00957a2512598b4a78a32283bdddb7a))
- **repo:** sync reentry for console notifications ([96290b4](https://github.com/alternun-development/alternun/commit/96290b4971f639114fed8161f44000ce4530a139))
- **repo:** sync reentry for project types ([eab9185](https://github.com/alternun-development/alternun/commit/eab9185269a056e0a7ea73b6a66e355519469b5d))
- **repo:** sync reentry for the domain admins change ([f978413](https://github.com/alternun-development/alternun/commit/f9784137dcbab28cc6347b845248b4e925d7e8b3))
- **repo:** sync reentry for the card layout fix ([8c6c823](https://github.com/alternun-development/alternun/commit/8c6c8238a0fcbc002009dfa9e8135667e441acfb))

### Documentation

- **marketplace:** architecture and security note with OpenAPI export (refs #249) ([5bc58b1](https://github.com/alternun-development/alternun/commit/5bc58b1ce08f44942a75504b4a09bd1d49e5a12b))

### Bug Fixes

- **marketplace:** archive the Hotel Piloto placeholder enterprise (refs #249) ([7b57870](https://github.com/alternun-development/alternun/commit/7b57870c04f9a7e94725b0222823c901f9ef9055))
- **admin:** open report cards use the full width and keep the date on its own line ([897d627](https://github.com/alternun-development/alternun/commit/897d62764ea66b2fcddb93ccc237c07ffab3abd1))

### Features

- **marketplace:** admin-controlled order for enterprises and projects (refs #249) ([754c006](https://github.com/alternun-development/alternun/commit/754c00611427e6ad8d547bb6562f98f926369a8e))
- **marketplace:** medal catalog for each project ([465e406](https://github.com/alternun-development/alternun/commit/465e4065b0e7c8c4b9560b3687e1a3dfe65be36b))
- **admin:** manage enterprises from the marketplace panel (refs #249) ([068ae0f](https://github.com/alternun-development/alternun/commit/068ae0f73549e10446411bc6b564046c89bf967d))
- **marketplace:** console inbox for Airs report notifications ([6119f0d](https://github.com/alternun-development/alternun/commit/6119f0db579d320d37776e3b173bedd4d99a084c))
- **marketplace:** project types decide the document number for Airs reports ([1df94e5](https://github.com/alternun-development/alternun/commit/1df94e55a20fdee5c9ec773ce50951ce9f62e5d3))
- **infra:** make alternun.co internal admins, only for verified addresses ([52306e7](https://github.com/alternun-development/alternun/commit/52306e7f43b9e67857ec82fe51bf5450b92ae539))

## [1.1.120](https://github.com/alternun-development/alternun/compare/v1.1.119...v1.1.120) (2026-10-27)

### Changes

- **repo:** sync reentry with follow-ups from #299 review ([de986ce](https://github.com/alternun-development/alternun/commit/de986ce95ee32fd673bde6892392984bdb517f24))
- **docs:** remove unused npm lockfile ([7109163](https://github.com/alternun-development/alternun/commit/710916389807bd0fbb49cb0b78cf36aafd4ac78f))

### Bug Fixes

- **marketplace:** match panel identities to webhook-synced accounts ([f0a93bd](https://github.com/alternun-development/alternun/commit/f0a93bd6e98f48e713422782edebb014b81f27e8))

## [1.1.119](https://github.com/alternun-development/alternun/compare/v1.1.117...v1.1.119) (2026-10-27)

### Features

- **infra:** pass Airs report and Authentik sync settings to the API from SSM ([5073878](https://github.com/alternun-development/alternun/commit/5073878e1dc07c5497a0788eab9ee77d9146bb60))
- **airs-report:** show each report's history and reward status ([a26100a](https://github.com/alternun-development/alternun/commit/a26100a60a2ef9b4ad6dc5a8f29c375fa741c45f))
- **admin:** summary strip and status accents on the Airs reports list ([abc73b2](https://github.com/alternun-development/alternun/commit/abc73b28d5f9dfebf19fd4ff628350a001e1af4d))
- **mobile:** shared search and view controls for the Explorer directories ([cf5b927](https://github.com/alternun-development/alternun/commit/cf5b92734f00d2d6ac96da860cfeaa62d49a228c))
- **marketplace:** assign project admins and moderators by email ([b0935f9](https://github.com/alternun-development/alternun/commit/b0935f9e1f6cb66f8599512b61b4333aac17f52d))
- **api:** email approvers, submitters and support about report approvals ([48515ea](https://github.com/alternun-development/alternun/commit/48515eaebbeb1bbb0af9b122577d7580d6ed6556))
- **supabase:** unlock the Airs report rewards at 20 paid Airs ([8b50e8d](https://github.com/alternun-development/alternun/commit/8b50e8df75c8303ffe162624742e5b607a98f1a8))

### Changes

- **repo:** sync reentry after integrating #249 PRs ([26a3e27](https://github.com/alternun-development/alternun/commit/26a3e27bc78de14dd3b5719d07c3b8c0f65c47f8))
- **repo:** sync reentry after the fixture fix ([817bbdc](https://github.com/alternun-development/alternun/commit/817bbdcc450f2190969f92befcd569d5ba5bafa8))
- **admin:** build the request key fixture so the secret scan ignores no line numbers ([8d1f1ac](https://github.com/alternun-development/alternun/commit/8d1f1ac9a96912e255222cf54338e86fc2e387d7))
- **repo:** sync reentry for the Airs report history ([463b2d8](https://github.com/alternun-development/alternun/commit/463b2d8783cb35cedb9d3d07f52e7360fd6b7c11))
- **repo:** sync reentry for the share image fix ([5c6d2e6](https://github.com/alternun-development/alternun/commit/5c6d2e6d11724cd865294c56e60b8a6034eb1d99))
- **repo:** sync reentry for the Airs reports list polish ([11b4b75](https://github.com/alternun-development/alternun/commit/11b4b7513e3a977a2c60ed28390f7f89ab1b955d))
- **repo:** sync reentry for membership by email ([548df60](https://github.com/alternun-development/alternun/commit/548df60054822295739cd041b3170d081f5e086f))
- **repo:** sync reentry for the unlock-rewards and approval-email work ([4c06a31](https://github.com/alternun-development/alternun/commit/4c06a3146aa8124d8ebc552256bc76876cbaf323))

### Bug Fixes

- **deps:** bump better-auth to 1.7.14 for GHSA-965c-763c-88jm ([bf79582](https://github.com/alternun-development/alternun/commit/bf795820dcff35cc8a63461b64028976667b6424))
- **web:** share only the square Airs logosymbol in link previews ([bcdea44](https://github.com/alternun-development/alternun/commit/bcdea447d98488fa4d47db0fc60c5486ffac3e0d))

## [1.1.118](https://github.com/alternun-development/alternun/compare/v1.1.117...v1.1.118) (2026-10-27)

### Bug Fixes

- **repo:** chore: sync reentry after integrating #249 PRs
- **repo:** fix(deps): bump better-auth to 1.7.14 for GHSA-965c-763c-88jm
- **repo:** chore: sync reentry for the Airs report history
- **repo:** feat(airs-report): show each report's history and reward status
- **repo:** chore: sync reentry for the share image fix

### Bug Fixes

- **deps:** bump better-auth to 1.7.14 for GHSA-965c-763c-88jm ([bf79582](https://github.com/alternun-development/alternun/commit/bf795820dcff35cc8a63461b64028976667b6424))
- **web:** share only the square Airs logosymbol in link previews ([bcdea44](https://github.com/alternun-development/alternun/commit/bcdea447d98488fa4d47db0fc60c5486ffac3e0d))

### Features

- **admin:** summary strip and status accents on the Airs reports list ([abc73b2](https://github.com/alternun-development/alternun/commit/abc73b28d5f9dfebf19fd4ff628350a001e1af4d)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **airs-report:** show each report's history and reward status ([a26100a](https://github.com/alternun-development/alternun/commit/a26100a60a2ef9b4ad6dc5a8f29c375fa741c45f)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **api:** email approvers, submitters and support about report approvals ([48515ea](https://github.com/alternun-development/alternun/commit/48515eaebbeb1bbb0af9b122577d7580d6ed6556)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **marketplace:** assign project admins and moderators by email ([b0935f9](https://github.com/alternun-development/alternun/commit/b0935f9e1f6cb66f8599512b61b4333aac17f52d)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **mobile:** shared search and view controls for the Explorer directories ([cf5b927](https://github.com/alternun-development/alternun/commit/cf5b92734f00d2d6ac96da860cfeaa62d49a228c)), closes [#249](https://github.com/alternun-development/alternun/issues/249)
- **supabase:** unlock the Airs report rewards at 20 paid Airs ([8b50e8d](https://github.com/alternun-development/alternun/commit/8b50e8df75c8303ffe162624742e5b607a98f1a8)), closes [#249](https://github.com/alternun-development/alternun/issues/249)

## [1.1.117](https://github.com/alternun-development/alternun/compare/v1.1.116...v1.1.117) (2026-10-27)

### Changes

- **mobile:** cover every top-nav menu action through the full-screen menu ([704421c](https://github.com/alternun-development/alternun/commit/704421c866ccaeafe27ea8cffb03793b774b6d69))

## [1.1.116](https://github.com/alternun-development/alternun/compare/v1.1.115...v1.1.116) (2026-10-27)

### Bug Fixes

- **mobile:** open a full-screen menu from the hamburger on extra small screens ([d6b70e2](https://github.com/alternun-development/alternun/commit/d6b70e2acddfafd0cdcbd7d781b4dd494d4d9096))

## [1.1.115](https://github.com/alternun-development/alternun/compare/v1.1.114...v1.1.115) (2026-10-27)

### Changes

- **mobile:** cover the settings top-nav route to the profile ([ff2d139](https://github.com/alternun-development/alternun/commit/ff2d13993cf4f61ac26010274d02af7d32f4b7d3))

## [1.1.114](https://github.com/alternun-development/alternun/compare/v1.1.113...v1.1.114) (2026-10-27)

### Features

- **mobile:** open the profile from the account badge avatar and name ([6600d20](https://github.com/alternun-development/alternun/commit/6600d20d17a03d0bdc4d3d75007f1ff233cb81ed))

## [1.1.113](https://github.com/alternun-development/alternun/compare/v1.1.112...v1.1.113) (2026-10-26)

### Features

- **mobile:** make the account badge chevron a visible chip and let the pill fill the nav ([b911d43](https://github.com/alternun-development/alternun/commit/b911d4380749efbfab5e6a1999bc58436674d3a7))

## [1.1.112](https://github.com/alternun-development/alternun/compare/v1.1.111...v1.1.112) (2026-10-26)

### Bug Fixes

- **security:** resolve CodeQL clear-text logging and bad tag filter alerts ([63291cf](https://github.com/alternun-development/alternun/commit/63291cf9f4f42ec8e0dd52291642a757d0261f9d))

## [1.1.111](https://github.com/alternun-development/alternun/compare/v1.1.110...v1.1.111) (2026-10-26)

### Changes

- **security:** ignore Airs report idempotency-key test fixtures in gitleaks ([f05cfee](https://github.com/alternun-development/alternun/commit/f05cfeee138bb9ba9dbb146a313b79d8f0d8edad))
- **reentry:** set the next step for the Airs report work ([0d5136b](https://github.com/alternun-development/alternun/commit/0d5136bdb985a9af798890021e3f7901fb0b9ba8))
- **reentry:** set the next step for the Airs report work ([4f550f9](https://github.com/alternun-development/alternun/commit/4f550f96715f7ae1a5250639c6f2e9bf50ededd8))

### Features

- **admin:** report Airs to a guest and review reports over the limits ([63c3a12](https://github.com/alternun-development/alternun/commit/63c3a1273d359d87a1c6d80454bbef431bda73cb))
- **api:** script to link each project with its Airs account ([47fe172](https://github.com/alternun-development/alternun/commit/47fe1721cfdb17286e3a91bebcf60396880c510a))
- **api:** email the recipient and support when Airs are issued ([64a5cca](https://github.com/alternun-development/alternun/commit/64a5cca5723f65093b6ab1130a516b63b30a7699))
- **api:** claim waiting Airs reports when a confirmed user signs in ([c9bd444](https://github.com/alternun-development/alternun/commit/c9bd444e704b7040c2cced0cb9c847bb6f501a7e))
- **db:** claim User Airs Reports and link a project account ([1855dc4](https://github.com/alternun-development/alternun/commit/1855dc4ef364687f2ac886163566d78734401906))

## [1.1.110](https://github.com/alternun-development/alternun/compare/v1.1.109...v1.1.110) (2026-10-26)

### Bug Fixes

- **api:** key each Airs report submission by a client key, not the request counter ([aaf0789](https://github.com/alternun-development/alternun/commit/aaf0789a1f17284adc755b99fadc2882483a1a8b))

## [1.1.109](https://github.com/alternun-development/alternun/compare/v1.1.108...v1.1.109) (2026-10-26)

### Bug Fixes

- **airs-reports:** require a document number on every report ([ac0029c](https://github.com/alternun-development/alternun/commit/ac0029cc6dfc7ac8f4e34d084c1f3031096a3a60))
- **airs-reports:** never auto-approve a report to the submitter ([be8d215](https://github.com/alternun-development/alternun/commit/be8d2153e8bdd81f928b5cdabe397c5622c87abc))
- **marketplace:** allow image hosts for project logo, cover and gallery ([20594cc](https://github.com/alternun-development/alternun/commit/20594cce5b49e25179bb16bfa062feb24f422457))

### Changes

- **reentry:** note the User Airs Report next steps ([7d1be85](https://github.com/alternun-development/alternun/commit/7d1be85f8e912dc006ec0549bb9c6cf65f985c53))
- **airs-reports:** cover the User Airs Report cut (B15) ([8ffbb44](https://github.com/alternun-development/alternun/commit/8ffbb4462b4cb747d1403f4fcd94f51bda4cdf63))
- **reentry:** note marketplace media hosts follow-up ([d765fff](https://github.com/alternun-development/alternun/commit/d765fffc10ef98dcf43a62d302e84a29df845c51))

### Features

- **api:** add the User Airs Report admin endpoints ([8c07a96](https://github.com/alternun-development/alternun/commit/8c07a9685e668f90fbca5780613accac96579190))
- **db:** add the User Airs Report transition functions ([1973689](https://github.com/alternun-development/alternun/commit/1973689bc6963a3fd1adeb5f81cc7b63cdc1d7b9))
- **db:** add the airs_reports schema ([ad2cb5b](https://github.com/alternun-development/alternun/commit/ad2cb5b5e9920cb28b4acfce4de2fd1c580bd18d))
- **api:** add the User Airs Report API contract ([0cd5600](https://github.com/alternun-development/alternun/commit/0cd5600ba5f85133a75d5fdba52d1d31aecd22f9))

## [1.1.108](https://github.com/alternun-development/alternun/compare/v1.1.107...v1.1.108) (2026-10-26)

### Documentation

- **repo:** record the Oct 22 dashboard pipeline build incident ([fccf46f](https://github.com/alternun-development/alternun/commit/fccf46f02e3013765560694bb1b929033e7eb885))

## [1.1.107](https://github.com/alternun-development/alternun/compare/v1.1.106...v1.1.107) (2026-10-26)

### Changes

- **repo:** run the deploy pipeline build commands on every PR ([3943c55](https://github.com/alternun-development/alternun/commit/3943c5584412f30d47b690a6692fbcc0c12945df))
- **reentry:** next step after pipeline build fix ([76908af](https://github.com/alternun-development/alternun/commit/76908afcf1587fd51064cd1f31e4949a0f1eeacd))

### Bug Fixes

- **api:** build @alternun/i18n before compiling the API ([aee3bc5](https://github.com/alternun-development/alternun/commit/aee3bc543683ba3b716036d81b36bdb2be491219))

## [1.1.106](https://github.com/alternun-development/alternun/compare/v1.1.105...v1.1.106) (2026-10-26)

### Documentation

- **airs:** document User Airs Reports and claiming process (#249) ([48d5e35](https://github.com/alternun-development/alternun/commit/48d5e35da7ee4a8355c8fcaae88d5ac29b61fb4c))

### Changes

- **reentry:** sync after v1.1.106-dev.0 release ([58da31c](https://github.com/alternun-development/alternun/commit/58da31c673d9b00b673e199d4ca10542e775bcd5))
- **reentry:** note testnet admin CORS follow-up ([bf48bbe](https://github.com/alternun-development/alternun/commit/bf48bbe5963d2726a975ccd143ee6c7412675930))

### Bug Fixes

- **api:** trust the testnet admin origin for CORS ([63bb70b](https://github.com/alternun-development/alternun/commit/63bb70bc32ffe329fd905b8c3b65ecde825f1553))
- **mobile:** honor the app motion level in the participation factor bar ([dc2227a](https://github.com/alternun-development/alternun/commit/dc2227a49bb9a392aa177f6e18cdbf00d3e2f498))

## [1.1.105](https://github.com/alternun-development/alternun/compare/v1.1.104...v1.1.105) (2026-10-22)

### Changes

- **reentry:** set next step after #279 release ([3275fa4](https://github.com/alternun-development/alternun/commit/3275fa4403d2dcb69c33bc9f8128dff216aa2bda))
- **docs:** deploy GitHub Pages from master only, drop v\* tag trigger ([3dfbcde](https://github.com/alternun-development/alternun/commit/3dfbcde41a7218e555bf6b3807fb540d703c802e))
- **versioning:** update reentry next step for the FP liquid bar ([45e06dc](https://github.com/alternun-development/alternun/commit/45e06dc61f9803b9028843278cc33b510ca5f306))

### Features

- **mobile:** use the liquid progress bar in the RBI projection card ([8edcfc1](https://github.com/alternun-development/alternun/commit/8edcfc18725239303a919fcd0b954866c5d3ac72))
- **mobile:** add animated liquid ParticipationFactorBar ([d29769d](https://github.com/alternun-development/alternun/commit/d29769d2dc8f95fae899add7f1dc20cf357daf46))
- **mobile:** add liquid progress palette tokens for dark and light themes ([42a89e8](https://github.com/alternun-development/alternun/commit/42a89e86504be83a86441eea052257ec5b402ebc))

## [1.1.104](https://github.com/alternun-development/alternun/compare/v1.1.103...v1.1.104) (2026-10-22)

### Documentation

- **identity:** document Authentik platform access and bootstrap state ([6195422](https://github.com/alternun-development/alternun/commit/6195422752a11adfb9c35b57481220caef28307a))

### Bug Fixes

- **web:** bump next to 15.5.28 for GHSA-2464-fhr4-w9xw ([6ac881b](https://github.com/alternun-development/alternun/commit/6ac881bc46eeb4d29f3c2ad0fd3d2e9020c500df))

## [1.1.103](https://github.com/alternun-development/alternun/compare/v1.1.102...v1.1.103) (2026-10-22)

### Bug Fixes

- **repo:** artifact, graph.db ([06abc0e](https://github.com/alternun-development/alternun/commit/06abc0ed904042f04bf3fa7a72f57d028b9d5346))
- **repo:** artifact, graph.db ([24d7834](https://github.com/alternun-development/alternun/commit/24d78345f177e0244a149f2b8f0792d9466cfd65))
- **identity:** promote @alternun.io users to internal and add shared dev admin ([53f6e5c](https://github.com/alternun-development/alternun/commit/53f6e5cff715ed2c0d017511c1f4b6e80350cbca))
- **mobile:** size Explorer hero slides to the inset content width ([5ab688f](https://github.com/alternun-development/alternun/commit/5ab688fc71925a02b597443957c0f2dcefb0f526))

### Changes

- **mobile:** cover AirsIntroVideoCard picture-in-picture control ([7018ec5](https://github.com/alternun-development/alternun/commit/7018ec5b37b9e601911212ce484fff750ad8dbec))

### Features

- **mobile:** neutral Explorer palette, banner video/Canva, PiP, normalized footer ([f6fd61b](https://github.com/alternun-development/alternun/commit/f6fd61bc380fc3fc790cfedd21989e546099363d))

## [1.1.102](https://github.com/alternun-development/alternun/compare/v1.1.101...v1.1.102) (2026-10-22)

### Bug Fixes

- **repo:** artifact, graph.db ([a6dc886](https://github.com/alternun-development/alternun/commit/a6dc886142a1b2efefe4a1e5a30119b209b78251))

### Features

- **mobile:** center content column with max width and gutters on large screens ([89ddf7a](https://github.com/alternun-development/alternun/commit/89ddf7ae251d821c090a11e0e964fc26de948484))

## [1.1.101](https://github.com/alternun-development/alternun/compare/v1.1.100...v1.1.101) (2026-10-22)

### Bug Fixes

- **mobile:** localize the web tab title and link the FP note to the docs ([19b600e](https://github.com/alternun-development/alternun/commit/19b600e2250d99402a2cd92d42b89483c413093d))
- **api:** address CodeQL alerts from release v1.1.101 ([6a1c956](https://github.com/alternun-development/alternun/commit/6a1c9563ee9c3d7d36e4d4a019e7378f099df306))
- **db:** close moderator media reorder and sub_admin approval in SQL ([55b7ece](https://github.com/alternun-development/alternun/commit/55b7ece56b61bdea187e541573e59ca21aca57cf))
- **marketplace:** stop global moderator from pausing activities ([62c1f13](https://github.com/alternun-development/alternun/commit/62c1f1381ea5c857f8aefd3fa9f69d7242cec30d))
- **admin:** align marketplace permissions with the API role limits ([1c7ac55](https://github.com/alternun-development/alternun/commit/1c7ac557053546aafb1ce880322414d96b029b08))
- **marketplace:** stop global moderator from approving activities and protect brand media ([6826a07](https://github.com/alternun-development/alternun/commit/6826a0784ffac307d2b9650a1969bfa25000165a))
- **mobile:** show the Airs title, description and logo in link previews ([610133a](https://github.com/alternun-development/alternun/commit/610133a51ac682ba06946f0abdb31c1bd8ddc580))
- **mobile:** embed the Canva presentation on the web project detail ([36c1321](https://github.com/alternun-development/alternun/commit/36c132146c2739b8f28cb618816c292f69242dbd))
- **ui:** never show a negative progress to the next tier ([fa06554](https://github.com/alternun-development/alternun/commit/fa0655498c73985bc967ccfcfba4d5dca775c251))
- **api:** require a verified session for /auth/exchange (refs #100) ([ff0d43c](https://github.com/alternun-development/alternun/commit/ff0d43c1cd9ec479381094af140a2712bd8c286a))
- **auth:** send credentials and drop legacy exchange fields (refs #100) ([2b90bd5](https://github.com/alternun-development/alternun/commit/2b90bd534b24089402a24a86cfe09be6d899db94))
- **api:** restrict CORS to trusted origins (refs #100) ([c6ba118](https://github.com/alternun-development/alternun/commit/c6ba118982baf54322dd6291e2d641ae09877e86))

### Changes

- **versioning:** refresh reentry status after PR integration batch ([53a08e0](https://github.com/alternun-development/alternun/commit/53a08e08bd773299d7f12e760d526b3da0832937))
- **repo:** update reentry for the Airs share link preview ([4159be5](https://github.com/alternun-development/alternun/commit/4159be55d4e725571bdc78f1fcf0261311f094c5))
- **mobile:** publish the official Airs logo for link previews ([30f63da](https://github.com/alternun-development/alternun/commit/30f63da709eb60bfe70f850a889d2755e4c89291))
- **repo:** update reentry for the paginated Explorer enterprise directory ([f376e59](https://github.com/alternun-development/alternun/commit/f376e59aef8aa6178b52ddd6ff2ccc2608ee7dc5))
- **repo:** update reentry for the project detail Canva embed ([3b11de4](https://github.com/alternun-development/alternun/commit/3b11de41e32582aa6d1dbc161d42c9f71e0f3ae7))
- **repo:** update reentry for marketplace project proposals ([49d5939](https://github.com/alternun-development/alternun/commit/49d5939b7fe9133c1beb2653c4ae9aaec2f47b1f))
- **infra:** wire MARKETPLACE_CONTACT_EMAIL through env and deploys ([f91e786](https://github.com/alternun-development/alternun/commit/f91e7861ed63c1cc451e0d6b0fe533c26cd7c6b9))
- **db:** verify project proposal rate limits and authenticated denial ([e721e42](https://github.com/alternun-development/alternun/commit/e721e42680ba0eb91839b735b40660eda0dd9699))
- **airs:** note pending community equivalent AIRS and update reentry ([402244b](https://github.com/alternun-development/alternun/commit/402244b5319a4f300f5dc468b70f79dd8f2a15e4))
- **api:** add HTTP-level regression test for /auth/exchange (refs #100) ([a259ad0](https://github.com/alternun-development/alternun/commit/a259ad03b8c6a40700388826e5fabeca48968cc6))

### Documentation

- **marketplace:** document admin roles, Authentik groups, and assignment ([b287d33](https://github.com/alternun-development/alternun/commit/b287d33be1184ec449617b3782c15f44ce66c757))
- **auth:** drop branch-specific wording from the backend handoff (refs #100) ([6bd25f1](https://github.com/alternun-development/alternun/commit/6bd25f148cce6695cc3e5d0b62c0653ae1883837))
- **auth:** update backend handoff now that the client sends credentials (refs #100) ([cb18da6](https://github.com/alternun-development/alternun/commit/cb18da68e08102714e77b97ad6ca804a17ff8ab0))

### Features

- **infra:** map one Authentik group to each admin role ([863818f](https://github.com/alternun-development/alternun/commit/863818f4f842d14064f1d4c66ab378de9d6424f9))
- **mobile:** scroll back to the enterprise list on page or view change ([5c54535](https://github.com/alternun-development/alternun/commit/5c54535845b01ed250ce73b861bc721d9b893899))
- **mobile:** paginate the Explorer enterprise directory with three views ([d34d1e0](https://github.com/alternun-development/alternun/commit/d34d1e07e1834b5036fdd119739ee2f6fc6aa1f1))
- **i18n:** add enterprise directory view and pagination labels ([d118c5f](https://github.com/alternun-development/alternun/commit/d118c5f42584f4b807f0a18d3cd6d6a2a9774961))
- **i18n:** add accessible title for the project presentation embed ([04ec26a](https://github.com/alternun-development/alternun/commit/04ec26a56f9ccc391853b8dfa2899f9b1c2cd654))
- **mobile:** send Explorer project proposals to the API ([f98d194](https://github.com/alternun-development/alternun/commit/f98d1942b42132fd6aa9deb76736156bf8824dd0))
- **api:** accept marketplace project proposals and notify by email ([192cb4e](https://github.com/alternun-development/alternun/commit/192cb4eb5ea3f875b0dceb1d63b0696ab81788ad))
- **mobile:** label provisional FP as estimated and clarify RBI help texts ([d922c46](https://github.com/alternun-development/alternun/commit/d922c467484012d6b53cbf1f8859376e8956eabc))
- **api:** return provisional participation factor from /v1/airs/me ([6eec5b3](https://github.com/alternun-development/alternun/commit/6eec5b30cbce48b02bf3d7fb9f01f4658ef0cfed))
- **db:** store marketplace project proposals ([924972d](https://github.com/alternun-development/alternun/commit/924972d7bd51c978b4be016f710ac293e12425dd))

### Refactoring

- **auth:** use an explicit bearer token field for the exchange (refs #100) ([f3a7171](https://github.com/alternun-development/alternun/commit/f3a7171228eadc9049f9468acac8f78ebb977d2a))

## [1.1.100](https://github.com/alternun-development/alternun/compare/v1.1.99...v1.1.100) (2026-10-18)

### Bug Fixes

- **mobile:** make tooltip surface opaque to match hero ([96d5ab3](https://github.com/alternun-development/alternun/commit/96d5ab3c89f41036bcbf7b869cce1894aea0ca71))

## [1.1.99](https://github.com/alternun-development/alternun/compare/v1.1.98...v1.1.99) (2026-10-18)

### Bug Fixes

- **mobile:** unify tooltip icon and modal to hero style ([c28cc0f](https://github.com/alternun-development/alternun/commit/c28cc0f60c995589a2c38e2015c0e2429dffeb12))

## [1.1.98](https://github.com/alternun-development/alternun/compare/v1.1.97...v1.1.98) (2026-10-18)

### Changes

- **repo:** refresh codebase-memory graph ([c88f478](https://github.com/alternun-development/alternun/commit/c88f4789029778a4d3c1334354f36c285d5d3976))

### Bug Fixes

- **repo:** artifact, graph.db, config, specs ([3df990f](https://github.com/alternun-development/alternun/commit/3df990f786fc8d83c9b1fbe69cb96fa86c96cd09))
- **mobile:** use hero info icons on dashboard metrics ([51a3897](https://github.com/alternun-development/alternun/commit/51a38972074112d0d9be98a7281a3209040972ae))

## [1.1.97](https://github.com/alternun-development/alternun/compare/v1.1.96...v1.1.97) (2026-10-18)

### Changes

- **repo:** sync reentry for v1.1.97 release ([807a78f](https://github.com/alternun-development/alternun/commit/807a78f31f06907757027955381f8bf82490aa46))
- **repo:** 🚀 ci: publish docs on version tags ([528613b](https://github.com/alternun-development/alternun/commit/528613b69bd691c9e0ee09adde66594d57e30775))
- **web:** remove mock user data from the home page (#259) ([75bb3c9](https://github.com/alternun-development/alternun/commit/75bb3c96e387757d16fa7a7f5786bc32c178973b))

### Features

- **db:** publish eco-turismo as marketplace project 1 ([65ee576](https://github.com/alternun-development/alternun/commit/65ee5764a4153a12b9da691194ed1c7c0c8b0fe8))
- **mobile:** redesign ATN and RBI projection dashboard cards (#261) ([fc00f42](https://github.com/alternun-development/alternun/commit/fc00f426f9ccb9d2f32ef5dbe1d6ff73e486df06))
- **marketplace:** deliver scoped marketplace and Explorer workflows (#260) ([80d98f8](https://github.com/alternun-development/alternun/commit/80d98f8d1ae23fb28c749108ddf91067e0dd42de))

### Bug Fixes

- **mobile:** polish ATN card and add metric tooltips ([228c5d8](https://github.com/alternun-development/alternun/commit/228c5d853f911db10f35950e34da75bfcbf7fc83))
- **repo:** make component type guard parser tolerant ([c0fb47d](https://github.com/alternun-development/alternun/commit/c0fb47d0d61d19f34a05e5c3dc84491cb238972e))
- **repo:** normalize parser filenames ([068ae80](https://github.com/alternun-development/alternun/commit/068ae8076ced8b0fa53a8c750bdeb4b1fbc1eb85))
- **repo:** support route filenames in type guard ([26f409f](https://github.com/alternun-development/alternun/commit/26f409f66d91394eab7acdd47d44475d8a5f2237))
- **repo:** fail closed on activity write config ([0a8b562](https://github.com/alternun-development/alternun/commit/0a8b562d5269bdfd6286b3961895a403bc833bbc))
- **repo:** harden AIRS database privileges ([ee84137](https://github.com/alternun-development/alternun/commit/ee84137d3fc745b7c7bc9ca7700f5adc6a0d3360))
- **repo:** resolve legal paths and sanitize media URLs ([1662836](https://github.com/alternun-development/alternun/commit/166283621a662e24523117729233f5ca2d4ace57))

### Refactoring

- **repo:** isolate component types and enforce boundary ([76d0401](https://github.com/alternun-development/alternun/commit/76d04011d1f3a8b6c499fb7792c8efd1ab77c241))

## [1.1.96](https://github.com/alternun-development/alternun/compare/v1.1.95...v1.1.96) (2026-10-09)

### Bug Fixes

- **docs:** repair localized terms Markdown rendering ([23d9a98](https://github.com/alternun-development/alternun/commit/23d9a98909853e9cf3a76543bd2ca9d88114d9a0))

## [1.1.95](https://github.com/alternun-development/alternun/compare/v1.1.94...v1.1.95) (2026-10-09)

### Documentation

- **repo:** consolidate and translate AIRS terms (#253) ([89f6690](https://github.com/alternun-development/alternun/commit/89f66904edb0bdfa0f43bc51ad93216f7e03372a))

### Changes

- **auth:** cover callback provisioning failures ([d5b4cac](https://github.com/alternun-development/alternun/commit/d5b4cac4477f315f016d0f21122a2e7d5f4c7f91))
- **auth:** make callback mock resolvable in CI ([d37b540](https://github.com/alternun-development/alternun/commit/d37b540f4bb73389de234e09e9f226289d944e8d))

### Bug Fixes

- **auth:** provision Authentik callbacks through API ([9982e3a](https://github.com/alternun-development/alternun/commit/9982e3a0c942c8268beb887dea9b13058d790ad2))

## [1.1.94](https://github.com/alternun-development/alternun/compare/v1.1.92...v1.1.94) (2026-10-09)

### Bug Fixes

- **api:** correct milestone card counters and patch security audit ([6bb8b22](https://github.com/alternun-development/alternun/commit/6bb8b224f0fad8bfe07615cfc333da565affbecd))

### Changes

- **repo:** 🔒️ fix: restrict OIDC upsert function execution ([90a9953](https://github.com/alternun-development/alternun/commit/90a99537b0f1ca9e0955071f286f428d2fc06fb5))

## [1.1.93](https://github.com/alternun-development/alternun/compare/v1.1.92...v1.1.93) (2026-10-09)

### Bug Fixes

- **repo:** 🔒️ fix: restrict OIDC upsert function execution

## [1.1.92](https://github.com/alternun-development/alternun/compare/v1.1.91...v1.1.92) (2026-10-08)

### Bug Fixes

- **repo:** artifact, graph.db ([5292ceb](https://github.com/alternun-development/alternun/commit/5292cebb35d0acbd6242f80e6f56b0dd7cb35ff6))
- **repo:** artifact, graph.db ([a59dd3c](https://github.com/alternun-development/alternun/commit/a59dd3c786668f51c7fd78a395b1cb6682a80b0d))
- **repo:** artifact, graph.db ([fa16e3b](https://github.com/alternun-development/alternun/commit/fa16e3bc8d8814aa348009ffb10b1e0bd6a1eb89))
- **repo:** artifact, graph.db ([2e75bb7](https://github.com/alternun-development/alternun/commit/2e75bb78dff289d784c58240f930fb2208fb873c))
- **infra:** correct misleading 'reset to false' comment on identity secret adoption ([4471374](https://github.com/alternun-development/alternun/commit/447137402a3f174dbf7dce13d6cd4266970351f8))
- **infra:** widen cert-preservation test fixture type to allow outputs field ([c506a3b](https://github.com/alternun-development/alternun/commit/c506a3bebdb1254aa27805b0fb2ad42d21eac0be))
- **repo:** artifact, graph.db ([6034cdd](https://github.com/alternun-development/alternun/commit/6034cdd02aa585c3bfb5a8725e51e04c8ac797c6))
- **repo:** artifact, graph.db ([ca5ea54](https://github.com/alternun-development/alternun/commit/ca5ea543fcfa1e0e491d4ca996f8e02c0db5da5a))
- **repo:** artifact, graph.db ([7c553ab](https://github.com/alternun-development/alternun/commit/7c553abafe492e5967ceec9df7a7578b4b5dd6e2))
- **infra:** ignore stale completed pending operations in cert state guard ([f6ab4b9](https://github.com/alternun-development/alternun/commit/f6ab4b940de4b5dd81e704e6013995b8020b4d93))
- **repo:** artifact, graph.db ([1cbe022](https://github.com/alternun-development/alternun/commit/1cbe022b9be869788551c4fc3f494082e2a33890))
- **repo:** artifact, graph.db ([817f4e2](https://github.com/alternun-development/alternun/commit/817f4e2ff6f69f51e220a2550141ee3e69664aad))
- **infra:** monitor TLS for air.alternun.co and alternun.co redirects ([f244c8a](https://github.com/alternun-development/alternun/commit/f244c8a33ee4f0302a42f54b9efc95bb84391541))
- **infra:** adopt retained identity secrets for identity-prod and identity-dev ([5d65320](https://github.com/alternun-development/alternun/commit/5d6532016e19ab54703f8b99428fa8ab0c53ed6c))
- **infra:** ignore orphaned pending operations in cert state guard ([16b14e5](https://github.com/alternun-development/alternun/commit/16b14e5424b3735aa6a47362644d2847af764b05))
- **security:** bump proxy-addr, shell-quote, simple-git past critical advisories ([8c2476a](https://github.com/alternun-development/alternun/commit/8c2476ac797718fef27036503548246a08371891))
- **infra:** restore sourcing invocation in certificate-env-rotation test ([25b10fe](https://github.com/alternun-development/alternun/commit/25b10fe042d496e8893fddc8caa547c2502eca9b))
- **api:** accept legacy exchange fields and ignore them (refs #100) ([73c0686](https://github.com/alternun-development/alternun/commit/73c068651738bc42af0fb03d049dd63a325e6a6f))

### Documentation

- **infra:** correct identity secret adoption guidance in .env.example ([ed15a67](https://github.com/alternun-development/alternun/commit/ed15a67cd091b523f143a1902aca5ddd8590b5d2))
- **infra:** correct identity secret adoption runbook to match permanent-flag behavior ([96a2eee](https://github.com/alternun-development/alternun/commit/96a2eee731d2b829e046412cd911aa690d9d3e6c))
- **auth:** record live testnet validation results (refs #100) ([e540c36](https://github.com/alternun-development/alternun/commit/e540c36faf1abd4dc1e24597676af1769c12dde5))
- **auth:** record testnet smoke-check results (refs #100) ([d557dbf](https://github.com/alternun-development/alternun/commit/d557dbfd40551fa975fd1092a95a265cf64fcb75))
- **auth:** add Better Auth testnet validation matrix (refs #100) ([4be16c7](https://github.com/alternun-development/alternun/commit/4be16c7c1d2f6ea5a044f5edb7e6b2ebc40baeb7))

### Changes

- **repo:** gitignore .pnpm-store ([95ffa28](https://github.com/alternun-development/alternun/commit/95ffa28ea911d0f367bb92ce8f9efb7c24ccc863))
- **api:** cover remaining Better Auth callback cases; add smoke runbook (refs #100) ([538901d](https://github.com/alternun-development/alternun/commit/538901d3511479a009ab6653f905aa074f22e1b4))
- **repo:** Potential fix for pull request finding 'CodeQL / Shell command built from environment values' ([c2b06b0](https://github.com/alternun-development/alternun/commit/c2b06b02b7c4da7dec8a57ec9c1524976d06739d))

## [1.1.91](https://github.com/alternun-development/alternun/compare/v1.1.89...v1.1.91) (2026-10-01)

### Changes

- **repo,mobile:** artifact, graph.db, HeroStats.navigation.test, TopNav.tier.test ([9acef4d](https://github.com/alternun-development/alternun/commit/9acef4d9b59d58938d3628b2006dfec57bf35b81))
- **repo,mobile,i18n:** artifact, graph.db, tls-health, README ([71b6beb](https://github.com/alternun-development/alternun/commit/71b6beb63fbc70edbb2d230b1d3bd3cfe3b9be91))

## [1.1.90](https://github.com/alternun-development/alternun/compare/v1.1.89...v1.1.90) (2026-10-01)

### Bug Fixes

- **repo:** test(repo,mobile,i18n): artifact, graph.db, tls-health, README

## [1.1.89](https://github.com/alternun-development/alternun/compare/v1.1.87...v1.1.89) (2026-09-19)

### Documentation

- **security:** record v1.1.89 dependency audit ([209f7ac](https://github.com/alternun-development/alternun/commit/209f7ace87f96dad9d95148804f5f1095232f6b9))

### Bug Fixes

- **airs:** avoid duplicate links in mobile sharing ([2a6aaea](https://github.com/alternun-development/alternun/commit/2a6aaea95b75cd85a4a1333bf9bfd18a99ff9f2d))

## [1.1.88](https://github.com/alternun-development/alternun/compare/v1.1.87...v1.1.88) (2026-09-20)

### Bug Fixes

- **repo:** fix(airs): avoid duplicate links in mobile sharing

### Bug Fixes

- **airs:** avoid duplicate links in mobile sharing ([2a6aaea](https://github.com/alternun-development/alternun/commit/2a6aaea95b75cd85a4a1333bf9bfd18a99ff9f2d))

## [1.1.87](https://github.com/alternun-development/alternun/compare/v1.1.86...v1.1.87) (2026-09-19)

### Bug Fixes

- **airs:** streamline mobile milestone sharing ([3de22e3](https://github.com/alternun-development/alternun/commit/3de22e3e70f66a45c6e3893123ee3ff257821264))
- **infra:** qualify production identity secret with its stage ([9c0a222](https://github.com/alternun-development/alternun/commit/9c0a2226ed4e2f17c30d9ac62dae549c5d320a70))

### Changes

- **airs:** cover badge sharing fallbacks and tier states ([c81cb58](https://github.com/alternun-development/alternun/commit/c81cb580f026239b7451429e531cb11512cde418))

## [1.1.86](https://github.com/alternun-development/alternun/compare/v1.1.85...v1.1.86) (2026-09-19)

### Changes

- **airs:** align release checks with current pagination and referrals ([cf78020](https://github.com/alternun-development/alternun/commit/cf78020e59abc8fce748682e045e417135a09cbc))

### Bug Fixes

- **airs:** polish badge journeys and personalize milestone sharing ([d2b2588](https://github.com/alternun-development/alternun/commit/d2b258859cbdbfe53d8fc29c4c1066c9f21ea2cf))

## [1.1.85](https://github.com/alternun-development/alternun/compare/v1.1.84...v1.1.85) (2026-09-19)

### Bug Fixes

- **security:** patch Next.js and retain CI audit evidence ([621a075](https://github.com/alternun-development/alternun/commit/621a07510aacb7cd6a6348ce3be322e172cc5553))
- **api:** load app environment for repository-root startup ([6967406](https://github.com/alternun-development/alternun/commit/6967406c3d607bc02aab77d39d59b6d0e935c120))

### Changes

- **profile:** cover tier thresholds and unavailable scores ([f4c08af](https://github.com/alternun-development/alternun/commit/f4c08af0f31f9b40ac671bf6f676e46fdb2aba60))

## [1.1.84](https://github.com/alternun-development/alternun/compare/v1.1.83...v1.1.84) (2026-09-19)

### Features

- **profile:** add AIRS badge artwork and tier detail modals ([775af4a](https://github.com/alternun-development/alternun/commit/775af4a980aa5b5812ee7c180005c8caccca99de))

### Bug Fixes

- **api:** resolve startup migrations and explain inactive tenants ([9c5cd18](https://github.com/alternun-development/alternun/commit/9c5cd18f597669ed386cbefcceed3d06e548f055))
- **mobile:** stop DynamicMessageBar marquee from stalling and going stale ([ae53f1b](https://github.com/alternun-development/alternun/commit/ae53f1ba92ffc608b7377a841f4c6a8b8beac9bd))

## [1.1.83](https://github.com/alternun-development/alternun/compare/v1.1.82...v1.1.83) (2026-09-07)

### Bug Fixes

- **repo:** artifact, graph.db ([4a07436](https://github.com/alternun-development/alternun/commit/4a074362b05ba2f5737ef6e4b1410649ae0afb7f))
- **infra:** point dashboard-prod at the -v2 identity integration-config secret (#228) ([050e879](https://github.com/alternun-development/alternun/commit/050e87993ab674efbaa2c997ba74d76c9c336988))

### Changes

- **onboarding:** add coverage for hero layout metrics ([c59051c](https://github.com/alternun-development/alternun/commit/c59051cb5697c6f531176954ab43c144fa5c8419))

## [1.1.82](https://github.com/alternun-development/alternun/compare/v1.1.81...v1.1.82) (2026-09-07)

### Bug Fixes

- **landing:** remove duplicated AIRS word from overview/kicker copy, sync all locales ([ca95271](https://github.com/alternun-development/alternun/commit/ca95271e09d7b47ef832dd282f2ff66e11096057))
- **landing:** refine desktop hero typography and CTA sizing ([8e600ae](https://github.com/alternun-development/alternun/commit/8e600ae724a501102b3a4971d6671fe4b9f806e4))

## [1.1.81](https://github.com/alternun-development/alternun/compare/v1.1.80...v1.1.81) (2026-09-04)

### Bug Fixes

- **identity:** complete admin release integration ([59f7bdf](https://github.com/alternun-development/alternun/commit/59f7bdf788d725435b3ef7c338da91819c1bd7ad))

## [1.1.80](https://github.com/alternun-development/alternun/compare/v1.1.79...v1.1.80) (2026-09-01)

### Features

- **identity:** harden partner admin access ([4346794](https://github.com/alternun-development/alternun/commit/4346794677f5b0c7c0a5e049374c5b595fb1c539))

### Documentation

- **workflow:** adopt canonical task specifications ([7e4c8b1](https://github.com/alternun-development/alternun/commit/7e4c8b185b0fecc41f6e25e94305fad7a7adccc9))

## [1.1.79](https://github.com/alternun-development/alternun/compare/v1.1.77...v1.1.79) (2026-08-31)

### Bug Fixes

- **repo:** artifact, graph.db ([f16352f](https://github.com/alternun-development/alternun/commit/f16352faed830a113d0fe7c59d775cb206d2a212))
- **repo,admin,api:** artifact, graph.db, CHANGELOG, README ([d46860b](https://github.com/alternun-development/alternun/commit/d46860ba281160fd7141ebd8a65c9b2fa9be0442))
- **identity:** admin logout redirects to admin login, not Authentik screen ([39bb6d5](https://github.com/alternun-development/alternun/commit/39bb6d5455fe4483a06939687c05e58dd73d45a2))
- **identity:** repair admin SSO redirect loop and add monthly DB backups ([e8c3e03](https://github.com/alternun-development/alternun/commit/e8c3e036f63d155e3bd0e9baf6e41a42a3b84c57))
- **mobile:** resolve @alternun/auth mock in CI test environment ([728003d](https://github.com/alternun-development/alternun/commit/728003d538abb1432f3792625450a297018f284c))

### Documentation

- **repo:** fix stale release-flow guidance to require release:patch:promote ([964617b](https://github.com/alternun-development/alternun/commit/964617b04c60cc634c623c2e2d8b4c2e90339061))

### Changes

- **repo:** update reentry status for admin SSO fix + backup hardening ([c2c7a46](https://github.com/alternun-development/alternun/commit/c2c7a467ec9418dac30b3ac6de79b6610399fe39))
- **mobile:** add regression coverage for auth callback redirect guard ([9828dbc](https://github.com/alternun-development/alternun/commit/9828dbc863c2b6cd5a8718ba91fe5043056b4f20))
- **repo:** update reentry status for v1.1.77 release ([f7b04d8](https://github.com/alternun-development/alternun/commit/f7b04d8cffd7e24d4e415b8a7ba4a3f109af3c7f))

## [1.1.78](https://github.com/alternun-development/alternun/compare/v1.1.77...v1.1.78) (2026-09-01)

### Bug Fixes

- **repo:** fix(identity): admin logout redirects to admin login, not Authentik screen
- **repo:** docs: fix stale release-flow guidance to require release:patch:promote
- **repo:** chore: update reentry status for admin SSO fix + backup hardening
- **repo:** fix(identity): repair admin SSO redirect loop and add monthly DB backups
- **repo:** fix(mobile): resolve @alternun/auth mock in CI test environment

### Bug Fixes

- **identity:** admin logout redirects to admin login, not Authentik screen ([39bb6d5](https://github.com/alternun-development/alternun/commit/39bb6d5455fe4483a06939687c05e58dd73d45a2))
- **identity:** repair admin SSO redirect loop and add monthly DB backups ([e8c3e03](https://github.com/alternun-development/alternun/commit/e8c3e036f63d155e3bd0e9baf6e41a42a3b84c57))
- **mobile:** resolve @alternun/auth mock in CI test environment ([728003d](https://github.com/alternun-development/alternun/commit/728003d538abb1432f3792625450a297018f284c))

## [1.1.77](https://github.com/alternun-development/alternun/compare/v1.1.76...v1.1.77) (2026-08-31)

### Bug Fixes

- **repo:** artifact, graph.db ([3664138](https://github.com/alternun-development/alternun/commit/366413886e9989ad0e397de7232d5da2340537fb))
- **mobile:** stop infinite reload loop on Google auth callback ([557e760](https://github.com/alternun-development/alternun/commit/557e760c3a2ac41daed674f197c6bdd3ebe42b1c))
- **infra:** lift identity RDS protection during drift-recovery refresh ([803484e](https://github.com/alternun-development/alternun/commit/803484eef14d1fd168a4ab8b36a776b8a916ee6b))

## [1.1.76](https://github.com/alternun-development/alternun/compare/v1.1.75...v1.1.76) (2026-08-31)

### Bug Fixes

- **infra:** auto-recover identity RDS drift via sst refresh ([9140ed6](https://github.com/alternun-development/alternun/commit/9140ed667c829f705f87b351733b57cecb501b2f))

### Documentation

- **repo:** restore accurate v1.1.74 changelog section ([4aa3cf1](https://github.com/alternun-development/alternun/commit/4aa3cf11d88815902976d9649fa23144e7eb23c0))

## [1.1.75](https://github.com/alternun-development/alternun/compare/v1.1.74...v1.1.75) (2026-08-31)

### Bug Fixes

- **repo:** artifact, graph.db, todo ([34c9ba1](https://github.com/alternun-development/alternun/commit/34c9ba1d3742549356378e20c99ddb04f84da9a6))
- **infra:** apply production RDS protections to identity-prod stage ([2ff96e8](https://github.com/alternun-development/alternun/commit/2ff96e8330552323921cb6ce7ef62a813bfa2f1d))
- **repo:** gate retained secret adoption to recovery ([b9fb39c](https://github.com/alternun-development/alternun/commit/b9fb39c434dfeabb3266ea89de3c1a6ee404e493))

## [1.1.74](https://github.com/alternun-development/alternun/compare/v1.1.73...v1.1.74) (2026-08-30)

### Bug Fixes

- **repo:** adopt retained identity secrets before deploy ([506ad75](https://github.com/alternun-development/alternun/commit/506ad759ee79e31e12cb17b89fd51b4ebaf83aea))
- **repo:** prevent discord source flow recursion ([6ae5e31](https://github.com/alternun-development/alternun/commit/6ae5e311032767c28d7c918f0e16d11428f600b8))

## [1.1.73](https://github.com/alternun-development/alternun/compare/v1.1.72...v1.1.73) (2026-08-30)

### Bug Fixes

- **repo:** isolate production provider source flows ([c75356d](https://github.com/alternun-development/alternun/commit/c75356def4d192e526f24e9f66e063ccf230c106))

### Changes

- **repo:** cover production google source wrapper ([466fe95](https://github.com/alternun-development/alternun/commit/466fe95b631c2f94824f64c88c859b00d9578e81))

## [1.1.72](https://github.com/alternun-development/alternun/compare/v1.1.71...v1.1.72) (2026-08-30)

### Changes

- **repo:** 🐛 fix: resume admin oidc after google ([c0fc668](https://github.com/alternun-development/alternun/commit/c0fc66898413ff133abff8b52fb64a0e133ae2fa))

## [1.1.71](https://github.com/alternun-development/alternun/compare/v1.1.70...v1.1.71) (2026-08-30)

### Changes

- **repo:** 🐛 fix: complete direct source authentication ([c5b756b](https://github.com/alternun-development/alternun/commit/c5b756bf0ec457f92f32365f97bb8e232fb20d74))

## [1.1.70](https://github.com/alternun-development/alternun/compare/v1.1.69...v1.1.70) (2026-08-30)

### Changes

- **repo:** 🐛 fix: preserve admin oidc context for google ([2a554ec](https://github.com/alternun-development/alternun/commit/2a554ec9587507969056eb22cf16462d830aaebf))

## [1.1.69](https://github.com/alternun-development/alternun/compare/v1.1.68...v1.1.69) (2026-08-30)

### Changes

- **repo:** 🐛 fix: render admin group claim mapping ([fd366a3](https://github.com/alternun-development/alternun/commit/fd366a32521a7f5c178f4c3d16ad4781b674073c))

## [1.1.68](https://github.com/alternun-development/alternun/compare/v1.1.67...v1.1.68) (2026-08-30)

### Bug Fixes

- **infra:** preserve adopted database password on import ([6144d81](https://github.com/alternun-development/alternun/commit/6144d813f245e261105bf9e1406e3b2696c4932f))
- **infra:** reconcile adopted identity recovery state ([3b684ad](https://github.com/alternun-development/alternun/commit/3b684adb029d2b6d0479d95ebb96b11f14471b13))

## [1.1.67](https://github.com/alternun-development/alternun/compare/v1.1.66...v1.1.67) (2026-08-30)

### Bug Fixes

- **infra:** guard production identity migration ([3e59890](https://github.com/alternun-development/alternun/commit/3e5989084abe27a4f7bb89e0c3fe255134c44b63))

## [1.1.66](https://github.com/alternun-development/alternun/compare/v1.1.65...v1.1.66) (2026-08-30)

### Bug Fixes

- **infra:** sync adopted identity secrets ([f273520](https://github.com/alternun-development/alternun/commit/f27352090c3631737d108eb139dccf18f1c77e14))

## [1.1.65](https://github.com/alternun-development/alternun/compare/v1.1.64...v1.1.65) (2026-08-30)

### Bug Fixes

- **infra:** adopt existing identity secrets ([b983bb1](https://github.com/alternun-development/alternun/commit/b983bb1b14ab202db8fcd722004d3ecfeaa23dde))

## [1.1.64](https://github.com/alternun-development/alternun/compare/v1.1.63...v1.1.64) (2026-08-30)

### Bug Fixes

- **infra:** make SMTP secret adoption opt-in ([eb2188e](https://github.com/alternun-development/alternun/commit/eb2188e18aada49a4aeca0ca00fcf02939670919))

## [1.1.63](https://github.com/alternun-development/alternun/compare/v1.1.62...v1.1.63) (2026-08-30)

### Bug Fixes

- **infra:** unblock production identity deploy ([cc9852c](https://github.com/alternun-development/alternun/commit/cc9852c88f8e45944778e16063853638b510fd2e))

## [1.1.62](https://github.com/alternun-development/alternun/compare/v1.1.61...v1.1.62) (2026-08-30)

### Bug Fixes

- **infra:** harden Authentik startup cleanup ([2220a7b](https://github.com/alternun-development/alternun/commit/2220a7be29a17524c49088b93605027ac7337582))

## [1.1.61](https://github.com/alternun-development/alternun/compare/v1.1.60...v1.1.61) (2026-08-30)

### Bug Fixes

- **auth:** bootstrap identity pipelines on release ([4ebfb0c](https://github.com/alternun-development/alternun/commit/4ebfb0c0c284dd94ab522a78bb40fce5ada0ba9e))

## [1.1.60](https://github.com/alternun-development/alternun/compare/v1.1.58...v1.1.60) (2026-08-30)

### Changes

- **repo:** 🐛 fix(auth): map configured admin groups to roles ([191439c](https://github.com/alternun-development/alternun/commit/191439c6fc7c3546270aab85f5b4193008b6a7bd))

## [1.1.59](https://github.com/alternun-development/alternun/compare/v1.1.58...v1.1.59) (2026-08-30)

### Bug Fixes

- **repo:** chore: release v1.1.58

## [1.1.58](https://github.com/alternun-development/alternun/compare/v1.1.57...v1.1.58) (2026-08-30)

### Bug Fixes

- **repo:** 🐛 fix(auth): emit admin groups in oidc claims

## [1.1.57](https://github.com/alternun-development/alternun/compare/v1.1.56...v1.1.57) (2026-08-30)

### Bug Fixes

- **auth:** bypass legacy Google flow in production ([0362223](https://github.com/alternun-development/alternun/commit/036222306bc5042c6fb7581df6e08bcfe741a801))

## [1.1.56](https://github.com/alternun-development/alternun/compare/v1.1.55...v1.1.56) (2026-08-29)

### Bug Fixes

- **admin:** use direct Google source login in production ([ddbc444](https://github.com/alternun-development/alternun/commit/ddbc444ef6782e015a6b02db54e042f677ef443d))

## [1.1.55](https://github.com/alternun-development/alternun/compare/v1.1.54...v1.1.55) (2026-08-29)

### Features

- **admin:** improve mobile navigation and profile menu ([d3f484d](https://github.com/alternun-development/alternun/commit/d3f484dfbbd9ae86da93948a2b551b7a719cfe43))

## [1.1.54](https://github.com/alternun-development/alternun/compare/v1.1.53...v1.1.54) (2026-08-29)

### Changes

- **repo:** 🐛 fix: complete Authentik Google source flow ([de57c9e](https://github.com/alternun-development/alternun/commit/de57c9eaeab67528783156edb0affeda82fa0487))
- **repo:** 🐛 fix: default production admin Google relay ([1ad1f98](https://github.com/alternun-development/alternun/commit/1ad1f98056d6d22e540f74cdfedb640a818db30a))

## [1.1.53](https://github.com/alternun-development/alternun/compare/v1.1.52...v1.1.53) (2026-08-29)

### Changes

- **repo:** Internal release maintenance.

## [1.1.52](https://github.com/alternun-development/alternun/compare/v1.1.51...v1.1.52) (2026-08-29)

### Bug Fixes

- **identity:** align production google flow ([ee0db2a](https://github.com/alternun-development/alternun/commit/ee0db2a62442a9031ea471dad93c314f6fc69558))

## [1.1.51](https://github.com/alternun-development/alternun/compare/v1.1.50...v1.1.51) (2026-08-29)

### Bug Fixes

- **admin:** isolate browser authentik relay ([73d1f31](https://github.com/alternun-development/alternun/commit/73d1f317db9ce4bbf58c4c76c48b0d7d77c484fe))
- **mobile:** verify the bundled package release version ([79b92cc](https://github.com/alternun-development/alternun/commit/79b92cc8a534b5968b263ba4bd1c55054635af05))
- **video-studio:** use port 3003 by default ([4127df4](https://github.com/alternun-development/alternun/commit/4127df45d0d015ba982ffcb3d24c3efeae71fced))
- **auth:** repair admin authentik sign-in ([b2d2b38](https://github.com/alternun-development/alternun/commit/b2d2b38867e82cbebe430d3866381a2d91edcc24))

## [1.1.50](https://github.com/alternun-development/alternun/compare/v1.1.49...v1.1.50) (2026-08-24)

### Bug Fixes

- **i18n:** sync landing copy across locales ([f020194](https://github.com/alternun-development/alternun/commit/f0201941058eb3568a2917127f3551ab77bbb0b0))

## [1.1.49](https://github.com/alternun-development/alternun/compare/v1.1.48...v1.1.49) (2026-08-20)

### Bug Fixes

- **mobile:** stop RBI/ATN card content overflowing the card border on mobile ([fa5ce5e](https://github.com/alternun-development/alternun/commit/fa5ce5e5ebc79859cf3dd0ca52f5707f47d110b6))
- **infra:** make the pipeline-parity guard actually run and actually work ([b91825b](https://github.com/alternun-development/alternun/commit/b91825b0796fb0565fe7e9ce16dd220258ab7051))

## [1.1.48](https://github.com/alternun-development/alternun/compare/v1.1.47...v1.1.48) (2026-08-20)

### Changes

- **infra:** guard INFRA_PIPELINES parity between buildspec.yml and .env ([f1f95db](https://github.com/alternun-development/alternun/commit/f1f95db99d80c47c4ef861373189b385493d234f))

### Bug Fixes

- **infra:** bump SSM env cache to v3 for the stage-path fix ([b6debce](https://github.com/alternun-development/alternun/commit/b6debcedd377ab523f58b27c64a24275ebe3328f))

## [1.1.47](https://github.com/alternun-development/alternun/compare/v1.1.46...v1.1.47) (2026-08-20)

### Bug Fixes

- **infra:** force SSM_SHARED_STAGE for prod Google/Discord OAuth lookup ([b42a14a](https://github.com/alternun-development/alternun/commit/b42a14adbd747d338d0e7cad88460230be97383a))
- **infra:** stop recreating retired identity-dev/identity-prod pipelines ([5d67610](https://github.com/alternun-development/alternun/commit/5d67610fa37a8cdbeb24c215aea4bf779770f515))
- **infra:** address code review findings on OAuth SSM resolution ([3e0a382](https://github.com/alternun-development/alternun/commit/3e0a382dbaacbadf0e7f7e479f2bbbc42fda94a7))

## [1.1.46](https://github.com/alternun-development/alternun/compare/v1.1.45...v1.1.46) (2026-08-20)

### Bug Fixes

- **infra:** resolve Google/Discord OAuth creds from SSM for production stages ([d327770](https://github.com/alternun-development/alternun/commit/d327770374e3bfa44eac85a945caee2934deb4b9))

## [1.1.45](https://github.com/alternun-development/alternun/compare/v1.1.44...v1.1.45) (2026-08-20)

### Bug Fixes

- **infra:** treat backend API Google OAuth as optional like Discord ([1142016](https://github.com/alternun-development/alternun/commit/11420165d229637b89d749ba3e044d9a1f7698c0))

## [1.1.44](https://github.com/alternun-development/alternun/compare/v1.1.43...v1.1.44) (2026-08-20)

### Bug Fixes

- **infra:** treat backend API Google OAuth as optional like Discord ([1142016](https://github.com/alternun-development/alternun/commit/11420165d229637b89d749ba3e044d9a1f7698c0))

### Changes

- **repo,mobile,scripts:** CHANGELOG, DashboardSummaryCards, DashboardSummaryCards.render.test, release ([8247267](https://github.com/alternun-development/alternun/commit/824726779f3e4f500cd9ba40ef617a1cdf7ed590))

## [1.1.43](https://github.com/alternun-development/alternun/compare/v1.1.42...v1.1.43) (2026-08-20)

### Bug Fixes

- **mobile:** DashboardSummaryCards ([55860e3](https://github.com/alternun-development/alternun/commit/55860e3247ddcccbd51aac36083827407c9938d0))
- **infra:** preserve identity recovery aliases ([6dfe346](https://github.com/alternun-development/alternun/commit/6dfe34627a1e6050bff362c4224a7d3b78bf6731))

## [1.1.42](https://github.com/alternun-development/alternun/compare/v1.1.42-dev.0...v1.1.42) (2026-08-19)

### Bug Fixes

- **repo:** chore: release v1.1.42-dev.0
- **repo:** test(mobile,infra): PublicLandingPage, .env, deployment.config.example, infrastructure-specs

## [1.1.42](https://github.com/alternun-development/alternun/compare/v1.1.41...v1.1.42) (2026-08-19)

### Bug Fixes

- **repo:** test(mobile,infra): PublicLandingPage, .env, deployment.config.example, infrastructure-specs

## [1.1.41](https://github.com/alternun-development/alternun/compare/v1.1.41-dev.0...v1.1.41) (2026-08-19)

### Bug Fixes

- **repo:** chore: release v1.1.41-dev.0
- **repo:** test(mobile,i18n): PublicLandingPage, communityAirsTotal.test, communityAirsTotal, en

## [1.1.41](https://github.com/alternun-development/alternun/compare/v1.1.40-dev.0...v1.1.41) (2026-08-19)

### Bug Fixes

- **repo:** test(mobile,i18n): PublicLandingPage, communityAirsTotal.test, communityAirsTotal, en

## [1.1.40](https://github.com/alternun-development/alternun/compare/v1.1.39...v1.1.40) (2026-08-19)

### Bug Fixes

- **repo:** test(mobile,i18n,infra): PublicLandingPage, es, deployment.config.example, infrastructure-specs
- **repo:** fix(mobile): center AIRS community counter

### Bug Fixes

- **mobile:** center AIRS community counter ([723e6d2](https://github.com/alternun-development/alternun/commit/723e6d23ae834bbfdde1453398a4b508f8cf90ee))

## [1.1.39](https://github.com/alternun-development/alternun/compare/v1.1.39-dev.0...v1.1.39) (2026-08-19)

### Bug Fixes

- **repo:** chore: release v1.1.39-dev.0
- **repo:** fix(infra): apply dashboard migrations before deploy
- **repo:** fix(mobile): refine AIRS community total card

## [1.1.39](https://github.com/alternun-development/alternun/compare/v1.1.38...v1.1.39) (2026-08-19)

### Bug Fixes

- **repo:** fix(infra): apply dashboard migrations before deploy
- **repo:** fix(mobile): refine AIRS community total card

### Bug Fixes

- **infra:** apply dashboard migrations before deploy ([bc02f92](https://github.com/alternun-development/alternun/commit/bc02f92fb50e0e5d1fa036cfb0a3cbd07a6eff9c))
- **mobile:** refine AIRS community total card ([8b4dc5c](https://github.com/alternun-development/alternun/commit/8b4dc5cf3aa603e08f6797c77b060bc8057c6ed5))

## [1.1.38](https://github.com/alternun-development/alternun/compare/v1.1.38-dev.0...v1.1.38) (2026-08-19)

### Bug Fixes

- **repo:** chore: release v1.1.38-dev.0
- **repo:** test(mobile,repo,api): NotificationsContext, NotificationsContext.test, 20260819_0001_create_user_notifications, notifications.migration.test

## [1.1.38](https://github.com/alternun-development/alternun/compare/v1.1.37-dev.0...v1.1.38) (2026-08-19)

### Bug Fixes

- **repo:** test(mobile,repo,api): NotificationsContext, NotificationsContext.test, 20260819_0001_create_user_notifications, notifications.migration.test

## [1.1.37](https://github.com/alternun-development/alternun/compare/v1.1.36...v1.1.37) (2026-08-19)

### Bug Fixes

- **repo:** fix(i18n): runtime.test

### Bug Fixes

- **i18n:** runtime.test ([8de40a9](https://github.com/alternun-development/alternun/commit/8de40a9ba272337e02a7e673e26d3f25db258832))

## [1.1.36](https://github.com/alternun-development/alternun/compare/v1.1.36-dev.0...v1.1.36) (2026-08-19)

### Bug Fixes

- **repo:** chore: release v1.1.36-dev.0
- **repo:** test(mobile): NotificationsContext.test

## [1.1.36](https://github.com/alternun-development/alternun/compare/v1.1.35-dev.0...v1.1.36) (2026-08-19)

### Bug Fixes

- **repo:** test(mobile): NotificationsContext.test

## [1.1.35](https://github.com/alternun-development/alternun/compare/v1.1.34...v1.1.35) (2026-08-19)

### Bug Fixes

- **repo:** test(api,mobile,repo): app.module, airs.controller, airs.repository, airs.service
- **repo:** fix(auth): preserve metadata after email verification

### Bug Fixes

- **auth:** preserve metadata after email verification ([8bcc3c4](https://github.com/alternun-development/alternun/commit/8bcc3c4539601da3e04c41bd7d3784478ad3d414))

## [1.1.34](https://github.com/alternun-development/alternun/compare/v1.1.34-dev.0...v1.1.34) (2026-08-19)

### Bug Fixes

- **repo:** chore: release v1.1.34-dev.0
- **repo:** fix(api,auth): route email confirmation through backend
- **repo:** fix(release): preserve consumer startup and update staging

## [1.1.34](https://github.com/alternun-development/alternun/compare/v1.1.33...v1.1.34) (2026-08-19)

### Bug Fixes

- **repo:** fix(api,auth): route email confirmation through backend
- **repo:** fix(release): preserve consumer startup and update staging

### Bug Fixes

- **api,auth:** route email confirmation through backend ([98cf360](https://github.com/alternun-development/alternun/commit/98cf3600b20b1cf84ceb73245592333ac2409718))
- **release:** preserve consumer startup and update staging ([f9dd58f](https://github.com/alternun-development/alternun/commit/f9dd58fa8e904b488ece8bec4fa39604e9c5a5bf))

## [1.1.33](https://github.com/alternun-development/alternun/compare/v1.1.33-dev.0...v1.1.33) (2026-08-18)

### Bug Fixes

- **repo:** chore: release v1.1.33-dev.0
- **repo:** fix(auth): restore generated artifacts
- **repo:** fix(auth): address SMTP migration review
- **repo:** chore: release v1.1.32

## [1.1.33](https://github.com/alternun-development/alternun/compare/v1.1.32...v1.1.33) (2026-08-18)

### Bug Fixes

- **repo:** fix(repo): artifact, graph.db
- **repo:** test(api,repo,auth): apply-migrations, migration-runner-env.test, ENVIRONMENT_SETUP_SUMMARY, LOCAL_DEV_SETUP
- **repo:** fix(auth): restore generated artifacts
- **repo:** fix(auth): address SMTP migration review
- **repo:** chore: release v1.1.32

### Bug Fixes

- **auth:** address SMTP migration review ([5c88c56](https://github.com/alternun-development/alternun/commit/5c88c566078bf029810bb57e7dee27ee9e906888))
- **auth:** restore generated artifacts ([f295f64](https://github.com/alternun-development/alternun/commit/f295f645afc096ce4e4cc1920caa4e17bbcc22ca))
- **repo:** artifact, graph.db ([8ad8c04](https://github.com/alternun-development/alternun/commit/8ad8c043407f330374bb34435c0e897bd447237c))

## [1.1.32](https://github.com/alternun-development/alternun/compare/v1.1.32-dev.0...v1.1.32) (2026-08-18)

### Bug Fixes

- **repo:** chore: release v1.1.32-dev.0
- **repo:** fix(auth,infra): migrate SMTP delivery to Tlao

## [1.1.32](https://github.com/alternun-development/alternun/compare/v1.1.31...v1.1.32) (2026-08-18)

### Bug Fixes

- **repo:** fix(auth,infra): migrate SMTP delivery to Tlao

### Bug Fixes

- **auth,infra:** migrate SMTP delivery to Tlao ([6923e61](https://github.com/alternun-development/alternun/commit/6923e613d2ef6f14b5df54c0aceeaa689bebbf07))

## [1.1.31](https://github.com/alternun-development/alternun/compare/v1.1.31-dev.0...v1.1.31) (2026-08-18)

### Bug Fixes

- **repo:** chore: release v1.1.31-dev.0
- **repo:** fix(api): airs.email, auth-confirmation.email

## [1.1.31](https://github.com/alternun-development/alternun/compare/v1.1.30...v1.1.31) (2026-08-18)

### Bug Fixes

- **repo:** fix(api): airs.email, auth-confirmation.email

### Bug Fixes

- **api:** airs.email, auth-confirmation.email ([9d7dbc4](https://github.com/alternun-development/alternun/commit/9d7dbc4db89bf461c3de7d1548a018febc456a03))

## [1.1.30](https://github.com/alternun-development/alternun/compare/v1.1.30-dev.0...v1.1.30) (2026-08-18)

### Bug Fixes

- **repo:** chore: release v1.1.30-dev.0
- **repo:** fix(api): airs.email, airs-welcome.email, auth-confirmation.email, signup-welcome.email

## [1.1.30](https://github.com/alternun-development/alternun/compare/v1.1.29...v1.1.30) (2026-08-18)

### Bug Fixes

- **repo:** fix(api): airs.email, airs-welcome.email, auth-confirmation.email, signup-welcome.email

### Bug Fixes

- **api:** airs.email, airs-welcome.email, auth-confirmation.email, signup-welcome.email ([77b72fe](https://github.com/alternun-development/alternun/commit/77b72fe8f9d28098d1e735e9a4a3219fc544654b))

## [1.1.29](https://github.com/alternun-development/alternun/compare/v1.1.29-dev.0...v1.1.29) (2026-08-18)

### Bug Fixes

- **repo:** chore: release v1.1.29-dev.0
- **repo:** chore(scripts): release, release.test

## [1.1.29](https://github.com/alternun-development/alternun/compare/v1.1.28...v1.1.29) (2026-08-18)

### Bug Fixes

- **repo:** chore(scripts): release, release.test

## [1.1.28](https://github.com/alternun-development/alternun/compare/v1.1.28-dev.0...v1.1.28) (2026-08-18)

### Bug Fixes

- **repo:** chore: release v1.1.28-dev.0
- **repo:** test(repo,api,docs): release-promotion-guard.test, release-promotion-guard, airs-profile-bonus-text-rpc.migration.test, delete-account

## [1.1.28](https://github.com/alternun-development/alternun/compare/v1.1.27-dev.0...v1.1.28) (2026-08-18)

### Bug Fixes

- **repo:** test(repo,api,docs): release-promotion-guard.test, release-promotion-guard, airs-profile-bonus-text-rpc.migration.test, delete-account

## [1.1.27](https://github.com/alternun-development/alternun/compare/v1.1.26...v1.1.27) (2026-08-18)

### Bug Fixes

- **repo:** chore(scripts): release, release.test

## [1.1.26](https://github.com/alternun-development/alternun/compare/v1.1.26-dev.0...v1.1.26) (2026-08-18)

### Bug Fixes

- **repo:** chore: release v1.1.26-dev.0
- **repo:** chore(scripts): release, release.test

## [1.1.26](https://github.com/alternun-development/alternun/compare/v1.1.25...v1.1.26) (2026-08-18)

### Bug Fixes

- **repo:** chore(scripts): release, release.test

## [1.1.25](https://github.com/alternun-development/alternun/compare/v1.1.24...v1.1.25) (2026-08-18)

### Bug Fixes

- **repo:** chore: release v1.1.25-dev.0
- **repo:** chore(scripts): release, release.test
- **repo:** Potential fix for pull request finding 'CodeQL / Incomplete string escaping or encoding'

## [1.1.25](https://github.com/alternun-development/alternun/compare/v1.1.24...v1.1.25) (2026-08-18)

### Bug Fixes

- **repo:** chore(scripts): release, release.test

## [1.1.24](https://github.com/alternun-development/alternun/compare/v1.1.24-dev.0...v1.1.24) (2026-08-18)

### Bug Fixes

- **repo:** chore: release v1.1.24-dev.0
- **repo:** chore(repo,scripts): release-promotion-process, release, release.test

## [1.1.24](https://github.com/alternun-development/alternun/compare/v1.1.23-dev.0...v1.1.24) (2026-08-18)

### Bug Fixes

- **repo:** chore(repo,scripts): release-promotion-process, release, release.test

## [1.1.23](https://github.com/alternun-development/alternun/compare/v1.1.22...v1.1.23) (2026-08-18)

### Bug Fixes

- **repo:** test(repo,api,docs): release-promotion-guard.test, release-promotion-guard, signup.service, signup.service.test

## [1.1.22](https://github.com/alternun-development/alternun/compare/v1.1.22-dev.0...v1.1.22) (2026-08-18)

### Bug Fixes

- **repo:** chore: release v1.1.22-dev.0
- **repo:** test(infra): backend-api, backend-api-airs-env.test

## [1.1.22](https://github.com/alternun-development/alternun/compare/v1.1.21-dev.0...v1.1.22) (2026-08-18)

### Bug Fixes

- **repo:** test(infra): backend-api, backend-api-airs-env.test

## [1.1.21](https://github.com/alternun-development/alternun/compare/v1.1.20-dev.0...v1.1.21) (2026-08-18)

### Bug Fixes

- **repo:** chore(repo,scripts): README, release, release.test

## [1.1.20](https://github.com/alternun-development/alternun/compare/v1.1.19...v1.1.20) (2026-08-18)

### Bug Fixes

- **repo:** test(infra): backend-api, backend-api-airs-env.test

## [1.1.19](https://github.com/alternun-development/alternun/compare/v1.1.19-dev.0...v1.1.19) (2026-08-18)

### Bug Fixes

- **repo:** fix(release): stage generated release manifests

### Bug Fixes

- **release:** stage generated release manifests ([69a9258](https://github.com/alternun-development/alternun/commit/69a9258be8a16266295031d3143d5bae9a34a1a9))

## [1.1.19](https://github.com/alternun-development/alternun/compare/v1.1.17-dev.0...v1.1.19) (2026-08-18)

### Bug Fixes

- **repo:** chore(repo,docs,scripts): README, overview, contribution-workflow, release-deployment-flow
- **repo:** fix(auth): repair production signup provisioning
- **repo:** fix(api,db): harden referral email delivery
- **repo:** fix(api): use stage-aware referral email links
- **repo:** fix(api,db): make AIRS snapshot user ID comparison stage-safe

### Bug Fixes

- **api,db:** harden referral email delivery ([0b8c5a6](https://github.com/alternun-development/alternun/commit/0b8c5a60af9bc06e88d54d615056122b84173e67))
- **api,db:** make AIRS snapshot user ID comparison stage-safe ([f5c6528](https://github.com/alternun-development/alternun/commit/f5c6528fcac815aae4979fa0473b015bbf473b70))
- **api:** use stage-aware referral email links ([b56e039](https://github.com/alternun-development/alternun/commit/b56e03980618c5b9cd45bde25d98cc89a64c583b))
- **auth:** repair production signup provisioning ([cf50470](https://github.com/alternun-development/alternun/commit/cf50470147acf5584954e143519ccee16d23d5bf))

## [1.1.18](https://github.com/alternun-development/alternun/compare/v1.1.17-dev.0...v1.1.18) (2026-08-18)

### Bug Fixes

- **repo:** chore(repo,docs,scripts): README, overview, contribution-workflow, release-deployment-flow
- **repo:** fix(auth): repair production signup provisioning
- **repo:** fix(api,db): harden referral email delivery
- **repo:** fix(api): use stage-aware referral email links
- **repo:** fix(api,db): make AIRS snapshot user ID comparison stage-safe

### Bug Fixes

- **api,db:** harden referral email delivery ([0b8c5a6](https://github.com/alternun-development/alternun/commit/0b8c5a60af9bc06e88d54d615056122b84173e67))
- **api,db:** make AIRS snapshot user ID comparison stage-safe ([f5c6528](https://github.com/alternun-development/alternun/commit/f5c6528fcac815aae4979fa0473b015bbf473b70))
- **api:** use stage-aware referral email links ([b56e039](https://github.com/alternun-development/alternun/commit/b56e03980618c5b9cd45bde25d98cc89a64c583b))
- **auth:** repair production signup provisioning ([cf50470](https://github.com/alternun-development/alternun/commit/cf50470147acf5584954e143519ccee16d23d5bf))

## [1.1.17](https://github.com/alternun-development/alternun/compare/v1.1.16-dev.0...v1.1.17) (2026-08-18)

### Bug Fixes

- **repo:** fix(api,email,repo): airs.email, referrals.service, referral-reward, referral-reward.test
- **repo:** chore: release v1.1.16
- **repo:** chore: sync v1.1.16 production release artifact

### Bug Fixes

- **api,email,repo:** airs.email, referrals.service, referral-reward, referral-reward.test ([2808513](https://github.com/alternun-development/alternun/commit/2808513382d3be05c39e6359274cf51550e88104))

## [1.1.16](https://github.com/alternun-development/alternun/compare/v1.1.15...v1.1.16) (2026-08-18)

### Bug Fixes

- **repo:** test(api,repo): airs-uuid-overloads.migration.test, 20260818_0001_reload_postgrest_schema_after_airs_rpc_cleanup, 20260818_0002_make_airs_snapshot_rpc_uuid_canonical
- **repo:** chore: sync v1.1.15 production release artifact

## [1.1.15](https://github.com/alternun-development/alternun/compare/v1.1.15-dev.0...v1.1.15) (2026-08-18)

### Bug Fixes

- **repo:** chore: sync v1.1.15 README
- **repo:** chore: sync v1.1.15-dev.0 release artifacts

## [1.1.15](https://github.com/alternun-development/alternun/compare/v1.1.14...v1.1.15) (2026-08-18)

### Bug Fixes

- **repo:** test(mobile): mi-perfil, AirsDashboardProvider, Dashboard, HeroStats
- **repo:** chore: sync v1.1.14 production release artifact

## [1.1.14](https://github.com/alternun-development/alternun/compare/v1.1.14-dev.0...v1.1.14) (2026-08-18)

### Bug Fixes

- **repo:** chore: sync v1.1.14-dev.0 release artifacts

## [1.1.14](https://github.com/alternun-development/alternun/compare/v1.1.13...v1.1.14) (2026-08-18)

### Bug Fixes

- **repo:** test(api,mobile,repo): airs-uuid-overloads.migration.test, \_layout, \_layout.web, mi-perfil
- **repo:** fix(api): resolve referral type and update mobile dashboard tests
- **repo:** fix airs referral verification and activity scope/filter behavior
- **repo:** test(api,mobile): improve airs pagination and api coverage
- **repo:** chore: sync release v1.1.13

### Bug Fixes

- **api:** resolve referral type and update mobile dashboard tests ([6cbb81f](https://github.com/alternun-development/alternun/commit/6cbb81f4fbf098f7fb645a6bea9cb47463cfab93))

## [1.1.13](https://github.com/alternun-development/alternun/compare/v1.1.13-dev.0...v1.1.13) (2026-08-10)

### Bug Fixes

- **repo:** chore: sync release v1.1.13-dev.0

## [1.1.13](https://github.com/alternun-development/alternun/compare/v1.1.12...v1.1.13) (2026-08-09)

### Bug Fixes

- **repo:** feat(airs): paginate activity and secure referral rewards
- **repo:** chore: release v1.1.12
- **repo:** chore: sync release v1.1.12

### Features

- **airs:** paginate activity and secure referral rewards ([f87f9f8](https://github.com/alternun-development/alternun/commit/f87f9f84d457f8be450b6bed144494015429189e))

## [1.1.12](https://github.com/alternun-development/alternun/compare/v1.1.11...v1.1.12) (2026-08-09)

### Bug Fixes

- **repo:** test(mobile): update explorer navigation state
- **repo:** feat(mobile): upgrade explorer experience
- **repo:** chore: release v1.1.11
- **repo:** fix(mobile): tighten dashboard cards and brand pwa icons
- **repo:** fix(release): fail fast when promote PR creation fails

### Bug Fixes

- **mobile:** tighten dashboard cards and brand pwa icons ([11a3502](https://github.com/alternun-development/alternun/commit/11a3502b6638495a0de288ef28265cdb524c3127))
- **release:** fail fast when promote PR creation fails ([bcb215e](https://github.com/alternun-development/alternun/commit/bcb215e4fdb3acb8c35e35c49938b5febd992f96))

### Features

- **mobile:** upgrade explorer experience ([bb88ce4](https://github.com/alternun-development/alternun/commit/bb88ce42f80ccc2e42b1b09c4d2e8560eb175763))

## [1.1.11](https://github.com/alternun-development/alternun/compare/v1.1.11-dev.0...v1.1.11) (2026-07-03)

### Bug Fixes

- **repo:** chore: release v1.1.11-dev.0
- **repo:** fix(mobile): theme support modal and narrow cards
- **repo:** test(mobile): add FooterCopyright compact renderer test, upgrade react-test-renderer to 19
- **repo:** test(mobile): cover APP_VERSION empty fallback path in Footer.shared

## [1.1.11](https://github.com/alternun-development/alternun/compare/v1.1.10...v1.1.11) (2026-07-03)

### Bug Fixes

- **repo:** fix(mobile): theme support modal and narrow cards
- **repo:** test(mobile): add FooterCopyright compact renderer test, upgrade react-test-renderer to 19
- **repo:** test(mobile): cover APP_VERSION empty fallback path in Footer.shared

### Bug Fixes

- **mobile:** theme support modal and narrow cards ([5de1d72](https://github.com/alternun-development/alternun/commit/5de1d72d03549dd98bae62543046db07a1b6f8d6))

## [1.1.10](https://github.com/alternun-development/alternun/compare/v1.1.10-dev.0...v1.1.10) (2026-07-03)

### Bug Fixes

- **repo:** chore: enforce 70% coverage threshold with pre-push guard and CLAUDE.md docs
- **repo:** chore: sync README and mobile version to v1.1.10-dev.0 --no-validate-reentry
- **repo:** fix(ci): repair Footer.shared tests and CodeQL regex injection alert

### Bug Fixes

- **ci:** repair Footer.shared tests and CodeQL regex injection alert ([4e01b81](https://github.com/alternun-development/alternun/commit/4e01b815c6f32ea6d2d96c6bc7cac8b10501771b))

## [1.1.10](https://github.com/alternun-development/alternun/compare/v1.1.9-dev.0...v1.1.10) (2026-07-03)

### Bug Fixes

- **repo:** fix(mobile): remove Mi perfil heading, reorder tabs, tighten top spacing
- **repo:** chore: sync README and mobile version to v1.1.9-dev.0 --no-validate-reentry

### Bug Fixes

- **mobile:** remove Mi perfil heading, reorder tabs, tighten top spacing ([cab0a2c](https://github.com/alternun-development/alternun/commit/cab0a2cf08f40fa4e972c5da4e3fd4e725372470))

## [1.1.9](https://github.com/alternun-development/alternun/compare/v1.1.8...v1.1.9) (2026-07-03)

### Bug Fixes

- **repo:** fix(mobile): prevent ATN/RBI card value overflow on small screens

### Bug Fixes

- **mobile:** prevent ATN/RBI card value overflow on small screens ([5321de7](https://github.com/alternun-development/alternun/commit/5321de7542dcc67433d9906f8b06958b2721b9bf))

## [1.1.8](https://github.com/alternun-development/alternun/compare/v1.1.8-dev.0...v1.1.8) (2026-07-03)

### Bug Fixes

- **repo:** chore: sync README and mobile version to v1.1.8-dev.0 --no-validate-reentry

## [1.1.8](https://github.com/alternun-development/alternun/compare/v1.1.7...v1.1.8) (2026-07-03)

### Bug Fixes

- **repo:** fix(ui): align footer version with drawer and clean up changelog noise
- **repo:** chore: sync mobile version.production to v1.1.7 --no-validate-reentry

### Bug Fixes

- **ui:** align footer version with drawer and clean up changelog noise ([2db69a2](https://github.com/alternun-development/alternun/commit/2db69a287b8b9a6b5e452b5e719ede9000de01ad))

## [1.1.7](https://github.com/alternun-development/alternun/compare/v1.1.7-dev.0...v1.1.7) (2026-07-03)

### Bug Fixes

- **repo:** chore: sync README and mobile version to v1.1.7-dev.0 --no-validate-reentry

## [1.1.7](https://github.com/alternun-development/alternun/compare/v1.1.6...v1.1.7) (2026-07-03)

### Bug Fixes

- **repo:** fix(auth): settings menu Language/Theme clicks no longer close the dropdown

### Bug Fixes

- **auth:** settings menu Language/Theme clicks no longer close the dropdown ([b0bf6e6](https://github.com/alternun-development/alternun/commit/b0bf6e66ada043fb505a3f593a03919675f8b85f))

## [1.1.6](https://github.com/alternun-development/alternun/compare/v1.1.6-dev.0...v1.1.6) (2026-07-03)

### Bug Fixes

- **repo:** chore: sync README and mobile version to v1.1.6-dev.0 --no-validate-reentry

## [1.1.6](https://github.com/alternun-development/alternun/compare/v1.1.5...v1.1.6) (2026-07-03)

### Bug Fixes

- **repo:** chore(mobile): version.production
- **repo:** fix(referrals): award AIRS bonus to both referrer and referee on signup
- **repo:** test(mobile): cover null-hostname branch in isDevelopmentRuntime
- **repo:** feat(profile): collapsible invited users section with pagination in referral card
- **repo:** feat(auth): add Enter key submit support to sign-in and sign-up email forms

### Bug Fixes

- **referrals:** award AIRS bonus to both referrer and referee on signup ([e163917](https://github.com/alternun-development/alternun/commit/e163917fe50d6df4006882510507758123245dd3))

### Features

- **auth:** add Enter key submit support to sign-in and sign-up email forms ([fbac6b7](https://github.com/alternun-development/alternun/commit/fbac6b75cde541053f7159ff3b64f69a2968202a))
- **profile:** collapsible invited users section with pagination in referral card ([0874256](https://github.com/alternun-development/alternun/commit/0874256fede6ad6781ec60485a03b566246fed6a))

## [1.1.5](https://github.com/alternun-development/alternun/compare/v1.1.5-dev.0...v1.1.5) (2026-07-03)

### Bug Fixes

- **repo:** chore: sync README and mobile version to v1.1.5-dev.0 --no-validate-reentry

## [1.1.5](https://github.com/alternun-development/alternun/compare/v1.1.3-dev.0...v1.1.5) (2026-07-03)

### Bug Fixes

- **repo:** fix(mobile): production version display and auth form spacing
- **repo:** chore: sync root version.production.json to v1.1.4 --no-validate-reentry
- **repo:** chore: sync version files and CHANGELOG to v1.1.4-dev.0 after production release --no-validate-reentry
- **repo:** chore(repo,mobile): README, version.production
- **repo:** chore: sync mobile production version to 1.1.3 --no-validate-reentry

### Bug Fixes

- **api:** guard null status before comparison in signup error handler ([dbf4fce](https://github.com/alternun-development/alternun/commit/dbf4fcee817dd359515c7373bab13bcbd4b806b8))
- **api:** listen on 0.0.0.0 to resolve localhost CORS null-status errors ([29b7628](https://github.com/alternun-development/alternun/commit/29b7628bbc18379ea151f79071499e8402ecaf8f))
- **auth:** referral code hidden by default, back button, fix sessionStorage pre-fill ([08242f5](https://github.com/alternun-development/alternun/commit/08242f5bfa65ea711f1b5f90d93321d430f2ab74))
- **auth:** resolve signup 500 error and add social login to signup flow ([b2da482](https://github.com/alternun-development/alternun/commit/b2da482843163d843b6e0895aa1017356d7bdf61))
- **mobile:** production version display and auth form spacing ([55d0bf6](https://github.com/alternun-development/alternun/commit/55d0bf6971de93be1d6fd79952ed0fc227eba85e))
- **referrals:** allow user_id in POST body and always show referred-by in profile card ([4dc5f7b](https://github.com/alternun-development/alternun/commit/4dc5f7b76378f17fb10160dcdb77f47ff1d9c333))
- **referrals:** skip attribution on invalid/self referral code instead of 400 ([f3aaa41](https://github.com/alternun-development/alternun/commit/f3aaa41babe904c8d2357eda64822ed89defa27d))

### Features

- **auth:** improve signup UI and fix referral flow for social logins ([1e65f92](https://github.com/alternun-development/alternun/commit/1e65f92f94d35850a3db87b9941dcf2673209491))
- **auth:** refactor signup flow into two-path selection UI ([9712b44](https://github.com/alternun-development/alternun/commit/9712b442b0c2542cb12b1caecd37c5728b64f9a7))

## [1.1.4](https://github.com/alternun-development/alternun/compare/v1.1.3-dev.0...v1.1.4) (2026-07-03)

### Bug Fixes

- **repo:** chore: sync mobile production version to 1.1.3 --no-validate-reentry
- **repo:** feat(auth): improve signup UI and fix referral flow for social logins
- **repo:** fix(auth): referral code hidden by default, back button, fix sessionStorage pre-fill
- **repo:** feat(auth): refactor signup flow into two-path selection UI
- **repo:** fix(referrals): skip attribution on invalid/self referral code instead of 400

### Bug Fixes

- **api:** guard null status before comparison in signup error handler ([dbf4fce](https://github.com/alternun-development/alternun/commit/dbf4fcee817dd359515c7373bab13bcbd4b806b8))
- **api:** listen on 0.0.0.0 to resolve localhost CORS null-status errors ([29b7628](https://github.com/alternun-development/alternun/commit/29b7628bbc18379ea151f79071499e8402ecaf8f))
- **auth:** referral code hidden by default, back button, fix sessionStorage pre-fill ([08242f5](https://github.com/alternun-development/alternun/commit/08242f5bfa65ea711f1b5f90d93321d430f2ab74))
- **auth:** resolve signup 500 error and add social login to signup flow ([b2da482](https://github.com/alternun-development/alternun/commit/b2da482843163d843b6e0895aa1017356d7bdf61))
- **referrals:** allow user_id in POST body and always show referred-by in profile card ([4dc5f7b](https://github.com/alternun-development/alternun/commit/4dc5f7b76378f17fb10160dcdb77f47ff1d9c333))
- **referrals:** skip attribution on invalid/self referral code instead of 400 ([f3aaa41](https://github.com/alternun-development/alternun/commit/f3aaa41babe904c8d2357eda64822ed89defa27d))

### Features

- **auth:** improve signup UI and fix referral flow for social logins ([1e65f92](https://github.com/alternun-development/alternun/commit/1e65f92f94d35850a3db87b9941dcf2673209491))
- **auth:** refactor signup flow into two-path selection UI ([9712b44](https://github.com/alternun-development/alternun/commit/9712b442b0c2542cb12b1caecd37c5728b64f9a7))

## [1.1.3](https://github.com/alternun-development/alternun/compare/v1.1.2...v1.1.3) (2026-07-01)

## [1.1.4](https://github.com/alternun-development/alternun/compare/v1.1.3-dev.0...v1.1.4) (2026-07-03)

### Bug Fixes

- **api:** guard null status before comparison in signup error handler ([dbf4fce](https://github.com/alternun-development/alternun/commit/dbf4fcee817dd359515c7373bab13bcbd4b806b8))
- **api:** listen on 0.0.0.0 to resolve localhost CORS null-status errors ([29b7628](https://github.com/alternun-development/alternun/commit/29b7628bbc18379ea151f79071499e8402ecaf8f))
- **auth:** referral code hidden by default, back button, fix sessionStorage pre-fill ([08242f5](https://github.com/alternun-development/alternun/commit/08242f5bfa65ea711f1b5f90d93321d430f2ab74))
- **auth:** resolve signup 500 error and add social login to signup flow ([b2da482](https://github.com/alternun-development/alternun/commit/b2da482843163d843b6e0895aa1017356d7bdf61))
- **referrals:** allow user_id in POST body and always show referred-by in profile card ([4dc5f7b](https://github.com/alternun-development/alternun/commit/4dc5f7b76378f17fb10160dcdb77f47ff1d9c333))
- **referrals:** skip attribution on invalid/self referral code instead of 400 ([f3aaa41](https://github.com/alternun-development/alternun/commit/f3aaa41babe904c8d2357eda64822ed89defa27d))

### Features

- **auth:** improve signup UI and fix referral flow for social logins ([1e65f92](https://github.com/alternun-development/alternun/commit/1e65f92f94d35850a3db87b9941dcf2673209491))
- **auth:** refactor signup flow into two-path selection UI ([9712b44](https://github.com/alternun-development/alternun/commit/9712b442b0c2542cb12b1caecd37c5728b64f9a7))

## [1.1.3](https://github.com/alternun-development/alternun/compare/v1.1.2...v1.1.3) (2026-07-01)

## [1.1.3](https://github.com/alternun-development/alternun/compare/v1.1.2...v1.1.3) (2026-07-01)

### Bug Fixes

- **repo:** fix(db): force-drop stale AIRS uuid overloads causing PGRST203 ambiguity
- **repo:** chore: set develop to 1.1.2-dev.0 after production release --no-validate-reentry
- **repo:** chore: sync roadmap --no-validate-reentry
- **repo:** chore: sync version files for v1.1.2 --no-validate-reentry
- **repo:** docs(agents): add geo-service pending task — self-hosted MaxMind GeoLite2 to replace ipapi.co

### Bug Fixes

- **db:** force-drop stale AIRS uuid overloads causing PGRST203 ambiguity ([6c81fd5](https://github.com/alternun-development/alternun/commit/6c81fd592b14ec229a4827014e324723b4fbf381))

## [1.1.2](https://github.com/alternun-development/alternun/compare/v1.1.0...v1.1.2) (2026-07-01)

### Bug Fixes

- **repo:** chore(guard): block release/_ and promote/_ branch pushes in pre-push hook
- **repo:** feat(geo): server-side IP geolocation proxy via ipapi.co
- **repo:** fix(auth+ui): fix testnet pointing to production APIs + sign-out redirect
- **repo:** docs(claude): document canonical develop→master release flow (§11)
- **repo:** chore: sync development version to 1.1.1-dev.0 after production release

### Bug Fixes

- **auth+ui:** fix testnet pointing to production APIs + sign-out redirect ([03ddc95](https://github.com/alternun-development/alternun/commit/03ddc9546771249804739a766da395ca762619ac))
- **ui:** move profile tab pills below title, fix ATN/RBI card overlap on small screens ([d4e28a6](https://github.com/alternun-development/alternun/commit/d4e28a6d77907fb461d1c7ad5243f1dfdd719fe8))
- **wallet:** card UI + routing fix + vault detection + PIN change flow ([e74c06d](https://github.com/alternun-development/alternun/commit/e74c06d4ccce6db0523461836da3e4fc6e9984ae))
- **wallet:** eliminate layout gap in manage wallets screen ([9db2fbc](https://github.com/alternun-development/alternun/commit/9db2fbc2ecdc4a75b1bc6b5f6961c72fb069db6d))
- **wallet:** MetaMask body error, PIN false-positive, progressive image loading ([671cc4e](https://github.com/alternun-development/alternun/commit/671cc4e9d5e81aa55c98687d6ccfed8fe802c6a7))
- **wallet:** remove flex:1 from title style causing layout gap ([9311109](https://github.com/alternun-development/alternun/commit/931110979d07c9f1ae0d909746a8cfdeed0b3795))
- **wallet:** resolve 2 high-severity CodeQL alerts in packages/wallet ([5c6aaeb](https://github.com/alternun-development/alternun/commit/5c6aaeb234086c49f4c4a9b12a7fe898fc0b9fdc)), closes [#62](https://github.com/alternun-development/alternun/issues/62) [#61](https://github.com/alternun-development/alternun/issues/61)

### Features

- **geo:** server-side IP geolocation proxy via ipapi.co ([c0c45b6](https://github.com/alternun-development/alternun/commit/c0c45b6334f83812e85ca62d10264f51780cefd2))
- **i18n:** add missing wallet.changePin and addAccount.noVault translations to es/th ([630036c](https://github.com/alternun-development/alternun/commit/630036c790bc5e7233ff8348b04bdb1180bd73ea))
- **wallet:** full wallet management — add/delete/import + MetaMask linking + layout fix ([592f737](https://github.com/alternun-development/alternun/commit/592f737ac3234efcc1f4e83ad0cf2f57c3f4a95f))

## [1.1.2](https://github.com/alternun-development/alternun/compare/v1.1.0...v1.1.2) (2026-07-01)

### Bug Fixes

- **auth+ui:** fix testnet pointing to production APIs + sign-out redirect ([03ddc95](https://github.com/alternun-development/alternun/commit/03ddc9546771249804739a766da395ca762619ac))
- **ui:** move profile tab pills below title, fix ATN/RBI card overlap on small screens ([d4e28a6](https://github.com/alternun-development/alternun/commit/d4e28a6d77907fb461d1c7ad5243f1dfdd719fe8))
- **wallet:** card UI + routing fix + vault detection + PIN change flow ([e74c06d](https://github.com/alternun-development/alternun/commit/e74c06d4ccce6db0523461836da3e4fc6e9984ae))
- **wallet:** eliminate layout gap in manage wallets screen ([9db2fbc](https://github.com/alternun-development/alternun/commit/9db2fbc2ecdc4a75b1bc6b5f6961c72fb069db6d))
- **wallet:** MetaMask body error, PIN false-positive, progressive image loading ([671cc4e](https://github.com/alternun-development/alternun/commit/671cc4e9d5e81aa55c98687d6ccfed8fe802c6a7))
- **wallet:** remove flex:1 from title style causing layout gap ([9311109](https://github.com/alternun-development/alternun/commit/931110979d07c9f1ae0d909746a8cfdeed0b3795))
- **wallet:** resolve 2 high-severity CodeQL alerts in packages/wallet ([5c6aaeb](https://github.com/alternun-development/alternun/commit/5c6aaeb234086c49f4c4a9b12a7fe898fc0b9fdc)), closes [#62](https://github.com/alternun-development/alternun/issues/62) [#61](https://github.com/alternun-development/alternun/issues/61)

### Features

- **geo:** server-side IP geolocation proxy via ipapi.co ([c0c45b6](https://github.com/alternun-development/alternun/commit/c0c45b6334f83812e85ca62d10264f51780cefd2))
- **i18n:** add missing wallet.changePin and addAccount.noVault translations to es/th ([630036c](https://github.com/alternun-development/alternun/commit/630036c790bc5e7233ff8348b04bdb1180bd73ea))
- **wallet:** full wallet management — add/delete/import + MetaMask linking + layout fix ([592f737](https://github.com/alternun-development/alternun/commit/592f737ac3234efcc1f4e83ad0cf2f57c3f4a95f))

## [1.1.1](https://github.com/alternun-development/alternun/compare/v1.1.0...v1.1.1) (2026-07-01)

### Bug Fixes

- **repo:** fix(ui): move profile tab pills below title, fix ATN/RBI card overlap on small screens
- **repo:** docs(agents): add v2-ui-migration pending task spec with V1/V2 isolation strategy
- **repo:** test(mobile): expand walletApiClient coverage to 100% lines
- **repo:** test(mobile): add unit tests for walletApiClient and isTestnetRuntime
- **repo:** feat(i18n): add missing wallet.changePin and addAccount.noVault translations to es/th

### Bug Fixes

- **ui:** move profile tab pills below title, fix ATN/RBI card overlap on small screens ([f849d3e](https://github.com/alternun-development/alternun/commit/f849d3e99dc227e4dd5022bac2cd514b5a044bfd))
- **wallet:** card UI + routing fix + vault detection + PIN change flow ([e74c06d](https://github.com/alternun-development/alternun/commit/e74c06d4ccce6db0523461836da3e4fc6e9984ae))
- **wallet:** eliminate layout gap in manage wallets screen ([9db2fbc](https://github.com/alternun-development/alternun/commit/9db2fbc2ecdc4a75b1bc6b5f6961c72fb069db6d))
- **wallet:** MetaMask body error, PIN false-positive, progressive image loading ([671cc4e](https://github.com/alternun-development/alternun/commit/671cc4e9d5e81aa55c98687d6ccfed8fe802c6a7))
- **wallet:** remove flex:1 from title style causing layout gap ([9311109](https://github.com/alternun-development/alternun/commit/931110979d07c9f1ae0d909746a8cfdeed0b3795))
- **wallet:** resolve 2 high-severity CodeQL alerts in packages/wallet ([5c6aaeb](https://github.com/alternun-development/alternun/commit/5c6aaeb234086c49f4c4a9b12a7fe898fc0b9fdc)), closes [#62](https://github.com/alternun-development/alternun/issues/62) [#61](https://github.com/alternun-development/alternun/issues/61)

### Features

- **i18n:** add missing wallet.changePin and addAccount.noVault translations to es/th ([630036c](https://github.com/alternun-development/alternun/commit/630036c790bc5e7233ff8348b04bdb1180bd73ea))
- **wallet:** full wallet management — add/delete/import + MetaMask linking + layout fix ([592f737](https://github.com/alternun-development/alternun/commit/592f737ac3234efcc1f4e83ad0cf2f57c3f4a95f))

## [1.1.1](https://github.com/alternun-development/alternun/compare/v1.1.0...v1.1.1) (2026-07-01)

### Bug Fixes

- **ui:** move profile tab pills below title, fix ATN/RBI card overlap on small screens ([f849d3e](https://github.com/alternun-development/alternun/commit/f849d3e99dc227e4dd5022bac2cd514b5a044bfd))
- **wallet:** card UI + routing fix + vault detection + PIN change flow ([e74c06d](https://github.com/alternun-development/alternun/commit/e74c06d4ccce6db0523461836da3e4fc6e9984ae))
- **wallet:** eliminate layout gap in manage wallets screen ([9db2fbc](https://github.com/alternun-development/alternun/commit/9db2fbc2ecdc4a75b1bc6b5f6961c72fb069db6d))
- **wallet:** MetaMask body error, PIN false-positive, progressive image loading ([671cc4e](https://github.com/alternun-development/alternun/commit/671cc4e9d5e81aa55c98687d6ccfed8fe802c6a7))
- **wallet:** remove flex:1 from title style causing layout gap ([9311109](https://github.com/alternun-development/alternun/commit/931110979d07c9f1ae0d909746a8cfdeed0b3795))
- **wallet:** resolve 2 high-severity CodeQL alerts in packages/wallet ([5c6aaeb](https://github.com/alternun-development/alternun/commit/5c6aaeb234086c49f4c4a9b12a7fe898fc0b9fdc)), closes [#62](https://github.com/alternun-development/alternun/issues/62) [#61](https://github.com/alternun-development/alternun/issues/61)

### Features

- **i18n:** add missing wallet.changePin and addAccount.noVault translations to es/th ([630036c](https://github.com/alternun-development/alternun/commit/630036c790bc5e7233ff8348b04bdb1180bd73ea))
- **wallet:** full wallet management — add/delete/import + MetaMask linking + layout fix ([592f737](https://github.com/alternun-development/alternun/commit/592f737ac3234efcc1f4e83ad0cf2f57c3f4a95f))

## [1.1.0](https://github.com/alternun-development/alternun/compare/v1.1.0-dev.0...v1.1.0) (2026-06-30)

## [1.1.0](https://github.com/alternun-development/alternun/compare/v1.0.296...v1.1.0) (2026-06-30)

### Bug Fixes

- **mobile:** smooth AIRS ranking transitions ([70b510a](https://github.com/alternun-development/alternun/commit/70b510a3d32db4dc65062079ae710d09557f2ee6))
- stack dashboard summary cards on mobile ([e447ed1](https://github.com/alternun-development/alternun/commit/e447ed1070e00f774553f061acfeb15ddecb394c))

### Features

- **wallet:** non-custodial multi-chain wallet (EVM/Bitcoin/Solana) for web ([4561159](https://github.com/alternun-development/alternun/commit/45611598ac9e6d3582d587c31dfcbbdcc6265b37))

## [1.1.0](https://github.com/alternun-development/alternun/compare/v1.0.296...v1.1.0) (2026-06-30)

### Features

- **wallet:** Non-custodial multi-chain wallet (EVM/Bitcoin/Solana) for web — PIN-encrypted local key storage with PBKDF2 600k iterations, wallet creation with mandatory backup disclaimer and randomized word verification, restore from recovery phrase, send (with per-chain address validation and a fee-review step), receive, activity feed, multi-wallet management with selectable default account, and export (encrypted keystore or plaintext phrase). Server-side: full NestJS wallet module with IP throttling, per-user PIN lockout backoff, stage-aware mainnet/testnet RPC selection, RLS policies via app_user_id JWT claim.

### Bug Fixes

- **wallet:** Bitcoin addresses were always derived as mainnet (bc1...) regardless of deploy stage, causing BTC balances to silently disappear from the UI (testnet Esplora returned 400 for mainnet-format addresses)
- **wallet:** react-native-web's Alert.alert is a documented no-op — replaced all wallet error paths with visible inline error UI
- **wallet:** expo-secure-store web availability required isAvailableAsync(), not a typeof check on the wrapper function
- **wallet:** mi-perfil.tsx tab-sync useEffect had tabs in its dependency array, causing the active tab to snap back to the ?tab= URL param on every render
- **wallet:** Buffer-free crypto throughout packages/wallet (bip39→@scure/bip39, ed25519-hd-key→slip10Ed25519.ts, secureVault base64/hex helpers)

## [1.0.296](https://github.com/alternun-development/alternun/compare/v1.0.296-dev.0...v1.0.296) (2026-06-30)

### Bug Fixes

- **repo:** chore(repo): sync README and version mirror for v1.0.296

## [1.0.296](https://github.com/alternun-development/alternun/compare/v1.0.295...v1.0.296) (2026-06-30)

### Bug Fixes

- **repo:** test(repo,mobile,i18n): 10-airs-prod-migrations-and-wallet-empty-state, README, DashboardSummaryCards, walletSummary.test
- **repo:** chore: sync reentry status post-promote v1.0.295

## [1.0.295](https://github.com/alternun-development/alternun/compare/v1.0.295-dev.0...v1.0.295) (2026-06-30)

### Bug Fixes

- **repo:** docs: fix README current version line to 1.0.295
- **repo:** docs: sync root README for v1.0.295

## [1.0.295](https://github.com/alternun-development/alternun/compare/v1.0.294...v1.0.295) (2026-06-30)

### Bug Fixes

- **repo:** test(repo,api,mobile): pre-push, REENTRY, ROADMAP, reentry.status

## [1.0.294](https://github.com/alternun-development/alternun/compare/v1.0.294-dev.0...v1.0.294) (2026-06-29)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.294

## [1.0.294](https://github.com/alternun-development/alternun/compare/v1.0.293...v1.0.294) (2026-06-29)

### Bug Fixes

- **repo:** fix(repo,api,mobile): .gitignore, airs.repository, AppInfoFooter, Dashboard

### Bug Fixes

- **repo,api,mobile:** .gitignore, airs.repository, AppInfoFooter, Dashboard ([7836867](https://github.com/alternun-development/alternun/commit/7836867037b7b0b3f306621d3952418dfda4a500))

## [1.0.293](https://github.com/alternun-development/alternun/compare/v1.0.293-dev.0...v1.0.293) (2026-06-28)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.293

## [1.0.293](https://github.com/alternun-development/alternun/compare/v1.0.292...v1.0.293) (2026-06-28)

### Bug Fixes

- **repo:** fix(airs): fix null app_user_id in JWTs and backfill prod airs_balance
- **repo:** chore: release v1.0.288
- **repo:** docs: sync root README for v1.0.288

### Bug Fixes

- **airs:** fix null app_user_id in JWTs and backfill prod airs_balance ([c319be6](https://github.com/alternun-development/alternun/commit/c319be6bc6a6d8774a9967a0790b1d899f71d62b))

## [1.0.292](https://github.com/alternun-development/alternun/compare/v1.0.292-dev.0...v1.0.292) (2026-06-28)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.292

## [1.0.292](https://github.com/alternun-development/alternun/compare/v1.0.291-dev.0...v1.0.292) (2026-06-28)

### Bug Fixes

- **repo:** chore(repo): README
- **repo:** 🌐 feat(dashboard): add scope filter to activity feed and fix subtitle translations
- **repo:** ✨ feat(dashboard): merge leaderboard with position card and add scope filter

## [1.0.291](https://github.com/alternun-development/alternun/compare/v1.0.290-dev.0...v1.0.291) (2026-06-28)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.290
- **repo:** fix(identity): fix container IP lookup and increase verify script timeout

### Bug Fixes

- **identity:** fix container IP lookup and increase verify script timeout ([c15e458](https://github.com/alternun-development/alternun/commit/c15e458597d7a70857687518c9f1e7909203b14b))

## [1.0.290](https://github.com/alternun-development/alternun/compare/v1.0.289...v1.0.290) (2026-06-28)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.289
- **repo:** fix(identity): wait for SSM agent online before dispatching runtime sync

### Bug Fixes

- **identity:** wait for SSM agent online before dispatching runtime sync ([848da7d](https://github.com/alternun-development/alternun/commit/848da7d74dec52ce8fe774e126550f7c7d27006c))

## [1.0.289](https://github.com/alternun-development/alternun/compare/v1.0.289-dev.0...v1.0.289) (2026-06-27)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.289

## [1.0.289](https://github.com/alternun-development/alternun/compare/v1.0.287-dev.0...v1.0.289) (2026-06-27)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.288
- **repo:** fix(identity): replace manage.py shell readiness check with HTTP health endpoint

### Bug Fixes

- **identity:** replace manage.py shell readiness check with HTTP health endpoint ([7dbea82](https://github.com/alternun-development/alternun/commit/7dbea824443ba73ff9dbc37ed83e1c427039b96b))

## [1.0.288](https://github.com/alternun-development/alternun/compare/v1.0.286...v1.0.288) (2026-06-27)

### Bug Fixes

- **repo:** chore(repo,admin,api): CHANGELOG, README, app, version.development
- **repo:** fix(infra): sst-deploy

### Bug Fixes

- **infra:** sst-deploy ([721170d](https://github.com/alternun-development/alternun/commit/721170d578c2411d4242a778e76a1380fd6ad7d6))

## [1.0.287](https://github.com/alternun-development/alternun/compare/v1.0.286...v1.0.287) (2026-06-27)

### Bug Fixes

- **repo:** fix(infra): sst-deploy

### Bug Fixes

- **infra:** sst-deploy ([721170d](https://github.com/alternun-development/alternun/commit/721170d578c2411d4242a778e76a1380fd6ad7d6))

## [1.0.286](https://github.com/alternun-development/alternun/compare/v1.0.286-dev.0...v1.0.286) (2026-06-27)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.286

## [1.0.286](https://github.com/alternun-development/alternun/compare/v1.0.285...v1.0.286) (2026-06-27)

### Bug Fixes

- **repo:** fix(infra): add --kill-after to exec timeouts and extend SSM poll budget

### Bug Fixes

- **infra:** add --kill-after to exec timeouts and extend SSM poll budget ([770d364](https://github.com/alternun-development/alternun/commit/770d3640df495f85c06ccd22947b06cb98722c72))

## [1.0.285](https://github.com/alternun-development/alternun/compare/v1.0.285-dev.0...v1.0.285) (2026-06-27)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.285

## [1.0.285](https://github.com/alternun-development/alternun/compare/v1.0.284...v1.0.285) (2026-06-27)

### Bug Fixes

- **repo:** fix(infra): prevent docker exec hangs in identity runtime sync

### Bug Fixes

- **infra:** prevent docker exec hangs in identity runtime sync ([7242b0d](https://github.com/alternun-development/alternun/commit/7242b0db9194f076826051d2908c381ff3934ab2))

## [1.0.284](https://github.com/alternun-development/alternun/compare/v1.0.284-dev.0...v1.0.284) (2026-06-27)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.284

## [1.0.284](https://github.com/alternun-development/alternun/compare/v1.0.283-dev.1...v1.0.284) (2026-06-27)

### Bug Fixes

- **repo:** chore: release v1.0.283-dev.1
- **repo:** fix: AIRS auth 500s, collapsible referral, country/city pickers, dark mode help modal
- **repo:** chore: release v1.0.283
- **repo:** chore: release v1.0.283
- **repo:** chore: release v1.0.283

## [1.0.283](https://github.com/alternun-development/alternun/compare/v1.0.283-dev.0...v1.0.283) (2026-06-27)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.283

## [1.0.283](https://github.com/alternun-development/alternun/compare/v1.0.282...v1.0.283) (2026-06-27)

### Bug Fixes

- **repo:** fix(infra): degrade source-stage hotfix gracefully when pattern not found

### Bug Fixes

- **infra:** degrade source-stage hotfix gracefully when pattern not found ([8c9cd2e](https://github.com/alternun-development/alternun/commit/8c9cd2e020af91ff673bc635da26282716d7f2b3))

## [1.0.282](https://github.com/alternun-development/alternun/compare/v1.0.282-dev.0...v1.0.282) (2026-06-27)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.282

## [1.0.282](https://github.com/alternun-development/alternun/compare/v1.0.281...v1.0.282) (2026-06-27)

### Bug Fixes

- **repo:** fix(api): airs.service
- **repo:** docs: document v1.0.281 AIRS leaderboard, positions, and API fixes

### Bug Fixes

- **api:** airs.service ([45148be](https://github.com/alternun-development/alternun/commit/45148be37c8192f1a420f8abdb018c0f1ac5f814))

## [1.0.281](https://github.com/alternun-development/alternun/compare/v1.0.280...v1.0.281) (2026-06-27)

### Features

- **mobile:** AIRS leaderboard component with real data from `/v1/airs/leaderboard`, showing full usernames, gold/silver/bronze rank badges, and "TÚ" highlight for the current user
- **mobile:** Position card in dashboard now fetches live global, country, and city ranks from `/v1/airs/my-position`
- **mobile:** `PersonalInfoModal` now includes editable country and city fields with save wired to `PATCH /v1/airs/profile`

### Bug Fixes

- **api:** Fixed all `/v1/airs/*` routes returning 404 — NestJS `VERSION_NEUTRAL` does not match Fastify URI-versioned paths; added explicit `version: [VERSION_NEUTRAL, '1']` to both AIRS controllers
- **api:** Fixed `POST /v1/airs/onboarding`, `GET /v1/airs/me`, `GET /v1/airs/my-position` returning 500 — PostgREST `PGRST203` ambiguity between text and UUID overloads of five AIRS RPCs; dropped UUID overloads and made text overloads self-contained
- **api:** Added Better Auth `bearer()` plugin so `/auth/get-session` accepts `Authorization: Bearer <token>` headers without a JWT signing key in dev
- **api:** AIRS service now falls back from JWT verification to Better Auth session lookup when `AUTHENTIK_JWT_SIGNING_KEY` is absent, returning 401 instead of 500 on invalid tokens
- **mobile:** `PositionCard` was reading `data.global_rank` (snake_case) but the API returns camelCase (`globalRank`, `countryRank`, `cityRank`) — fixed field names so ranks display correctly
- **i18n:** Added missing `country`, `city`, `countryPlaceholder`, `cityPlaceholder` keys to `mobile.profile.modal` and `mobile.dashboard.summaryCards.position` in en/es/th catalogs

### Database Migrations

- `20260626_0001` — AIRS leaderboard RPC (`airs_get_leaderboard`) and referral bonus support
- `20260626_0002` — `country`/`city` columns on `public.users`; `airs_get_user_positions` and `airs_update_user_profile` RPCs
- `20260626_0003` — Leaderboard shows full display names (privacy masking removed; preserved in comments for future opt-in)
- `20260626_0004` — Dropped UUID overloads of 5 AIRS RPCs to resolve PostgREST `PGRST203` ambiguity; self-contained text overloads
- `20260626_0005` — Fixed `user_id` variable ambiguity in `airs_record_dashboard_visit` via `#variable_conflict use_column`
- `20260626_0006` — Backfilled Colombia / Medellín as default `country`/`city` for all existing users; set as column defaults for new signups

## [1.0.280](https://github.com/alternun-development/alternun/compare/v1.0.280-dev.0...v1.0.280) (2026-06-09)

### Bug Fixes

- **repo:** docs: sync root README for v1.0.280

## [1.0.280](https://github.com/alternun-development/alternun/compare/v1.0.279...v1.0.280) (2026-06-09)

### Bug Fixes

- **repo:** fix(mobile): AirsIntroExperience
- **repo:** fix(deps): bump shell-quote to 1.8.4

### Bug Fixes

- **deps:** bump shell-quote to 1.8.4 ([512e913](https://github.com/alternun-development/alternun/commit/512e913df973c3591eb5255775b4d55fff61b229))
- **mobile:** AirsIntroExperience ([9302a25](https://github.com/alternun-development/alternun/commit/9302a255f5e92a3ec10d68ad55733443b539db98))

## [1.0.279](https://github.com/alternun-development/alternun/compare/v1.0.279-dev.0...v1.0.279) (2026-06-09)

### Bug Fixes

- **repo:** docs: sync README for v1.0.279

## [1.0.279](https://github.com/alternun-development/alternun/compare/v1.0.278...v1.0.279) (2026-06-09)

### Bug Fixes

- **repo:** fix(mobile,i18n): PublicLandingPage, AirsIntroExperience, en, es
- **repo:** fix(mobile,i18n): normalize profile translations and clipboard handling
- **repo:** fix(api,i18n): legacy referral fallback and locale sync

### Bug Fixes

- **api,i18n:** legacy referral fallback and locale sync ([c20183a](https://github.com/alternun-development/alternun/commit/c20183ab52b772216b04504e9a92b2a36fdf3ee2))
- **mobile,i18n:** normalize profile translations and clipboard handling ([7b594ce](https://github.com/alternun-development/alternun/commit/7b594ce42939598cb857619da445c200a55bbf2f))
- **mobile,i18n:** PublicLandingPage, AirsIntroExperience, en, es ([9938e26](https://github.com/alternun-development/alternun/commit/9938e26e53cbb7ea1d81d8dd60ef164cd9364a8a))

## [1.0.278](https://github.com/alternun-development/alternun/compare/v1.0.278-dev.0...v1.0.278) (2026-06-03)

### Bug Fixes

- **repo:** docs: sync README for v1.0.278

## [1.0.278](https://github.com/alternun-development/alternun/compare/v1.0.277...v1.0.278) (2026-06-03)

### Bug Fixes

- **repo:** fix(mobile,i18n): Dashboard, PublicLandingPage, en, es
- **repo:** fix(web): widen Anek Latin globally

### Bug Fixes

- **mobile,i18n:** Dashboard, PublicLandingPage, en, es ([97c0daf](https://github.com/alternun-development/alternun/commit/97c0daf151c921b62d4493710ff6a0af5bd40780))
- **web:** widen Anek Latin globally ([93dd87f](https://github.com/alternun-development/alternun/commit/93dd87f62cec443f7ac87440d832b7aefa1e7f87))

## [1.0.277](https://github.com/alternun-development/alternun/compare/v1.0.277-dev.0...v1.0.277) (2026-05-28)

### Bug Fixes

- **repo:** chore(docs): sync root README for v1.0.277

## [1.0.277](https://github.com/alternun-development/alternun/compare/v1.0.276...v1.0.277) (2026-05-28)

### Bug Fixes

- **repo:** fix(mobile): PublicLandingPage, AirsIntroExperience, AirsIntroSettingsMenu

### Bug Fixes

- **mobile:** PublicLandingPage, AirsIntroExperience, AirsIntroSettingsMenu ([506c787](https://github.com/alternun-development/alternun/commit/506c7874cdbb23a3cae07b60761f842b0c3a410e))

## [1.0.276](https://github.com/alternun-development/alternun/compare/v1.0.276-dev.0...v1.0.276) (2026-05-26)

### Bug Fixes

- **repo:** chore(docs): sync root README for v1.0.276

## [1.0.276](https://github.com/alternun-development/alternun/compare/v1.0.275...v1.0.276) (2026-05-26)

### Bug Fixes

- **repo:** test(api,docs,repo): apply-migrations, run-migration, run-migrations-lambda, migration-runner-env.test
- **repo:** chore: release v1.0.275
- **repo:** fix(ci,release,infra): add Codecov coverage and idempotent promote
- **repo:** chore: release v1.0.275
- **repo:** fix(release): allow autogenerated promote commits

### Bug Fixes

- **ci,release,infra:** add Codecov coverage and idempotent promote ([13dd013](https://github.com/alternun-development/alternun/commit/13dd013dd8005b8339de0e79a92367ff9fd28d76))
- **release:** allow autogenerated promote commits ([40abd07](https://github.com/alternun-development/alternun/commit/40abd07673946998a5433fdc2fc5ada5c748ad47))
- **release:** allow empty promote release commit ([498cb20](https://github.com/alternun-development/alternun/commit/498cb2080efae17f7a97f71d35da675544e9f6cb))
- **scripts:** upsert release PR via REST ([ed27fd1](https://github.com/alternun-development/alternun/commit/ed27fd12846e809415c9c55bd716fc7a085e11ca))
- **versioning:** enforce root README sync ([d5ac390](https://github.com/alternun-development/alternun/commit/d5ac3906c0f0d2f6e8613742c41479d6b945f3ee))

## [1.0.275](https://github.com/alternun-development/alternun/compare/v1.0.275-dev.0...v1.0.275) (2026-05-25)

### Bug Fixes

- **repo:** chore: release v1.0.275-dev.0
- **repo:** fix(infra): preserve in-use ACM certs

## [1.0.275](https://github.com/alternun-development/alternun/compare/v1.0.274...v1.0.275) (2026-05-25)

### Bug Fixes

- **repo:** fix(infra): preserve in-use ACM certs

### Bug Fixes

- **infra:** preserve in-use ACM certs ([4db3ffb](https://github.com/alternun-development/alternun/commit/4db3ffb1ba44b1d02d16ad469bb41b569083f434))

## [1.0.274](https://github.com/alternun-development/alternun/compare/v1.0.274-dev.0...v1.0.274) (2026-05-25)

### Bug Fixes

- **repo:** chore: release v1.0.274-dev.0
- **repo:** test(infra): deploy-authentik, verify-authentik-runtime, deploy-authentik-runtime-hotfix.test, verify-authentik-runtime.test

## [1.0.274](https://github.com/alternun-development/alternun/compare/v1.0.273...v1.0.274) (2026-05-25)

### Bug Fixes

- **repo:** test(infra): deploy-authentik, verify-authentik-runtime, deploy-authentik-runtime-hotfix.test, verify-authentik-runtime.test

## [1.0.273](https://github.com/alternun-development/alternun/compare/v1.0.273-dev.0...v1.0.273) (2026-05-25)

### Bug Fixes

- **repo:** chore: release v1.0.273-dev.0
- **repo:** test(api): better-auth-dev.server, better-auth-dev-server.test

## [1.0.273](https://github.com/alternun-development/alternun/compare/v1.0.272-dev.0...v1.0.273) (2026-05-25)

### Bug Fixes

- **repo:** test(api): better-auth-dev.server, better-auth-dev-server.test

## [1.0.272](https://github.com/alternun-development/alternun/compare/v1.0.271...v1.0.272) (2026-05-25)

### Bug Fixes

- **repo:** test(api,email): referrals.service, referrals.service.test, airs-welcome, signup-welcome

## [1.0.271](https://github.com/alternun-development/alternun/compare/v1.0.271-dev.0...v1.0.271) (2026-05-25)

### Bug Fixes

- **repo:** chore: release v1.0.271-dev.0
- **repo:** chore(repo): deploy, require-pr-to-develop, test-deploy

## [1.0.271](https://github.com/alternun-development/alternun/compare/v1.0.270...v1.0.271) (2026-05-25)

### Bug Fixes

- **repo:** chore(repo): deploy, require-pr-to-develop, test-deploy

## [1.0.270](https://github.com/alternun-development/alternun/compare/v1.0.270-dev.0...v1.0.270) (2026-05-25)

### Bug Fixes

- **repo:** chore: release v1.0.270-dev.0
- **repo:** fix(api,i18n,repo): th, pnpm-lock

## [1.0.270](https://github.com/alternun-development/alternun/compare/v1.0.269...v1.0.270) (2026-05-25)

### Bug Fixes

- **repo:** fix(api,i18n,repo): th, pnpm-lock

### Bug Fixes

- **api,i18n,repo:** th, pnpm-lock ([29ae79f](https://github.com/alternun-development/alternun/commit/29ae79fd7ab7faaf3085cb7769299d310b7d3280))

## [1.0.269](https://github.com/alternun-development/alternun/compare/v1.0.269-dev.0...v1.0.269) (2026-05-25)

### Bug Fixes

- **repo:** chore: release v1.0.269-dev.0
- **repo:** test(api): better-auth-dev.server, better-auth-dev-server.test

## [1.0.269](https://github.com/alternun-development/alternun/compare/v1.0.268-dev.0...v1.0.269) (2026-05-25)

### Bug Fixes

- **repo:** test(api): better-auth-dev.server, better-auth-dev-server.test

## [1.0.268](https://github.com/alternun-development/alternun/compare/v1.0.267-dev.0...v1.0.268) (2026-05-24)

### Bug Fixes

- **repo:** test(api): lambda, lambda-response-normalization.test

## [1.0.267](https://github.com/alternun-development/alternun/compare/v1.0.266-dev.0...v1.0.267) (2026-05-24)

### Bug Fixes

- **repo:** test(auth): BetterAuthExecutionProvider, provider-contracts.test

## [1.0.266](https://github.com/alternun-development/alternun/compare/v1.0.265-dev.0...v1.0.266) (2026-05-24)

### Bug Fixes

- **repo:** test(mobile): authWebSession.test, betterAuthSessionRestore

## [1.0.265](https://github.com/alternun-development/alternun/compare/v1.0.264-dev.0...v1.0.265) (2026-05-24)

### Bug Fixes

- **repo:** test(mobile): callback, AppAuthProvider, authWebSession.test, betterAuthSessionRestore

## [1.0.264](https://github.com/alternun-development/alternun/compare/v1.0.263-dev.0...v1.0.264) (2026-05-24)

### Bug Fixes

- **repo:** test(api): better-auth-dev.server, better-auth-dev-server.test

## [1.0.263](https://github.com/alternun-development/alternun/compare/v1.0.262-dev.0...v1.0.263) (2026-05-24)

### Bug Fixes

- **repo:** test(api): better-auth-dev.config, better-auth-dev-env.test

## [1.0.262](https://github.com/alternun-development/alternun/compare/v1.0.261-dev.0...v1.0.262) (2026-05-24)

### Bug Fixes

- **repo:** test(api): better-auth-dev.config, better-auth-dev-env.test, better-auth-dev-server.test

## [1.0.261](https://github.com/alternun-development/alternun/compare/v1.0.260-dev.0...v1.0.261) (2026-05-24)

### Bug Fixes

- **repo:** test(api): better-auth-dev.server, better-auth-dev-server.test

## [1.0.260](https://github.com/alternun-development/alternun/compare/v1.0.259-dev.0...v1.0.260) (2026-05-24)

### Bug Fixes

- **repo:** test(api): better-auth-proxy, better-auth-runtime, better-auth-proxy.test, better-auth-runtime.test

## [1.0.259](https://github.com/alternun-development/alternun/compare/v1.0.258-dev.0...v1.0.259) (2026-05-24)

### Bug Fixes

- **repo:** test(api): better-auth-dev.server, better-auth-dev-server.test

## [1.0.258](https://github.com/alternun-development/alternun/compare/v1.0.257-dev.0...v1.0.258) (2026-05-24)

### Bug Fixes

- **repo:** test(mobile): AppAuthProvider, runtimeConfig.test, runtimeConfig

## [1.0.257](https://github.com/alternun-development/alternun/compare/v1.0.256-dev.0...v1.0.257) (2026-05-24)

### Bug Fixes

- **repo:** fix(repo,web): .gitignore, Sidebar, ReleaseUpdateBanner, pnpm-lock
- **repo:** fix(api,repo): better-auth-dev.server, pnpm-lock
- **repo:** test(api,repo): better-auth-dev.server, better-auth-dev-server.test, PR_TESTNET_GOOGLE_OAUTH, TESTNET_GOOGLE_OAUTH_SETUP
- **repo:** chore(video-studio): restore stashed studio workspace

### Bug Fixes

- **api,repo:** better-auth-dev.server, pnpm-lock ([034691b](https://github.com/alternun-development/alternun/commit/034691b254fd32fb0ecb547a1e51296a0e401f1f))
- **repo,web:** .gitignore, Sidebar, ReleaseUpdateBanner, pnpm-lock ([31bffb4](https://github.com/alternun-development/alternun/commit/31bffb47a0f629b6f1336e663e5f6548f599a4e5))

## [1.0.256](https://example.com/home/ed/Documents/Alternun/alternun/compare/v1.0.252-dev.0...v1.0.256) (2026-05-22)

### Bug Fixes

- **repo:** fix(admin,api,docs): app, build, release, version.development
- **repo:** fix(web): build
- **repo:** fix(web): next-env.d, \_document
- **repo:** fix(web): StaticErrorPage
- **repo:** fix(web): pages

### Bug Fixes

- **admin,api,docs:** app, build, release, version.development ([b83bede](https://example.com/home/ed/Documents/Alternun/alternun/commits/b83bede16e3780c2aba5e59cc77d3bc62eb6a16b))
- **api:** auto-enable testnet oauth proxy ([ded9c52](https://example.com/home/ed/Documents/Alternun/alternun/commits/ded9c5263f32205578a444cc694fb3d6cdb996ec))
- **auth:** keep Better Auth callback errors on the auth route ([e37c86a](https://example.com/home/ed/Documents/Alternun/alternun/commits/e37c86a6bb71b663e8772593bc291d4b9592c4f2))
- **auth:** keep testnet on direct callback flow ([627df60](https://example.com/home/ed/Documents/Alternun/alternun/commits/627df60029a88fbd094db82567d25180521560bd))
- **auth:** restore local Better Auth social flow ([9523f61](https://example.com/home/ed/Documents/Alternun/alternun/commits/9523f61f0d1475c190f6117bc8206bb9af656422))
- **auth:** scope better auth cookies to stage domains ([e72ca87](https://example.com/home/ed/Documents/Alternun/alternun/commits/e72ca8718219c771f86911af8bb22edff7ddc4cc))
- **infra:** derive testnet api URLs from api host ([576e1c9](https://example.com/home/ed/Documents/Alternun/alternun/commits/576e1c949afd57b42165e8d2d2de09b044ac24ee))
- **mobile:** enable testnet social auth ([716a256](https://example.com/home/ed/Documents/Alternun/alternun/commits/716a256e52207501b38d091daceb71810cce4eaa))
- **mobile:** keep hero wordmark consistent in dark mode ([9d11df0](https://example.com/home/ed/Documents/Alternun/alternun/commits/9d11df01a997413f9fbf8e1dcb234cb08366cf8c))
- **mobile:** remove duplicate auth import ([5ef31cf](https://example.com/home/ed/Documents/Alternun/alternun/commits/5ef31cf172a36bbb01ee4b8b289da1901f9a6afd))
- **mobile:** restore testnet social auth ([549f134](https://example.com/home/ed/Documents/Alternun/alternun/commits/549f1340918104181336482edb752383f1c5eedf))
- **mobile:** restore testnet social auth ([6b4f4f9](https://example.com/home/ed/Documents/Alternun/alternun/commits/6b4f4f9ae3fc4e9fde5372616c4c52a941baa531))
- **secrets:** remove discord public key from env example ([07f4247](https://example.com/home/ed/Documents/Alternun/alternun/commits/07f4247e1bf505fb25475ba5acdc7188cbe57a42))
- **web:** build ([419d276](https://example.com/home/ed/Documents/Alternun/alternun/commits/419d276e3a4b098a5e3e473b3e468ca1911d7963))
- **web:** next-env.d, \_document ([91b1e3b](https://example.com/home/ed/Documents/Alternun/alternun/commits/91b1e3bdb9d6c4268981eab520d329b43b46fee7))
- **web:** pages ([48285a1](https://example.com/home/ed/Documents/Alternun/alternun/commits/48285a1a7de966d170265d305d78c649a8758f59))
- **web:** StaticErrorPage ([ad17b7d](https://example.com/home/ed/Documents/Alternun/alternun/commits/ad17b7df7b5f263edfc69cebbef30aa155704c17))

## [1.0.252](https://github.com/alternun-development/alternun/compare/v1.0.251-dev.0...v1.0.252) (2026-05-07)

### Bug Fixes

- **repo:** fix(mobile): ReferralCard

### Bug Fixes

- **mobile:** ReferralCard ([c3f0784](https://github.com/alternun-development/alternun/commit/c3f078439d6d10ea5437f7db19599accccedc802))

## [1.0.251](https://github.com/alternun-development/alternun/compare/v1.0.250-dev.0...v1.0.251) (2026-05-06)

### Bug Fixes

- **repo:** test(infra): deploy-authentik, deploy-authentik-runtime-hotfix.test

## [1.0.250](https://github.com/alternun-development/alternun/compare/v1.0.249-dev.0...v1.0.250) (2026-05-06)

### Bug Fixes

- **repo:** test(api,web): referrals.service, referrals.service.test, Sidebar
- **repo:** fix(web): Sidebar
- **repo:** test(repo,api,docs): .env, referrals.service, referrals.service.test, authentication-and-session-flow

### Bug Fixes

- **web:** Sidebar ([4181dad](https://github.com/alternun-development/alternun/commit/4181dad95bde9d898dda1bfd781f68e269fba7e2))

## [1.0.249](https://github.com/alternun-development/alternun/compare/v1.0.248-dev.0...v1.0.249) (2026-05-03)

### Bug Fixes

- **repo:** fix(repo,api,mobile): .env, manifest

### Bug Fixes

- **repo,api,mobile:** .env, manifest ([316bb24](https://github.com/alternun-development/alternun/commit/316bb2441aca369f898687177b7aa85028da0769))

## [1.0.248](https://github.com/alternun-development/alternun/compare/v1.0.247-dev.0...v1.0.248) (2026-05-03)

### Bug Fixes

- **repo:** chore: release v1.0.247-dev.0
- **repo:** test(api,mobile,i18n): referral-summary.dto, referrals.service, referrals.service.test, auth

## [1.0.247](https://github.com/alternun-development/alternun/compare/v1.0.246-dev.0...v1.0.247) (2026-05-03)

### Bug Fixes

- **repo:** test(api,mobile,i18n): referral-summary.dto, referrals.service, referrals.service.test, auth

## [1.0.246](https://github.com/alternun-development/alternun/compare/v1.0.245-dev.0...v1.0.246) (2026-05-03)

### Bug Fixes

- **repo:** test(api,repo): referrals.service, referrals.service.test, sync_auth_user_to_app_users, auth-sync-bidirectional.test

## [1.0.245](https://github.com/alternun-development/alternun/compare/v1.0.244-dev.0...v1.0.245) (2026-05-03)

### Bug Fixes

- **repo:** chore: release v1.0.244-dev.0
- **repo:** test(mobile,repo): auth, AUTH_SYNC_TRIGGERS, sync_auth_user_to_app_users, 20260503_0001_auth_referral_attribution

## [1.0.244](https://github.com/alternun-development/alternun/compare/v1.0.243-dev.0...v1.0.244) (2026-05-03)

### Bug Fixes

- **repo:** test(mobile,repo): auth, AUTH_SYNC_TRIGGERS, sync_auth_user_to_app_users, 20260503_0001_auth_referral_attribution

## [1.0.243](https://github.com/alternun-development/alternun/compare/v1.0.242-dev.0...v1.0.243) (2026-05-03)

### Bug Fixes

- **repo:** test(infra): sst-deploy, sst-deploy-env-bootstrap.test, verify-authentik-runtime, verify-authentik-runtime.test

## [1.0.242](https://github.com/alternun-development/alternun/compare/v1.0.241-dev.0...v1.0.242) (2026-05-03)

### Bug Fixes

- **repo:** test(infra): \_load-infra-env, sst-deploy-env-bootstrap.test

## [1.0.241](https://github.com/alternun-development/alternun/compare/v1.0.240-dev.0...v1.0.241) (2026-05-03)

### Bug Fixes

- **repo:** test(infra): \_load-infra-env, sst-deploy-env-bootstrap.test

## [1.0.240](https://github.com/alternun-development/alternun/compare/v1.0.239-dev.0...v1.0.240) (2026-05-03)

### Bug Fixes

- **repo:** test(infra): sst-deploy, sst-log-diagnostics.test

## [1.0.239](https://github.com/alternun-development/alternun/compare/v1.0.238-dev.0...v1.0.239) (2026-05-03)

### Bug Fixes

- **repo:** test(api,mobile): referrals.service, referrals.controller.test, referrals.service.test, auth

## [1.0.238](https://github.com/alternun-development/alternun/compare/v1.0.237-dev.0...v1.0.238) (2026-05-03)

### Bug Fixes

- **repo:** test(infra): ensure-secrets, sst-deploy, sst-log-diagnostics.test

## [1.0.237](https://github.com/alternun-development/alternun/compare/v1.0.236-dev.0...v1.0.237) (2026-05-03)

### Bug Fixes

- **repo:** test(repo): sync_auth_user_to_app_users, auth-sync-bidirectional.test, 20260503_0001_auth_referral_attribution

## [1.0.236](https://github.com/alternun-development/alternun/compare/v1.0.235-dev.0...v1.0.236) (2026-05-03)

### Bug Fixes

- **repo:** fix(repo,infra,scripts): release-and-deploy-testnet, release-deployment-flow, buildspec, release

### Bug Fixes

- **repo,infra,scripts:** release-and-deploy-testnet, release-deployment-flow, buildspec, release ([40060e5](https://github.com/alternun-development/alternun/commit/40060e5ea3b335cccffc48a1d16f4b96f09850e9))

## [1.0.235](https://github.com/alternun-development/alternun/compare/v1.0.234-dev.0...v1.0.235) (2026-05-03)

### Bug Fixes

- **repo:** fix(api): referrals.service

### Bug Fixes

- **api:** referrals.service ([ac5aff2](https://github.com/alternun-development/alternun/commit/ac5aff2bd582c759cc630af1a3d22f2ea2e920dd))

## [1.0.234](https://github.com/alternun-development/alternun/compare/v1.0.233-dev.0...v1.0.234) (2026-05-03)

### Bug Fixes

- **repo:** test(api,mobile,auth): signup.service.test, AuthSignInScreen, types, AlternunAuthFacade

## [1.0.233](https://github.com/alternun-development/alternun/compare/v1.0.232-dev.0...v1.0.233) (2026-05-03)

### Bug Fixes

- **repo:** test(api,mobile,auth): auth-exchange.module, signup-request.dto, signup.service, signup.types

## [1.0.232](https://github.com/alternun-development/alternun/compare/v1.0.231-dev.0...v1.0.232) (2026-05-02)

### Bug Fixes

- **repo:** test(mobile,repo,auth): build, AuthResetPasswordScreen, ENV_SETUP.QUICK_REFERENCE, ENV_SETUP

## [1.0.231](https://github.com/alternun-development/alternun/compare/v1.0.230-dev.0...v1.0.231) (2026-04-25)

### Bug Fixes

- **repo:** fix(docs,web): build
- **repo:** fix(api): better-auth-signup.provider, better-auth-dev.server
- **repo:** test(repo,api,docs): .env, airs-welcome.email, better-auth-dev.server, create-referral.dto

### Bug Fixes

- **api:** better-auth-signup.provider, better-auth-dev.server ([b736031](https://github.com/alternun-development/alternun/commit/b73603115a3d115d30a57ddabad2805e36510785))
- **docs,web:** build ([68d781d](https://github.com/alternun-development/alternun/commit/68d781dcda0c107e45234822633a5749eaf6ce21))

## [1.0.230](https://github.com/alternun-development/alternun/compare/v1.0.229-dev.0...v1.0.230) (2026-04-25)

### Bug Fixes

- **repo:** test(repo,api,mobile): .eslintrc, airs.repository, airs.service, airs-registration-bonus.controller
- **repo:** fix(dashboard): correct welcome bonus endpoint URL and cleanup unused state
- **repo:** fix(auth): simplify to rely on Better Auth HTTP-only cookies only
- **repo:** debug(auth): add console logging for session restoration flow
- **repo:** fix(auth): simplify session token sync to prevent infinite refresh loops

### Bug Fixes

- **auth:** persist Better Auth email login sessions in localStorage ([e2df28d](https://github.com/alternun-development/alternun/commit/e2df28d178f4f03691719f3f08af725504ca4b1c))
- **auth:** simplify session token sync to prevent infinite refresh loops ([9f56833](https://github.com/alternun-development/alternun/commit/9f56833b53f8a082ef18b86c2b93aa3fb71fe417))
- **auth:** simplify to rely on Better Auth HTTP-only cookies only ([2608047](https://github.com/alternun-development/alternun/commit/2608047a38c25d224c5dfbb0ed15cd639b494276))
- **dashboard:** correct welcome bonus endpoint URL and cleanup unused state ([d6167f6](https://github.com/alternun-development/alternun/commit/d6167f631ce220424a1a791b2870b978027ccfe9))

## [1.0.229](https://github.com/alternun-development/alternun/compare/v1.0.228-dev.0...v1.0.229) (2026-04-25)

### Bug Fixes

- **repo:** test(repo,docs,mobile): release-deploy, authentication-and-session-flow, infrastructure-and-delivery, ActivityFeed

## [1.0.228](https://github.com/alternun-development/alternun/compare/v1.0.227-dev.0...v1.0.228) (2026-04-25)

### Bug Fixes

- **repo:** test(api,mobile,auth): better-auth-proxy, better-auth-runtime, auth-exchange.controller, better-auth-proxy.test
- **repo:** fix(profile): remove duplicate Animated import
- **repo:** feat(profile): add animated floating circles to profile hero background
- **repo:** fix(profile): remove unsupported boxShadow causing square artifact in tier badge

### Bug Fixes

- **profile:** remove duplicate Animated import ([9177ee4](https://github.com/alternun-development/alternun/commit/9177ee4b9fc0524694caa67711ec05185aa4290d))
- **profile:** remove unsupported boxShadow causing square artifact in tier badge ([f4d9bdb](https://github.com/alternun-development/alternun/commit/f4d9bdb14043e1db0e58b786ec4b089e37a7893b))

### Features

- **profile:** add animated floating circles to profile hero background ([dcd6aa1](https://github.com/alternun-development/alternun/commit/dcd6aa18d4955cc79d1c0da4ce646d07f6c4d9e5))

## [1.0.227](https://github.com/alternun-development/alternun/compare/v1.0.226-dev.0...v1.0.227) (2026-04-25)

### Bug Fixes

- **repo:** feat: add comprehensive database migration system with environment detection
- **repo:** fix(achievements): fix RPC function column names and SQL syntax
- **repo:** fix(achievements): handle array responses from get_user_achievements RPC
- **repo:** feat(achievements): expand to 16 total achievements
- **repo:** feat(achievements): implement user achievement tracking system

### Bug Fixes

- **achievements:** fix RPC function column names and SQL syntax ([2d0abc6](https://github.com/alternun-development/alternun/commit/2d0abc6e7dc9b3ba8e6d4cf1d1660ef186f99b8e))
- **achievements:** handle array responses from get_user_achievements RPC ([e23373e](https://github.com/alternun-development/alternun/commit/e23373eeb587e1a980c1cd3ff692a0c0ce89b97e))
- **airs,mobile:** award registration bonus after email verification ([b71450e](https://github.com/alternun-development/alternun/commit/b71450e561fdf4729c6f41b13beda739c6c89475))
- **mobile:** add textAlign center to confirmation button text ([37956c1](https://github.com/alternun-development/alternun/commit/37956c17af81f40259178394f7eb77f6c3b27726))
- **mobile:** improve email confirmation button styling and interactions ([b2a0f5b](https://github.com/alternun-development/alternun/commit/b2a0f5ba3283c86b419781899283881dccad44f3))
- **mobile:** refresh user state after email verification ([b36b25b](https://github.com/alternun-development/alternun/commit/b36b25b9827e9058416f9c8082b9dbb66822c29d))
- **mobile:** refresh user state periodically for email verification ([cb6388c](https://github.com/alternun-development/alternun/commit/cb6388cbb28afed13db89009143262a8738f26a2))
- **mobile:** remove redundant error box from email confirmation section only ([771727f](https://github.com/alternun-development/alternun/commit/771727ffe1ea33156bc3e4e42083cc357023d7c0))
- **mobile:** use width 100% for confirmation button to ensure full stretch ([7f6eadb](https://github.com/alternun-development/alternun/commit/7f6eadb1b475622ecdc0b61e7af6f9453ee96018))
- **mobile:** wrap button content in View for proper style application ([d78aa75](https://github.com/alternun-development/alternun/commit/d78aa75e1e4ca5d243f1f0d32ca74c588ea3ff62))

### Features

- **achievements:** expand to 16 total achievements ([6b42e82](https://github.com/alternun-development/alternun/commit/6b42e820cd661b65f373df82ce761430e3384c30))
- **achievements:** implement user achievement tracking system ([7316fd5](https://github.com/alternun-development/alternun/commit/7316fd5c4f69fc75775f0f547f66cfcd119caa3b))
- add comprehensive database migration system with environment detection ([43a2847](https://github.com/alternun-development/alternun/commit/43a2847c04e4e21edf6f328478f3893a7d2f0316))

## [1.0.226](https://github.com/alternun-development/alternun/compare/v1.0.225-dev.0...v1.0.226) (2026-04-25)

### Bug Fixes

- **repo:** test(api,mobile,auth): auth-exchange.controller, signup.service, social-signin.service, signup-welcome.email

## [1.0.225](https://github.com/alternun-development/alternun/compare/v1.0.224...v1.0.225) (2026-04-25)

### Bug Fixes

- **repo:** fix(mobile,auth): AirsIntroExperience, AlternunMobileAuthClient
- **repo:** updates
- **repo:** updates

### Bug Fixes

- **mobile,auth:** AirsIntroExperience, AlternunMobileAuthClient ([8060d38](https://github.com/alternun-development/alternun/commit/8060d382f63957e1f7978c5cfe079ce490fa02ef))

## [1.0.224](https://github.com/alternun-development/alternun/compare/v1.0.224-dev.0...v1.0.224) (2026-04-24)

### Bug Fixes

- **repo:** chore: sync release and env promotion

## [1.0.224](https://github.com/alternun-development/alternun/compare/v1.0.223-dev.1...v1.0.224) (2026-04-24)

### Bug Fixes

- **repo:** test(mobile,i18n): build, ReleaseUpdateBanner.native, ReleaseUpdateBanner.web, mobile-env.test

## [1.0.223](https://github.com/alternun-development/alternun/compare/v1.0.223-dev.0...v1.0.223) (2026-04-24)

### Bug Fixes

- **repo:** chore: release v1.0.223-dev.0
- **repo:** fix(mobile,i18n,ui): HeroStats, HeroPanel
- **repo:** feat(ui): Update HeroPanel greeting text color to gold (#CBAB35)
- **repo:** fix(ui): Remove all background colors from HeroPanel for full image transparency
- **repo:** fix(mobile): Adjust dashboard background image to fit better on all screen sizes

## [1.0.223](https://github.com/alternun-development/alternun/compare/v1.0.222-dev.0...v1.0.223) (2026-04-24)

### Bug Fixes

- **repo:** fix(mobile,i18n,ui): HeroStats, HeroPanel
- **repo:** feat(ui): Update HeroPanel greeting text color to gold (#CBAB35)
- **repo:** fix(ui): Remove all background colors from HeroPanel for full image transparency
- **repo:** fix(mobile): Adjust dashboard background image to fit better on all screen sizes
- **repo:** fix(ui): Make HeroPanel background fully transparent with text shadows for contrast

### Bug Fixes

- **mobile,i18n,ui:** HeroStats, HeroPanel ([97d795a](https://github.com/alternun-development/alternun/commit/97d795aad66b0e51f79819508dd4340159dca7e8))
- **mobile:** Adjust dashboard background image to fit better on all screen sizes ([bbc0b14](https://github.com/alternun-development/alternun/commit/bbc0b1455c5b62e9d161efaa45dd4caa74b3b5b5))
- **ui,mobile:** Improve background image visibility with minimal opacity ([4a3664b](https://github.com/alternun-development/alternun/commit/4a3664b0b683c702e03489c569bcc0f1a97ca127))
- **ui:** Make HeroPanel background fully transparent with text shadows for contrast ([167d2f1](https://github.com/alternun-development/alternun/commit/167d2f161a433c5156ab02d2965a8cd1da474b05))
- **ui:** Remove all background colors from HeroPanel for full image transparency ([8a54993](https://github.com/alternun-development/alternun/commit/8a549937b86e0c6b59350f8024f62bbd73f74832))

### Features

- **mobile:** Add dashboard background image to HeroStats card ([a3a73a9](https://github.com/alternun-development/alternun/commit/a3a73a93c9cf603b8b70b3f30ce18d535819ce61))
- **ui:** Update HeroPanel greeting text color to gold (#CBAB35) ([8959bf9](https://github.com/alternun-development/alternun/commit/8959bf9f13791f12a04df65830f32e9e2d81d0d4)), closes [#CBAB35](https://github.com/alternun-development/alternun/issues/CBAB35) [#CBAB35](https://github.com/alternun-development/alternun/issues/CBAB35)

## [1.0.222](https://github.com/alternun-development/alternun/compare/v1.0.221-dev.0...v1.0.222) (2026-04-24)

### Bug Fixes

- **repo:** fix(ui): Improve version pill text contrast by using accent color
- **repo:** fix(mobile): Fix logo selection across dashboard, footer, and notifications
- **repo:** fix(auth): Hide private views and menu items from unauthenticated users

### Bug Fixes

- **auth:** Hide private views and menu items from unauthenticated users ([0c02e6a](https://github.com/alternun-development/alternun/commit/0c02e6a8f1b96e2c314456ff26637a1ab14321af))
- **mobile:** Fix logo selection across dashboard, footer, and notifications ([6b2d53d](https://github.com/alternun-development/alternun/commit/6b2d53dc6c273779ae7230319c5abb7a4a80ed44))
- **ui:** Improve version pill text contrast by using accent color ([186e5aa](https://github.com/alternun-development/alternun/commit/186e5aa74c1169a1217b5bcef613b40c08b718f4))

## [1.0.221](https://github.com/alternun-development/alternun/compare/v1.0.220-dev.0...v1.0.221) (2026-04-24)

### Bug Fixes

- **repo:** fix(auth): Correct logo selection for light and dark modes

### Bug Fixes

- **auth:** Correct logo selection for light and dark modes ([ff54c74](https://github.com/alternun-development/alternun/commit/ff54c746b0e60d20645b55b4b123b5c7071e8884))

## [1.0.220](https://github.com/alternun-development/alternun/compare/v1.0.219-dev.0...v1.0.220) (2026-04-24)

### Bug Fixes

- **repo:** fix(mobile,i18n,ui): Update footer tagline and styling

### Bug Fixes

- **mobile,i18n,ui:** Update footer tagline and styling ([e6426fa](https://github.com/alternun-development/alternun/commit/e6426fa322047e6c9cd47a19dd14c6e0a31d4e83))

## [1.0.219](https://github.com/alternun-development/alternun/compare/v1.0.218-dev.0...v1.0.219) (2026-04-24)

### Bug Fixes

- **repo:** fix(mobile,i18n): AirsIntroExperience

### Bug Fixes

- **mobile,i18n:** AirsIntroExperience ([59024e5](https://github.com/alternun-development/alternun/commit/59024e591cf250eedad1e87952bea9bc79105e40))

## [1.0.218](https://github.com/alternun-development/alternun/compare/v1.0.217-dev.1...v1.0.218) (2026-04-24)

### Bug Fixes

- **repo:** fix(mobile,i18n): DynamicMessageBar, PublicLandingPage, AirsIntroExperience, en

### Bug Fixes

- **mobile,i18n:** DynamicMessageBar, PublicLandingPage, AirsIntroExperience, en ([514bb9d](https://github.com/alternun-development/alternun/commit/514bb9d62ad1c7739ac56dfb88bca7369a9781f2))

## [1.0.217](https://github.com/alternun-development/alternun/compare/v1.0.217-dev.0...v1.0.217) (2026-04-24)

### Bug Fixes

- **repo:** fix(auth,mobile): stabilize oauth and airs ui

### Bug Fixes

- **auth,mobile:** stabilize oauth and airs ui ([b04ac5a](https://github.com/alternun-development/alternun/commit/b04ac5a108882f6ebc60ea80342cccb28ce7f4ac))

## [1.0.217](https://github.com/alternun-development/alternun/compare/v1.0.216...v1.0.217) (2026-04-24)

### Bug Fixes

- **repo:** fix(api,auth,repo): apply-migrations, runtimeSignIn, 20260422_0012_create_referrals_table, 20260422_0013_auth_users_source_of_truth
- **repo:** fix(mobile): keep dropdown open after language/theme change
- **repo:** fix(mobile): fix auth modal dropdown closing on click
- **repo:** fix(mobile): use SVGs from main assets folder for membership logos
- **repo:** fix(mobile): update membership logos to use realistic SVGs and SVG folder logos

### Bug Fixes

- **api,auth,repo:** apply-migrations, runtimeSignIn, 20260422_0012_create_referrals_table, 20260422_0013_auth_users_source_of_truth ([7521e35](https://github.com/alternun-development/alternun/commit/7521e35fba5a3dfff65c9e635a309aae9b80cfa3))
- **mobile:** add missing Pressable import in AuthSignInScreen ([fe6f59e](https://github.com/alternun-development/alternun/commit/fe6f59e43478fa79e0d511bcd24adb054bb7b091))
- **mobile:** fix auth modal dropdown closing on click ([3ff3c66](https://github.com/alternun-development/alternun/commit/3ff3c66a34be12f7734edf0c416499ddbca46403))
- **mobile:** fix settings dropdown menu not responding to clicks ([f3184ad](https://github.com/alternun-development/alternun/commit/f3184adf4204642d1032ec412f82ff2efd125840))
- **mobile:** fix settings dropdown not changing language/theme on click ([cacb2e3](https://github.com/alternun-development/alternun/commit/cacb2e32af7ee65de8c50da4e929d877996e502f))
- **mobile:** keep dropdown open after language/theme change ([43c9210](https://github.com/alternun-development/alternun/commit/43c9210245d51bd0573836b127b95d063506e53a))
- **mobile:** revert membership logos to use PNG assets instead of SVGs ([e3be2f2](https://github.com/alternun-development/alternun/commit/e3be2f20a3914b3c985e9e0dc4b6bd92a8905ce7))
- **mobile:** update membership logos to use realistic SVGs and SVG folder logos ([fdc51a2](https://github.com/alternun-development/alternun/commit/fdc51a25b9cb37a02eeae156e01386d445aff883))
- **mobile:** use SVGs from main assets folder for membership logos ([c889787](https://github.com/alternun-development/alternun/commit/c889787f11da33fb1ab6f63c85b64d3afef1162f))

### Features

- **mobile:** add dynamic message bar with interactive pause/resume ([c761851](https://github.com/alternun-development/alternun/commit/c761851bb7f76c2be4ba5cbb1519b21c08f6ca1c)), closes [#333480](https://github.com/alternun-development/alternun/issues/333480)
- **mobile:** increase logo and navigation bar size on desktop view ([9557cbc](https://github.com/alternun-development/alternun/commit/9557cbcd1cfd215073a2bce4273f508c8233030f))
- **mobile:** migrate logo assets from PNG to SVG format ([700fa8f](https://github.com/alternun-development/alternun/commit/700fa8f8e9bed83fdbbbd9abf93b2f0ec27b6e4c))

## [1.0.216](https://github.com/alternun-development/alternun/compare/v1.0.216-dev.0...v1.0.216) (2026-04-23)

### Bug Fixes

- **repo:** fix: polish mobile auth and landing transitions
- **repo:** chore(mobile): restore dropped SVG assets
- **repo:** docs(claude): add git safety rules for uncommitted changes
- **repo:** fix(mobile): improve navbar dropdown positioning and closing behavior on desktop

### Bug Fixes

- **mobile:** improve navbar dropdown positioning and closing behavior on desktop ([4df0ff4](https://github.com/alternun-development/alternun/commit/4df0ff4ce3971639ade46edf72900ffc11f4226c))
- polish mobile auth and landing transitions ([0791756](https://github.com/alternun-development/alternun/commit/07917567c9fca647cd7dd0f981c94ecee7a1b661))

## [1.0.216](https://github.com/alternun-development/alternun/compare/v1.0.215...v1.0.216) (2026-04-23)

### Bug Fixes

- **repo:** test(infra): resolve-ssm-env, resolve-ssm-env-cache.test
- **repo:** feat(mobile): enhance referral navbar with theme toggle, language selector, and avatar dropdown

### Features

- **mobile:** enhance referral navbar with theme toggle, language selector, and avatar dropdown ([e3d7f05](https://github.com/alternun-development/alternun/commit/e3d7f051e34eaad40b196f2afeec0de59bb29059))

## [1.0.215](https://github.com/alternun-development/alternun/compare/v1.0.215-dev.0...v1.0.215) (2026-04-23)

### Bug Fixes

- **repo:** chore: release v1.0.215-dev.0
- **repo:** test(infra): resolve-ssm-env, resolve-ssm-env-cache.test

## [1.0.215](https://github.com/alternun-development/alternun/compare/v1.0.214...v1.0.215) (2026-04-23)

### Bug Fixes

- **repo:** test(infra): resolve-ssm-env, resolve-ssm-env-cache.test

## [1.0.214](https://github.com/alternun-development/alternun/compare/v1.0.214-dev.0...v1.0.214) (2026-04-23)

### Bug Fixes

- **repo:** chore: release v1.0.214-dev.0
- **repo:** test(auth): AlternunAuthFacade, BetterAuthExecutionProvider, facade.test, provider-contracts.test
- **repo:** fix: restore SSM Supabase precedence in CI

## [1.0.214](https://github.com/alternun-development/alternun/compare/v1.0.213...v1.0.214) (2026-04-23)

### Bug Fixes

- **repo:** test(auth): AlternunAuthFacade, BetterAuthExecutionProvider, facade.test, provider-contracts.test
- **repo:** fix: restore SSM Supabase precedence in CI

### Bug Fixes

- restore SSM Supabase precedence in CI ([a040746](https://github.com/alternun-development/alternun/commit/a040746e8eaeee0e4a58e3f61d16c451c9c94ef9))

## [1.0.213](https://github.com/alternun-development/alternun/compare/v1.0.213-dev.0...v1.0.213) (2026-04-23)

### Bug Fixes

- **repo:** chore: release v1.0.213-dev.0
- **repo:** test(infra): resolve-ssm-env, buildspec-auth-env.test

## [1.0.213](https://github.com/alternun-development/alternun/compare/v1.0.212...v1.0.213) (2026-04-23)

### Bug Fixes

- **repo:** test(infra): resolve-ssm-env, buildspec-auth-env.test

## [1.0.212](https://github.com/alternun-development/alternun/compare/v1.0.212-dev.0...v1.0.212) (2026-04-23)

### Bug Fixes

- **repo:** chore: release v1.0.212-dev.0
- **repo:** test(api,mobile): better-auth-proxy, better-auth-runtime, auth-exchange.controller, auth-exchange.module

## [1.0.212](https://github.com/alternun-development/alternun/compare/v1.0.211-dev.0...v1.0.212) (2026-04-23)

### Bug Fixes

- **repo:** test(api,mobile): better-auth-proxy, better-auth-runtime, auth-exchange.controller, auth-exchange.module

## [1.0.211](https://github.com/alternun-development/alternun/compare/v1.0.210-dev.0...v1.0.211) (2026-04-23)

### Bug Fixes

- **repo:** test(api,infra): lambda, lambda-response-normalization.test, resolve-ssm-env, resolve-ssm-env-cache.test

## [1.0.210](https://github.com/alternun-development/alternun/compare/v1.0.209-dev.0...v1.0.210) (2026-04-23)

### Bug Fixes

- **repo:** test(infra): buildspec, bootstrap-ssm-parameters, bootstrap-ssm-parameters.test, buildspec-auth-env.test

## [1.0.209](https://github.com/alternun-development/alternun/compare/v1.0.208-dev.0...v1.0.209) (2026-04-23)

### Bug Fixes

- **repo:** fix(infra): resolve-ssm-env

### Bug Fixes

- **infra:** resolve-ssm-env ([d122eec](https://github.com/alternun-development/alternun/commit/d122eec2885cb2103316e82a86add802427f5f59))

## [1.0.208](https://github.com/alternun-development/alternun/compare/v1.0.207-dev.0...v1.0.208) (2026-04-23)

### Bug Fixes

- **repo:** test(infra): resolve-ssm-env, buildspec-auth-env.test

## [1.0.207](https://github.com/alternun-development/alternun/compare/v1.0.206-dev.0...v1.0.207) (2026-04-23)

### Bug Fixes

- **repo:** test(infra): api, dashboard, dashboard-pipeline-better-auth-env.test, backend-pipeline-supabase-env.test

## [1.0.206](https://github.com/alternun-development/alternun/compare/v1.0.205-dev.0...v1.0.206) (2026-04-23)

### Bug Fixes

- **repo:** test(api,mobile): signup.utils, signup.service.test, callback, referral

## [1.0.205](https://github.com/alternun-development/alternun/compare/v1.0.204-dev.0...v1.0.205) (2026-04-23)

### Bug Fixes

- **repo:** chore: clean up auth and build changes
- **repo:** fix(auth): keep signup on Supabase

### Bug Fixes

- **auth:** keep signup on Supabase ([63cfdd8](https://github.com/alternun-development/alternun/commit/63cfdd80dca3a66e32fb68593a2022a95fbcff22))

## [1.0.204](https://github.com/alternun-development/alternun/compare/v1.0.203...v1.0.204) (2026-04-23)

### Bug Fixes

- **repo:** fix(auth): infer better-auth signup on testnet
- **repo:** fix(versioning): accept promoted mobile app version mirror

### Bug Fixes

- **auth:** infer better-auth signup on testnet ([f7cd4d1](https://github.com/alternun-development/alternun/commit/f7cd4d1ce3eb53db2dc133076b412de60cd33ccb))
- **versioning:** accept promoted mobile app version mirror ([7213270](https://github.com/alternun-development/alternun/commit/7213270a03d8d2774fb4d0f77758e0cf72a5f1ff))

## [1.0.203](https://github.com/alternun-development/alternun/compare/v1.0.203-dev.0...v1.0.203) (2026-04-23)

### Bug Fixes

- **repo:** chore: release v1.0.203-dev.0
- **repo:** test(mobile): build, build-script.test
- **repo:** test(mobile): build, build-script.test
- **repo:** test(api,mobile,infra): connection, database-connection.test, build, AuthSignInScreen

## [1.0.203](https://github.com/alternun-development/alternun/compare/v1.0.202-dev.0...v1.0.203) (2026-04-23)

### Bug Fixes

- **repo:** test(mobile): build, build-script.test
- **repo:** test(mobile): build, build-script.test
- **repo:** test(api,mobile,infra): connection, database-connection.test, build, AuthSignInScreen

## [1.0.202](https://github.com/alternun-development/alternun/compare/v1.0.201-dev.1...v1.0.202) (2026-04-23)

### Bug Fixes

- **repo:** test(infra,scripts): bootstrap-backend-database-secret.test, apply-migrations-local, bootstrap-backend-database-secret, deploy-with-migrations
- **repo:** chore(version): restore mobile app version for develop
- **repo:** chore: release v1.0.201
- **repo:** chore: release v1.0.201
- **repo:** chore(infra): standardize backend db secrets

## [1.0.201](https://github.com/alternun-development/alternun/compare/v1.0.201-dev.1...v1.0.201) (2026-04-23)

### Bug Fixes

- **repo:** chore: release v1.0.201
- **repo:** chore(infra): standardize backend db secrets

## [1.0.201](https://github.com/alternun-development/alternun/compare/v1.0.201-dev.1...v1.0.201) (2026-04-23)

### Bug Fixes

- **repo:** chore(infra): standardize backend db secrets

## [1.0.201](https://github.com/alternun-development/alternun/compare/v1.0.201-dev.0...v1.0.201) (2026-04-23)

### Bug Fixes

- **repo:** fix(mobile,root): env resolver and discord placeholder

### Bug Fixes

- **mobile,root:** env resolver and discord placeholder ([7210c22](https://github.com/alternun-development/alternun/commit/7210c227046956fab2b44f8af5a4e5035f7c0304))

## [1.0.201](https://github.com/alternun-development/alternun/compare/v1.0.200-dev.0...v1.0.201) (2026-04-23)

### Bug Fixes

- **repo:** fix(api): referral-response.dto, referrals.controller
- **repo:** test(repo,admin,api): .env, apply-migrations
- **repo:** feat(mobile): add THREE.js aurora animation and navbar to referral page
- **repo:** feat(mobile): make referral page publicly accessible as standalone page

### Bug Fixes

- **api:** referral-response.dto, referrals.controller ([22bc20a](https://github.com/alternun-development/alternun/commit/22bc20a9ef229fb27b3d1e3961bc9060de0e3157))

### Features

- **mobile:** add THREE.js aurora animation and navbar to referral page ([86e5706](https://github.com/alternun-development/alternun/commit/86e5706a86a1eaa918de1ae882c01d1bf0f54a57))
- **mobile:** make referral page publicly accessible as standalone page ([f4c5989](https://github.com/alternun-development/alternun/commit/f4c59897abef0ee00ef1487f3ebde7d148d9a209))

## [1.0.200](https://github.com/alternun-development/alternun/compare/v1.0.199-dev.0...v1.0.200) (2026-04-22)

### Bug Fixes

- **repo:** test(api,repo,infra): apply-migrations, run-migration, run-migrations-lambda, connection

## [1.0.199](https://github.com/alternun-development/alternun/compare/v1.0.198-dev.0...v1.0.199) (2026-04-22)

### Bug Fixes

- **repo:** test(api,auth): signup.service, better-auth-dev.server, better-auth-dev-server.test, signup.service.test
- **repo:** feat(release): auto-create promotion PR
- **repo:** chore: release v1.0.198

### Features

- **release:** auto-create promotion PR ([6cbbf43](https://github.com/alternun-development/alternun/commit/6cbbf431ce96e88532a90bbdbce3d33d86735069))

## [1.0.198](https://github.com/alternun-development/alternun/compare/v1.0.198-dev.0...v1.0.198) (2026-04-22)

### Bug Fixes

- **repo:** chore: release v1.0.198-dev.0
- **repo:** test(infra): dashboard, infra.config, backend-api, backend-api-airs-env.test

## [1.0.198](https://github.com/alternun-development/alternun/compare/v1.0.197-dev.0...v1.0.198) (2026-04-22)

### Bug Fixes

- **repo:** test(infra): dashboard, infra.config, backend-api, backend-api-airs-env.test

## [1.0.197](https://github.com/alternun-development/alternun/compare/v1.0.196...v1.0.197) (2026-04-22)

### Bug Fixes

- **repo:** test(mobile,infra): AuthSignInScreen, authSignInFlow.test, authSignInFlow, dashboard
- **repo:** chore(version): sync develop app version
- **repo:** fix(mobile): relax Expo bundle version check

### Bug Fixes

- **mobile:** relax Expo bundle version check ([65fc490](https://github.com/alternun-development/alternun/commit/65fc4908a9df2c079e23602ef70f0cc9584f4425))

## [1.0.196](https://github.com/alternun-development/alternun/compare/v1.0.196-dev.0...v1.0.196) (2026-04-22)

### Bug Fixes

- **repo:** fix(mobile): relax legacy export validation
- **repo:** fix(release): promote develop and update open pr

### Bug Fixes

- **mobile:** relax legacy export validation ([9b8ccea](https://github.com/alternun-development/alternun/commit/9b8cceaa38076e8855a44dffb4bf3edd4607f4d2))
- **release:** promote develop and update open pr ([e59f695](https://github.com/alternun-development/alternun/commit/e59f695f40b4abd6476baa550dedde639647011d))

## [1.0.196](https://github.com/alternun-development/alternun/compare/v1.0.195...v1.0.196) (2026-04-22)

### Bug Fixes

- **repo:** fix(repo): keep master sync manual on develop
- **repo:** fix(mobile): validate bundle version from package manifest
- **repo:** docs: clarify release promotion starts from develop
- **repo:** refactor: keep release promotion on develop
- **repo:** chore: release v1.0.195

### Bug Fixes

- **api:** bootstrap legacy migrations on dev ([4376520](https://github.com/alternun-development/alternun/commit/43765200efc48d0893741e49b0e313b087996c2b))
- **mobile:** validate bundle version from package manifest ([13ab2e6](https://github.com/alternun-development/alternun/commit/13ab2e6b0f328c675f9d69d900955b07041bfcd3))
- **repo:** keep master sync manual on develop ([c1a54ac](https://github.com/alternun-development/alternun/commit/c1a54ac8cf2c7dbc6d08c7c6c5fb34fa233b36c9))

## [1.0.195](https://github.com/alternun-development/alternun/compare/v1.0.194-dev.0...v1.0.195) (2026-04-22)

### Bug Fixes

- **repo:** fix(infra): build expo site before sync
- **repo:** updates
- **repo:** fix(infra): rebuild backend api before deploy

### Bug Fixes

- **infra:** build expo site before sync ([0a0d694](https://github.com/alternun-development/alternun/commit/0a0d6941bd776988f0c311429a98c3e0449df767))
- **infra:** rebuild backend api before deploy ([5733668](https://github.com/alternun-development/alternun/commit/5733668ccee45d907b89161ac7a8f3614e043423))

## [1.0.194](https://github.com/alternun-development/alternun/compare/v1.0.193-dev.0...v1.0.194) (2026-04-21)

### Bug Fixes

- **repo:** test(infra): README, buildspec, expo, infra.config

## [1.0.193](https://github.com/alternun-development/alternun/compare/v1.0.192-dev.1...v1.0.193) (2026-04-21)

### Bug Fixes

- **repo:** chore: release v1.0.192-dev.1
- **repo:** chore(scripts): release

## [1.0.192](https://github.com/alternun-development/alternun/compare/v1.0.192-dev.0...v1.0.192) (2026-04-21)

### Bug Fixes

- **repo:** chore(scripts): release

## [1.0.192](https://github.com/alternun-development/alternun/compare/v1.0.191-dev.3...v1.0.192) (2026-04-21)

### Bug Fixes

- **repo:** fix(mobile,auth): build
- **repo:** fix(mobile,auth): build
- **repo:** fix(mobile,auth): build
- **repo:** chore(repo,mobile): CHANGELOG, app, version.development
- **repo:** chore(scripts): version-files, version-files.test

### Bug Fixes

- **infra:** rename expo site bucket ([cd0d731](https://github.com/alternun-development/alternun/commit/cd0d73148caeb2875c53452c76553df7b6dfb105))
- **mobile,auth:** build ([26492f6](https://github.com/alternun-development/alternun/commit/26492f687570870e750a425f7f7383da9d80c1f0))
- **mobile,auth:** build ([1c1bb8c](https://github.com/alternun-development/alternun/commit/1c1bb8c5d636658606df7245bdf18e75d1ebfb72))
- **mobile,auth:** build ([9f1057c](https://github.com/alternun-development/alternun/commit/9f1057c90740b1079c5b9362b1ce72a8f5ad760d))
- **mobile:** verify exported web bundle version ([50a5865](https://github.com/alternun-development/alternun/commit/50a586510447a5e785818547875594628256918f))
- **secret-scan:** remove bootstrap key fragments ([a013a39](https://github.com/alternun-development/alternun/commit/a013a3918fe36bdf5b446a9af7bc6168f5f5c328))
- **secret-scan:** remove publishable key literals ([3699e22](https://github.com/alternun-development/alternun/commit/3699e224e9ea1e0b455408aa787aaafe987312a7))

### Features

- **release:** add promotion wrapper ([b36ed34](https://github.com/alternun-development/alternun/commit/b36ed3437cd4aabd2d7bb83b41263f9dcb17b2af))

## [1.0.191](https://github.com/alternun-development/alternun/compare/v1.0.191-dev.3...v1.0.191) (2026-04-21)

### Bug Fixes

- **repo:** chore(scripts): version-files, version-files.test
- **repo:** fix(mobile): verify exported web bundle version
- **repo:** fix(secret-scan): remove bootstrap key fragments
- **repo:** fix(secret-scan): remove publishable key literals
- **repo:** feat(release): add promotion wrapper

### Bug Fixes

- **infra:** rename expo site bucket ([cd0d731](https://github.com/alternun-development/alternun/commit/cd0d73148caeb2875c53452c76553df7b6dfb105))
- **mobile:** verify exported web bundle version ([50a5865](https://github.com/alternun-development/alternun/commit/50a586510447a5e785818547875594628256918f))
- **secret-scan:** remove bootstrap key fragments ([a013a39](https://github.com/alternun-development/alternun/commit/a013a3918fe36bdf5b446a9af7bc6168f5f5c328))
- **secret-scan:** remove publishable key literals ([3699e22](https://github.com/alternun-development/alternun/commit/3699e224e9ea1e0b455408aa787aaafe987312a7))

### Features

- **release:** add promotion wrapper ([b36ed34](https://github.com/alternun-development/alternun/commit/b36ed3437cd4aabd2d7bb83b41263f9dcb17b2af))

## [1.0.191](https://github.com/alternun-development/alternun/compare/v1.0.191-dev.2...v1.0.191) (2026-04-21)

### Bug Fixes

- **repo:** test(infra): INFRASTRUCTURE_SPECS, expo, infra.config, sync-public-assets

## [1.0.191](https://github.com/alternun-development/alternun/compare/v1.0.191-dev.1...v1.0.191) (2026-04-21)

### Bug Fixes

- **repo:** test(mobile): Footer.shared, Footer.shared.test, ReleaseUpdateBanner.native, ReleaseUpdateBanner.web

## [1.0.191](https://github.com/alternun-development/alternun/compare/v1.0.191-dev.0...v1.0.191) (2026-04-21)

### Bug Fixes

- **repo:** test(mobile): build, ENV_SETUP, build-script.test

## [1.0.191](https://github.com/alternun-development/alternun/compare/v1.0.190-dev.0...v1.0.191) (2026-04-21)

### Bug Fixes

- **repo:** test(mobile,infra): Footer.shared, Footer.shared.test, README, core

## [1.0.190](https://github.com/alternun-development/alternun/compare/v1.0.188-dev.0...v1.0.190) (2026-04-21)

### Bug Fixes

- **repo:** test(repo,admin,api): CHANGELOG, app, README, postdeploy-cloudfront-invalidate
- **repo:** test(infra): README, infra.config, pipeline-auth-execution-provider.test

## [1.0.189](https://github.com/alternun-development/alternun/compare/v1.0.188-dev.0...v1.0.189) (2026-04-21)

### Bug Fixes

- **repo:** test(infra): README, infra.config, pipeline-auth-execution-provider.test

## [1.0.188](https://github.com/alternun-development/alternun/compare/v1.0.187-dev.1...v1.0.188) (2026-04-21)

### Bug Fixes

- **repo:** test(infra): buildspec, static-site-invalidation.test

## [1.0.187](https://github.com/alternun-development/alternun/compare/v1.0.187-dev.0...v1.0.187) (2026-04-21)

### Bug Fixes

- **repo:** fix(mobile,auth): PublicLandingPage
- **repo:** fix(release): stage root package version

### Bug Fixes

- **mobile,auth:** PublicLandingPage ([53e4280](https://github.com/alternun-development/alternun/commit/53e42804865be5a52be2045a848baf5febc7763e))
- **release:** stage root package version ([ace90ab](https://github.com/alternun-development/alternun/commit/ace90ab77752dcd18bd14b7a88a0976558e6a26a))

## [1.0.187](https://github.com/alternun-development/alternun/compare/v1.0.186-dev.0...v1.0.187) (2026-04-21)

### Bug Fixes

- **repo:** fix(mobile,auth): build
- **repo:** fix(mobile,repo): build

### Bug Fixes

- **mobile,auth:** build ([0549e41](https://github.com/alternun-development/alternun/commit/0549e414e55571b895b518968f20ec274d214d5b))
- **mobile,repo:** build ([ff753b6](https://github.com/alternun-development/alternun/commit/ff753b6110e47db6334dbdcfbca253dc688acd0d))

## [1.0.186](https://github.com/alternun-development/alternun/compare/v1.0.185-dev.1...v1.0.186) (2026-04-21)

### Bug Fixes

- **repo:** chore(scripts): release, version-files, version-files.test
- **repo:** fix(release): stage develop production manifest

### Bug Fixes

- **release:** stage develop production manifest ([98ff166](https://github.com/alternun-development/alternun/commit/98ff166af5438b01249ded7664b9952758b102f3))

## [1.0.185](https://github.com/alternun-development/alternun/compare/v1.0.185-dev.0...v1.0.185) (2026-04-21)

### Bug Fixes

- **repo:** chore(repo): version.production

## [1.0.185](https://github.com/alternun-development/alternun/compare/v1.0.184-dev.0...v1.0.185) (2026-04-21)

### Bug Fixes

- **repo:** fix(admin,api,docs): pnpm-lock, release, version-sync, version-files

### Bug Fixes

- **admin,api,docs:** pnpm-lock, release, version-sync, version-files ([601b89e](https://github.com/alternun-development/alternun/commit/601b89e63119bd96cb6c6ccb69604beb836a8b4c))

## [1.0.183](https://github.com/alternun-development/alternun/compare/v1.0.183-dev.2...v1.0.183) (2026-04-21)

### Bug Fixes

- **repo:** chore(repo,mobile,scripts): CHANGELOG, app, release-and-deploy-testnet, release-deployment-flow
- **repo:** chore(repo): version.production

## [1.0.183](https://github.com/alternun-development/alternun/compare/v1.0.183-dev.2...v1.0.183) (2026-04-21)

## [1.0.183](https://github.com/alternun-development/alternun/compare/v1.0.183-dev.2...v1.0.183) (2026-04-21)

## [1.0.183](https://github.com/alternun-development/alternun/compare/v1.0.183-dev.1...v1.0.183) (2026-04-21)

### Bug Fixes

- **repo:** chore(repo,scripts): README, release-and-deploy-testnet, release-deployment-flow, version-sync

## [1.0.183](https://github.com/alternun-development/alternun/compare/v1.0.183-dev.1...v1.0.183) (2026-04-21)

## [1.0.183](https://github.com/alternun-development/alternun/compare/v1.0.180...v1.0.183) (2026-04-21)

### Bug Fixes

- **repo:** chore(repo,admin,api): CHANGELOG
- **repo:** chore: release v1.0.181
- **repo:** test(api,infra): connection, better-auth-dev-server.test, README, dashboard
- **repo:** fix(infra): make static-site invalidation non-blocking
- **repo:** fix(infra): route CodeBuild deploys through wrapper

### Bug Fixes

- **infra:** make static-site invalidation non-blocking ([1e0ab9d](https://github.com/alternun-development/alternun/commit/1e0ab9de83d70e235b7e1d7f077b9f4af87708b9))
- **infra:** route CodeBuild deploys through wrapper ([1aa417f](https://github.com/alternun-development/alternun/commit/1aa417f9282b5ae797b18c3b0a7277b499a9b4b4))

### Features

- add alternun ECC bundle (.agents/skills/alternun/agents/openai.yaml) ([8b5f594](https://github.com/alternun-development/alternun/commit/8b5f594dc23121cc87ae3837ac3a60d625322770))
- add alternun ECC bundle (.agents/skills/alternun/SKILL.md) ([4b0f1bc](https://github.com/alternun-development/alternun/commit/4b0f1bcba04387a7df3b59cb34c1be5733c4e5e0))
- add alternun ECC bundle (.claude/ecc-tools.json) ([d023842](https://github.com/alternun-development/alternun/commit/d0238423f49c55a8d9d73b3bd66d964466e30aa2))
- add alternun ECC bundle (.claude/homunculus/instincts/inherited/alternun-instincts.yaml) ([a63de25](https://github.com/alternun-development/alternun/commit/a63de2555a9e0b2c7f440f8c7a9b9d2ef5546418))
- add alternun ECC bundle (.claude/identity.json) ([e9f6a21](https://github.com/alternun-development/alternun/commit/e9f6a217bf6c9e2abfeb0cb2efd0f7c4de3caf4b))
- add alternun ECC bundle (.claude/skills/alternun/SKILL.md) ([4e14ac0](https://github.com/alternun-development/alternun/commit/4e14ac09494a72c5dc98b9cf05f5c48c8e56e3d2))
- add alternun ECC bundle (.codex/AGENTS.md) ([f2d9c2a](https://github.com/alternun-development/alternun/commit/f2d9c2a1144198044b357a14811464e16cdc00d5))
- add alternun ECC bundle (.codex/agents/docs-researcher.toml) ([72b0b5f](https://github.com/alternun-development/alternun/commit/72b0b5f45df4061579cabdf4d73f914befbc6a0a))
- add alternun ECC bundle (.codex/agents/explorer.toml) ([41ab49b](https://github.com/alternun-development/alternun/commit/41ab49be7145326fbc5b53b7a94568fe248b1a80))
- add alternun ECC bundle (.codex/agents/reviewer.toml) ([038a3bd](https://github.com/alternun-development/alternun/commit/038a3bd2e117b8eae3aca739f315d655be457a40))
- add alternun ECC bundle (.codex/config.toml) ([1f00f06](https://github.com/alternun-development/alternun/commit/1f00f06ffcc3cda47a79eb8875f0e1137d967d09))

## [1.0.183](https://github.com/alternun-development/alternun/compare/v1.0.180...v1.0.183) (2026-04-21)

### Bug Fixes

- **infra:** make static-site invalidation non-blocking ([1e0ab9d](https://github.com/alternun-development/alternun/commit/1e0ab9de83d70e235b7e1d7f077b9f4af87708b9))
- **infra:** route CodeBuild deploys through wrapper ([1aa417f](https://github.com/alternun-development/alternun/commit/1aa417f9282b5ae797b18c3b0a7277b499a9b4b4))

### Features

- add alternun ECC bundle (.agents/skills/alternun/agents/openai.yaml) ([8b5f594](https://github.com/alternun-development/alternun/commit/8b5f594dc23121cc87ae3837ac3a60d625322770))
- add alternun ECC bundle (.agents/skills/alternun/SKILL.md) ([4b0f1bc](https://github.com/alternun-development/alternun/commit/4b0f1bcba04387a7df3b59cb34c1be5733c4e5e0))
- add alternun ECC bundle (.claude/ecc-tools.json) ([d023842](https://github.com/alternun-development/alternun/commit/d0238423f49c55a8d9d73b3bd66d964466e30aa2))
- add alternun ECC bundle (.claude/homunculus/instincts/inherited/alternun-instincts.yaml) ([a63de25](https://github.com/alternun-development/alternun/commit/a63de2555a9e0b2c7f440f8c7a9b9d2ef5546418))
- add alternun ECC bundle (.claude/identity.json) ([e9f6a21](https://github.com/alternun-development/alternun/commit/e9f6a217bf6c9e2abfeb0cb2efd0f7c4de3caf4b))
- add alternun ECC bundle (.claude/skills/alternun/SKILL.md) ([4e14ac0](https://github.com/alternun-development/alternun/commit/4e14ac09494a72c5dc98b9cf05f5c48c8e56e3d2))
- add alternun ECC bundle (.codex/AGENTS.md) ([f2d9c2a](https://github.com/alternun-development/alternun/commit/f2d9c2a1144198044b357a14811464e16cdc00d5))
- add alternun ECC bundle (.codex/agents/docs-researcher.toml) ([72b0b5f](https://github.com/alternun-development/alternun/commit/72b0b5f45df4061579cabdf4d73f914befbc6a0a))
- add alternun ECC bundle (.codex/agents/explorer.toml) ([41ab49b](https://github.com/alternun-development/alternun/commit/41ab49be7145326fbc5b53b7a94568fe248b1a80))
- add alternun ECC bundle (.codex/agents/reviewer.toml) ([038a3bd](https://github.com/alternun-development/alternun/commit/038a3bd2e117b8eae3aca739f315d655be457a40))
- add alternun ECC bundle (.codex/config.toml) ([1f00f06](https://github.com/alternun-development/alternun/commit/1f00f06ffcc3cda47a79eb8875f0e1137d967d09))

## [1.0.182](https://github.com/alternun-development/alternun/compare/v1.0.180...v1.0.182) (2026-04-21)

### Bug Fixes

- **infra:** make static-site invalidation non-blocking ([1e0ab9d](https://github.com/alternun-development/alternun/commit/1e0ab9de83d70e235b7e1d7f077b9f4af87708b9))
- **infra:** route CodeBuild deploys through wrapper ([1aa417f](https://github.com/alternun-development/alternun/commit/1aa417f9282b5ae797b18c3b0a7277b499a9b4b4))

### Features

- add alternun ECC bundle (.agents/skills/alternun/agents/openai.yaml) ([8b5f594](https://github.com/alternun-development/alternun/commit/8b5f594dc23121cc87ae3837ac3a60d625322770))
- add alternun ECC bundle (.agents/skills/alternun/SKILL.md) ([4b0f1bc](https://github.com/alternun-development/alternun/commit/4b0f1bcba04387a7df3b59cb34c1be5733c4e5e0))
- add alternun ECC bundle (.claude/ecc-tools.json) ([d023842](https://github.com/alternun-development/alternun/commit/d0238423f49c55a8d9d73b3bd66d964466e30aa2))
- add alternun ECC bundle (.claude/homunculus/instincts/inherited/alternun-instincts.yaml) ([a63de25](https://github.com/alternun-development/alternun/commit/a63de2555a9e0b2c7f440f8c7a9b9d2ef5546418))
- add alternun ECC bundle (.claude/identity.json) ([e9f6a21](https://github.com/alternun-development/alternun/commit/e9f6a217bf6c9e2abfeb0cb2efd0f7c4de3caf4b))
- add alternun ECC bundle (.claude/skills/alternun/SKILL.md) ([4e14ac0](https://github.com/alternun-development/alternun/commit/4e14ac09494a72c5dc98b9cf05f5c48c8e56e3d2))
- add alternun ECC bundle (.codex/AGENTS.md) ([f2d9c2a](https://github.com/alternun-development/alternun/commit/f2d9c2a1144198044b357a14811464e16cdc00d5))
- add alternun ECC bundle (.codex/agents/docs-researcher.toml) ([72b0b5f](https://github.com/alternun-development/alternun/commit/72b0b5f45df4061579cabdf4d73f914befbc6a0a))
- add alternun ECC bundle (.codex/agents/explorer.toml) ([41ab49b](https://github.com/alternun-development/alternun/commit/41ab49be7145326fbc5b53b7a94568fe248b1a80))
- add alternun ECC bundle (.codex/agents/reviewer.toml) ([038a3bd](https://github.com/alternun-development/alternun/commit/038a3bd2e117b8eae3aca739f315d655be457a40))
- add alternun ECC bundle (.codex/config.toml) ([1f00f06](https://github.com/alternun-development/alternun/commit/1f00f06ffcc3cda47a79eb8875f0e1137d967d09))

## [1.0.181](https://github.com/alternun-development/alternun/compare/v1.0.180...v1.0.181) (2026-04-21)

### Bug Fixes

- **repo:** test(api,infra): connection, better-auth-dev-server.test, README, dashboard
- **repo:** fix(infra): make static-site invalidation non-blocking
- **repo:** fix(infra): route CodeBuild deploys through wrapper
- **repo:** ci: make CI pull-request only
- **repo:** test(repo): patch fastify middie audit advisory

### Bug Fixes

- **infra:** make static-site invalidation non-blocking ([1e0ab9d](https://github.com/alternun-development/alternun/commit/1e0ab9de83d70e235b7e1d7f077b9f4af87708b9))
- **infra:** route CodeBuild deploys through wrapper ([1aa417f](https://github.com/alternun-development/alternun/commit/1aa417f9282b5ae797b18c3b0a7277b499a9b4b4))

## [1.0.181](https://github.com/alternun-development/alternun/compare/v1.0.180...v1.0.181) (2026-04-21)

### Bug Fixes

- **infra:** make static-site invalidation non-blocking ([1e0ab9d](https://github.com/alternun-development/alternun/commit/1e0ab9de83d70e235b7e1d7f077b9f4af87708b9))
- **infra:** route CodeBuild deploys through wrapper ([1aa417f](https://github.com/alternun-development/alternun/commit/1aa417f9282b5ae797b18c3b0a7277b499a9b4b4))

## [1.0.180](https://github.com/alternun-development/alternun/compare/v1.0.179...v1.0.180) (2026-04-20)

### Bug Fixes

- **repo:** test(infra): resolve-ssm-env, buildspec-auth-env.test

## [1.0.180](https://github.com/alternun-development/alternun/compare/v1.0.179...v1.0.180) (2026-04-20)

## [1.0.179](https://github.com/alternun-development/alternun/compare/v1.0.178...v1.0.179) (2026-04-20)

### Bug Fixes

- **repo:** test(infra): resolve-ssm-env, buildspec-auth-env.test

## [1.0.179](https://github.com/alternun-development/alternun/compare/v1.0.178...v1.0.179) (2026-04-20)

## [1.0.178](https://github.com/alternun-development/alternun/compare/v1.0.177...v1.0.178) (2026-04-20)

### Bug Fixes

- **repo:** test(api,web,auth): auth-exchange.controller, auth-exchange.module, signup-request.dto, signup-response.dto

## [1.0.178](https://github.com/alternun-development/alternun/compare/v1.0.177...v1.0.178) (2026-04-20)

## [1.0.177](https://github.com/alternun-development/alternun/compare/v1.0.176...v1.0.177) (2026-04-20)

### Bug Fixes

- **repo:** fix(mobile): PublicLandingPage
- **repo:** fix: clear stale api url in ci builds

### Bug Fixes

- clear stale api url in ci builds ([ed1650b](https://github.com/alternun-development/alternun/commit/ed1650b52402e460a5195bdefb303b7481a73809))
- **mobile:** PublicLandingPage ([2f52006](https://github.com/alternun-development/alternun/commit/2f5200611a224c28b6b879da200ba09239b2ba37))

## [1.0.177](https://github.com/alternun-development/alternun/compare/v1.0.176...v1.0.177) (2026-04-20)

### Bug Fixes

- clear stale api url in ci builds ([ed1650b](https://github.com/alternun-development/alternun/commit/ed1650b52402e460a5195bdefb303b7481a73809))
- **mobile:** PublicLandingPage ([2f52006](https://github.com/alternun-development/alternun/commit/2f5200611a224c28b6b879da200ba09239b2ba37))

## [1.0.176](https://github.com/alternun-development/alternun/compare/v1.0.175...v1.0.176) (2026-04-20)

### Bug Fixes

- **repo:** test(mobile,infra): AuthResetPasswordScreen, buildspec, bootstrap-ssm-parameters, resolve-ssm-env

## [1.0.176](https://github.com/alternun-development/alternun/compare/v1.0.175...v1.0.176) (2026-04-20)

## [1.0.175](https://github.com/alternun-development/alternun/compare/v1.0.174...v1.0.175) (2026-04-20)

### Bug Fixes

- **repo:** fix(infra): resolve-ssm-env

### Bug Fixes

- **infra:** resolve-ssm-env ([552e040](https://github.com/alternun-development/alternun/commit/552e040d33eace08ecf0e53144a9a695a21fc228))

## [1.0.175](https://github.com/alternun-development/alternun/compare/v1.0.174...v1.0.175) (2026-04-20)

### Bug Fixes

- **infra:** resolve-ssm-env ([552e040](https://github.com/alternun-development/alternun/commit/552e040d33eace08ecf0e53144a9a695a21fc228))

## [1.0.174](https://github.com/alternun-development/alternun/compare/v1.0.173...v1.0.174) (2026-04-20)

### Bug Fixes

- **repo:** test(mobile): build, validate-exported-auth-bundle, validate-exported-auth-bundle.test

## [1.0.174](https://github.com/alternun-development/alternun/compare/v1.0.173...v1.0.174) (2026-04-20)

## [1.0.173](https://github.com/alternun-development/alternun/compare/v1.0.172...v1.0.173) (2026-04-20)

### Bug Fixes

- **repo:** test(api,mobile,auth): .env, \_layout, \_layout.web

## [1.0.173](https://github.com/alternun-development/alternun/compare/v1.0.172...v1.0.173) (2026-04-20)

## [1.0.172](https://github.com/alternun-development/alternun/compare/v1.0.171...v1.0.172) (2026-04-20)

### Bug Fixes

- **repo:** test(api): supabase-signup.service, supabase-signup.service.test

## [1.0.172](https://github.com/alternun-development/alternun/compare/v1.0.171...v1.0.172) (2026-04-20)

## [1.0.171](https://github.com/alternun-development/alternun/compare/v1.0.170...v1.0.171) (2026-04-20)

### Bug Fixes

- **repo:** test(repo,api,mobile): README, dev-better-auth, auth-exchange.controller, social-signin.service

## [1.0.171](https://github.com/alternun-development/alternun/compare/v1.0.170...v1.0.171) (2026-04-20)

## [1.0.170](https://github.com/alternun-development/alternun/compare/v1.0.169...v1.0.170) (2026-04-20)

### Bug Fixes

- **repo:** test(api): lambda, request-path, request-path.test

## [1.0.170](https://github.com/alternun-development/alternun/compare/v1.0.169...v1.0.170) (2026-04-20)

## [1.0.169](https://github.com/alternun-development/alternun/compare/v1.0.168...v1.0.169) (2026-04-20)

### Bug Fixes

- **repo:** test(mobile): callback, authCallbackFlow.test, authCallbackFlow

## [1.0.169](https://github.com/alternun-development/alternun/compare/v1.0.168...v1.0.169) (2026-04-20)

## [1.0.168](https://github.com/alternun-development/alternun/compare/v1.0.167...v1.0.168) (2026-04-20)

### Bug Fixes

- **repo:** fix: add INFRA_ROUTE53_HOSTED_ZONE_ID to buildspec env vars
- **repo:** debug: improve sst deploy output capture
- **repo:** fix: add sst unlock before deploy to clear stale locks
- **repo:** simplify: remove diagnostic noise from buildspec SST deploy
- **repo:** debug: add comprehensive bash tracing to SST deploy

### Bug Fixes

- add INFRA_ROUTE53_HOSTED_ZONE_ID to buildspec env vars ([884b96e](https://github.com/alternun-development/alternun/commit/884b96ee17d514ae5aba59c3a3872cdd58ede46d))
- add sst unlock before deploy to clear stale locks ([d39c8ff](https://github.com/alternun-development/alternun/commit/d39c8ffc4dc8a36ae15c0bfb7a8df8c2284271f6))
- **infra:** bypass sst-deploy.sh wrapper with direct npx sst deploy ([d88a1b7](https://github.com/alternun-development/alternun/commit/d88a1b7f10ed0579c473f57ae940bcef42e6948c))

## [1.0.168](https://github.com/alternun-development/alternun/compare/v1.0.167...v1.0.168) (2026-04-20)

### Bug Fixes

- add INFRA_ROUTE53_HOSTED_ZONE_ID to buildspec env vars ([884b96e](https://github.com/alternun-development/alternun/commit/884b96ee17d514ae5aba59c3a3872cdd58ede46d))
- add sst unlock before deploy to clear stale locks ([d39c8ff](https://github.com/alternun-development/alternun/commit/d39c8ffc4dc8a36ae15c0bfb7a8df8c2284271f6))
- **infra:** bypass sst-deploy.sh wrapper with direct npx sst deploy ([d88a1b7](https://github.com/alternun-development/alternun/commit/d88a1b7f10ed0579c473f57ae940bcef42e6948c))

## [1.0.167](https://github.com/alternun-development/alternun/compare/v1.0.166...v1.0.167) (2026-04-19)

### Bug Fixes

- **repo:** chore(repo,scripts): AWS_ACCOUNT_ENFORCEMENT, aws-account-guard
- **repo:** debug: add debug output to sst-deploy.sh to identify exit point
- **repo:** fix(infra): export APPROVE to sst-deploy script using explicit export
- **repo:** revert: disable AUTO_REMOVE_CONFLICTING_DNS for dev
- **repo:** fix(mobile): restore v1.0.166 PublicLandingPage with simplified cards

### Bug Fixes

- **infra:** auto-invalidate CloudFront cache after deployments ([a51047c](https://github.com/alternun-development/alternun/commit/a51047c314597787732e6b6dfcace3c1c2e3dd4d))
- **infra:** enable AUTO_REMOVE_CONFLICTING_DNS for dev DNS cleanup ([4de344c](https://github.com/alternun-development/alternun/commit/4de344c11b4deb65855df447697b9447f36f3ac5))
- **infra:** export APPROVE to sst-deploy script using explicit export ([8a51f17](https://github.com/alternun-development/alternun/commit/8a51f17f4c32f4682f8a6cabc0cd4d5328cd23fb))
- **mobile:** restore v1.0.166 PublicLandingPage with simplified cards ([5e63e49](https://github.com/alternun-development/alternun/commit/5e63e49d2e4ee12d755faf520d9af8f377483cb1))
- update .gitleaksignore to properly ignore public API keys ([5ffd54c](https://github.com/alternun-development/alternun/commit/5ffd54c0b0a3ceb56a206e2510b169b5689cdb4f))

### Performance Improvements

- **infra:** optimize CodePipeline buildspec for faster dev iterations ([834378a](https://github.com/alternun-development/alternun/commit/834378a8fc2cf1732b75426a6b29eea25a887bb7))

### Reverts

- disable AUTO_REMOVE_CONFLICTING_DNS for dev ([067630c](https://github.com/alternun-development/alternun/commit/067630c443ec659153a4ec25bea6537e8689c203))
- **mobile:** PublicLandingPage to v1.0.57 layout ([ab06239](https://github.com/alternun-development/alternun/commit/ab06239ad09c52d089c7049a40c9c07bfeb81d05))

## [1.0.167](https://github.com/alternun-development/alternun/compare/v1.0.166...v1.0.167) (2026-04-19)

### Bug Fixes

- **infra:** auto-invalidate CloudFront cache after deployments ([a51047c](https://github.com/alternun-development/alternun/commit/a51047c314597787732e6b6dfcace3c1c2e3dd4d))
- **infra:** enable AUTO_REMOVE_CONFLICTING_DNS for dev DNS cleanup ([4de344c](https://github.com/alternun-development/alternun/commit/4de344c11b4deb65855df447697b9447f36f3ac5))
- **infra:** export APPROVE to sst-deploy script using explicit export ([8a51f17](https://github.com/alternun-development/alternun/commit/8a51f17f4c32f4682f8a6cabc0cd4d5328cd23fb))
- **mobile:** restore v1.0.166 PublicLandingPage with simplified cards ([5e63e49](https://github.com/alternun-development/alternun/commit/5e63e49d2e4ee12d755faf520d9af8f377483cb1))
- update .gitleaksignore to properly ignore public API keys ([5ffd54c](https://github.com/alternun-development/alternun/commit/5ffd54c0b0a3ceb56a206e2510b169b5689cdb4f))

### Performance Improvements

- **infra:** optimize CodePipeline buildspec for faster dev iterations ([834378a](https://github.com/alternun-development/alternun/commit/834378a8fc2cf1732b75426a6b29eea25a887bb7))

### Reverts

- disable AUTO_REMOVE_CONFLICTING_DNS for dev ([067630c](https://github.com/alternun-development/alternun/commit/067630c443ec659153a4ec25bea6537e8689c203))
- **mobile:** PublicLandingPage to v1.0.57 layout ([ab06239](https://github.com/alternun-development/alternun/commit/ab06239ad09c52d089c7049a40c9c07bfeb81d05))

## [1.0.166](https://github.com/alternun-development/alternun/compare/v1.0.165...v1.0.166) (2026-04-19)

### Bug Fixes

- **repo:** docs: add release and deployment flow documentation
- **repo:** ci: add automatic testnet deployment on release

## [1.0.166](https://github.com/alternun-development/alternun/compare/v1.0.165...v1.0.166) (2026-04-19)

## [1.0.165](https://github.com/alternun-development/alternun/compare/v1.0.164...v1.0.165) (2026-04-19)

### Bug Fixes

- **repo:** chore: release v1.0.164
- **repo:** fix(api): build, app-metadata, dist-lambda
- **repo:** docs(scripts): add testnet deployment helper and release guide
- **repo:** fix(api): remove hardcoded version, improve package.json detection
- **repo:** fix(api): hardcode version with file system fallback

## [1.0.165](https://github.com/alternun-development/alternun/compare/v1.0.164...v1.0.165) (2026-04-19)

## [1.0.164](https://github.com/alternun-development/alternun/compare/v1.0.163...v1.0.164) (2026-04-19)

### Bug Fixes

- **repo:** fix(api): build, app-metadata, dist-lambda
- **repo:** docs(scripts): add testnet deployment helper and release guide
- **repo:** fix(api): remove hardcoded version, improve package.json detection
- **repo:** fix(api): hardcode version with file system fallback
- **repo:** fix(api): improve package.json path resolution with multiple fallbacks

### Bug Fixes

- **api:** build, app-metadata, dist-lambda ([c52e00e](https://github.com/alternun-development/alternun/commit/c52e00e626e4540832ba6b9a05efb0c6036e863a))
- **api:** hardcode version with file system fallback ([05baafa](https://github.com/alternun-development/alternun/commit/05baafaaa5a68831f31a99e4671883b84c107e09))
- **api:** improve package.json path resolution with multiple fallbacks ([53e6f2b](https://github.com/alternun-development/alternun/commit/53e6f2b4099f6e3044bbe07eb74fcb0b05af19d1))
- **api:** include package.json in Lambda bundle for runtime version loading ([2aa44bf](https://github.com/alternun-development/alternun/commit/2aa44bf0f473462b0b3ffbdd9d37c14d79da2fe7))
- **api:** remove hardcoded version, improve package.json detection ([65b7322](https://github.com/alternun-development/alternun/commit/65b7322619b698bb01eae10b89bf29c8b1cc494f))
- **api:** use fs.readFileSync for runtime version loading in Lambda ([2ce54d4](https://github.com/alternun-development/alternun/commit/2ce54d4a60aba52540fe4bbaa21380d95155d8b7))
- **mobile:** add timeout to OAuth redirect to prevent stalling UI ([b7cb1c7](https://github.com/alternun-development/alternun/commit/b7cb1c76b27fe9ad7c1a5bd0af64fae21cd9c88b))

## [1.0.164](https://github.com/alternun-development/alternun/compare/v1.0.163...v1.0.164) (2026-04-19)

### Bug Fixes

- **api:** build, app-metadata, dist-lambda ([c52e00e](https://github.com/alternun-development/alternun/commit/c52e00e626e4540832ba6b9a05efb0c6036e863a))
- **api:** hardcode version with file system fallback ([05baafa](https://github.com/alternun-development/alternun/commit/05baafaaa5a68831f31a99e4671883b84c107e09))
- **api:** improve package.json path resolution with multiple fallbacks ([53e6f2b](https://github.com/alternun-development/alternun/commit/53e6f2b4099f6e3044bbe07eb74fcb0b05af19d1))
- **api:** include package.json in Lambda bundle for runtime version loading ([2aa44bf](https://github.com/alternun-development/alternun/commit/2aa44bf0f473462b0b3ffbdd9d37c14d79da2fe7))
- **api:** remove hardcoded version, improve package.json detection ([65b7322](https://github.com/alternun-development/alternun/commit/65b7322619b698bb01eae10b89bf29c8b1cc494f))
- **api:** use fs.readFileSync for runtime version loading in Lambda ([2ce54d4](https://github.com/alternun-development/alternun/commit/2ce54d4a60aba52540fe4bbaa21380d95155d8b7))
- **mobile:** add timeout to OAuth redirect to prevent stalling UI ([b7cb1c7](https://github.com/alternun-development/alternun/commit/b7cb1c76b27fe9ad7c1a5bd0af64fae21cd9c88b))

## [1.0.163](https://github.com/alternun-development/alternun/compare/v1.0.161...v1.0.163) (2026-04-19)

### Bug Fixes

- **repo:** chore(repo,admin,api): CHANGELOG, app, release
- **repo:** fix(gitignore): ignore i18n dist folder
- **repo:** fix(api): improve social sign-in endpoint error handling
- **repo:** fix(mobile): remove duplicate resend cooldown message

### Bug Fixes

- **api:** improve social sign-in endpoint error handling ([00fe88a](https://github.com/alternun-development/alternun/commit/00fe88a6c7cea28edb3445c422d628fe10625edc))
- **gitignore:** ignore i18n dist folder ([d1bca2e](https://github.com/alternun-development/alternun/commit/d1bca2e268a5cf1dcc196ef5c619f51231389429))
- **mobile:** remove duplicate resend cooldown message ([6c1e241](https://github.com/alternun-development/alternun/commit/6c1e241029b4266e4f73561c72d67c316742d0c8))

## [1.0.163](https://github.com/alternun-development/alternun/compare/v1.0.161...v1.0.163) (2026-04-19)

### Bug Fixes

- **api:** improve social sign-in endpoint error handling ([00fe88a](https://github.com/alternun-development/alternun/commit/00fe88a6c7cea28edb3445c422d628fe10625edc))
- **gitignore:** ignore i18n dist folder ([d1bca2e](https://github.com/alternun-development/alternun/commit/d1bca2e268a5cf1dcc196ef5c619f51231389429))
- **mobile:** remove duplicate resend cooldown message ([6c1e241](https://github.com/alternun-development/alternun/commit/6c1e241029b4266e4f73561c72d67c316742d0c8))

## [1.0.162](https://github.com/alternun-development/alternun/compare/v1.0.161...v1.0.162) (2026-04-19)

### Bug Fixes

- **repo:** fix(gitignore): ignore i18n dist folder
- **repo:** fix(api): improve social sign-in endpoint error handling
- **repo:** fix(mobile): remove duplicate resend cooldown message

### Bug Fixes

- **api:** improve social sign-in endpoint error handling ([00fe88a](https://github.com/alternun-development/alternun/commit/00fe88a6c7cea28edb3445c422d628fe10625edc))
- **gitignore:** ignore i18n dist folder ([d1bca2e](https://github.com/alternun-development/alternun/commit/d1bca2e268a5cf1dcc196ef5c619f51231389429))
- **mobile:** remove duplicate resend cooldown message ([6c1e241](https://github.com/alternun-development/alternun/commit/6c1e241029b4266e4f73561c72d67c316742d0c8))

## [1.0.162](https://github.com/alternun-development/alternun/compare/v1.0.161...v1.0.162) (2026-04-19)

### Bug Fixes

- **api:** improve social sign-in endpoint error handling ([00fe88a](https://github.com/alternun-development/alternun/commit/00fe88a6c7cea28edb3445c422d628fe10625edc))
- **gitignore:** ignore i18n dist folder ([d1bca2e](https://github.com/alternun-development/alternun/commit/d1bca2e268a5cf1dcc196ef5c619f51231389429))
- **mobile:** remove duplicate resend cooldown message ([6c1e241](https://github.com/alternun-development/alternun/commit/6c1e241029b4266e4f73561c72d67c316742d0c8))

## [1.0.161](https://github.com/alternun-development/alternun/compare/v1.0.160...v1.0.161) (2026-04-19)

### Bug Fixes

- **repo:** fix(mobile): prevent stale auth errors from persisting after mode switch
- **repo:** fix(mobile): clear error message when user types in any input field
- **repo:** fix(api,mobile): unified signup response format for proper error handling
- **repo:** fix(api): return error responses instead of throwing to avoid 500 errors
- **repo:** fix(mobile): improve error message styling and clear on mode switch

### Bug Fixes

- **api,mobile:** add social sign-in endpoint, fix lint errors ([70a334e](https://github.com/alternun-development/alternun/commit/70a334ec2c88412cd5edf1b8a0213e99a99d150e))
- **api,mobile:** unified signup response format for proper error handling ([1fc2ff8](https://github.com/alternun-development/alternun/commit/1fc2ff8651d212c16ffe2519157495280208e865))
- **api:** return error responses instead of throwing to avoid 500 errors ([4db53b3](https://github.com/alternun-development/alternun/commit/4db53b334f4619ff1aef7c5fd8a4380680eabebd))
- **mobile:** clear error message when user types in any input field ([a9d594f](https://github.com/alternun-development/alternun/commit/a9d594f91497199f3428a1cafaf69f9a24411c14))
- **mobile:** improve error message styling and clear on mode switch ([0df6409](https://github.com/alternun-development/alternun/commit/0df64098866780c3d8c1576e2f64af17d24468a1))
- **mobile:** prevent stale auth errors from persisting after mode switch ([13aa3b2](https://github.com/alternun-development/alternun/commit/13aa3b246c0e1115c26699a8110390166b362690))

## [1.0.161](https://github.com/alternun-development/alternun/compare/v1.0.160...v1.0.161) (2026-04-19)

### Bug Fixes

- **api,mobile:** add social sign-in endpoint, fix lint errors ([70a334e](https://github.com/alternun-development/alternun/commit/70a334ec2c88412cd5edf1b8a0213e99a99d150e))
- **api,mobile:** unified signup response format for proper error handling ([1fc2ff8](https://github.com/alternun-development/alternun/commit/1fc2ff8651d212c16ffe2519157495280208e865))
- **api:** return error responses instead of throwing to avoid 500 errors ([4db53b3](https://github.com/alternun-development/alternun/commit/4db53b334f4619ff1aef7c5fd8a4380680eabebd))
- **mobile:** clear error message when user types in any input field ([a9d594f](https://github.com/alternun-development/alternun/commit/a9d594f91497199f3428a1cafaf69f9a24411c14))
- **mobile:** improve error message styling and clear on mode switch ([0df6409](https://github.com/alternun-development/alternun/commit/0df64098866780c3d8c1576e2f64af17d24468a1))
- **mobile:** prevent stale auth errors from persisting after mode switch ([13aa3b2](https://github.com/alternun-development/alternun/commit/13aa3b246c0e1115c26699a8110390166b362690))

## [1.0.160](https://github.com/alternun-development/alternun/compare/v1.0.159...v1.0.160) (2026-04-18)

### Bug Fixes

- **repo:** chore(scripts): setup-aws-account

## [1.0.160](https://github.com/alternun-development/alternun/compare/v1.0.159...v1.0.160) (2026-04-18)

## [1.0.159](https://github.com/alternun-development/alternun/compare/v1.0.158...v1.0.159) (2026-04-18)

### Bug Fixes

- **repo:** fix(infra,scripts): buildspec, resolve-secrets-manager-env, setup-aws-account

### Bug Fixes

- **infra,scripts:** buildspec, resolve-secrets-manager-env, setup-aws-account ([6dc9313](https://github.com/alternun-development/alternun/commit/6dc931344b821ed9fce291d6ea8260f2ae0f64e4))

## [1.0.159](https://github.com/alternun-development/alternun/compare/v1.0.158...v1.0.159) (2026-04-18)

### Bug Fixes

- **infra,scripts:** buildspec, resolve-secrets-manager-env, setup-aws-account ([6dc9313](https://github.com/alternun-development/alternun/commit/6dc931344b821ed9fce291d6ea8260f2ae0f64e4))

## [1.0.158](https://github.com/alternun-development/alternun/compare/v1.0.157...v1.0.158) (2026-04-18)

### Bug Fixes

- **repo:** fix(api,mobile,repo): .env, build, apply-migrations, empty-module
- **repo:** fix(auth): establish consistent signup routing standard
- **repo:** fix(auth): handle Better Auth endpoint discovery
- **repo:** fix(auth): improve signup error handling with proper typing
- **repo:** fix(api): add proper typing and eslint-disable comments to Lambda handler

### Bug Fixes

- **api,mobile,repo:** .env, build, apply-migrations, empty-module ([855ed21](https://github.com/alternun-development/alternun/commit/855ed2134eadb34c58f73a972546968c850549e4))
- **api:** add proper typing and eslint-disable comments to Lambda handler ([10d1a99](https://github.com/alternun-development/alternun/commit/10d1a9954631fcb3c47ce713b781f0b06c6bb57c))
- **auth:** deploy API with DATABASE_URL environment variable ([9f43782](https://github.com/alternun-development/alternun/commit/9f4378261384d13f7f7e2b732ef2ada0ec7991bf))
- **auth:** establish consistent signup routing standard ([8b6c01b](https://github.com/alternun-development/alternun/commit/8b6c01bda9cdc8266d21137b805e9a34e0adce39))
- **auth:** handle Better Auth endpoint discovery ([3b6d609](https://github.com/alternun-development/alternun/commit/3b6d6094c71ade9b588938531e3fed820ad23ff3))
- **auth:** improve signup error handling with proper typing ([6fc11ca](https://github.com/alternun-development/alternun/commit/6fc11ca24629f52ce7932113284fe98488953bbf))
- **auth:** resolve DATABASE_URL from AWS Secrets Manager for Better Auth ([7ee5876](https://github.com/alternun-development/alternun/commit/7ee58767fd12d5f895050cfc6c85a1dc95861c69))
- **infra:** ensure sst-deploy.sh loads correct AWS account credentials ([79fc5d3](https://github.com/alternun-development/alternun/commit/79fc5d30b81abe25bc3d22a9b403ace3740845b9))
- **mobile:** force set correct auth URLs before Expo export to prevent localhost ([5ee6dbe](https://github.com/alternun-development/alternun/commit/5ee6dbeb51938c630131f62b0acab02512c2bb3d))
- **mobile:** update .env files BEFORE @alternun/auth build to prevent localhost ([0eb680f](https://github.com/alternun-development/alternun/commit/0eb680f35b5285c59f431a25aeb54011450bcb7b))
- **mobile:** update .env files BEFORE load_env_vars to ensure correct stage URLs ([af59b29](https://github.com/alternun-development/alternun/commit/af59b297e931f1e4b270b31301a1ec67c9826b26))
- **mobile:** write stage-specific .env files before Expo export to ensure correct URLs ([cfb6e26](https://github.com/alternun-development/alternun/commit/cfb6e261308bd7ea2532bd0a2d19c96ea08328f0))

## [1.0.158](https://github.com/alternun-development/alternun/compare/v1.0.157...v1.0.158) (2026-04-18)

### Bug Fixes

- **api,mobile,repo:** .env, build, apply-migrations, empty-module ([855ed21](https://github.com/alternun-development/alternun/commit/855ed2134eadb34c58f73a972546968c850549e4))
- **api:** add proper typing and eslint-disable comments to Lambda handler ([10d1a99](https://github.com/alternun-development/alternun/commit/10d1a9954631fcb3c47ce713b781f0b06c6bb57c))
- **auth:** deploy API with DATABASE_URL environment variable ([9f43782](https://github.com/alternun-development/alternun/commit/9f4378261384d13f7f7e2b732ef2ada0ec7991bf))
- **auth:** establish consistent signup routing standard ([8b6c01b](https://github.com/alternun-development/alternun/commit/8b6c01bda9cdc8266d21137b805e9a34e0adce39))
- **auth:** handle Better Auth endpoint discovery ([3b6d609](https://github.com/alternun-development/alternun/commit/3b6d6094c71ade9b588938531e3fed820ad23ff3))
- **auth:** improve signup error handling with proper typing ([6fc11ca](https://github.com/alternun-development/alternun/commit/6fc11ca24629f52ce7932113284fe98488953bbf))
- **auth:** resolve DATABASE_URL from AWS Secrets Manager for Better Auth ([7ee5876](https://github.com/alternun-development/alternun/commit/7ee58767fd12d5f895050cfc6c85a1dc95861c69))
- **infra:** ensure sst-deploy.sh loads correct AWS account credentials ([79fc5d3](https://github.com/alternun-development/alternun/commit/79fc5d30b81abe25bc3d22a9b403ace3740845b9))
- **mobile:** force set correct auth URLs before Expo export to prevent localhost ([5ee6dbe](https://github.com/alternun-development/alternun/commit/5ee6dbeb51938c630131f62b0acab02512c2bb3d))
- **mobile:** update .env files BEFORE @alternun/auth build to prevent localhost ([0eb680f](https://github.com/alternun-development/alternun/commit/0eb680f35b5285c59f431a25aeb54011450bcb7b))
- **mobile:** update .env files BEFORE load_env_vars to ensure correct stage URLs ([af59b29](https://github.com/alternun-development/alternun/commit/af59b297e931f1e4b270b31301a1ec67c9826b26))
- **mobile:** write stage-specific .env files before Expo export to ensure correct URLs ([cfb6e26](https://github.com/alternun-development/alternun/commit/cfb6e261308bd7ea2532bd0a2d19c96ea08328f0))

## [1.0.157](https://github.com/alternun-development/alternun/compare/v1.0.156...v1.0.157) (2026-04-18)

### Bug Fixes

- **repo:** fix(mobile,i18n): build

### Bug Fixes

- **mobile,i18n:** build ([65ecd09](https://github.com/alternun-development/alternun/commit/65ecd09bfbb2afff9a978717a41af602b3180a1f))

## [1.0.157](https://github.com/alternun-development/alternun/compare/v1.0.156...v1.0.157) (2026-04-18)

### Bug Fixes

- **mobile,i18n:** build ([65ecd09](https://github.com/alternun-development/alternun/commit/65ecd09bfbb2afff9a978717a41af602b3180a1f))

## [1.0.156](https://github.com/alternun-development/alternun/compare/v1.0.155...v1.0.156) (2026-04-18)

### Bug Fixes

- **repo:** fix(api,infra): better-auth-cors, infra.config
- **repo:** feat: make migrations optional (opt-in) by default

### Bug Fixes

- **api,infra:** better-auth-cors, infra.config ([ae734b5](https://github.com/alternun-development/alternun/commit/ae734b5c60aca5da52600e99f3ae5977dfc06fe6))

### Features

- make migrations optional (opt-in) by default ([a82735d](https://github.com/alternun-development/alternun/commit/a82735d52a735205871f9f0f9cdd8d9b7b79f62a))

## [1.0.156](https://github.com/alternun-development/alternun/compare/v1.0.155...v1.0.156) (2026-04-18)

### Bug Fixes

- **api,infra:** better-auth-cors, infra.config ([ae734b5](https://github.com/alternun-development/alternun/commit/ae734b5c60aca5da52600e99f3ae5977dfc06fe6))

### Features

- make migrations optional (opt-in) by default ([a82735d](https://github.com/alternun-development/alternun/commit/a82735d52a735205871f9f0f9cdd8d9b7b79f62a))

## [1.0.155](https://github.com/alternun-development/alternun/compare/v1.0.153...v1.0.155) (2026-04-18)

### Bug Fixes

- **repo:** fix: correct import path for migrations module
- **repo:** fix(auth): initialize database migrations on API startup

### Bug Fixes

- **auth:** initialize database migrations on API startup ([265ff70](https://github.com/alternun-development/alternun/commit/265ff7031d56667633cfb911e35db4c3b9bce3e8))
- correct import path for migrations module ([74a8aca](https://github.com/alternun-development/alternun/commit/74a8aca2876e4db252774cac08211d95e615bfdc))

## [1.0.155](https://github.com/alternun-development/alternun/compare/v1.0.153...v1.0.155) (2026-04-18)

### Bug Fixes

- **auth:** initialize database migrations on API startup ([265ff70](https://github.com/alternun-development/alternun/commit/265ff7031d56667633cfb911e35db4c3b9bce3e8))
- correct import path for migrations module ([74a8aca](https://github.com/alternun-development/alternun/commit/74a8aca2876e4db252774cac08211d95e615bfdc))

## [1.0.154](https://github.com/alternun-development/alternun/compare/v1.0.153...v1.0.154) (2026-04-18)

### Bug Fixes

- **repo:** fix(auth): initialize database migrations on API startup

### Bug Fixes

- **auth:** initialize database migrations on API startup ([265ff70](https://github.com/alternun-development/alternun/commit/265ff7031d56667633cfb911e35db4c3b9bce3e8))

## [1.0.154](https://github.com/alternun-development/alternun/compare/v1.0.153...v1.0.154) (2026-04-18)

### Bug Fixes

- **auth:** initialize database migrations on API startup ([265ff70](https://github.com/alternun-development/alternun/commit/265ff7031d56667633cfb911e35db4c3b9bce3e8))

## [1.0.153](https://github.com/alternun-development/alternun/compare/v1.0.151...v1.0.153) (2026-04-18)

### Bug Fixes

- **repo:** chore(scripts): apply-migrations-local
- **repo:** chore: add secure deployment automation with AWS Secrets
- **repo:** feat: wire DATABASE_URL to Lambda and make migrations optional
- **repo:** refactor: make database migrations scalable and maintainable
- **repo:** docs: add Supabase migration and deployment guides

### Bug Fixes

- **api:** add in-memory database adapter to Better Auth ([e42c9bf](https://github.com/alternun-development/alternun/commit/e42c9bf4072f134d59bcba8c9b6e803d6fb101bc))
- **api:** ensure CORS headers sent for all responses including errors ([0e52831](https://github.com/alternun-development/alternun/commit/0e52831feae46eda1c8ee3ea3cf492f90c9a6a83))
- **ci:** add sanitize-html types ([d3ba202](https://github.com/alternun-development/alternun/commit/d3ba20225071a598232733791611fa7141b619dc))
- **ci:** address codeql alerts in auth helpers ([6547da8](https://github.com/alternun-development/alternun/commit/6547da8be6670bff4e001d831f8e2462cf2b8735))
- **ci:** generate mobile icons with sharp ([e882f69](https://github.com/alternun-development/alternun/commit/e882f698a9a07d30a63b9e8646b1bbde74d0d639))
- **ci:** invoke turbo directly for build matrix ([1dcaf0d](https://github.com/alternun-development/alternun/commit/1dcaf0da1a10e5119e62c54888892b0aa17450f1))
- **ci:** make mobile env test deterministic ([f4153f0](https://github.com/alternun-development/alternun/commit/f4153f04eb5bf290b47f3280ba730e2bd89f6cdc))
- **ci:** refresh audit pin and mobile env tests ([63811f7](https://github.com/alternun-development/alternun/commit/63811f73bab19e13e2cea6a25a81b2f4f85f6bc3))
- **ci:** target workspace packages in build matrix ([92610aa](https://github.com/alternun-development/alternun/commit/92610aaea8bf4fec5cfcdd26b83e576c81eca2cc))
- **ci:** update lockfile for api sanitize-html ([80ab38a](https://github.com/alternun-development/alternun/commit/80ab38aaf59a3c7e21bd223ad9117fa2301cf5fa))

### Features

- **auth:** integrate Better Auth with Supabase PostgreSQL database ([5f899b9](https://github.com/alternun-development/alternun/commit/5f899b9b241124613c42027661a28c4c93027b95))
- wire DATABASE_URL to Lambda and make migrations optional ([11776be](https://github.com/alternun-development/alternun/commit/11776beafa92d20e8730a2fd1377ce3bdaf9078c))

## [1.0.153](https://github.com/alternun-development/alternun/compare/v1.0.151...v1.0.153) (2026-04-18)

### Bug Fixes

- **api:** add in-memory database adapter to Better Auth ([e42c9bf](https://github.com/alternun-development/alternun/commit/e42c9bf4072f134d59bcba8c9b6e803d6fb101bc))
- **api:** ensure CORS headers sent for all responses including errors ([0e52831](https://github.com/alternun-development/alternun/commit/0e52831feae46eda1c8ee3ea3cf492f90c9a6a83))
- **ci:** add sanitize-html types ([d3ba202](https://github.com/alternun-development/alternun/commit/d3ba20225071a598232733791611fa7141b619dc))
- **ci:** address codeql alerts in auth helpers ([6547da8](https://github.com/alternun-development/alternun/commit/6547da8be6670bff4e001d831f8e2462cf2b8735))
- **ci:** generate mobile icons with sharp ([e882f69](https://github.com/alternun-development/alternun/commit/e882f698a9a07d30a63b9e8646b1bbde74d0d639))
- **ci:** invoke turbo directly for build matrix ([1dcaf0d](https://github.com/alternun-development/alternun/commit/1dcaf0da1a10e5119e62c54888892b0aa17450f1))
- **ci:** make mobile env test deterministic ([f4153f0](https://github.com/alternun-development/alternun/commit/f4153f04eb5bf290b47f3280ba730e2bd89f6cdc))
- **ci:** refresh audit pin and mobile env tests ([63811f7](https://github.com/alternun-development/alternun/commit/63811f73bab19e13e2cea6a25a81b2f4f85f6bc3))
- **ci:** target workspace packages in build matrix ([92610aa](https://github.com/alternun-development/alternun/commit/92610aaea8bf4fec5cfcdd26b83e576c81eca2cc))
- **ci:** update lockfile for api sanitize-html ([80ab38a](https://github.com/alternun-development/alternun/commit/80ab38aaf59a3c7e21bd223ad9117fa2301cf5fa))

### Features

- **auth:** integrate Better Auth with Supabase PostgreSQL database ([5f899b9](https://github.com/alternun-development/alternun/commit/5f899b9b241124613c42027661a28c4c93027b95))
- wire DATABASE_URL to Lambda and make migrations optional ([11776be](https://github.com/alternun-development/alternun/commit/11776beafa92d20e8730a2fd1377ce3bdaf9078c))

## [1.0.152](https://github.com/alternun-development/alternun/compare/v1.0.151...v1.0.152) (2026-04-18)

### Bug Fixes

- **repo:** feat: wire DATABASE_URL to Lambda and make migrations optional
- **repo:** refactor: make database migrations scalable and maintainable
- **repo:** docs: add Supabase migration and deployment guides
- **repo:** feat(auth): integrate Better Auth with Supabase PostgreSQL database
- **repo:** fix(api): add in-memory database adapter to Better Auth

### Bug Fixes

- **api:** add in-memory database adapter to Better Auth ([e42c9bf](https://github.com/alternun-development/alternun/commit/e42c9bf4072f134d59bcba8c9b6e803d6fb101bc))
- **api:** ensure CORS headers sent for all responses including errors ([0e52831](https://github.com/alternun-development/alternun/commit/0e52831feae46eda1c8ee3ea3cf492f90c9a6a83))
- **ci:** add sanitize-html types ([d3ba202](https://github.com/alternun-development/alternun/commit/d3ba20225071a598232733791611fa7141b619dc))
- **ci:** address codeql alerts in auth helpers ([6547da8](https://github.com/alternun-development/alternun/commit/6547da8be6670bff4e001d831f8e2462cf2b8735))
- **ci:** generate mobile icons with sharp ([e882f69](https://github.com/alternun-development/alternun/commit/e882f698a9a07d30a63b9e8646b1bbde74d0d639))
- **ci:** invoke turbo directly for build matrix ([1dcaf0d](https://github.com/alternun-development/alternun/commit/1dcaf0da1a10e5119e62c54888892b0aa17450f1))
- **ci:** make mobile env test deterministic ([f4153f0](https://github.com/alternun-development/alternun/commit/f4153f04eb5bf290b47f3280ba730e2bd89f6cdc))
- **ci:** refresh audit pin and mobile env tests ([63811f7](https://github.com/alternun-development/alternun/commit/63811f73bab19e13e2cea6a25a81b2f4f85f6bc3))
- **ci:** target workspace packages in build matrix ([92610aa](https://github.com/alternun-development/alternun/commit/92610aaea8bf4fec5cfcdd26b83e576c81eca2cc))
- **ci:** update lockfile for api sanitize-html ([80ab38a](https://github.com/alternun-development/alternun/commit/80ab38aaf59a3c7e21bd223ad9117fa2301cf5fa))

### Features

- **auth:** integrate Better Auth with Supabase PostgreSQL database ([5f899b9](https://github.com/alternun-development/alternun/commit/5f899b9b241124613c42027661a28c4c93027b95))
- wire DATABASE_URL to Lambda and make migrations optional ([11776be](https://github.com/alternun-development/alternun/commit/11776beafa92d20e8730a2fd1377ce3bdaf9078c))

## [1.0.152](https://github.com/alternun-development/alternun/compare/v1.0.151...v1.0.152) (2026-04-18)

### Bug Fixes

- **api:** add in-memory database adapter to Better Auth ([e42c9bf](https://github.com/alternun-development/alternun/commit/e42c9bf4072f134d59bcba8c9b6e803d6fb101bc))
- **api:** ensure CORS headers sent for all responses including errors ([0e52831](https://github.com/alternun-development/alternun/commit/0e52831feae46eda1c8ee3ea3cf492f90c9a6a83))
- **ci:** add sanitize-html types ([d3ba202](https://github.com/alternun-development/alternun/commit/d3ba20225071a598232733791611fa7141b619dc))
- **ci:** address codeql alerts in auth helpers ([6547da8](https://github.com/alternun-development/alternun/commit/6547da8be6670bff4e001d831f8e2462cf2b8735))
- **ci:** generate mobile icons with sharp ([e882f69](https://github.com/alternun-development/alternun/commit/e882f698a9a07d30a63b9e8646b1bbde74d0d639))
- **ci:** invoke turbo directly for build matrix ([1dcaf0d](https://github.com/alternun-development/alternun/commit/1dcaf0da1a10e5119e62c54888892b0aa17450f1))
- **ci:** make mobile env test deterministic ([f4153f0](https://github.com/alternun-development/alternun/commit/f4153f04eb5bf290b47f3280ba730e2bd89f6cdc))
- **ci:** refresh audit pin and mobile env tests ([63811f7](https://github.com/alternun-development/alternun/commit/63811f73bab19e13e2cea6a25a81b2f4f85f6bc3))
- **ci:** target workspace packages in build matrix ([92610aa](https://github.com/alternun-development/alternun/commit/92610aaea8bf4fec5cfcdd26b83e576c81eca2cc))
- **ci:** update lockfile for api sanitize-html ([80ab38a](https://github.com/alternun-development/alternun/commit/80ab38aaf59a3c7e21bd223ad9117fa2301cf5fa))

### Features

- **auth:** integrate Better Auth with Supabase PostgreSQL database ([5f899b9](https://github.com/alternun-development/alternun/commit/5f899b9b241124613c42027661a28c4c93027b95))
- wire DATABASE_URL to Lambda and make migrations optional ([11776be](https://github.com/alternun-development/alternun/commit/11776beafa92d20e8730a2fd1377ce3bdaf9078c))

## [1.0.151](https://github.com/alternun-development/alternun/compare/v1.0.150...v1.0.151) (2026-04-18)

### Bug Fixes

- **repo:** test(mobile,infra): AIRS-logo-dark-realistic, AIRS-logo-light-realistic, README, buildspec

## [1.0.151](https://github.com/alternun-development/alternun/compare/v1.0.150...v1.0.151) (2026-04-18)

## [1.0.150](https://github.com/alternun-development/alternun/compare/v1.0.149...v1.0.150) (2026-04-18)

### Bug Fixes

- **repo:** test(repo,api): pnpm-lock, fastify-compat.test

## [1.0.150](https://github.com/alternun-development/alternun/compare/v1.0.149...v1.0.150) (2026-04-18)

## [1.0.149](https://github.com/alternun-development/alternun/compare/v1.0.148...v1.0.149) (2026-04-18)

### Bug Fixes

- **repo:** test(infra): \_pipeline-safety, predeploy-checks, sst-deploy, destructive-cleanup-guards.test

## [1.0.149](https://github.com/alternun-development/alternun/compare/v1.0.148...v1.0.149) (2026-04-18)

## [1.0.148](https://github.com/alternun-development/alternun/compare/v1.0.147...v1.0.148) (2026-04-18)

### Bug Fixes

- **repo:** test(infra): .env, README, buildspec, \_pipeline-safety

## [1.0.148](https://github.com/alternun-development/alternun/compare/v1.0.147...v1.0.148) (2026-04-18)

## [1.0.147](https://github.com/alternun-development/alternun/compare/v1.0.146...v1.0.147) (2026-04-17)

### Bug Fixes

- **repo:** test(infra): postdeploy-reachability-check, resolve-ssm-env, sst-deploy, buildspec-auth-env.test

## [1.0.147](https://github.com/alternun-development/alternun/compare/v1.0.146...v1.0.147) (2026-04-17)

## [1.0.146](https://github.com/alternun-development/alternun/compare/v1.0.145...v1.0.146) (2026-04-17)

### Bug Fixes

- **repo:** test(infra): sst-deploy, redirect-aliases.test

## [1.0.146](https://github.com/alternun-development/alternun/compare/v1.0.145...v1.0.146) (2026-04-17)

## [1.0.145](https://github.com/alternun-development/alternun/compare/v1.0.144...v1.0.145) (2026-04-17)

### Bug Fixes

- **repo:** test(mobile,infra): AirsIntroExperience, HeroVideoNative, sst-deploy, redirect-aliases.test

## [1.0.145](https://github.com/alternun-development/alternun/compare/v1.0.144...v1.0.145) (2026-04-17)

## [1.0.144](https://github.com/alternun-development/alternun/compare/v1.0.143...v1.0.144) (2026-04-17)

### Bug Fixes

- **repo:** test(mobile,infra): landing-backup, landing-optimized, landing, AirsIntroExperience

## [1.0.144](https://github.com/alternun-development/alternun/compare/v1.0.143...v1.0.144) (2026-04-17)

## [1.0.143](https://github.com/alternun-development/alternun/compare/v1.0.142...v1.0.143) (2026-04-17)

### Bug Fixes

- **repo:** test(infra): expo, redirects, redirect-aliases.test, sst-globals.d

## [1.0.143](https://github.com/alternun-development/alternun/compare/v1.0.142...v1.0.143) (2026-04-17)

## [1.0.142](https://github.com/alternun-development/alternun/compare/v1.0.141...v1.0.142) (2026-04-17)

### Bug Fixes

- **repo:** test(mobile,infra,repo): app, landing-optimized, HeroVideoNative, sst-deploy

## [1.0.142](https://github.com/alternun-development/alternun/compare/v1.0.141...v1.0.142) (2026-04-17)

## [1.0.141](https://github.com/alternun-development/alternun/compare/v1.0.140...v1.0.141) (2026-04-17)

### Bug Fixes

- **repo:** fix(infra): sst-deploy

### Bug Fixes

- **infra:** sst-deploy ([4cd9755](https://github.com/alternun-development/alternun/commit/4cd9755a7780f7c26e9d8f2322d3eee50dce508f))

## [1.0.141](https://github.com/alternun-development/alternun/compare/v1.0.140...v1.0.141) (2026-04-17)

### Bug Fixes

- **infra:** sst-deploy ([4cd9755](https://github.com/alternun-development/alternun/commit/4cd9755a7780f7c26e9d8f2322d3eee50dce508f))

## [1.0.140](https://github.com/alternun-development/alternun/compare/v1.0.138...v1.0.140) (2026-04-17)

### Bug Fixes

- **repo:** fix(repo,admin,api): CHANGELOG, app, build
- **repo:** fix(infra): .env, buildspec, redirects, sst-deploy

### Bug Fixes

- **infra:** .env, buildspec, redirects, sst-deploy ([e474d57](https://github.com/alternun-development/alternun/commit/e474d57b6eea504a93b13d94b6f919af83f70054))
- **repo,admin,api:** CHANGELOG, app, build ([9f2996b](https://github.com/alternun-development/alternun/commit/9f2996beb7b475d1ae25474263e0b47f84a2acbe))

## [1.0.140](https://github.com/alternun-development/alternun/compare/v1.0.138...v1.0.140) (2026-04-17)

### Bug Fixes

- **infra:** .env, buildspec, redirects, sst-deploy ([e474d57](https://github.com/alternun-development/alternun/commit/e474d57b6eea504a93b13d94b6f919af83f70054))
- **repo,admin,api:** CHANGELOG, app, build ([9f2996b](https://github.com/alternun-development/alternun/commit/9f2996beb7b475d1ae25474263e0b47f84a2acbe))

## [1.0.139](https://github.com/alternun-development/alternun/compare/v1.0.138...v1.0.139) (2026-04-17)

### Bug Fixes

- **repo:** fix(infra): .env, buildspec, redirects, sst-deploy

### Bug Fixes

- **infra:** .env, buildspec, redirects, sst-deploy ([e474d57](https://github.com/alternun-development/alternun/commit/e474d57b6eea504a93b13d94b6f919af83f70054))

## [1.0.139](https://github.com/alternun-development/alternun/compare/v1.0.138...v1.0.139) (2026-04-17)

### Bug Fixes

- **infra:** .env, buildspec, redirects, sst-deploy ([e474d57](https://github.com/alternun-development/alternun/commit/e474d57b6eea504a93b13d94b6f919af83f70054))

## [1.0.138](https://github.com/alternun-development/alternun/compare/v1.0.137...v1.0.138) (2026-04-17)

### Bug Fixes

- **repo:** test(infra): infra.config, redirects, redirect-aliases.test, sst-globals.d

## [1.0.138](https://github.com/alternun-development/alternun/compare/v1.0.137...v1.0.138) (2026-04-17)

## [1.0.137](https://github.com/alternun-development/alternun/compare/v1.0.136...v1.0.137) (2026-04-17)

### Bug Fixes

- **repo:** chore: prepare close issue #105
- **repo:** docs: note global activity feed status
- **repo:** chore: close issue #105

## [1.0.137](https://github.com/alternun-development/alternun/compare/v1.0.136...v1.0.137) (2026-04-17)

## [1.0.136](https://github.com/alternun-development/alternun/compare/v1.0.135...v1.0.136) (2026-04-17)

### Bug Fixes

- **repo:** test(mobile,infra): AuthSignInScreen, infra.config, sst-deploy, redirect-aliases.test

## [1.0.136](https://github.com/alternun-development/alternun/compare/v1.0.135...v1.0.136) (2026-04-17)

## [1.0.135](https://github.com/alternun-development/alternun/compare/v1.0.134...v1.0.135) (2026-04-17)

### Bug Fixes

- **repo:** test(repo,infra): expo-web-aws-deploy, .env, README, infra.config

## [1.0.135](https://github.com/alternun-development/alternun/compare/v1.0.134...v1.0.135) (2026-04-17)

## [1.0.134](https://github.com/alternun-development/alternun/compare/v1.0.133...v1.0.134) (2026-04-17)

### Bug Fixes

- **repo:** test(api,repo,infra): build, expo-web-aws-deploy, .env, README

## [1.0.134](https://github.com/alternun-development/alternun/compare/v1.0.133...v1.0.134) (2026-04-17)

## [1.0.133](https://github.com/alternun-development/alternun/compare/v1.0.132...v1.0.133) (2026-04-17)

### Bug Fixes

- **repo:** feat(api): add global activity feed module

### Features

- **api:** add global activity feed module ([4902456](https://github.com/alternun-development/alternun/commit/490245656d7f04f7f5672a42950c73e439f7d18f))

## [1.0.133](https://github.com/alternun-development/alternun/compare/v1.0.132...v1.0.133) (2026-04-17)

### Features

- **api:** add global activity feed module ([4902456](https://github.com/alternun-development/alternun/commit/490245656d7f04f7f5672a42950c73e439f7d18f))

## [1.0.132](https://github.com/alternun-development/alternun/compare/v1.0.131...v1.0.132) (2026-04-17)

### Bug Fixes

- **repo:** chore: add packages/wallet/dist to gitignore
- **repo:** fix(api): suppress Buffer.isBuffer eslint error with safe cast

### Bug Fixes

- **api:** suppress Buffer.isBuffer eslint error with safe cast ([7caf9e6](https://github.com/alternun-development/alternun/commit/7caf9e6a4c32e09dbca5359b108bf2591c259cb3))

## [1.0.132](https://github.com/alternun-development/alternun/compare/v1.0.131...v1.0.132) (2026-04-17)

### Bug Fixes

- **api:** suppress Buffer.isBuffer eslint error with safe cast ([7caf9e6](https://github.com/alternun-development/alternun/commit/7caf9e6a4c32e09dbca5359b108bf2591c259cb3))

## [1.0.131](https://github.com/alternun-development/alternun/compare/v1.0.130...v1.0.131) (2026-04-17)

### Bug Fixes

- **repo:** fix(mobile): align deploy auth env and audit pins
- **repo:** docs: add global activity feed feature plan
- **repo:** fix(wallet): make pin digest key extractable
- **repo:** fix(ci): refresh pnpm lockfile for wallet package
- **repo:** chore(repo,admin,api): CHANGELOG, app

### Bug Fixes

- **ci:** refresh pnpm lockfile for wallet package ([d4d1c53](https://github.com/alternun-development/alternun/commit/d4d1c536c8542162042ee7730fbce0340b58f3ca))
- **infra:** allow certificateArn reassignment ([34475e5](https://github.com/alternun-development/alternun/commit/34475e5621c3c0655419128327f44c6779cbc407))
- **mobile:** align deploy auth env and audit pins ([88850f4](https://github.com/alternun-development/alternun/commit/88850f498db06c3435204f906e4421cb61dce684))
- **wallet:** make pin digest key extractable ([8a4dbbe](https://github.com/alternun-development/alternun/commit/8a4dbbe61fd82070c2ea9a81f5f151a691773314))

### Features

- **wallet:** scaffold phase-1 non-custodial HD wallet core ([189b8f0](https://github.com/alternun-development/alternun/commit/189b8f0a2c13745a2d19f0af7a3b2005d28265e1))

## [1.0.131](https://github.com/alternun-development/alternun/compare/v1.0.130...v1.0.131) (2026-04-17)

### Bug Fixes

- **ci:** refresh pnpm lockfile for wallet package ([d4d1c53](https://github.com/alternun-development/alternun/commit/d4d1c536c8542162042ee7730fbce0340b58f3ca))
- **infra:** allow certificateArn reassignment ([34475e5](https://github.com/alternun-development/alternun/commit/34475e5621c3c0655419128327f44c6779cbc407))
- **mobile:** align deploy auth env and audit pins ([88850f4](https://github.com/alternun-development/alternun/commit/88850f498db06c3435204f906e4421cb61dce684))
- **wallet:** make pin digest key extractable ([8a4dbbe](https://github.com/alternun-development/alternun/commit/8a4dbbe61fd82070c2ea9a81f5f151a691773314))

### Features

- **wallet:** scaffold phase-1 non-custodial HD wallet core ([189b8f0](https://github.com/alternun-development/alternun/commit/189b8f0a2c13745a2d19f0af7a3b2005d28265e1))

## [1.0.130](https://github.com/alternun-development/alternun/compare/v1.0.127...v1.0.130) (2026-04-17)

### Bug Fixes

- **repo:** chore: remove email-templates dist from release tracked paths
- **repo:** fix(repo,admin,api): CHANGELOG, app
- **repo:** fix(api): fix airs verifySessionToken return type
- **repo:** fix(email): 28 files updated
- **repo:** chore: ignore email-templates dist directory

### Bug Fixes

- **api:** fix airs verifySessionToken return type ([cbb7663](https://github.com/alternun-development/alternun/commit/cbb7663986741556fdd57a9c871f5834601256b6))
- **docs,mobile,auth:** mi-perfil, ProfileStyles ([68a3a8e](https://github.com/alternun-development/alternun/commit/68a3a8ee6982e9300751e16e207551be9490c725))
- **email:** 28 files updated ([d97e499](https://github.com/alternun-development/alternun/commit/d97e499cda5164bb1d4397fb9b36dfb859da619a))
- **repo,admin,api:** CHANGELOG, app ([b56e228](https://github.com/alternun-development/alternun/commit/b56e228a2712c03e48d1fcca8439d6428f27ecee))

## [1.0.130](https://github.com/alternun-development/alternun/compare/v1.0.127...v1.0.130) (2026-04-17)

### Bug Fixes

- **api:** fix airs verifySessionToken return type ([cbb7663](https://github.com/alternun-development/alternun/commit/cbb7663986741556fdd57a9c871f5834601256b6))
- **docs,mobile,auth:** mi-perfil, ProfileStyles ([68a3a8e](https://github.com/alternun-development/alternun/commit/68a3a8ee6982e9300751e16e207551be9490c725))
- **email:** 28 files updated ([d97e499](https://github.com/alternun-development/alternun/commit/d97e499cda5164bb1d4397fb9b36dfb859da619a))
- **repo,admin,api:** CHANGELOG, app ([b56e228](https://github.com/alternun-development/alternun/commit/b56e228a2712c03e48d1fcca8439d6428f27ecee))

## [1.0.129](https://github.com/alternun-development/alternun/compare/v1.0.127...v1.0.129) (2026-04-17)

### Bug Fixes

- **repo:** fix(repo,admin,api): CHANGELOG, app
- **repo:** fix(api): fix airs verifySessionToken return type
- **repo:** fix(email): 28 files updated
- **repo:** chore: ignore email-templates dist directory
- **repo:** docs: add AIRS Wallet System comprehensive integration plan

### Bug Fixes

- **api:** fix airs verifySessionToken return type ([cbb7663](https://github.com/alternun-development/alternun/commit/cbb7663986741556fdd57a9c871f5834601256b6))
- **docs,mobile,auth:** mi-perfil, ProfileStyles ([68a3a8e](https://github.com/alternun-development/alternun/commit/68a3a8ee6982e9300751e16e207551be9490c725))
- **email:** 28 files updated ([d97e499](https://github.com/alternun-development/alternun/commit/d97e499cda5164bb1d4397fb9b36dfb859da619a))
- **repo,admin,api:** CHANGELOG, app ([b56e228](https://github.com/alternun-development/alternun/commit/b56e228a2712c03e48d1fcca8439d6428f27ecee))

## [1.0.129](https://github.com/alternun-development/alternun/compare/v1.0.127...v1.0.129) (2026-04-17)

### Bug Fixes

- **api:** fix airs verifySessionToken return type ([cbb7663](https://github.com/alternun-development/alternun/commit/cbb7663986741556fdd57a9c871f5834601256b6))
- **docs,mobile,auth:** mi-perfil, ProfileStyles ([68a3a8e](https://github.com/alternun-development/alternun/commit/68a3a8ee6982e9300751e16e207551be9490c725))
- **email:** 28 files updated ([d97e499](https://github.com/alternun-development/alternun/commit/d97e499cda5164bb1d4397fb9b36dfb859da619a))
- **repo,admin,api:** CHANGELOG, app ([b56e228](https://github.com/alternun-development/alternun/commit/b56e228a2712c03e48d1fcca8439d6428f27ecee))

## [1.0.128](https://github.com/alternun-development/alternun/compare/v1.0.127...v1.0.128) (2026-04-17)

### Bug Fixes

- **repo:** fix(email): 28 files updated
- **repo:** chore: ignore email-templates dist directory
- **repo:** docs: add AIRS Wallet System comprehensive integration plan
- **repo:** fix(docs,mobile,auth): mi-perfil, ProfileStyles
- **repo:** test(admin,api,docs): oidc-client, app-shell, callback-page, resource-list-page

### Bug Fixes

- **docs,mobile,auth:** mi-perfil, ProfileStyles ([68a3a8e](https://github.com/alternun-development/alternun/commit/68a3a8ee6982e9300751e16e207551be9490c725))
- **email:** 28 files updated ([d97e499](https://github.com/alternun-development/alternun/commit/d97e499cda5164bb1d4397fb9b36dfb859da619a))

## [1.0.128](https://github.com/alternun-development/alternun/compare/v1.0.127...v1.0.128) (2026-04-17)

### Bug Fixes

- **docs,mobile,auth:** mi-perfil, ProfileStyles ([68a3a8e](https://github.com/alternun-development/alternun/commit/68a3a8ee6982e9300751e16e207551be9490c725))
- **email:** 28 files updated ([d97e499](https://github.com/alternun-development/alternun/commit/d97e499cda5164bb1d4397fb9b36dfb859da619a))

## [1.0.127](https://github.com/alternun-development/alternun/compare/v1.0.126...v1.0.127) (2026-04-17)

### Bug Fixes

- **repo:** chore: release v1.0.126
- **repo:** test(mobile,i18n,infra): PublicLandingPage, en, es, th

## [1.0.127](https://github.com/alternun-development/alternun/compare/v1.0.126...v1.0.127) (2026-04-17)

## [1.0.126](https://github.com/alternun-development/alternun/compare/v1.0.125...v1.0.126) (2026-04-17)

### Bug Fixes

- **repo:** test(mobile,i18n,infra): PublicLandingPage, en, es, th

## [1.0.126](https://github.com/alternun-development/alternun/compare/v1.0.125...v1.0.126) (2026-04-17)

## [1.0.125](https://github.com/alternun-development/alternun/compare/v1.0.124...v1.0.125) (2026-04-17)

### Bug Fixes

- **repo:** test(mobile,i18n,infra): AuthSignInScreen, PublicLandingPage, AirsIntroExperience, en
- **repo:** chore: release v1.0.122
- **repo:** test(mobile,i18n): AuthSignInScreen, en, es, th
- **repo:** chore: release v1.0.121
- **repo:** test(infra): SSM_PARAMETERS, resolve-ssm-env, buildspec-auth-env.test

## [1.0.122](https://github.com/alternun-development/alternun/compare/v1.0.121...v1.0.122) (2026-04-17)

## [1.0.121](https://github.com/alternun-development/alternun/compare/v1.0.120...v1.0.121) (2026-04-17)

## [1.0.125](https://github.com/alternun-development/alternun/compare/v1.0.124...v1.0.125) (2026-04-17)

## [1.0.122](https://github.com/alternun-development/alternun/compare/v1.0.121...v1.0.122) (2026-04-17)

## [1.0.121](https://github.com/alternun-development/alternun/compare/v1.0.120...v1.0.121) (2026-04-17)

## [1.0.124](https://github.com/alternun-development/alternun/compare/v1.0.123...v1.0.124) (2026-04-17)

### Bug Fixes

- **repo:** chore(repo): AGENTS, CLAUDE

## [1.0.124](https://github.com/alternun-development/alternun/compare/v1.0.123...v1.0.124) (2026-04-17)

## [1.0.123](https://github.com/alternun-development/alternun/compare/v1.0.120...v1.0.123) (2026-04-17)

### Bug Fixes

- **repo:** test(mobile,i18n): PublicLandingPage, membershipMarquee.test, membershipMarquee, en
- **repo:** chore: release v1.0.122
- **repo:** fix(repo,admin,api): CHANGELOG, app, callback, explorar
- **repo:** refactor(mobile): remove "By Alternun" byline from landing page, keep only AIRS logo
- **repo:** refactor(mobile): remove "By Alternun" byline from TopNav, keep only AIRS logo

### Bug Fixes

- **mobile:** AIRS-logo-dark-2x, AIRS-logo-dark, AIRS-logo-light-2x, AIRS-logo-light ([a9c3f48](https://github.com/alternun-development/alternun/commit/a9c3f48592907cfd55dcc6f7d258550a2e4e2037))
- **mobile:** center landing cards and fix wallet link routing on mobile ([2d1fee9](https://github.com/alternun-development/alternun/commit/2d1fee98a480e4a2e473ab87a9d927de46690c57))
- **repo,admin,api:** CHANGELOG, app, callback, explorar ([dcddf89](https://github.com/alternun-development/alternun/commit/dcddf89718fdfec30a9bb7fcfe7a91c1942ba714))

### Features

- **mobile:** replace AIRS-logotipo with new AIRS-logo in landing page, add 2x desktop sizing ([afcf507](https://github.com/alternun-development/alternun/commit/afcf5075fa5eb777adf6da797be220e138040b18))
- **mobile:** replace AIRS-logotipo with new AIRS-logo in TopNav, add 2x desktop sizing ([d56064d](https://github.com/alternun-development/alternun/commit/d56064d5789d019d3186c568b52bbac98a638374))
- **mobile:** use PNG AIRS-logo assets with responsive 2x desktop sizing ([b2c2459](https://github.com/alternun-development/alternun/commit/b2c2459e46b153647e804636da9e1a292eadf6fb))

## [1.0.123](https://github.com/alternun-development/alternun/compare/v1.0.120...v1.0.123) (2026-04-17)

### Bug Fixes

- **mobile:** AIRS-logo-dark-2x, AIRS-logo-dark, AIRS-logo-light-2x, AIRS-logo-light ([a9c3f48](https://github.com/alternun-development/alternun/commit/a9c3f48592907cfd55dcc6f7d258550a2e4e2037))
- **mobile:** center landing cards and fix wallet link routing on mobile ([2d1fee9](https://github.com/alternun-development/alternun/commit/2d1fee98a480e4a2e473ab87a9d927de46690c57))
- **repo,admin,api:** CHANGELOG, app, callback, explorar ([dcddf89](https://github.com/alternun-development/alternun/commit/dcddf89718fdfec30a9bb7fcfe7a91c1942ba714))

### Features

- **mobile:** replace AIRS-logotipo with new AIRS-logo in landing page, add 2x desktop sizing ([afcf507](https://github.com/alternun-development/alternun/commit/afcf5075fa5eb777adf6da797be220e138040b18))
- **mobile:** replace AIRS-logotipo with new AIRS-logo in TopNav, add 2x desktop sizing ([d56064d](https://github.com/alternun-development/alternun/commit/d56064d5789d019d3186c568b52bbac98a638374))
- **mobile:** use PNG AIRS-logo assets with responsive 2x desktop sizing ([b2c2459](https://github.com/alternun-development/alternun/commit/b2c2459e46b153647e804636da9e1a292eadf6fb))

## [1.0.122](https://github.com/alternun-development/alternun/compare/v1.0.120...v1.0.122) (2026-04-17)

### Bug Fixes

- **repo:** fix(repo,admin,api): CHANGELOG, app, callback, explorar
- **repo:** refactor(mobile): remove "By Alternun" byline from landing page, keep only AIRS logo
- **repo:** refactor(mobile): remove "By Alternun" byline from TopNav, keep only AIRS logo
- **repo:** feat(mobile): use PNG AIRS-logo assets with responsive 2x desktop sizing
- **repo:** feat(mobile): replace AIRS-logotipo with new AIRS-logo in landing page, add 2x desktop sizing

### Bug Fixes

- **mobile:** AIRS-logo-dark-2x, AIRS-logo-dark, AIRS-logo-light-2x, AIRS-logo-light ([a9c3f48](https://github.com/alternun-development/alternun/commit/a9c3f48592907cfd55dcc6f7d258550a2e4e2037))
- **mobile:** center landing cards and fix wallet link routing on mobile ([2d1fee9](https://github.com/alternun-development/alternun/commit/2d1fee98a480e4a2e473ab87a9d927de46690c57))
- **repo,admin,api:** CHANGELOG, app, callback, explorar ([dcddf89](https://github.com/alternun-development/alternun/commit/dcddf89718fdfec30a9bb7fcfe7a91c1942ba714))

### Features

- **mobile:** replace AIRS-logotipo with new AIRS-logo in landing page, add 2x desktop sizing ([afcf507](https://github.com/alternun-development/alternun/commit/afcf5075fa5eb777adf6da797be220e138040b18))
- **mobile:** replace AIRS-logotipo with new AIRS-logo in TopNav, add 2x desktop sizing ([d56064d](https://github.com/alternun-development/alternun/commit/d56064d5789d019d3186c568b52bbac98a638374))
- **mobile:** use PNG AIRS-logo assets with responsive 2x desktop sizing ([b2c2459](https://github.com/alternun-development/alternun/commit/b2c2459e46b153647e804636da9e1a292eadf6fb))

## [1.0.122](https://github.com/alternun-development/alternun/compare/v1.0.120...v1.0.122) (2026-04-17)

### Bug Fixes

- **mobile:** AIRS-logo-dark-2x, AIRS-logo-dark, AIRS-logo-light-2x, AIRS-logo-light ([a9c3f48](https://github.com/alternun-development/alternun/commit/a9c3f48592907cfd55dcc6f7d258550a2e4e2037))
- **mobile:** center landing cards and fix wallet link routing on mobile ([2d1fee9](https://github.com/alternun-development/alternun/commit/2d1fee98a480e4a2e473ab87a9d927de46690c57))
- **repo,admin,api:** CHANGELOG, app, callback, explorar ([dcddf89](https://github.com/alternun-development/alternun/commit/dcddf89718fdfec30a9bb7fcfe7a91c1942ba714))

### Features

- **mobile:** replace AIRS-logotipo with new AIRS-logo in landing page, add 2x desktop sizing ([afcf507](https://github.com/alternun-development/alternun/commit/afcf5075fa5eb777adf6da797be220e138040b18))
- **mobile:** replace AIRS-logotipo with new AIRS-logo in TopNav, add 2x desktop sizing ([d56064d](https://github.com/alternun-development/alternun/commit/d56064d5789d019d3186c568b52bbac98a638374))
- **mobile:** use PNG AIRS-logo assets with responsive 2x desktop sizing ([b2c2459](https://github.com/alternun-development/alternun/commit/b2c2459e46b153647e804636da9e1a292eadf6fb))

## [1.0.121](https://github.com/alternun-development/alternun/compare/v1.0.120...v1.0.121) (2026-04-17)

### Bug Fixes

- **repo:** fix(mobile): AIRS-logo-dark-2x, AIRS-logo-dark, AIRS-logo-light-2x, AIRS-logo-light
- **repo:** docs(CLAUDE.md): strengthen AWS account guard protocol
- **repo:** fix(mobile): center landing cards and fix wallet link routing on mobile

### Bug Fixes

- **mobile:** AIRS-logo-dark-2x, AIRS-logo-dark, AIRS-logo-light-2x, AIRS-logo-light ([a9c3f48](https://github.com/alternun-development/alternun/commit/a9c3f48592907cfd55dcc6f7d258550a2e4e2037))
- **mobile:** center landing cards and fix wallet link routing on mobile ([2d1fee9](https://github.com/alternun-development/alternun/commit/2d1fee98a480e4a2e473ab87a9d927de46690c57))

## [1.0.121](https://github.com/alternun-development/alternun/compare/v1.0.120...v1.0.121) (2026-04-17)

### Bug Fixes

- **mobile:** AIRS-logo-dark-2x, AIRS-logo-dark, AIRS-logo-light-2x, AIRS-logo-light ([a9c3f48](https://github.com/alternun-development/alternun/commit/a9c3f48592907cfd55dcc6f7d258550a2e4e2037))
- **mobile:** center landing cards and fix wallet link routing on mobile ([2d1fee9](https://github.com/alternun-development/alternun/commit/2d1fee98a480e4a2e473ab87a9d927de46690c57))

## [1.0.120](https://github.com/alternun-development/alternun/compare/v1.0.119...v1.0.120) (2026-04-17)

### Bug Fixes

- **repo:** fix(infra): wire testnet to Better Auth in release deploy path

### Bug Fixes

- **infra:** wire testnet to Better Auth in release deploy path ([21c6951](https://github.com/alternun-development/alternun/commit/21c69513816b3b1a33d6dd754ee552e59acc98b7)), closes [#100](https://github.com/alternun-development/alternun/issues/100)

## [1.0.120](https://github.com/alternun-development/alternun/compare/v1.0.119...v1.0.120) (2026-04-17)

### Bug Fixes

- **infra:** wire testnet to Better Auth in release deploy path ([21c6951](https://github.com/alternun-development/alternun/commit/21c69513816b3b1a33d6dd754ee552e59acc98b7)), closes [#100](https://github.com/alternun-development/alternun/issues/100)

## [1.0.119](https://github.com/alternun-development/alternun/compare/v1.0.118...v1.0.119) (2026-04-17)

### Bug Fixes

- **repo:** test(infra): SSM_PARAMETERS, resolve-ssm-env, buildspec-auth-env.test

## [1.0.119](https://github.com/alternun-development/alternun/compare/v1.0.118...v1.0.119) (2026-04-17)

## [1.0.118](https://github.com/alternun-development/alternun/compare/v1.0.117...v1.0.118) (2026-04-17)

### Bug Fixes

- **repo:** test(mobile,repo,infra): build, ENV_SETUP.QUICK_REFERENCE, ENV_SETUP, mobile-env

## [1.0.118](https://github.com/alternun-development/alternun/compare/v1.0.117...v1.0.118) (2026-04-17)

## [1.0.117](https://github.com/alternun-development/alternun/compare/v1.0.116...v1.0.117) (2026-04-17)

### Bug Fixes

- **repo:** fix(mobile,auth,i18n): AuthSignInScreen, en, es, th

### Bug Fixes

- **mobile,auth,i18n:** AuthSignInScreen, en, es, th ([73eabc5](https://github.com/alternun-development/alternun/commit/73eabc5b3e04c1bc0e3cb1b04fd2ee0d49cb046c))

## [1.0.117](https://github.com/alternun-development/alternun/compare/v1.0.116...v1.0.117) (2026-04-17)

### Bug Fixes

- **mobile,auth,i18n:** AuthSignInScreen, en, es, th ([73eabc5](https://github.com/alternun-development/alternun/commit/73eabc5b3e04c1bc0e3cb1b04fd2ee0d49cb046c))

## [1.0.116](https://github.com/alternun-development/alternun/compare/v1.0.115...v1.0.116) (2026-04-16)

### Bug Fixes

- **repo:** test(repo,mobile,infra): README, mobile-env, mobile-env.test, DEPLOYMENT_FIX_SUMMARY

## [1.0.116](https://github.com/alternun-development/alternun/compare/v1.0.115...v1.0.116) (2026-04-16)

## [1.0.115](https://github.com/alternun-development/alternun/compare/v1.0.114...v1.0.115) (2026-04-16)

### Bug Fixes

- **repo:** test(api,repo): better-auth-runtime, better-auth-runtime.test, DEPLOYMENT_FIX_SUMMARY, alternun-better-auth-testnet-execution-plan

## [1.0.115](https://github.com/alternun-development/alternun/compare/v1.0.114...v1.0.115) (2026-04-16)

## [1.0.114](https://github.com/alternun-development/alternun/compare/v1.0.113...v1.0.114) (2026-04-16)

### Bug Fixes

- **repo:** fix(api,infra): enable embedded Better Auth with native Google OAuth on testnet

### Bug Fixes

- **api,infra:** enable embedded Better Auth with native Google OAuth on testnet ([01b441b](https://github.com/alternun-development/alternun/commit/01b441bfee78e75208a608eaae5a7466c9dcbf6a))

## [1.0.114](https://github.com/alternun-development/alternun/compare/v1.0.113...v1.0.114) (2026-04-16)

### Bug Fixes

- **api,infra:** enable embedded Better Auth with native Google OAuth on testnet ([01b441b](https://github.com/alternun-development/alternun/commit/01b441bfee78e75208a608eaae5a7466c9dcbf6a))

## [1.0.113](https://github.com/alternun-development/alternun/compare/v1.0.112...v1.0.113) (2026-04-16)

### Bug Fixes

- **repo:** fix(mobile): stage-aware social login mode fallback in build.sh
- **repo:** fix(infra): stage-aware authentik social login mode in SSM resolver

### Bug Fixes

- **infra:** stage-aware authentik social login mode in SSM resolver ([efe6d0b](https://github.com/alternun-development/alternun/commit/efe6d0be4a3ae78b28e18e0b8bc8acee4a3cabba))
- **mobile:** stage-aware social login mode fallback in build.sh ([79c66de](https://github.com/alternun-development/alternun/commit/79c66de37957c4126e49d28cfc89d18d1e2456cc))

## [1.0.113](https://github.com/alternun-development/alternun/compare/v1.0.112...v1.0.113) (2026-04-16)

### Bug Fixes

- **infra:** stage-aware authentik social login mode in SSM resolver ([efe6d0b](https://github.com/alternun-development/alternun/commit/efe6d0be4a3ae78b28e18e0b8bc8acee4a3cabba))
- **mobile:** stage-aware social login mode fallback in build.sh ([79c66de](https://github.com/alternun-development/alternun/commit/79c66de37957c4126e49d28cfc89d18d1e2456cc))

## [1.0.112](https://github.com/alternun-development/alternun/compare/v1.0.110...v1.0.112) (2026-04-16)

### Bug Fixes

- **repo:** fix(repo,admin,api): 6cd210d32ef36442-turbo.log, dff0bbe77b072a66-turbo.log, CHANGELOG, app
- **repo:** fix(mobile,repo): AppAuthProvider, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY, LOCAL_DEV_SETUP

### Bug Fixes

- **mobile,repo:** AppAuthProvider, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY, LOCAL_DEV_SETUP ([73fb0df](https://github.com/alternun-development/alternun/commit/73fb0dfc20b8711f5b5a671a366d12c7c11859a8))
- **repo,admin,api:** 6cd210d32ef36442-turbo.log, dff0bbe77b072a66-turbo.log, CHANGELOG, app ([6b08cbe](https://github.com/alternun-development/alternun/commit/6b08cbed236ead8489725e16ad1a3d946a1f2f2f))

## [1.0.112](https://github.com/alternun-development/alternun/compare/v1.0.110...v1.0.112) (2026-04-16)

### Bug Fixes

- **mobile,repo:** AppAuthProvider, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY, LOCAL_DEV_SETUP ([73fb0df](https://github.com/alternun-development/alternun/commit/73fb0dfc20b8711f5b5a671a366d12c7c11859a8))
- **repo,admin,api:** 6cd210d32ef36442-turbo.log, dff0bbe77b072a66-turbo.log, CHANGELOG, app ([6b08cbe](https://github.com/alternun-development/alternun/commit/6b08cbed236ead8489725e16ad1a3d946a1f2f2f))

## [1.0.111](https://github.com/alternun-development/alternun/compare/v1.0.110...v1.0.111) (2026-04-16)

### Bug Fixes

- **repo:** fix(mobile,repo): AppAuthProvider, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY, LOCAL_DEV_SETUP

### Bug Fixes

- **mobile,repo:** AppAuthProvider, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY, LOCAL_DEV_SETUP ([73fb0df](https://github.com/alternun-development/alternun/commit/73fb0dfc20b8711f5b5a671a366d12c7c11859a8))

## [1.0.111](https://github.com/alternun-development/alternun/compare/v1.0.110...v1.0.111) (2026-04-16)

### Bug Fixes

- **mobile,repo:** AppAuthProvider, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY, LOCAL_DEV_SETUP ([73fb0df](https://github.com/alternun-development/alternun/commit/73fb0dfc20b8711f5b5a671a366d12c7c11859a8))

## [1.0.110](https://github.com/alternun-development/alternun/compare/v1.0.108...v1.0.110) (2026-04-16)

### Bug Fixes

- **repo:** fix(repo,admin,api): CHANGELOG, app
- **repo:** chore(scripts): validate-aws-account
- **repo:** chore(scripts): setup-aws-account
- **repo:** fix(repo,infra,scripts): pre-commit, CLAUDE, bootstrap-ssm-parameters, release

### Bug Fixes

- **repo,admin,api:** CHANGELOG, app ([d8be55b](https://github.com/alternun-development/alternun/commit/d8be55b1343c412f8b27ce5cac2ba08674eb3095))
- **repo,infra,scripts:** pre-commit, CLAUDE, bootstrap-ssm-parameters, release ([989a409](https://github.com/alternun-development/alternun/commit/989a4097cf6a0ba1d74fc55cf738270d7c88d204))

## [1.0.110](https://github.com/alternun-development/alternun/compare/v1.0.108...v1.0.110) (2026-04-16)

### Bug Fixes

- **repo,admin,api:** CHANGELOG, app ([d8be55b](https://github.com/alternun-development/alternun/commit/d8be55b1343c412f8b27ce5cac2ba08674eb3095))
- **repo,infra,scripts:** pre-commit, CLAUDE, bootstrap-ssm-parameters, release ([989a409](https://github.com/alternun-development/alternun/commit/989a4097cf6a0ba1d74fc55cf738270d7c88d204))

## [1.0.109](https://github.com/alternun-development/alternun/compare/v1.0.108...v1.0.109) (2026-04-16)

### Bug Fixes

- **repo:** chore(scripts): validate-aws-account
- **repo:** chore(scripts): setup-aws-account
- **repo:** fix(repo,infra,scripts): pre-commit, CLAUDE, bootstrap-ssm-parameters, release

### Bug Fixes

- **repo,infra,scripts:** pre-commit, CLAUDE, bootstrap-ssm-parameters, release ([989a409](https://github.com/alternun-development/alternun/commit/989a4097cf6a0ba1d74fc55cf738270d7c88d204))

## [1.0.109](https://github.com/alternun-development/alternun/compare/v1.0.108...v1.0.109) (2026-04-16)

### Bug Fixes

- **repo,infra,scripts:** pre-commit, CLAUDE, bootstrap-ssm-parameters, release ([989a409](https://github.com/alternun-development/alternun/commit/989a4097cf6a0ba1d74fc55cf738270d7c88d204))

## [1.0.108](https://github.com/alternun-development/alternun/compare/v1.0.107...v1.0.108) (2026-04-16)

### Bug Fixes

- **repo:** fix(repo,scripts): pre-commit, CLAUDE, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY

### Bug Fixes

- **repo,scripts:** pre-commit, CLAUDE, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY ([3b699aa](https://github.com/alternun-development/alternun/commit/3b699aa81fc8af8579137cf089ae8e8436bb9d5f))

## [1.0.108](https://github.com/alternun-development/alternun/compare/v1.0.107...v1.0.108) (2026-04-16)

### Bug Fixes

- **repo,scripts:** pre-commit, CLAUDE, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY ([3b699aa](https://github.com/alternun-development/alternun/commit/3b699aa81fc8af8579137cf089ae8e8436bb9d5f))

## [1.0.107](https://github.com/alternun-development/alternun/compare/v1.0.106...v1.0.107) (2026-04-16)

### Bug Fixes

- **repo:** fix(mobile,auth,update): build, mobile-env, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY

### Bug Fixes

- **mobile,auth,update:** build, mobile-env, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY ([973fe6c](https://github.com/alternun-development/alternun/commit/973fe6cf0de22ef05700d17903dac94cc3d051fe))

## [1.0.107](https://github.com/alternun-development/alternun/compare/v1.0.106...v1.0.107) (2026-04-16)

### Bug Fixes

- **mobile,auth,update:** build, mobile-env, DEPLOYMENT_FIX_SUMMARY, ENVIRONMENT_SETUP_SUMMARY ([973fe6c](https://github.com/alternun-development/alternun/commit/973fe6cf0de22ef05700d17903dac94cc3d051fe))

## [1.0.106](https://github.com/alternun-development/alternun/compare/v1.0.105...v1.0.106) (2026-04-16)

### Bug Fixes

- **repo:** chore: release v1.0.105
- **repo:** fix(mobile): ENV_SETUP.QUICK_REFERENCE, ENV_SETUP, docs
- **repo:** docs(mobile): add comprehensive environment setup documentation

## [1.0.106](https://github.com/alternun-development/alternun/compare/v1.0.105...v1.0.106) (2026-04-16)

## [1.0.105](https://github.com/alternun-development/alternun/compare/v1.0.104...v1.0.105) (2026-04-16)

### Bug Fixes

- **repo:** fix(mobile): ENV_SETUP.QUICK_REFERENCE, ENV_SETUP, docs
- **repo:** docs(mobile): add comprehensive environment setup documentation

### Bug Fixes

- **mobile:** ENV_SETUP.QUICK_REFERENCE, ENV_SETUP, docs ([3a6f77e](https://github.com/alternun-development/alternun/commit/3a6f77ea63e7894082d18b385a867c9f196a4755))

## [1.0.105](https://github.com/alternun-development/alternun/compare/v1.0.104...v1.0.105) (2026-04-16)

### Bug Fixes

- **mobile:** ENV_SETUP.QUICK_REFERENCE, ENV_SETUP, docs ([3a6f77e](https://github.com/alternun-development/alternun/commit/3a6f77ea63e7894082d18b385a867c9f196a4755))

## [1.0.104](https://github.com/alternun-development/alternun/compare/v1.0.103...v1.0.104) (2026-04-16)

### Bug Fixes

- **repo:** fix(mobile): allow stage-specific env files to override .env values

### Bug Fixes

- **mobile:** allow stage-specific env files to override .env values ([0baf364](https://github.com/alternun-development/alternun/commit/0baf364452a1f812fc665fd5932f5ca2c8839309))

## [1.0.104](https://github.com/alternun-development/alternun/compare/v1.0.103...v1.0.104) (2026-04-16)

### Bug Fixes

- **mobile:** allow stage-specific env files to override .env values ([0baf364](https://github.com/alternun-development/alternun/commit/0baf364452a1f812fc665fd5932f5ca2c8839309))

## [1.0.103](https://github.com/alternun-development/alternun/compare/v1.0.102...v1.0.103) (2026-04-16)

### Bug Fixes

- **repo:** fix(mobile): load stage-specific env files in mobile-env.cjs
- **repo:** fix(mobile): implement stage-aware environment configuration loading

### Bug Fixes

- **mobile:** implement stage-aware environment configuration loading ([bd0be3c](https://github.com/alternun-development/alternun/commit/bd0be3cf8faa7d2071f06eaf3559f143080d96f9))
- **mobile:** load stage-specific env files in mobile-env.cjs ([6caf830](https://github.com/alternun-development/alternun/commit/6caf830b6275eb9fa7bf0c062574c12fff057047))

## [1.0.103](https://github.com/alternun-development/alternun/compare/v1.0.102...v1.0.103) (2026-04-16)

### Bug Fixes

- **mobile:** implement stage-aware environment configuration loading ([bd0be3c](https://github.com/alternun-development/alternun/commit/bd0be3cf8faa7d2071f06eaf3559f143080d96f9))
- **mobile:** load stage-specific env files in mobile-env.cjs ([6caf830](https://github.com/alternun-development/alternun/commit/6caf830b6275eb9fa7bf0c062574c12fff057047))

## [1.0.102](https://github.com/alternun-development/alternun/compare/v1.0.101...v1.0.102) (2026-04-16)

### Bug Fixes

- **repo:** fix(mobile,auth,update): mobile-env

### Bug Fixes

- **mobile,auth,update:** mobile-env ([632c1f4](https://github.com/alternun-development/alternun/commit/632c1f40c2bff58950acb7c3a1cf8966d49c64e8))

## [1.0.102](https://github.com/alternun-development/alternun/compare/v1.0.101...v1.0.102) (2026-04-16)

### Bug Fixes

- **mobile,auth,update:** mobile-env ([632c1f4](https://github.com/alternun-development/alternun/commit/632c1f40c2bff58950acb7c3a1cf8966d49c64e8))

## [1.0.101](https://github.com/alternun-development/alternun/compare/v1.0.100...v1.0.101) (2026-04-16)

### Bug Fixes

- **repo:** chore: release v1.0.100

## [1.0.101](https://github.com/alternun-development/alternun/compare/v1.0.100...v1.0.101) (2026-04-16)

## [1.0.100](https://github.com/alternun-development/alternun/compare/v1.0.99...v1.0.100) (2026-04-16)

### Bug Fixes

- **repo:** chore: release v1.0.99

## [1.0.100](https://github.com/alternun-development/alternun/compare/v1.0.99...v1.0.100) (2026-04-16)

## [1.0.99](https://github.com/alternun-development/alternun/compare/v1.0.98...v1.0.99) (2026-04-16)

### Bug Fixes

- **repo:** chore: release v1.0.98

## [1.0.99](https://github.com/alternun-development/alternun/compare/v1.0.98...v1.0.99) (2026-04-16)

## [1.0.98](https://github.com/alternun-development/alternun/compare/v1.0.97...v1.0.98) (2026-04-16)

### Bug Fixes

- **repo:** chore: release v1.0.97
- **repo:** fix(auth): use better-auth for Google social login on testnet dev stage

## [1.0.98](https://github.com/alternun-development/alternun/compare/v1.0.97...v1.0.98) (2026-04-16)

## [1.0.97](https://github.com/alternun-development/alternun/compare/v1.0.96...v1.0.97) (2026-04-16)

### Bug Fixes

- **repo:** fix(auth): use better-auth for Google social login on testnet dev stage

### Bug Fixes

- **auth:** use better-auth for Google social login on testnet dev stage ([b9fb0cd](https://github.com/alternun-development/alternun/commit/b9fb0cdbf1468ffc8144fee0c56444201cd3a9c7))

## [1.0.97](https://github.com/alternun-development/alternun/compare/v1.0.96...v1.0.97) (2026-04-16)

### Bug Fixes

- **auth:** use better-auth for Google social login on testnet dev stage ([b9fb0cd](https://github.com/alternun-development/alternun/commit/b9fb0cdbf1468ffc8144fee0c56444201cd3a9c7))

## [1.0.96](https://github.com/alternun-development/alternun/compare/v1.0.95...v1.0.96) (2026-04-16)

### Bug Fixes

- **repo:** feat(update): make release check interval configurable via EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS

### Features

- **update:** make release check interval configurable via EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS ([0b69e57](https://github.com/alternun-development/alternun/commit/0b69e57f8556837b2569e8de755c41594cb26b6c))

## [1.0.96](https://github.com/alternun-development/alternun/compare/v1.0.95...v1.0.96) (2026-04-16)

### Features

- **update:** make release check interval configurable via EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS ([0b69e57](https://github.com/alternun-development/alternun/commit/0b69e57f8556837b2569e8de755c41594cb26b6c))

## [1.0.95](https://github.com/alternun-development/alternun/compare/v1.0.94...v1.0.95) (2026-04-16)

### Bug Fixes

- **repo:** fix(mobile,auth): derive better-auth URL at runtime if not in environment

### Bug Fixes

- **mobile,auth:** derive better-auth URL at runtime if not in environment ([88de811](https://github.com/alternun-development/alternun/commit/88de8111a28628c4dd70dbfd05e05125c474fc76))

## [1.0.95](https://github.com/alternun-development/alternun/compare/v1.0.94...v1.0.95) (2026-04-16)

### Bug Fixes

- **mobile,auth:** derive better-auth URL at runtime if not in environment ([88de811](https://github.com/alternun-development/alternun/commit/88de8111a28628c4dd70dbfd05e05125c474fc76))

## [1.0.94](https://github.com/alternun-development/alternun/compare/v1.0.93...v1.0.94) (2026-04-16)

### Bug Fixes

- **repo:** fix(mobile): rename Sculpin font files to remove spaces
- **repo:** feat(mobile): apply Sculpin font to navbar links
- **repo:** feat(mobile): load Sculpin font and apply to landing overlay text
- **repo:** fix(mobile): restore overlay text and badge on landing video card

### Bug Fixes

- **mobile:** rename Sculpin font files to remove spaces ([4f7dff8](https://github.com/alternun-development/alternun/commit/4f7dff8a214e944aacd0f5457e347f5651e0032f))
- **mobile:** restore overlay text and badge on landing video card ([7ae4224](https://github.com/alternun-development/alternun/commit/7ae42243860237ca4d2a968b02c752287eaba5a6))

### Features

- **mobile:** apply Sculpin font to navbar links ([29062fe](https://github.com/alternun-development/alternun/commit/29062fecbe7389fe875625b49bad93ed8b083e44))
- **mobile:** load Sculpin font and apply to landing overlay text ([e30c322](https://github.com/alternun-development/alternun/commit/e30c322c860e09ce396b31198befe803b7ec0e3d))

## [1.0.94](https://github.com/alternun-development/alternun/compare/v1.0.93...v1.0.94) (2026-04-16)

### Bug Fixes

- **mobile:** rename Sculpin font files to remove spaces ([4f7dff8](https://github.com/alternun-development/alternun/commit/4f7dff8a214e944aacd0f5457e347f5651e0032f))
- **mobile:** restore overlay text and badge on landing video card ([7ae4224](https://github.com/alternun-development/alternun/commit/7ae42243860237ca4d2a968b02c752287eaba5a6))

### Features

- **mobile:** apply Sculpin font to navbar links ([29062fe](https://github.com/alternun-development/alternun/commit/29062fecbe7389fe875625b49bad93ed8b083e44))
- **mobile:** load Sculpin font and apply to landing overlay text ([e30c322](https://github.com/alternun-development/alternun/commit/e30c322c860e09ce396b31198befe803b7ec0e3d))

## [1.0.93](https://github.com/alternun-development/alternun/compare/v1.0.92...v1.0.93) (2026-04-16)

### Bug Fixes

- **repo:** fix(auth): allow testnet origin in better-auth trusted origins

### Bug Fixes

- **auth:** allow testnet origin in better-auth trusted origins ([bd74651](https://github.com/alternun-development/alternun/commit/bd74651a4452c54ca69728075449e4164e15f673))

## [1.0.93](https://github.com/alternun-development/alternun/compare/v1.0.92...v1.0.93) (2026-04-16)

### Bug Fixes

- **auth:** allow testnet origin in better-auth trusted origins ([bd74651](https://github.com/alternun-development/alternun/commit/bd74651a4452c54ca69728075449e4164e15f673))

## [1.0.92](https://github.com/alternun-development/alternun/compare/v1.0.91...v1.0.92) (2026-04-16)

### Bug Fixes

- **repo:** chore: stop tracking auto-generated changelog files

## [1.0.92](https://github.com/alternun-development/alternun/compare/v1.0.91...v1.0.92) (2026-04-16)

## [1.0.91](https://github.com/alternun-development/alternun/compare/v1.0.90...v1.0.91) (2026-04-16)

### Bug Fixes

- **repo:** fix(mobile): use Alternun logo for social media meta images
- **repo:** fix(mobile): correct Pexels video poster URL path
- **repo:** fix(root): correct Node version engine constraint
- **repo:** fix(update): only notify for newer versions, not downgrades

### Bug Fixes

- **mobile:** correct Pexels video poster URL path ([28c1b7a](https://github.com/alternun-development/alternun/commit/28c1b7a3575e5c0734b30cd28d8b0f12ddf23c15))
- **mobile:** use Alternun logo for social media meta images ([61b4df6](https://github.com/alternun-development/alternun/commit/61b4df65d4519c2c7bcb85c1274e267309536acc))
- **root:** correct Node version engine constraint ([f948ab0](https://github.com/alternun-development/alternun/commit/f948ab0216c6bc6d97300810a3646802fdb2f276))
- **update:** only notify for newer versions, not downgrades ([25f13b2](https://github.com/alternun-development/alternun/commit/25f13b286dd71769d89986a8d178761b25b1beec))

## [1.0.91](https://github.com/alternun-development/alternun/compare/v1.0.90...v1.0.91) (2026-04-16)

### Bug Fixes

- **mobile:** correct Pexels video poster URL path ([28c1b7a](https://github.com/alternun-development/alternun/commit/28c1b7a3575e5c0734b30cd28d8b0f12ddf23c15))
- **mobile:** use Alternun logo for social media meta images ([61b4df6](https://github.com/alternun-development/alternun/commit/61b4df65d4519c2c7bcb85c1274e267309536acc))
- **root:** correct Node version engine constraint ([f948ab0](https://github.com/alternun-development/alternun/commit/f948ab0216c6bc6d97300810a3646802fdb2f276))
- **update:** only notify for newer versions, not downgrades ([25f13b2](https://github.com/alternun-development/alternun/commit/25f13b286dd71769d89986a8d178761b25b1beec))

## [1.0.90](https://github.com/alternun-development/alternun/compare/v1.0.89...v1.0.90) (2026-04-16)

### Bug Fixes

- **repo:** docs: add EXPO_PUBLIC_BETTER_AUTH_URL and EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER to SSM parameter requirements

## [1.0.90](https://github.com/alternun-development/alternun/compare/v1.0.89...v1.0.90) (2026-04-16)

## [1.0.89](https://github.com/alternun-development/alternun/compare/v1.0.88...v1.0.89) (2026-04-16)

### Bug Fixes

- **repo:** feat(mobile, update): PWA compliance, icon assets, SEO, and robust update detection
- **repo:** chore: update CHANGELOG and changelogData

### Features

- **mobile, update:** PWA compliance, icon assets, SEO, and robust update detection ([b9e0021](https://github.com/alternun-development/alternun/commit/b9e0021192580db42c7685c021d04771f63499be))

## [1.0.89](https://github.com/alternun-development/alternun/compare/v1.0.88...v1.0.89) (2026-04-16)

### Features

- **mobile, update:** PWA compliance, icon assets, SEO, and robust update detection ([b9e0021](https://github.com/alternun-development/alternun/commit/b9e0021192580db42c7685c021d04771f63499be))

## [1.0.88](https://github.com/alternun-development/alternun/compare/v1.0.87...v1.0.88) (2026-04-16)

### Bug Fixes

- **repo:** fix(repo,docs,mobile): CHANGELOG, changelogData, check-changelog

### Bug Fixes

- **repo,docs,mobile:** CHANGELOG, changelogData, check-changelog ([cf368a1](https://github.com/alternun-development/alternun/commit/cf368a1b83ed109f7eaa862095a257cc4f71144a))

## [1.0.88](https://github.com/alternun-development/alternun/compare/v1.0.87...v1.0.88) (2026-04-16)

### Bug Fixes

- **repo,docs,mobile:** CHANGELOG, changelogData, check-changelog ([cf368a1](https://github.com/alternun-development/alternun/commit/cf368a1b83ed109f7eaa862095a257cc4f71144a))

## [1.0.87](https://github.com/alternun-development/alternun/compare/v1.0.86...v1.0.87) (2026-04-16)

### Miscellaneous

- chore(docs): CHANGELOG
- infra: sync better-auth variables from ssm parameter store for mobile builds

## [1.0.87](https://github.com/alternun-development/alternun/compare/v1.0.86...v1.0.87) (2026-04-16)

## [1.0.86](https://github.com/alternun-development/alternun/compare/v1.0.85...v1.0.86) (2026-04-16)

### Bug Fixes

- **repo,docs,mobile:** CHANGELOG, changelogData ([2a8a94b](https://github.com/alternun-development/alternun/commit/2a8a94b871fe683241a0388ab449ee7a90566e90))

## [1.0.86](https://github.com/alternun-development/alternun/compare/v1.0.85...v1.0.86) (2026-04-16)

### Bug Fixes

- **repo,docs,mobile:** CHANGELOG, changelogData ([2a8a94b](https://github.com/alternun-development/alternun/commit/2a8a94b871fe683241a0388ab449ee7a90566e90))

## [1.0.85](https://github.com/alternun-development/alternun/compare/v1.0.84...v1.0.85) (2026-04-16)

### Bug Fixes

- **infra:** ESLint prefer-nullish-coalescing fix ([commit](https://github.com/alternun-development/alternun/commit/placeholder))

## [1.0.84](https://github.com/alternun-development/alternun/compare/v1.0.82...v1.0.84) (2026-04-16)

## [1.0.84](https://github.com/alternun-development/alternun/compare/v1.0.82...v1.0.84) (2026-04-16)

### Bug Fixes

- **repo,admin,api:** CHANGELOG, app, mobile-env ([1fa63e7](https://github.com/alternun-development/alternun/commit/1fa63e7e3f88c41fc27e08696dbe6ad6c02e212f))

## [1.0.84](https://github.com/alternun-development/alternun/compare/v1.0.82...v1.0.84) (2026-04-16)

### Bug Fixes

- **repo,admin,api:** CHANGELOG, app, mobile-env ([1fa63e7](https://github.com/alternun-development/alternun/commit/1fa63e7e3f88c41fc27e08696dbe6ad6c02e212f))

## [1.0.83](https://github.com/alternun-development/alternun/compare/v1.0.82...v1.0.83) (2026-04-16)

## [1.0.83](https://github.com/alternun-development/alternun/compare/v1.0.82...v1.0.83) (2026-04-16)

## [1.0.82](https://github.com/alternun-development/alternun/compare/v1.0.79...v1.0.82) (2026-04-16)

### Bug Fixes

- **repo,admin,api:** CHANGELOG, app, build ([6039e90](https://github.com/alternun-development/alternun/commit/6039e9064b183b2969e95183331ff427f3b632d6))
- **repo,admin,api:** CHANGELOG, app, build, changelogData ([55ac4ed](https://github.com/alternun-development/alternun/commit/55ac4ed50fafb957613a5300f508a77a23b14d99))

## [1.0.82](https://github.com/alternun-development/alternun/compare/v1.0.79...v1.0.82) (2026-04-16)

### Bug Fixes

- **repo,admin,api:** CHANGELOG, app, build ([6039e90](https://github.com/alternun-development/alternun/commit/6039e9064b183b2969e95183331ff427f3b632d6))
- **repo,admin,api:** CHANGELOG, app, build, changelogData ([55ac4ed](https://github.com/alternun-development/alternun/commit/55ac4ed50fafb957613a5300f508a77a23b14d99))

## [1.0.81](https://github.com/alternun-development/alternun/compare/v1.0.79...v1.0.81) (2026-04-16)

### Bug Fixes

- **repo,admin,api:** CHANGELOG, app, build ([6039e90](https://github.com/alternun-development/alternun/commit/6039e9064b183b2969e95183331ff427f3b632d6))

## [1.0.81](https://github.com/alternun-development/alternun/compare/v1.0.79...v1.0.81) (2026-04-16)

### Bug Fixes

- **repo,admin,api:** CHANGELOG, app, build ([6039e90](https://github.com/alternun-development/alternun/commit/6039e9064b183b2969e95183331ff427f3b632d6))

## [1.0.80](https://github.com/alternun-development/alternun/compare/v1.0.79...v1.0.80) (2026-04-16)

## [1.0.80](https://github.com/alternun-development/alternun/compare/v1.0.79...v1.0.80) (2026-04-16)

## [1.0.79](https://github.com/alternun-development/alternun/compare/v1.0.78...v1.0.79) (2026-04-16)

### Bug Fixes

- **auth:** export AppAuthProvider from main index to fix undefined component error
- **mobile:** add hero section navigation buttons for "Como funciona" and "Beneficios"
- **mobile:** fix benefit cards centering on mid-size screens
- **mobile:** align hero navigation buttons with "Go to dashboard" link styling

## [1.0.78](https://github.com/alternun-development/alternun/compare/v1.0.77...v1.0.78) (2026-04-15)

### Bug Fixes

- **docs,mobile,auth:** CHANGELOG, PublicLandingPage, AirsIntroExperience, changelogData ([83934d7](https://github.com/alternun-development/alternun/commit/83934d7d35564e3ee578c10ea265b0b6f1667a74))

## [1.0.77](https://github.com/alternun-development/alternun/compare/v1.0.76...v1.0.77) (2026-04-15)

### Bug Fixes

- **auth:** remove server-only and better-auth exports from main index ([4e391d1](https://github.com/alternun-development/alternun/commit/4e391d1c161e3f7196662e78d04a73ad27057192))

## [1.0.77](https://github.com/alternun-development/alternun/compare/v1.0.76...v1.0.77) (2026-04-15)

### Bug Fixes

- **auth:** remove server-only and better-auth exports from main index ([4e391d1](https://github.com/alternun-development/alternun/commit/4e391d1c161e3f7196662e78d04a73ad27057192))

## [1.0.76](https://github.com/alternun-development/alternun/compare/v1.0.75...v1.0.76) (2026-04-15)

### Bug Fixes

- **repo:** sync auth exports and footer drawers ([74f4d70](https://github.com/alternun-development/alternun/commit/74f4d702be16695f1738a9422282cc4d7dcc9b56))

## [1.0.76](https://github.com/alternun-development/alternun/compare/v1.0.75...v1.0.76) (2026-04-15)

### Bug Fixes

- **repo:** sync auth exports and footer drawers ([74f4d70](https://github.com/alternun-development/alternun/commit/74f4d702be16695f1738a9422282cc4d7dcc9b56))

## [1.0.75](https://github.com/alternun-development/alternun/compare/v1.0.74...v1.0.75) (2026-04-15)

### Bug Fixes

- **auth:** remove server-only and better-auth exports from main index ([c7d9a48](https://github.com/alternun-development/alternun/commit/c7d9a480a22b1000ee391df88a90426e67e18661))
- **mobile:** changelogData ([44d7260](https://github.com/alternun-development/alternun/commit/44d7260ca641e9b907a27f96d7dbfbb4f09c4628))

## [1.0.75](https://github.com/alternun-development/alternun/compare/v1.0.74...v1.0.75) (2026-04-15)

### Bug Fixes

- **auth:** remove server-only and better-auth exports from main index ([c7d9a48](https://github.com/alternun-development/alternun/commit/c7d9a480a22b1000ee391df88a90426e67e18661))
- **mobile:** changelogData ([44d7260](https://github.com/alternun-development/alternun/commit/44d7260ca641e9b907a27f96d7dbfbb4f09c4628))

## [1.0.74](https://github.com/alternun-development/alternun/compare/v1.0.72...v1.0.74) (2026-04-15)

### Bug Fixes

- **auth:** remove better-auth and server-only exports to prevent web bundling ([80ec073](https://github.com/alternun-development/alternun/commit/80ec07368b8cb90da7d9ace935ce02391ea08b60))
- **docs,mobile,auth:** CHANGELOG, changelogData ([8db9657](https://github.com/alternun-development/alternun/commit/8db9657a8b6c4d5b71adc32ec219afd1ceb449a2))

## [1.0.74](https://github.com/alternun-development/alternun/compare/v1.0.72...v1.0.74) (2026-04-15)

### Bug Fixes

- **auth:** remove better-auth and server-only exports to prevent web bundling ([80ec073](https://github.com/alternun-development/alternun/commit/80ec07368b8cb90da7d9ace935ce02391ea08b60))
- **docs,mobile,auth:** CHANGELOG, changelogData ([8db9657](https://github.com/alternun-development/alternun/commit/8db9657a8b6c4d5b71adc32ec219afd1ceb449a2))

## [1.0.73](https://github.com/alternun-development/alternun/compare/v1.0.72...v1.0.73) (2026-04-15)

### Bug Fixes

- **auth:** remove better-auth and server-only exports to prevent web bundling ([4b1f25a](https://github.com/alternun-development/alternun/commit/4b1f25a7b94f897d9f43b5bcfc4dcdd8c7430db5))
- **docs,mobile,auth:** CHANGELOG, changelogData ([09d4a11](https://github.com/alternun-development/alternun/commit/09d4a11bc7dc5bb87199f4f9ab717dad58bcb40d))

## [1.0.73](https://github.com/alternun-development/alternun/compare/v1.0.72...v1.0.73) (2026-04-15)

### Bug Fixes

- **auth:** remove better-auth and server-only exports to prevent web bundling ([4b1f25a](https://github.com/alternun-development/alternun/commit/4b1f25a7b94f897d9f43b5bcfc4dcdd8c7430db5))
- **docs,mobile,auth:** CHANGELOG, changelogData ([09d4a11](https://github.com/alternun-development/alternun/commit/09d4a11bc7dc5bb87199f4f9ab717dad58bcb40d))

## [1.0.72](https://github.com/alternun-development/alternun/compare/v1.0.70...v1.0.72) (2026-04-15)

### Bug Fixes

- **auth:** remove server-only exports from main package to fix web bundling ([f2229b8](https://github.com/alternun-development/alternun/commit/f2229b8801c66e565a9f1238f74cb31b29750187))
- **docs,repo,auth:** authentication-and-session-flow, CHANGELOG, alternun-better-auth-testnet-execution-plan, .env ([be3dacb](https://github.com/alternun-development/alternun/commit/be3dacb9a4819e5b83f4cee33b81445d3e02da3c))
- **lint:** add .d.ts to lint-staged pattern ([33205d0](https://github.com/alternun-development/alternun/commit/33205d05bb24d6e7539b94941eda8e71af832a29))
- **repo:** replace deprecated audit endpoint ([0c48ae8](https://github.com/alternun-development/alternun/commit/0c48ae81cc28e220cda0e345912a226d30b35e0e))

## [1.0.72](https://github.com/alternun-development/alternun/compare/v1.0.70...v1.0.72) (2026-04-15)

### Bug Fixes

- **auth:** remove server-only exports from main package to fix web bundling ([f2229b8](https://github.com/alternun-development/alternun/commit/f2229b8801c66e565a9f1238f74cb31b29750187))
- **docs,repo,auth:** authentication-and-session-flow, CHANGELOG, alternun-better-auth-testnet-execution-plan, .env ([be3dacb](https://github.com/alternun-development/alternun/commit/be3dacb9a4819e5b83f4cee33b81445d3e02da3c))
- **lint:** add .d.ts to lint-staged pattern ([33205d0](https://github.com/alternun-development/alternun/commit/33205d05bb24d6e7539b94941eda8e71af832a29))
- **repo:** replace deprecated audit endpoint ([0c48ae8](https://github.com/alternun-development/alternun/commit/0c48ae81cc28e220cda0e345912a226d30b35e0e))

## [1.0.71](https://github.com/alternun-development/alternun/compare/v1.0.70...v1.0.71) (2026-04-15)

### Bug Fixes

- **auth:** remove server-only exports from main package to fix web bundling
- **lint:** add .d.ts to lint-staged pattern ([33205d0](https://github.com/alternun-development/alternun/commit/33205d05bb24d6e7539b94941eda8e71af832a29))
- **repo:** replace deprecated audit endpoint ([0c48ae8](https://github.com/alternun-development/alternun/commit/0c48ae81cc28e220cda0e345912a226d30b35e0e))

## [1.0.71](https://github.com/alternun-development/alternun/compare/v1.0.70...v1.0.71) (2026-04-15)

### Bug Fixes

- **auth:** remove server-only exports from main package to fix web bundling
- **lint:** add .d.ts to lint-staged pattern ([33205d0](https://github.com/alternun-development/alternun/commit/33205d05bb24d6e7539b94941eda8e71af832a29))
- **repo:** replace deprecated audit endpoint ([0c48ae8](https://github.com/alternun-development/alternun/commit/0c48ae81cc28e220cda0e345912a226d30b35e0e))

## [1.0.70](https://github.com/alternun-development/alternun/compare/v1.0.64...v1.0.70) (2026-04-15)

### Bug Fixes

- **api:** satisfy better auth dev build types ([ab2d488](https://github.com/alternun-development/alternun/commit/ab2d4884aae97f9c2cdedbfce79a95ae51a70d27))
- **auth:** sync canonical docs and mobile build ([8bd68d8](https://github.com/alternun-development/alternun/commit/8bd68d815911b5f2f861f754394e8008773c0ba1))
- canonicalize better auth public base url ([1202905](https://github.com/alternun-development/alternun/commit/12029050454408be3f7b545db9a7a910c97e4164))
- **mobile,i18n,repo:** LandingFooter, PublicLandingPage, AirsIntroExperience, en ([dbd6ac4](https://github.com/alternun-development/alternun/commit/dbd6ac4a0435fa804b0eb9973aa333db03f58699))
- **mobile:** update AppInfoFooter.links test to match current 3-link definitions ([88fd38c](https://github.com/alternun-development/alternun/commit/88fd38c3de1fa3d88ed05b8b3905a0ee061c92e5))
- **repo,admin,api:** CHANGELOG, app, changelogData ([2aab253](https://github.com/alternun-development/alternun/commit/2aab253058b154cc813686a858cd954567ed0446))
- **repo,admin,api:** CHANGELOG, app, changelogData ([b9e841d](https://github.com/alternun-development/alternun/commit/b9e841ddb4810b3abba77e1212d9ead0086e8821))

## [1.0.70](https://github.com/alternun-development/alternun/compare/v1.0.64...v1.0.70) (2026-04-15)

### Bug Fixes

- **api:** satisfy better auth dev build types ([ab2d488](https://github.com/alternun-development/alternun/commit/ab2d4884aae97f9c2cdedbfce79a95ae51a70d27))
- **auth:** sync canonical docs and mobile build ([8bd68d8](https://github.com/alternun-development/alternun/commit/8bd68d815911b5f2f861f754394e8008773c0ba1))
- canonicalize better auth public base url ([1202905](https://github.com/alternun-development/alternun/commit/12029050454408be3f7b545db9a7a910c97e4164))
- **mobile,i18n,repo:** LandingFooter, PublicLandingPage, AirsIntroExperience, en ([dbd6ac4](https://github.com/alternun-development/alternun/commit/dbd6ac4a0435fa804b0eb9973aa333db03f58699))
- **mobile:** update AppInfoFooter.links test to match current 3-link definitions ([88fd38c](https://github.com/alternun-development/alternun/commit/88fd38c3de1fa3d88ed05b8b3905a0ee061c92e5))
- **repo,admin,api:** CHANGELOG, app, changelogData ([2aab253](https://github.com/alternun-development/alternun/commit/2aab253058b154cc813686a858cd954567ed0446))
- **repo,admin,api:** CHANGELOG, app, changelogData ([b9e841d](https://github.com/alternun-development/alternun/commit/b9e841ddb4810b3abba77e1212d9ead0086e8821))

## [1.0.69](https://github.com/alternun-development/alternun/compare/v1.0.68...v1.0.69) (2026-04-15)

### Bug Fixes

- **mobile:** read the mobile env files when validating the exported web auth bundle so Better Auth builds do not fail on stale shell-only defaults
- **docs:** update the public and auth-facade docs to reflect the current Better Auth execution layer, Authentik issuer boundary, and API-origin `/auth` proxy shape

## [1.0.68](https://github.com/alternun-development/alternun/compare/v1.0.65...v1.0.68) (2026-04-15)

### Bug Fixes

- **mobile:** update AppInfoFooter.links test to match current 3-link definitions ([88fd38c](https://github.com/alternun-development/alternun/commit/88fd38c3de1fa3d88ed05b8b3905a0ee061c92e5))
- **repo,admin,api:** CHANGELOG, app, changelogData ([2aab253](https://github.com/alternun-development/alternun/commit/2aab253058b154cc813686a858cd954567ed0446))
- **repo,admin,api:** CHANGELOG, app, changelogData ([b9e841d](https://github.com/alternun-development/alternun/commit/b9e841ddb4810b3abba77e1212d9ead0086e8821))

## [1.0.68](https://github.com/alternun-development/alternun/compare/v1.0.65...v1.0.68) (2026-04-15)

### Bug Fixes

- **mobile:** update AppInfoFooter.links test to match current 3-link definitions ([88fd38c](https://github.com/alternun-development/alternun/commit/88fd38c3de1fa3d88ed05b8b3905a0ee061c92e5))
- **repo,admin,api:** CHANGELOG, app, changelogData ([2aab253](https://github.com/alternun-development/alternun/commit/2aab253058b154cc813686a858cd954567ed0446))
- **repo,admin,api:** CHANGELOG, app, changelogData ([b9e841d](https://github.com/alternun-development/alternun/commit/b9e841ddb4810b3abba77e1212d9ead0086e8821))

## [1.0.67](https://github.com/alternun-development/alternun/compare/v1.0.65...v1.0.67) (2026-04-15)

### Bug Fixes

- **mobile:** update AppInfoFooter.links test to match current 3-link definitions ([88fd38c](https://github.com/alternun-development/alternun/commit/88fd38c3de1fa3d88ed05b8b3905a0ee061c92e5))
- **repo,admin,api:** CHANGELOG, app, changelogData ([b9e841d](https://github.com/alternun-development/alternun/commit/b9e841ddb4810b3abba77e1212d9ead0086e8821))

## [1.0.67](https://github.com/alternun-development/alternun/compare/v1.0.65...v1.0.67) (2026-04-15)

### Bug Fixes

- **mobile:** update AppInfoFooter.links test to match current 3-link definitions ([88fd38c](https://github.com/alternun-development/alternun/commit/88fd38c3de1fa3d88ed05b8b3905a0ee061c92e5))
- **repo,admin,api:** CHANGELOG, app, changelogData ([b9e841d](https://github.com/alternun-development/alternun/commit/b9e841ddb4810b3abba77e1212d9ead0086e8821))

## [1.0.66](https://github.com/alternun-development/alternun/compare/v1.0.65...v1.0.66) (2026-04-15)

### Bug Fixes

- **mobile:** update AppInfoFooter.links test to match current 3-link definitions ([88fd38c](https://github.com/alternun-development/alternun/commit/88fd38c3de1fa3d88ed05b8b3905a0ee061c92e5))

## [1.0.66](https://github.com/alternun-development/alternun/compare/v1.0.65...v1.0.66) (2026-04-15)

### Bug Fixes

- **mobile:** update AppInfoFooter.links test to match current 3-link definitions ([88fd38c](https://github.com/alternun-development/alternun/commit/88fd38c3de1fa3d88ed05b8b3905a0ee061c92e5))

## [1.0.65](https://github.com/alternun-development/alternun/compare/v1.0.64...v1.0.65) (2026-04-15)

### Bug Fixes

- **api:** satisfy better auth dev build types ([ab2d488](https://github.com/alternun-development/alternun/commit/ab2d4884aae97f9c2cdedbfce79a95ae51a70d27))
- canonicalize better auth public base url ([1202905](https://github.com/alternun-development/alternun/commit/12029050454408be3f7b545db9a7a910c97e4164))
- **mobile,i18n,repo:** LandingFooter, PublicLandingPage, AirsIntroExperience, en ([dbd6ac4](https://github.com/alternun-development/alternun/commit/dbd6ac4a0435fa804b0eb9973aa333db03f58699))

## [1.0.65](https://github.com/alternun-development/alternun/compare/v1.0.64...v1.0.65) (2026-04-15)

### Bug Fixes

- **api:** satisfy better auth dev build types ([ab2d488](https://github.com/alternun-development/alternun/commit/ab2d4884aae97f9c2cdedbfce79a95ae51a70d27))
- canonicalize better auth public base url ([1202905](https://github.com/alternun-development/alternun/commit/12029050454408be3f7b545db9a7a910c97e4164))
- **mobile,i18n,repo:** LandingFooter, PublicLandingPage, AirsIntroExperience, en ([dbd6ac4](https://github.com/alternun-development/alternun/commit/dbd6ac4a0435fa804b0eb9973aa333db03f58699))

## [1.0.64](https://github.com/alternun-development/alternun/compare/v1.0.63...v1.0.64) (2026-04-15)

### Bug Fixes

- **mobile:** resolve all lint and type-check build failures ([c0fcff2](https://github.com/alternun-development/alternun/commit/c0fcff2b0b43c6d54465f3620b1409e4c7ad8546))

## [1.0.64](https://github.com/alternun-development/alternun/compare/v1.0.63...v1.0.64) (2026-04-15)

### Bug Fixes

- **mobile:** resolve all lint and type-check build failures ([c0fcff2](https://github.com/alternun-development/alternun/commit/c0fcff2b0b43c6d54465f3620b1409e4c7ad8546))

## [1.0.63](https://github.com/alternun-development/alternun/compare/v1.0.62...v1.0.63) (2026-04-12)

### Bug Fixes

- **mobile:** landing extra sections and header nav ([e25c236](https://github.com/alternun-development/alternun/commit/e25c23654a8019d2920600e93e875cd75991399f))
- **mobile:** landing nav bar styles and restore extra sections correctly ([56043fe](https://github.com/alternun-development/alternun/commit/56043fe0dbe849b916dd27b6b11391eee3d71531))
- **mobile:** restore BackToTopButton and fix forwardRef export in AirsIntroExperience ([845f47f](https://github.com/alternun-development/alternun/commit/845f47f97a4314fbd3b1befe36d776cef47c6197))
- **mobile:** restore BackToTopButton and properly type forwardRef export ([783a9ce](https://github.com/alternun-development/alternun/commit/783a9ce009a12313c60a017aca998ebb9672dfab))
- **mobile:** TopNav dropdown animations and layout width ([b36e80b](https://github.com/alternun-development/alternun/commit/b36e80b1475465f3109a9d36dd8658787b69a9c8))
- **repo,mobile,auth:** settings, airs, atn, rbi ([3e82a94](https://github.com/alternun-development/alternun/commit/3e82a94acd18e95d3da353d1ceb4d3f2951fc772))

### Features

- **mobile:** show PublicLandingPage for unauthenticated users with header nav ([57fb86d](https://github.com/alternun-development/alternun/commit/57fb86d7216ab89260dd053ed3db4c1100ff0942))

## [1.0.63](https://github.com/alternun-development/alternun/compare/v1.0.62...v1.0.63) (2026-04-12)

### Bug Fixes

- **mobile:** landing extra sections and header nav ([e25c236](https://github.com/alternun-development/alternun/commit/e25c23654a8019d2920600e93e875cd75991399f))
- **mobile:** landing nav bar styles and restore extra sections correctly ([56043fe](https://github.com/alternun-development/alternun/commit/56043fe0dbe849b916dd27b6b11391eee3d71531))
- **mobile:** restore BackToTopButton and fix forwardRef export in AirsIntroExperience ([845f47f](https://github.com/alternun-development/alternun/commit/845f47f97a4314fbd3b1befe36d776cef47c6197))
- **mobile:** restore BackToTopButton and properly type forwardRef export ([783a9ce](https://github.com/alternun-development/alternun/commit/783a9ce009a12313c60a017aca998ebb9672dfab))
- **mobile:** TopNav dropdown animations and layout width ([b36e80b](https://github.com/alternun-development/alternun/commit/b36e80b1475465f3109a9d36dd8658787b69a9c8))
- **repo,mobile,auth:** settings, airs, atn, rbi ([3e82a94](https://github.com/alternun-development/alternun/commit/3e82a94acd18e95d3da353d1ceb4d3f2951fc772))

### Features

- **mobile:** show PublicLandingPage for unauthenticated users with header nav ([57fb86d](https://github.com/alternun-development/alternun/commit/57fb86d7216ab89260dd053ed3db4c1100ff0942))

## [1.0.62](https://github.com/alternun-development/alternun/compare/v1.0.60...v1.0.62) (2026-04-11)

### Bug Fixes

- wire Better Auth social login and the legacy email/password fallback through separate execution paths
- fix changelog/version rendering for mobile, web, and docs so the release pill and history show the current version
- fix banner, drawer, and locale plumbing so update notices and legal links resolve the right origin/API in each surface

### Features

- apply Anek Latin as the default font across mobile, web, and docs
- propagate Better Auth and release env settings through infra and build scripts

## [1.0.61](https://github.com/alternun-development/alternun/compare/v1.0.59...v1.0.61) (2026-04-11)

### Bug Fixes

- dashboard footer layout - align copyright and controls on same line ([4ae9e00](https://github.com/alternun-development/alternun/commit/4ae9e0054ebcf6506e79963e9bb2b70749cf2d8a))
- **repo,admin,api:** CHANGELOG, app, changelogData ([ef8ad01](https://github.com/alternun-development/alternun/commit/ef8ad01ddcb994da34cb2e6aff89b672434bff67))

## [1.0.61](https://github.com/alternun-development/alternun/compare/v1.0.59...v1.0.61) (2026-04-11)

### Bug Fixes

- dashboard footer layout - align copyright and controls on same line ([4ae9e00](https://github.com/alternun-development/alternun/commit/4ae9e0054ebcf6506e79963e9bb2b70749cf2d8a))
- **repo,admin,api:** CHANGELOG, app, changelogData ([ef8ad01](https://github.com/alternun-development/alternun/commit/ef8ad01ddcb994da34cb2e6aff89b672434bff67))

## [1.0.60](https://github.com/alternun-development/alternun/compare/v1.0.59...v1.0.60) (2026-04-11)

### Bug Fixes

- dashboard footer layout - align copyright and controls on same line ([4ae9e00](https://github.com/alternun-development/alternun/commit/4ae9e0054ebcf6506e79963e9bb2b70749cf2d8a))

## [1.0.60](https://github.com/alternun-development/alternun/compare/v1.0.59...v1.0.60) (2026-04-11)

### Bug Fixes

- dashboard footer layout - align copyright and controls on same line ([4ae9e00](https://github.com/alternun-development/alternun/commit/4ae9e0054ebcf6506e79963e9bb2b70749cf2d8a))

## [1.0.59](https://github.com/alternun-development/alternun/compare/v1.0.58...v1.0.59) (2026-04-11)

### Bug Fixes

- fix the mobile auth bridge so the initial null session no longer triggers an Authentik logout during Better Auth Google sign-in
- make the legacy Authentik fresh-session policy execution-provider aware so Better Auth keeps the new flow end to end
- add regression coverage for the auth session bridge and provider-aware web sign-in policy

## [1.0.58](https://github.com/alternun-development/alternun/compare/v1.0.57...v1.0.58) (2026-04-11)

### Bug Fixes

- **mobile:** changelogData ([21d6a2f](https://github.com/alternun-development/alternun/commit/21d6a2f5e9f6ffa55a53f132b2e46da02b196b5a))

### Features

- add web3 login feature flag to hide connect wallet option ([aed9bf2](https://github.com/alternun-development/alternun/commit/aed9bf2f04ecbe0f0526b2f9087c2d0c548a601b))

## [1.0.58](https://github.com/alternun-development/alternun/compare/v1.0.57...v1.0.58) (2026-04-11)

### Bug Fixes

- **mobile:** changelogData ([21d6a2f](https://github.com/alternun-development/alternun/commit/21d6a2f5e9f6ffa55a53f132b2e46da02b196b5a))

### Features

- add web3 login feature flag to hide connect wallet option ([aed9bf2](https://github.com/alternun-development/alternun/commit/aed9bf2f04ecbe0f0526b2f9087c2d0c548a601b))

## [1.0.57](https://github.com/alternun-development/alternun/compare/v1.0.53...v1.0.57) (2026-04-11)

### Bug Fixes

- add i18n translations to FooterCopyright component ([880dce9](https://github.com/alternun-development/alternun/commit/880dce9aa06634976b952fcdef7676eb388167ac))
- center align mobile landing footer bottom bar in compact mode ([c50ac5a](https://github.com/alternun-development/alternun/commit/c50ac5aae4c639d0e9ec7beb4c6942f75bd130b4))
- **mobile,auth,i18n:** changelogData ([a50c703](https://github.com/alternun-development/alternun/commit/a50c703fb472cb6164d7d0da43d4b2fe2d1301df))
- **mobile:** center footer bottom bar content layout ([6b4d9b7](https://github.com/alternun-development/alternun/commit/6b4d9b7a84dde923e7700a49f79e3fe35b6721a5))
- **mobile:** show underline on hover only for privacy & terms links ([7f4aea8](https://github.com/alternun-development/alternun/commit/7f4aea8fc3ceff674cd746a4999449d8ec1eaef0))
- remove duplicate v1.0.56 changelog entry ([a974799](https://github.com/alternun-development/alternun/commit/a974799f067b8764f01b6d463f12f5181fdb5b9f))
- reorder footer icons (version first) and ensure consistent 32px heights ([fbb16a7](https://github.com/alternun-development/alternun/commit/fbb16a7e75fb6c59b6ffbfa62964bedc5129f070))
- **web:** center landing footer content ([6243466](https://github.com/alternun-development/alternun/commit/624346617b935cd3233fed751911de48416ea3e3))
- **web:** properly center landing footer and add accessibility labels ([18c0c33](https://github.com/alternun-development/alternun/commit/18c0c33a9da301123e8ade33f2f1dd1d5d9abb9f))

### Features

- **i18n,web:** add footer translations to web i18n catalogs ([ae7e2ee](https://github.com/alternun-development/alternun/commit/ae7e2ee7b9717b73c0232b4a803ce19536ecef12))
- **mobile,api:** add auth footer with policy & help drawers ([c3e3654](https://github.com/alternun-development/alternun/commit/c3e365401595bcc719521245d968ade9f02d5876))
- **mobile:** add underline effect to privacy & terms links ([4405ef0](https://github.com/alternun-development/alternun/commit/4405ef0ae41f037f61a7b7320f30d437e137d6cb))
- **web:** use proper translations in landing footer ([d1818f5](https://github.com/alternun-development/alternun/commit/d1818f57070d0d2d870e14442bfceeb305f08805))

## [1.0.57](https://github.com/alternun-development/alternun/compare/v1.0.53...v1.0.57) (2026-04-11)

### Bug Fixes

- add i18n translations to FooterCopyright component ([880dce9](https://github.com/alternun-development/alternun/commit/880dce9aa06634976b952fcdef7676eb388167ac))
- center align mobile landing footer bottom bar in compact mode ([c50ac5a](https://github.com/alternun-development/alternun/commit/c50ac5aae4c639d0e9ec7beb4c6942f75bd130b4))
- **mobile,auth,i18n:** changelogData ([a50c703](https://github.com/alternun-development/alternun/commit/a50c703fb472cb6164d7d0da43d4b2fe2d1301df))
- **mobile:** center footer bottom bar content layout ([6b4d9b7](https://github.com/alternun-development/alternun/commit/6b4d9b7a84dde923e7700a49f79e3fe35b6721a5))
- **mobile:** show underline on hover only for privacy & terms links ([7f4aea8](https://github.com/alternun-development/alternun/commit/7f4aea8fc3ceff674cd746a4999449d8ec1eaef0))
- remove duplicate v1.0.56 changelog entry ([a974799](https://github.com/alternun-development/alternun/commit/a974799f067b8764f01b6d463f12f5181fdb5b9f))
- reorder footer icons (version first) and ensure consistent 32px heights ([fbb16a7](https://github.com/alternun-development/alternun/commit/fbb16a7e75fb6c59b6ffbfa62964bedc5129f070))
- **web:** center landing footer content ([6243466](https://github.com/alternun-development/alternun/commit/624346617b935cd3233fed751911de48416ea3e3))
- **web:** properly center landing footer and add accessibility labels ([18c0c33](https://github.com/alternun-development/alternun/commit/18c0c33a9da301123e8ade33f2f1dd1d5d9abb9f))

### Features

- **i18n,web:** add footer translations to web i18n catalogs ([ae7e2ee](https://github.com/alternun-development/alternun/commit/ae7e2ee7b9717b73c0232b4a803ce19536ecef12))
- **mobile,api:** add auth footer with policy & help drawers ([c3e3654](https://github.com/alternun-development/alternun/commit/c3e365401595bcc719521245d968ade9f02d5876))
- **mobile:** add underline effect to privacy & terms links ([4405ef0](https://github.com/alternun-development/alternun/commit/4405ef0ae41f037f61a7b7320f30d437e137d6cb))
- **web:** use proper translations in landing footer ([d1818f5](https://github.com/alternun-development/alternun/commit/d1818f57070d0d2d870e14442bfceeb305f08805))

## [1.0.56](https://github.com/alternun-development/alternun/compare/v1.0.52...v1.0.56) (2026-04-11)

### Bug Fixes

- add i18n translations to FooterCopyright component ([f599b20](https://github.com/alternun-development/alternun/commit/f599b20ee183f157b42253a85b3df5269d00c85e))
- center align mobile landing footer bottom bar in compact mode ([64608f4](https://github.com/alternun-development/alternun/commit/64608f4f580872fbed1444659cef548f964e5c4c))
- **mobile,auth,i18n:** changelogData ([a9ae766](https://github.com/alternun-development/alternun/commit/a9ae766e7e0c2409a3eb5013678739e07d6206cb))
- **mobile:** center footer bottom bar content layout ([0c73add](https://github.com/alternun-development/alternun/commit/0c73add66e8ed0ee4d806ebd7d4ec1a997831a94))
- **mobile:** show underline on hover only for privacy & terms links ([6ddd9a8](https://github.com/alternun-development/alternun/commit/6ddd9a80bcc72e57be5b2f9bb3ac7f9e3605577a))
- **web:** center landing footer content ([a24dd46](https://github.com/alternun-development/alternun/commit/a24dd46a269c9a9009bfb7d8bf99a8f60e76c349))
- **web:** properly center landing footer and add accessibility labels ([9d8635f](https://github.com/alternun-development/alternun/commit/9d8635f0d119c58fd6735322f5672ec16cedf328))

### Features

- **i18n,web:** add footer translations to web i18n catalogs ([f556415](https://github.com/alternun-development/alternun/commit/f556415291ae9fc1195f38bf7cae0759407e7a9e))
- **mobile,api:** add auth footer with policy & help drawers ([3133d53](https://github.com/alternun-development/alternun/commit/3133d53d53f95df1c2eb32512b1ea5f180a8d35d))
- **mobile:** add underline effect to privacy & terms links ([e027b07](https://github.com/alternun-development/alternun/commit/e027b07577ccef08c25f93a17920b63e1ee3d54d))
- **web:** use proper translations in landing footer ([1cb8863](https://github.com/alternun-development/alternun/commit/1cb8863f7390075d7a00d586cfb5825b54f4048d))

## [1.0.52](https://github.com/alternun-development/alternun/compare/v1.0.51...v1.0.52) (2026-04-10)

### Bug Fixes

- **docs:** tags ([7d289b4](https://github.com/alternun-development/alternun/commit/7d289b48f57929974fd3091411464752f2ba3c8e))

## [1.0.52](https://github.com/alternun-development/alternun/compare/v1.0.51...v1.0.52) (2026-04-10)

### Bug Fixes

- **docs:** tags ([7d289b4](https://github.com/alternun-development/alternun/commit/7d289b48f57929974fd3091411464752f2ba3c8e))

## [1.0.51](https://github.com/alternun-development/alternun/compare/v1.0.50...v1.0.51) (2026-04-10)

### Bug Fixes

- wire Better Auth execution through mobile and web auth flows
- align infra envs and release build output with the new Better Auth testnet setup
- rebuild the auth package before Expo export so the bundled runtime picks up current auth config

## [1.0.50](https://github.com/alternun-development/alternun/compare/v1.0.48...v1.0.50) (2026-04-10)

### Bug Fixes

- **mobile:** changelogData ([71cc6cd](https://github.com/alternun-development/alternun/commit/71cc6cdec917a25b10e4f741f20e0567cf7e6748))
- prevent footer icon overlap and improve consistency ([c00508c](https://github.com/alternun-development/alternun/commit/c00508c272bd156542630eef8b6f1c9a5a052e70))
- reorder footer buttons and unify styling ([35d89a4](https://github.com/alternun-development/alternun/commit/35d89a4a5fdfe95b05695a5b102109172f5fbf21))
- **repo,admin,api:** CHANGELOG, app, changelogData ([904f885](https://github.com/alternun-development/alternun/commit/904f885abb658a4751c4b616969f3ecebc143baf))

### Features

- add landing page footer with version and help icon ([ffc265d](https://github.com/alternun-development/alternun/commit/ffc265d8c86ff960ca85acaca0d29b2468ff4d21))
- add mark as unread functionality to notifications ([6b5a696](https://github.com/alternun-development/alternun/commit/6b5a696fd69f7da6871cff77271ee4ae5e26f2f0))

## [1.0.50](https://github.com/alternun-development/alternun/compare/v1.0.48...v1.0.50) (2026-04-10)

### Bug Fixes

- **mobile:** changelogData ([71cc6cd](https://github.com/alternun-development/alternun/commit/71cc6cdec917a25b10e4f741f20e0567cf7e6748))
- prevent footer icon overlap and improve consistency ([c00508c](https://github.com/alternun-development/alternun/commit/c00508c272bd156542630eef8b6f1c9a5a052e70))
- reorder footer buttons and unify styling ([35d89a4](https://github.com/alternun-development/alternun/commit/35d89a4a5fdfe95b05695a5b102109172f5fbf21))
- **repo,admin,api:** CHANGELOG, app, changelogData ([904f885](https://github.com/alternun-development/alternun/commit/904f885abb658a4751c4b616969f3ecebc143baf))

### Features

- add landing page footer with version and help icon ([ffc265d](https://github.com/alternun-development/alternun/commit/ffc265d8c86ff960ca85acaca0d29b2468ff4d21))
- add mark as unread functionality to notifications ([6b5a696](https://github.com/alternun-development/alternun/commit/6b5a696fd69f7da6871cff77271ee4ae5e26f2f0))

## [1.0.49](https://github.com/alternun-development/alternun/compare/v1.0.48...v1.0.49) (2026-04-10)

### Bug Fixes

- **mobile:** changelogData ([71cc6cd](https://github.com/alternun-development/alternun/commit/71cc6cdec917a25b10e4f741f20e0567cf7e6748))

### Features

- add mark as unread functionality to notifications ([6b5a696](https://github.com/alternun-development/alternun/commit/6b5a696fd69f7da6871cff77271ee4ae5e26f2f0))

## [1.0.49](https://github.com/alternun-development/alternun/compare/v1.0.48...v1.0.49) (2026-04-10)

### Bug Fixes

- **mobile:** changelogData ([71cc6cd](https://github.com/alternun-development/alternun/commit/71cc6cdec917a25b10e4f741f20e0567cf7e6748))

### Features

- add mark as unread functionality to notifications ([6b5a696](https://github.com/alternun-development/alternun/commit/6b5a696fd69f7da6871cff77271ee4ae5e26f2f0))

## [1.0.48](https://github.com/alternun-development/alternun/compare/v1.0.47...v1.0.48) (2026-04-10)

### Bug Fixes

- **mobile:** changelogData ([9f37b5c](https://github.com/alternun-development/alternun/commit/9f37b5c8ccd3c4726730c06b1f09b52ca06d54a2))

### Features

- add tooltip info to notification badge ([89e3ae4](https://github.com/alternun-development/alternun/commit/89e3ae4243a85efb66b72e829ce7124c72d1d098))

## [1.0.48](https://github.com/alternun-development/alternun/compare/v1.0.47...v1.0.48) (2026-04-10)

### Bug Fixes

- **mobile:** changelogData ([9f37b5c](https://github.com/alternun-development/alternun/commit/9f37b5c8ccd3c4726730c06b1f09b52ca06d54a2))

### Features

- add tooltip info to notification badge ([89e3ae4](https://github.com/alternun-development/alternun/commit/89e3ae4243a85efb66b72e829ce7124c72d1d098))

## [1.0.47](https://github.com/alternun-development/alternun/compare/v1.0.46...v1.0.47) (2026-04-10)

### Bug Fixes

- improve notification badge styling with circular container and overlay badge ([7b73a14](https://github.com/alternun-development/alternun/commit/7b73a14561e16415980ecc5aaf63db8c8d84a136))

### Features

- Add animated counters and wallet navigation to dashboard cards ([0861a2f](https://github.com/alternun-development/alternun/commit/0861a2fbe45461a90dea9ef3b767c5aa9e971b83))
- Add view-transition effects and system theme detection to web app ([8c2f07e](https://github.com/alternun-development/alternun/commit/8c2f07e1af091a7c06d458aeebf6b9a512af66fd))
- Complete notification system upgrade with context, search filters, and actions ([a8a8848](https://github.com/alternun-development/alternun/commit/a8a884855be4012702071194e4892eea3d76b181))
- Wire up notification center navigation from dropdown ([d592c49](https://github.com/alternun-development/alternun/commit/d592c49da58510f70369cc37f60b06564723e4e4))

## [1.0.47](https://github.com/alternun-development/alternun/compare/v1.0.46...v1.0.47) (2026-04-10)

### Bug Fixes

- improve notification badge styling with circular container and overlay badge ([7b73a14](https://github.com/alternun-development/alternun/commit/7b73a14561e16415980ecc5aaf63db8c8d84a136))

### Features

- Add animated counters and wallet navigation to dashboard cards ([0861a2f](https://github.com/alternun-development/alternun/commit/0861a2fbe45461a90dea9ef3b767c5aa9e971b83))
- Add view-transition effects and system theme detection to web app ([8c2f07e](https://github.com/alternun-development/alternun/commit/8c2f07e1af091a7c06d458aeebf6b9a512af66fd))
- Complete notification system upgrade with context, search filters, and actions ([a8a8848](https://github.com/alternun-development/alternun/commit/a8a884855be4012702071194e4892eea3d76b181))
- Wire up notification center navigation from dropdown ([d592c49](https://github.com/alternun-development/alternun/commit/d592c49da58510f70369cc37f60b06564723e4e4))

## [1.0.46](https://github.com/alternun-development/alternun/compare/v1.0.44...v1.0.46) (2026-04-10)

### Bug Fixes

- **mobile:** changelogData ([143c63a](https://github.com/alternun-development/alternun/commit/143c63a2abe0eed8e53660c6b6171a86f8c7bc40))

## [1.0.46](https://github.com/alternun-development/alternun/compare/v1.0.44...v1.0.46) (2026-04-10)

### Bug Fixes

- **mobile:** changelogData ([143c63a](https://github.com/alternun-development/alternun/commit/143c63a2abe0eed8e53660c6b6171a86f8c7bc40))

## [1.0.45](https://github.com/alternun-development/alternun/compare/v1.0.44...v1.0.45) (2026-04-10)

### Features

- **admin:** add OIDC client wrapper for Authentik-based authentication flow
- **admin:** add app-shell with sidebar navigation structure
- **admin:** add forbidden-page for access denied scenarios

### Bug Fixes

- **api:** fix callback-page flow for OIDC token exchange

## [1.0.44](https://github.com/alternun-development/alternun/compare/v1.0.43...v1.0.44) (2026-04-10)

### Bug Fixes

- refactor `packages/auth` into a facade/provider model with Better Auth execution and Authentik issuer exchange
- keep the docs CMS auth relay browser-safe by avoiding the package-root auth import
- sync generated auth release artifacts for the new release flow

## [1.0.43](https://github.com/alternun-development/alternun/compare/v1.0.42...v1.0.43) (2026-04-10)

### Bug Fixes

- hide scroll arrows when not needed in horizontal scroller ([4752b43](https://github.com/alternun-development/alternun/commit/4752b4322700587ea6a753c3a5b526769e389a2e))
- improve mobile PWA behavior and show full app name on topbar ([7bb5d90](https://github.com/alternun-development/alternun/commit/7bb5d90cfe2303f1134f0f4400ba7df7990bf086))
- resolve eslint errors with trailing commas and type safety ([14e99b4](https://github.com/alternun-development/alternun/commit/14e99b45d5caa4fa11408e6bab66fabf13360e85))
- restore footer copyright text with hover underline on Alternun link ([6261869](https://github.com/alternun-development/alternun/commit/6261869977cf655be2566d9c942bd93e5c1f1075))
- restore trailing commas and formatting after prettier ([77958bf](https://github.com/alternun-development/alternun/commit/77958bf33d5a0ab4d403e5b9542b1235a53ab990))
- upgrade mobile footer layout with improved spacing and smaller social icons ([7a38e78](https://github.com/alternun-development/alternun/commit/7a38e78c2dcf3082d0237f08f866324f18667451))

### Features

- add modern KPI card component and update copyright link ([0d0d255](https://github.com/alternun-development/alternun/commit/0d0d255a5323dd9e0a93d8b16b2083e8924759b3))
- add standalone notification center page ([6aa375f](https://github.com/alternun-development/alternun/commit/6aa375fb9e4b4532dcc25ec04e2ff4356b8f3e6e))

## [1.0.43](https://github.com/alternun-development/alternun/compare/v1.0.42...v1.0.43) (2026-04-10)

### Bug Fixes

- hide scroll arrows when not needed in horizontal scroller ([4752b43](https://github.com/alternun-development/alternun/commit/4752b4322700587ea6a753c3a5b526769e389a2e))
- improve mobile PWA behavior and show full app name on topbar ([7bb5d90](https://github.com/alternun-development/alternun/commit/7bb5d90cfe2303f1134f0f4400ba7df7990bf086))
- resolve eslint errors with trailing commas and type safety ([14e99b4](https://github.com/alternun-development/alternun/commit/14e99b45d5caa4fa11408e6bab66fabf13360e85))
- restore footer copyright text with hover underline on Alternun link ([6261869](https://github.com/alternun-development/alternun/commit/6261869977cf655be2566d9c942bd93e5c1f1075))
- restore trailing commas and formatting after prettier ([77958bf](https://github.com/alternun-development/alternun/commit/77958bf33d5a0ab4d403e5b9542b1235a53ab990))
- upgrade mobile footer layout with improved spacing and smaller social icons ([7a38e78](https://github.com/alternun-development/alternun/commit/7a38e78c2dcf3082d0237f08f866324f18667451))

### Features

- add modern KPI card component and update copyright link ([0d0d255](https://github.com/alternun-development/alternun/commit/0d0d255a5323dd9e0a93d8b16b2083e8924759b3))
- add standalone notification center page ([6aa375f](https://github.com/alternun-development/alternun/commit/6aa375fb9e4b4532dcc25ec04e2ff4356b8f3e6e))

## [1.0.42](https://github.com/alternun-development/alternun/compare/v1.0.40...v1.0.42) (2026-04-10)

### Bug Fixes

- **infra:** auto-allow protected instance replacement when deployment changes require it ([7813aac](https://github.com/alternun-development/alternun/commit/7813aac9a2e9dbf3224756b31f0d73dc8019e3ac))
- **mobile,ui,repo:** app, HeroPanel, .versioning ([138f80b](https://github.com/alternun-development/alternun/commit/138f80b82435849f9a015dc2cd5936cfb30f1244))
- **mobile,ui:** add ShieldCheckIcon, enhance cards, and fix tooltip z-index ([d9ad72a](https://github.com/alternun-development/alternun/commit/d9ad72ae223e441b95c2a707367d5072b1fda2cf))
- **mobile:** improve tooltip visibility and layering ([8a745be](https://github.com/alternun-development/alternun/commit/8a745beda0f93e6e856b7f96378f0bf50478150e))
- **mobile:** open settings dropdown by default in TopNav ([64e84d7](https://github.com/alternun-development/alternun/commit/64e84d7681a8366224cc737443c2f47ea7714ce5))
- **mobile:** single-line page header with safe tooltip positioning ([e5ad469](https://github.com/alternun-development/alternun/commit/e5ad46904d99764365284d96de0de6180d7c46b8))

### Features

- **mobile:** add navbar-consistent icons to page headers ([8d7fdd1](https://github.com/alternun-development/alternun/commit/8d7fdd1907e27807d09c642fd9efb2962fabb63c))
- **mobile:** consolidate navigation into 3 tab-based views ([115d551](https://github.com/alternun-development/alternun/commit/115d55144482779e90d8bea7151cbbfa0f137318))
- **ui:** add elegant spring animations to StatCard ([befb082](https://github.com/alternun-development/alternun/commit/befb08298315349f15e5676fcf6f5ab1d7e198c6))

## [1.0.41](https://github.com/alternun-development/alternun/compare/v1.0.40...v1.0.41) (2026-04-10)

### Features

- **mobile:** consolidate navigation into 3 tab-based views - Consolidate 7 separate pages into 3 modern tab-based views (Explorar, Portafolio, Mi Perfil) with responsive tab bar, elegant hover tooltips, and spring animations

### Bug Fixes

- **mobile,ui,repo:** app, HeroPanel, .versioning ([138f80b](https://github.com/alternun-development/alternun/commit/138f80b82435849f9a015dc2cd5936cfb30f1244))

## [1.0.41](https://github.com/alternun-development/alternun/compare/v1.0.40...v1.0.41) (2026-04-10)

### Features

- **mobile:** consolidate navigation into 3 tab-based views - Consolidate 7 separate pages into 3 modern tab-based views (Explorar, Portafolio, Mi Perfil) with responsive tab bar, elegant hover tooltips, and spring animations

### Bug Fixes

- **mobile,ui,repo:** app, HeroPanel, .versioning ([138f80b](https://github.com/alternun-development/alternun/commit/138f80b82435849f9a015dc2cd5936cfb30f1244))

## [1.0.40](https://github.com/alternun-development/alternun/compare/v1.0.39...v1.0.40) (2026-04-07)

### Bug Fixes

- consolidate ts-expect-error comment ([cb6d190](https://github.com/alternun-development/alternun/commit/cb6d19063223a497c652440605f01dabc237dc3d))
- increase tooltip width while maintaining center positioning, add return type ([6fe3988](https://github.com/alternun-development/alternun/commit/6fe398858b7164d200b0f807a8772eecf82e1683))

## [1.0.39](https://github.com/alternun-development/alternun/compare/v1.0.38...v1.0.39) (2026-04-07)

### Bug Fixes

- move tooltip inside card bounds, near icon ([c0247d7](https://github.com/alternun-development/alternun/commit/c0247d700d893258708ab6aea0d9c9a47388f6ae))

## [1.0.39](https://github.com/alternun-development/alternun/compare/v1.0.38...v1.0.39) (2026-04-07)

### Bug Fixes

- move tooltip inside card bounds, near icon ([c0247d7](https://github.com/alternun-development/alternun/commit/c0247d700d893258708ab6aea0d9c9a47388f6ae))

## [1.0.38](https://github.com/alternun-development/alternun/compare/v1.0.37...v1.0.38) (2026-04-07)

### Bug Fixes

- adjust tooltip position closer to icon view ([a1f27e8](https://github.com/alternun-development/alternun/commit/a1f27e8b30a41ddf4c002117cee508d5d8089a30))
- position tooltip top-right of icon, tighter ([1e90e77](https://github.com/alternun-development/alternun/commit/1e90e776ebd6c481ff879bf48d25bdedc7552da7))

## [1.0.38](https://github.com/alternun-development/alternun/compare/v1.0.37...v1.0.38) (2026-04-07)

### Bug Fixes

- adjust tooltip position closer to icon view ([a1f27e8](https://github.com/alternun-development/alternun/commit/a1f27e8b30a41ddf4c002117cee508d5d8089a30))
- position tooltip top-right of icon, tighter ([1e90e77](https://github.com/alternun-development/alternun/commit/1e90e776ebd6c481ff879bf48d25bdedc7552da7))

## [1.0.37](https://github.com/alternun-development/alternun/compare/v1.0.34...v1.0.37) (2026-04-07)

### Bug Fixes

- move tooltip above icon, closer to top ([da9693f](https://github.com/alternun-development/alternun/commit/da9693f64cfee90ed3a35c38d0e7b79ce852bebd))

### Features

- add web hover tooltip trigger for info icon ([6c6663f](https://github.com/alternun-development/alternun/commit/6c6663f9de50dc9a0ae5bc4f3284880eb597de66))

## [1.0.37](https://github.com/alternun-development/alternun/compare/v1.0.34...v1.0.37) (2026-04-07)

### Bug Fixes

- move tooltip above icon, closer to top ([da9693f](https://github.com/alternun-development/alternun/commit/da9693f64cfee90ed3a35c38d0e7b79ce852bebd))

### Features

- add web hover tooltip trigger for info icon ([6c6663f](https://github.com/alternun-development/alternun/commit/6c6663f9de50dc9a0ae5bc4f3284880eb597de66))

## [1.0.36](https://github.com/alternun-development/alternun/compare/v1.0.34...v1.0.36) (2026-04-07)

### Features

- add web hover tooltip trigger for info icon ([6c6663f](https://github.com/alternun-development/alternun/commit/6c6663f9de50dc9a0ae5bc4f3284880eb597de66))

## [1.0.36](https://github.com/alternun-development/alternun/compare/v1.0.34...v1.0.36) (2026-04-07)

### Features

- add web hover tooltip trigger for info icon ([6c6663f](https://github.com/alternun-development/alternun/commit/6c6663f9de50dc9a0ae5bc4f3284880eb597de66))

## [1.0.35](https://github.com/alternun-development/alternun/compare/v1.0.34...v1.0.35) (2026-04-07)

### Features

- add web hover tooltip trigger for info icon ([e3780ee](https://github.com/alternun-development/alternun/commit/e3780ee66eadfc4d87c3ee8987dc6b8884547def))

## [1.0.35](https://github.com/alternun-development/alternun/compare/v1.0.34...v1.0.35) (2026-04-07)

### Features

- add web hover tooltip trigger for info icon ([e3780ee](https://github.com/alternun-development/alternun/commit/e3780ee66eadfc4d87c3ee8987dc6b8884547def))

## [1.0.34](https://github.com/alternun-development/alternun/compare/v1.0.33...v1.0.34) (2026-04-07)

### Bug Fixes

- move tooltip closer to info icon with float animation ([e497f40](https://github.com/alternun-development/alternun/commit/e497f40d0d574e6e158af1257a53684866053ab5))

## [1.0.34](https://github.com/alternun-development/alternun/compare/v1.0.33...v1.0.34) (2026-04-07)

### Bug Fixes

- move tooltip closer to info icon with float animation ([e497f40](https://github.com/alternun-development/alternun/commit/e497f40d0d574e6e158af1257a53684866053ab5))

## [1.0.33](https://github.com/alternun-development/alternun/compare/v1.0.32...v1.0.33) (2026-04-07)

### Bug Fixes

- improve tooltip positioning, time display, and visual polish ([7618e18](https://github.com/alternun-development/alternun/commit/7618e18))

## [1.0.32](https://github.com/alternun-development/alternun/compare/v1.0.31...v1.0.32) (2026-04-07)

### Bug Fixes

- improve tooltip positioning, z-index layering, and last-update timestamp ([963223b](https://github.com/alternun-development/alternun/commit/963223b322801f496325e3fd53266456824bd7f5))

## [1.0.32](https://github.com/alternun-development/alternun/compare/v1.0.31...v1.0.32) (2026-04-07)

### Bug Fixes

- improve tooltip positioning, z-index layering, and last-update timestamp ([963223b](https://github.com/alternun-development/alternun/commit/963223b322801f496325e3fd53266456824bd7f5))

## [1.0.31](https://github.com/alternun-development/alternun/compare/v1.0.30...v1.0.31) (2026-04-07)

### Bug Fixes

- **release:** sync mobile changelog data ([c98382d](https://github.com/alternun-development/alternun/commit/c98382d3fe447cf8b63ed2ffd564c20d1e043b7d))

## [1.0.31](https://github.com/alternun-development/alternun/compare/v1.0.30...v1.0.31) (2026-04-07)

### Bug Fixes

- **release:** sync mobile changelog data ([c98382d](https://github.com/alternun-development/alternun/commit/c98382d3fe447cf8b63ed2ffd564c20d1e043b7d))

## [1.0.30](https://github.com/alternun-development/alternun/compare/v1.0.29...v1.0.30) (2026-04-07)

### Bug Fixes

- **mobile,auth,ui:** AppInfoFooter, Footer.shared, LandingFooter, Tooltip ([ed3db36](https://github.com/alternun-development/alternun/commit/ed3db36ee181dfdfbba7702217a962556146cbfa))
- **release:** sync mobile changelog data ([8e103c7](https://github.com/alternun-development/alternun/commit/8e103c7ac331f277bdbc56d9165398c4634d2ad6))

### Features

- implement cross-platform tooltip system with status update info ([c37bcac](https://github.com/alternun-development/alternun/commit/c37bcac7a7b7c394c4da76dcafad174361a48f31))

## [1.0.30](https://github.com/alternun-development/alternun/compare/v1.0.29...v1.0.30) (2026-04-07)

### Bug Fixes

- **mobile,auth,ui:** AppInfoFooter, Footer.shared, LandingFooter, Tooltip ([ed3db36](https://github.com/alternun-development/alternun/commit/ed3db36ee181dfdfbba7702217a962556146cbfa))
- **release:** sync mobile changelog data ([8e103c7](https://github.com/alternun-development/alternun/commit/8e103c7ac331f277bdbc56d9165398c4634d2ad6))

### Features

- implement cross-platform tooltip system with status update info ([c37bcac](https://github.com/alternun-development/alternun/commit/c37bcac7a7b7c394c4da76dcafad174361a48f31))

## [1.0.29](https://github.com/alternun-development/alternun/compare/v1.0.28...v1.0.29) (2026-04-07)

### Bug Fixes

- **mobile:** SearchFilterBar, ActivityFeed ([f1da5a5](https://github.com/alternun-development/alternun/commit/f1da5a5cce98214ee0f3eb19ac9468c77b23b844))
- **release:** dedupe v1.0.28 changelog ([4bae2c6](https://github.com/alternun-development/alternun/commit/4bae2c6b5f583206a958ba59bb05ec7ee6df7bcb))

## [1.0.29](https://github.com/alternun-development/alternun/compare/v1.0.28...v1.0.29) (2026-04-07)

### Bug Fixes

- **mobile:** SearchFilterBar, ActivityFeed ([f1da5a5](https://github.com/alternun-development/alternun/commit/f1da5a5cce98214ee0f3eb19ac9468c77b23b844))
- **release:** dedupe v1.0.28 changelog ([4bae2c6](https://github.com/alternun-development/alternun/commit/4bae2c6b5f583206a958ba59bb05ec7ee6df7bcb))

## [1.0.28](https://github.com/alternun-development/alternun/compare/v1.0.27...v1.0.28) (2026-04-07)

### Bug Fixes

- **mobile,ui:** AppInfoFooter, BackToTopButton, ScreenShell, Dashboard ([a6ea41d](https://github.com/alternun-development/alternun/commit/a6ea41df9fda8c882fbbe63b0e64ea0b19f5ba76))

## [1.0.27](https://github.com/alternun-development/alternun/compare/v1.0.26...v1.0.27) (2026-04-07)

### Bug Fixes

- **mobile,ui:** AppInfoFooter, Footer.shared, LandingFooter, DashboardSummaryCards ([a9707f8](https://github.com/alternun-development/alternun/commit/a9707f8ce6b5042c5474151359c14677483e8878))

## [1.0.26](https://github.com/alternun-development/alternun/compare/v1.0.27...v1.0.26) (2026-04-07)

### Bug Fixes

- **auth,update,repo:** research_prompt_20260407_011629 ([2aa71d7](https://github.com/alternun-development/alternun/commit/2aa71d7bacb7221c1438e7a2d55522efdb7b10d8))
- optimize mobile UI layout and fix responsive issues ([f0618aa](https://github.com/alternun-development/alternun/commit/f0618aa147cbc99b219073b6745b7c2c3c8d78af))

### Features

- add reload icon and skeleton loading to HeroPanel ([29e8902](https://github.com/alternun-development/alternun/commit/29e8902a7a263603548690e87be9b03643ba413e))
- implement complete reload system with pull-to-refresh and visible reload button ([b78116b](https://github.com/alternun-development/alternun/commit/b78116bb35d07349a19a1e58669b660e02bec37e))

## [1.0.26](https://github.com/alternun-development/alternun/compare/v1.0.27...v1.0.26) (2026-04-07)

### Bug Fixes

- **auth,update,repo:** research_prompt_20260407_011629 ([2aa71d7](https://github.com/alternun-development/alternun/commit/2aa71d7bacb7221c1438e7a2d55522efdb7b10d8))
- optimize mobile UI layout and fix responsive issues ([f0618aa](https://github.com/alternun-development/alternun/commit/f0618aa147cbc99b219073b6745b7c2c3c8d78af))

### Features

- add reload icon and skeleton loading to HeroPanel ([29e8902](https://github.com/alternun-development/alternun/commit/29e8902a7a263603548690e87be9b03643ba413e))
- implement complete reload system with pull-to-refresh and visible reload button ([b78116b](https://github.com/alternun-development/alternun/commit/b78116bb35d07349a19a1e58669b660e02bec37e))

## [1.0.25](https://github.com/alternun-development/alternun/compare/v1.0.27...v1.0.25) (2026-04-07)

### Features

- add reload icon and skeleton loading to HeroPanel ([29e8902](https://github.com/alternun-development/alternun/commit/29e8902a7a263603548690e87be9b03643ba413e))
- implement complete reload system with pull-to-refresh and visible reload button ([b78116b](https://github.com/alternun-development/alternun/commit/b78116bb35d07349a19a1e58669b660e02bec37e))

## [1.0.25](https://github.com/alternun-development/alternun/compare/v1.0.27...v1.0.25) (2026-04-07)

### Features

- add reload icon and skeleton loading to HeroPanel ([29e8902](https://github.com/alternun-development/alternun/commit/29e8902a7a263603548690e87be9b03643ba413e))
- implement complete reload system with pull-to-refresh and visible reload button ([b78116b](https://github.com/alternun-development/alternun/commit/b78116bb35d07349a19a1e58669b660e02bec37e))

## [1.0.25-dev.1](https://github.com/alternun-development/alternun/compare/v1.0.25...v1.0.25-dev.1) (2026-04-06)

### Bug Fixes

- **admin,docs,mobile:** README, authProvider, page, router ([98ea507](https://github.com/alternun-development/alternun/commit/98ea5071f44a7ea0176fc9c64566d2b00fe250fb))

## [1.0.25-dev.1](https://github.com/alternun-development/alternun/compare/v1.0.25...v1.0.25-dev.1) (2026-04-06)

### Bug Fixes

- **admin,docs,mobile:** README, authProvider, page, router ([98ea507](https://github.com/alternun-development/alternun/commit/98ea5071f44a7ea0176fc9c64566d2b00fe250fb))

## [1.0.25](https://github.com/alternun-development/alternun/compare/v1.0.24...v1.0.25) (2026-04-06)

### Bug Fixes

- **ci:** sync changelog parser and lockfile ([2542848](https://github.com/alternun-development/alternun/commit/25428486ccf1bcaa2c419efeb0223fc1c75134ce))
- **mobile:** embed changelog data for reliable loading in all environments ([7e38a63](https://github.com/alternun-development/alternun/commit/7e38a63b5a535757c502cc5aad2cf5a6d8a9e643))
- **mobile:** make footer links test-safe ([3a159f2](https://github.com/alternun-development/alternun/commit/3a159f2a9b1f29ed460a8415af1bd0ddc4e43cb2))

## [1.0.25](https://github.com/alternun-development/alternun/compare/v1.0.24...v1.0.25) (2026-04-06)

### Bug Fixes

- **ci:** sync changelog parser and lockfile ([2542848](https://github.com/alternun-development/alternun/commit/25428486ccf1bcaa2c419efeb0223fc1c75134ce))
- **mobile:** embed changelog data for reliable loading in all environments ([7e38a63](https://github.com/alternun-development/alternun/commit/7e38a63b5a535757c502cc5aad2cf5a6d8a9e643))
- **mobile:** make footer links test-safe ([3a159f2](https://github.com/alternun-development/alternun/commit/3a159f2a9b1f29ed460a8415af1bd0ddc4e43cb2))

## [1.0.24](https://github.com/alternun-development/alternun/compare/v1.0.23...v1.0.24) (2026-04-06)

### Bug Fixes

- **repo,docs:** .gitignore, auth ([99bdb97](https://github.com/alternun-development/alternun/commit/99bdb974cc50eb46e50215772ddc82f8a9280025))

## [1.0.24](https://github.com/alternun-development/alternun/compare/v1.0.23...v1.0.24) (2026-04-06)

### Bug Fixes

- **repo,docs:** .gitignore, auth ([99bdb97](https://github.com/alternun-development/alternun/commit/99bdb974cc50eb46e50215772ddc82f8a9280025))

## [1.0.23](https://github.com/alternun-development/alternun/compare/v1.0.22...v1.0.23) (2026-04-06)

### Bug Fixes

- **admin,docs,infra:** README, authProvider, authentication-and-session-flow, .env ([e75e896](https://github.com/alternun-development/alternun/commit/e75e8969f3ae1c2c0ef3c500e38ddb3b63b3339b))

## [1.0.23](https://github.com/alternun-development/alternun/compare/v1.0.22...v1.0.23) (2026-04-06)

### Bug Fixes

- **admin,docs,infra:** README, authProvider, authentication-and-session-flow, .env ([e75e896](https://github.com/alternun-development/alternun/commit/e75e8969f3ae1c2c0ef3c500e38ddb3b63b3339b))

## [1.0.22](https://github.com/alternun-development/alternun/compare/v1.0.21...v1.0.22) (2026-04-06)

### Bug Fixes

- **mobile:** improve changelog loading fallback for all environments ([cbee46c](https://github.com/alternun-development/alternun/commit/cbee46cff3f368f358e3b7ba83379e63574684c9))

## [1.0.22](https://github.com/alternun-development/alternun/compare/v1.0.21...v1.0.22) (2026-04-06)

### Bug Fixes

- **mobile:** improve changelog loading fallback for all environments ([cbee46c](https://github.com/alternun-development/alternun/commit/cbee46cff3f368f358e3b7ba83379e63574684c9))

## [1.0.21](https://github.com/alternun-development/alternun/compare/v1.0.20...v1.0.21) (2026-04-06)

### Bug Fixes

- **mobile:** show version number on changelog drawer trigger pill ([557d825](https://github.com/alternun-development/alternun/commit/557d8255e8299ca9358a4b83ccf3988469b23086))
- **mobile:** use localhost URLs for docs and project links in development ([341801d](https://github.com/alternun-development/alternun/commit/341801dec2c993828811b34f98faf31c8aa69207))
- **ui:** fix modal expansion and add direct GitHub tag links ([b253d8e](https://github.com/alternun-development/alternun/commit/b253d8e98e68302236844121518ffdc25265ba02))
- **ui:** improve ChangelogDrawer sheet expansion and header display ([ef632ae](https://github.com/alternun-development/alternun/commit/ef632ae1f78f7dcdd318ea6a1dd43060367ce306))

### Features

- **docs:** integrate ChangelogDrawer into Docusaurus footer ([40437ed](https://github.com/alternun-development/alternun/commit/40437edfdac4ca5cb7a0f21ee8d20af117885430))
- **mobile:** comprehensive responsive design improvements ([773dc91](https://github.com/alternun-development/alternun/commit/773dc9191a3af320ff8be650e9aeddd48d87d953))
- **mobile:** integrate ChangelogDrawer into landing and app footers ([86e880b](https://github.com/alternun-development/alternun/commit/86e880b537e541b81634eb4d787bff1f2aa11fc7))
- **ui,release:** add ChangelogDrawer component and empty-changelog guard ([957038d](https://github.com/alternun-development/alternun/commit/957038d3c98abbe914958c5d5424a4eac1b6fdc4))

## [1.0.21](https://github.com/alternun-development/alternun/compare/v1.0.20...v1.0.21) (2026-04-06)

### Bug Fixes

- **mobile:** show version number on changelog drawer trigger pill ([557d825](https://github.com/alternun-development/alternun/commit/557d8255e8299ca9358a4b83ccf3988469b23086))
- **mobile:** use localhost URLs for docs and project links in development ([341801d](https://github.com/alternun-development/alternun/commit/341801dec2c993828811b34f98faf31c8aa69207))
- **ui:** fix modal expansion and add direct GitHub tag links ([b253d8e](https://github.com/alternun-development/alternun/commit/b253d8e98e68302236844121518ffdc25265ba02))
- **ui:** improve ChangelogDrawer sheet expansion and header display ([ef632ae](https://github.com/alternun-development/alternun/commit/ef632ae1f78f7dcdd318ea6a1dd43060367ce306))

### Features

- **docs:** integrate ChangelogDrawer into Docusaurus footer ([40437ed](https://github.com/alternun-development/alternun/commit/40437edfdac4ca5cb7a0f21ee8d20af117885430))
- **mobile:** comprehensive responsive design improvements ([773dc91](https://github.com/alternun-development/alternun/commit/773dc9191a3af320ff8be650e9aeddd48d87d953))
- **mobile:** integrate ChangelogDrawer into landing and app footers ([86e880b](https://github.com/alternun-development/alternun/commit/86e880b537e541b81634eb4d787bff1f2aa11fc7))
- **ui,release:** add ChangelogDrawer component and empty-changelog guard ([957038d](https://github.com/alternun-development/alternun/commit/957038d3c98abbe914958c5d5424a4eac1b6fdc4))

## [1.0.20](https://github.com/alternun-development/alternun/compare/v1.0.19...v1.0.20) (2026-04-06)

### Bug Fixes

- **infra:** README, shared, identity-resources, bootstrap-authentik-integrations ([47c7006](https://github.com/alternun-development/alternun/commit/47c70064e9618c9155a1f928700a753089507370))

## [1.0.20](https://github.com/alternun-development/alternun/compare/v1.0.19...v1.0.20) (2026-04-06)

### Bug Fixes

- **infra:** README, shared, identity-resources, bootstrap-authentik-integrations ([47c7006](https://github.com/alternun-development/alternun/commit/47c70064e9618c9155a1f928700a753089507370))

## [1.0.19](https://github.com/alternun-development/alternun/compare/v1.0.18...v1.0.19) (2026-04-06)

### Bug Fixes

- **security:** remove regex from browser origin normalization ([919ff18](https://github.com/alternun-development/alternun/commit/919ff180f221de09feea06be104b0f91b1051f5a))

## [1.0.19](https://github.com/alternun-development/alternun/compare/v1.0.18...v1.0.19) (2026-04-06)

### Bug Fixes

- **security:** remove regex from browser origin normalization ([919ff18](https://github.com/alternun-development/alternun/commit/919ff180f221de09feea06be104b0f91b1051f5a))

## [1.0.18](https://github.com/alternun-development/alternun/compare/v1.0.17...v1.0.18) (2026-04-05)

## [1.0.18](https://github.com/alternun-development/alternun/compare/v1.0.17...v1.0.18) (2026-04-05)

## [1.0.17](https://github.com/alternun-development/alternun/compare/v1.0.16...v1.0.17) (2026-04-05)

### Bug Fixes

- **repo,docs,mobile:** AGENTS, CLAUDE, README, authentication-and-session-flow ([01f04c7](https://github.com/alternun-development/alternun/commit/01f04c7aabda74785953f1636de8bcf1ca958797))

## [1.0.17](https://github.com/alternun-development/alternun/compare/v1.0.16...v1.0.17) (2026-04-05)

### Bug Fixes

- **repo,docs,mobile:** AGENTS, CLAUDE, README, authentication-and-session-flow ([01f04c7](https://github.com/alternun-development/alternun/commit/01f04c7aabda74785953f1636de8bcf1ca958797))

## [1.0.16](https://github.com/alternun-development/alternun/compare/v1.0.15...v1.0.16) (2026-04-05)

### Bug Fixes

- **docs,repo,infra:** authentication-and-session-flow, alternun-authentik-social-login-incident-2026-04, README, bootstrap-authentik-integrations ([63ab8e5](https://github.com/alternun-development/alternun/commit/63ab8e5bf7328e97bbd25685af776f1e68ab5ae6))

## [1.0.16](https://github.com/alternun-development/alternun/compare/v1.0.15...v1.0.16) (2026-04-05)

### Bug Fixes

- **docs,repo,infra:** authentication-and-session-flow, alternun-authentik-social-login-incident-2026-04, README, bootstrap-authentik-integrations ([63ab8e5](https://github.com/alternun-development/alternun/commit/63ab8e5bf7328e97bbd25685af776f1e68ab5ae6))

## [1.0.15](https://github.com/alternun-development/alternun/compare/v1.0.14...v1.0.15) (2026-04-05)

## [1.0.15](https://github.com/alternun-development/alternun/compare/v1.0.14...v1.0.15) (2026-04-05)

## [1.0.14](https://github.com/alternun-development/alternun/compare/v1.0.13...v1.0.14) (2026-04-05)

### Bug Fixes

- **mobile:** DashboardSummaryCards ([041a8fe](https://github.com/alternun-development/alternun/commit/041a8fea72cf61fd293ce9a68416d7e71a9d7c46))

## [1.0.14](https://github.com/alternun-development/alternun/compare/v1.0.13...v1.0.14) (2026-04-05)

### Bug Fixes

- **mobile:** DashboardSummaryCards ([041a8fe](https://github.com/alternun-development/alternun/commit/041a8fea72cf61fd293ce9a68416d7e71a9d7c46))

## [1.0.13](https://github.com/alternun-development/alternun/compare/v1.0.12...v1.0.13) (2026-04-05)

### Bug Fixes

- **mobile,auth,update:** Dashboard, DashboardSummaryCards, TopNav ([5ae9580](https://github.com/alternun-development/alternun/commit/5ae9580ea1784816927e5f4f4ed882b2ca825ba1))

## [1.0.13](https://github.com/alternun-development/alternun/compare/v1.0.12...v1.0.13) (2026-04-05)

### Bug Fixes

- **mobile,auth,update:** Dashboard, DashboardSummaryCards, TopNav ([5ae9580](https://github.com/alternun-development/alternun/commit/5ae9580ea1784816927e5f4f4ed882b2ca825ba1))

## [1.0.12](https://github.com/alternun-development/alternun/compare/v1.0.11...v1.0.12) (2026-04-05)

### Bug Fixes

- **mobile,auth,update:** \_layout, HorizontalCardScroller, Dashboard, NotificationDropdown ([fccc4f3](https://github.com/alternun-development/alternun/commit/fccc4f3962cfa22111a028b8bf3dec1d56d8e1b5))
- **mobile,ui:** \_layout.web, beneficios, compensaciones, mis-atn ([d7799b5](https://github.com/alternun-development/alternun/commit/d7799b5245537149a34d66f85d8f46ccbc54018c))

## [1.0.12](https://github.com/alternun-development/alternun/compare/v1.0.11...v1.0.12) (2026-04-05)

### Bug Fixes

- **mobile,auth,update:** \_layout, HorizontalCardScroller, Dashboard, NotificationDropdown ([fccc4f3](https://github.com/alternun-development/alternun/commit/fccc4f3962cfa22111a028b8bf3dec1d56d8e1b5))
- **mobile,ui:** \_layout.web, beneficios, compensaciones, mis-atn ([d7799b5](https://github.com/alternun-development/alternun/commit/d7799b5245537149a34d66f85d8f46ccbc54018c))

## [1.0.11](https://github.com/alternun-development/alternun/compare/v1.0.10...v1.0.11) (2026-04-05)

### Bug Fixes

- **mobile,ui:** \_layout, AppInfoFooter, Dashboard, ParticleBubbles ([3bf92ae](https://github.com/alternun-development/alternun/commit/3bf92aeb52169e6c4d1d37e2a0498061c5bffe43))

## [1.0.11](https://github.com/alternun-development/alternun/compare/v1.0.10...v1.0.11) (2026-04-05)

### Bug Fixes

- **mobile,ui:** \_layout, AppInfoFooter, Dashboard, ParticleBubbles ([3bf92ae](https://github.com/alternun-development/alternun/commit/3bf92aeb52169e6c4d1d37e2a0498061c5bffe43))

## [1.0.10](https://github.com/alternun-development/alternun/compare/v1.0.9...v1.0.10) (2026-04-05)

### Bug Fixes

- restore direct source auth login stages ([9e746aa](https://github.com/alternun-development/alternun/commit/9e746aab1bbe48abbf0c69e2e149bef1c824dd99))

## [1.0.10](https://github.com/alternun-development/alternun/compare/v1.0.9...v1.0.10) (2026-04-05)

### Bug Fixes

- restore direct source auth login stages ([9e746aa](https://github.com/alternun-development/alternun/commit/9e746aab1bbe48abbf0c69e2e149bef1c824dd99))

## [1.0.9](https://github.com/alternun-development/alternun/compare/v1.0.8...v1.0.9) (2026-04-05)

### Bug Fixes

- **mobile,auth,i18n:** \_layout, AppInfoFooter, Dashboard, HeroStats ([d9c31a7](https://github.com/alternun-development/alternun/commit/d9c31a7e4844cec99504356ba1c52ce50897e47a))
- split authentik web callback flow ([6f03008](https://github.com/alternun-development/alternun/commit/6f03008a1b263e7d7371836857c1119093edc32e))

## [1.0.9](https://github.com/alternun-development/alternun/compare/v1.0.8...v1.0.9) (2026-04-05)

### Bug Fixes

- **mobile,auth,i18n:** \_layout, AppInfoFooter, Dashboard, HeroStats ([d9c31a7](https://github.com/alternun-development/alternun/commit/d9c31a7e4844cec99504356ba1c52ce50897e47a))
- split authentik web callback flow ([6f03008](https://github.com/alternun-development/alternun/commit/6f03008a1b263e7d7371836857c1119093edc32e))

## [1.0.8](https://github.com/alternun-development/alternun/compare/v1.0.7-dev.3...v1.0.8) (2026-04-05)

### Bug Fixes

- **mobile:** clean up TopNav — remove top-bar pills, move wallet into dropdown ([a356e59](https://github.com/alternun-development/alternun/commit/a356e591087d7f111dc059a383f9718d1d7bb422))
- **repo,admin,api:** CHANGELOG, app, tsconfig ([1286f02](https://github.com/alternun-development/alternun/commit/1286f02022bd0df46492f3a779630e15d657175d))
- resolve @alternun/update in Metro and fix auth callback loop ([27ea88b](https://github.com/alternun-development/alternun/commit/27ea88b3e24aaf0f4a6d5e44a7f406b03e48df34))

### Features

- **scripts:** auto-commit pending changes before release ([8e7f7c4](https://github.com/alternun-development/alternun/commit/8e7f7c491490552ac415131c23b20713d9635817))

## [1.0.8](https://github.com/alternun-development/alternun/compare/v1.0.7-dev.3...v1.0.8) (2026-04-05)

### Bug Fixes

- **mobile:** clean up TopNav — remove top-bar pills, move wallet into dropdown ([a356e59](https://github.com/alternun-development/alternun/commit/a356e591087d7f111dc059a383f9718d1d7bb422))
- **repo,admin,api:** CHANGELOG, app, tsconfig ([1286f02](https://github.com/alternun-development/alternun/commit/1286f02022bd0df46492f3a779630e15d657175d))
- resolve @alternun/update in Metro and fix auth callback loop ([27ea88b](https://github.com/alternun-development/alternun/commit/27ea88b3e24aaf0f4a6d5e44a7f406b03e48df34))

### Features

- **scripts:** auto-commit pending changes before release ([8e7f7c4](https://github.com/alternun-development/alternun/commit/8e7f7c491490552ac415131c23b20713d9635817))

## [1.0.7](https://github.com/alternun-development/alternun/compare/v1.0.7-dev.3...v1.0.7) (2026-04-05)

### Bug Fixes

- **mobile:** clean up TopNav — remove top-bar pills, move wallet into dropdown ([a356e59](https://github.com/alternun-development/alternun/commit/a356e591087d7f111dc059a383f9718d1d7bb422))
- resolve @alternun/update in Metro and fix auth callback loop ([27ea88b](https://github.com/alternun-development/alternun/commit/27ea88b3e24aaf0f4a6d5e44a7f406b03e48df34))

### Features

- **scripts:** auto-commit pending changes before release ([8e7f7c4](https://github.com/alternun-development/alternun/commit/8e7f7c491490552ac415131c23b20713d9635817))

## [1.0.7](https://github.com/alternun-development/alternun/compare/v1.0.7-dev.3...v1.0.7) (2026-04-05)

### Bug Fixes

- **mobile:** clean up TopNav — remove top-bar pills, move wallet into dropdown ([a356e59](https://github.com/alternun-development/alternun/commit/a356e591087d7f111dc059a383f9718d1d7bb422))
- resolve @alternun/update in Metro and fix auth callback loop ([27ea88b](https://github.com/alternun-development/alternun/commit/27ea88b3e24aaf0f4a6d5e44a7f406b03e48df34))

### Features

- **scripts:** auto-commit pending changes before release ([8e7f7c4](https://github.com/alternun-development/alternun/commit/8e7f7c491490552ac415131c23b20713d9635817))

## [1.0.7-dev.3](https://github.com/alternun-development/alternun/compare/v1.0.7-dev.2...v1.0.7-dev.3) (2026-04-04)

### Features

- dashboard UI redesign, shared UI design system, and Metro fix ([68a50de](https://github.com/alternun-development/alternun/commit/68a50de171e1bbf2f1c902141c5c571221da98ac))

## [1.0.7-dev.3](https://github.com/alternun-development/alternun/compare/v1.0.7-dev.2...v1.0.7-dev.3) (2026-04-04)

### Features

- dashboard UI redesign, shared UI design system, and Metro fix ([68a50de](https://github.com/alternun-development/alternun/commit/68a50de171e1bbf2f1c902141c5c571221da98ac))

## [1.0.7-dev.2](https://github.com/alternun-development/alternun/compare/v1.0.7-dev.1...v1.0.7-dev.2) (2026-04-04)

### Bug Fixes

- build tracked artifacts during release ([ed05ec3](https://github.com/alternun-development/alternun/commit/ed05ec3c71695ca504aa1a9b7aa8b808d2d68deb))

## [1.0.7-dev.2](https://github.com/alternun-development/alternun/compare/v1.0.7-dev.1...v1.0.7-dev.2) (2026-04-04)

### Bug Fixes

- build tracked artifacts during release ([ed05ec3](https://github.com/alternun-development/alternun/commit/ed05ec3c71695ca504aa1a9b7aa8b808d2d68deb))

## [1.0.7-dev.1](https://github.com/alternun-development/alternun/compare/v1.0.4...v1.0.7-dev.1) (2026-04-04)

### Bug Fixes

- add explicit authentik social login mode ([499db0f](https://github.com/alternun-development/alternun/commit/499db0fa24dbd0bc5b72df420808b3fa54e3c97d))
- **admin:** harden authentik sign-in flow ([7505182](https://github.com/alternun-development/alternun/commit/7505182f1ddf9e7f7c6c8b3f06f590e253634e3d))
- **admin:** stop userinfo cors failures ([740b900](https://github.com/alternun-development/alternun/commit/740b900d3d972e770c1ca9fa1bf8694ad647c4c6))
- **admin:** use provider-specific oidc issuer ([af7731a](https://github.com/alternun-development/alternun/commit/af7731a66fd197523b8b14b3cfd7fecf008f85cb))
- **admin:** wire authentik oidc login ([698e815](https://github.com/alternun-development/alternun/commit/698e815558424fd3567220912d39811aabe54a7a))
- **api:** bundle swagger ui assets ([1b92fc7](https://github.com/alternun-development/alternun/commit/1b92fc7795e8d7f33744b3648763c0332e15cca5))
- **api:** harden decap oauth popup bridge ([6cfdf8c](https://github.com/alternun-development/alternun/commit/6cfdf8c234489295e6668cab42b708a9c64d5a8d))
- **api:** initialize lambda proxy before fastify ready ([8252e56](https://github.com/alternun-development/alternun/commit/8252e56d1f1958320d99c3c739f10b13b40c7247))
- **api:** stabilize decap oauth state crypto helpers ([1741b4e](https://github.com/alternun-development/alternun/commit/1741b4e07fcf3527c9ac6218c41e8a12e896babe))
- **auth:** bypass Authentik login page for Google/Discord OAuth ([8209666](https://github.com/alternun-development/alternun/commit/8209666a0a3a4b02cc68ee41c4af41ac0c8225ba))
- **auth:** capture OIDC callback search at module load time ([60f23e7](https://github.com/alternun-development/alternun/commit/60f23e730e8ae27c37e2adb4382855063e956f6d))
- **auth:** fix settings dropdown z-index stacking over card content ([3abb30e](https://github.com/alternun-development/alternun/commit/3abb30e4392fb4180cfa8ba341e5e58e7ed1c37a))
- **auth:** fix Supabase setSession this-binding and inject Authentik env into CI ([caf0cf8](https://github.com/alternun-development/alternun/commit/caf0cf8cefd3cfab572f4275caa82dbe0f3916e2))
- **auth:** improve settings dropdown — solid bg, no chevron, active gear state ([3a8a7a5](https://github.com/alternun-development/alternun/commit/3a8a7a580657bed3e19855ed3b4624d684901501))
- **auth:** remove Google source authentication_flow + keep spinner during OIDC callback ([7f166bf](https://github.com/alternun-development/alternun/commit/7f166bfaa71db252c71d264a2e10edf7c455b37f))
- **auth:** resolve @edcalderon/auth/authentik via local re-export ([51588e9](https://github.com/alternun-development/alternun/commit/51588e9561e00af1701b05cc9a6e70d32571029e))
- **ci:** align identity dev pipeline database mode ([966ae9c](https://github.com/alternun-development/alternun/commit/966ae9c961820c96239e1a8b32be791e9ea6400f))
- **ci:** reduce duplicate and slow checks ([1a239d8](https://github.com/alternun-development/alternun/commit/1a239d84ec6b8451687415731353b35c2dd0968f))
- **ci:** sync lockfile and fix CodeQL insecure-randomness alert ([a1e3f38](https://github.com/alternun-development/alternun/commit/a1e3f3829fb43c1d3ea69ef18e6b51bfefb87ed4))
- **ci:** unblock release checks and code scanning ([e04377f](https://github.com/alternun-development/alternun/commit/e04377f66aba7182cdb6a0a31af0e3c5ce347aba))
- derive authentik redirect uri ([8b46d80](https://github.com/alternun-development/alternun/commit/8b46d806cb87ca639f9df8f0ec55c49b433c5975))
- **identity:** keep admin policy bootstrap app-scoped ([8b5bfa9](https://github.com/alternun-development/alternun/commit/8b5bfa961b996a79835d3ade1518c3b26c13f3b4))
- **identity:** promote internal google admins ([1a3ca2f](https://github.com/alternun-development/alternun/commit/1a3ca2f2aa7de8bc82f2c4138de364dfb10b9525))
- **infra:** allow dedicated non-expo stack deploys ([ad22218](https://github.com/alternun-development/alternun/commit/ad22218e8788a62f349ab9b74333dc0749eb4645))
- **infra:** auto-provision api custom domain certs ([4b57f33](https://github.com/alternun-development/alternun/commit/4b57f3334f6a64f214d2aa22da7d2cd017a1fbed))
- **infra:** export resolved route53 zone for deploys ([2292b0c](https://github.com/alternun-development/alternun/commit/2292b0cbfa9df20c023a6af84eeb660ea2dc9520))
- **infra:** fail build on SSM errors, warn only on ParameterNotFound ([35fe88c](https://github.com/alternun-development/alternun/commit/35fe88c201bde21ad15f7f1fbc047b11b46c689f))
- **infra:** guard managed pipeline reconciliation ([0a5b07a](https://github.com/alternun-development/alternun/commit/0a5b07a3e5e7abaa304958a7a54d2a7b0964e1fd))
- **infra:** inject Authentik OIDC env vars into Expo SST build ([fb35b23](https://github.com/alternun-development/alternun/commit/fb35b23b04f82174e5d3de16f1587fdd9e2a6fea))
- **infra:** keep identity runtime sync logs off stdout ([67a7fd4](https://github.com/alternun-development/alternun/commit/67a7fd4b7f98c0c9bf8e47b5d329f65e693398b3))
- **infra:** migrate identity runtime sync templates ([c3845d8](https://github.com/alternun-development/alternun/commit/c3845d86bf8faf5e15923dd26f8c2ce6c5b0a897))
- **infra:** protect dashboard deploys and bootstrap admin oidc ([b972478](https://github.com/alternun-development/alternun/commit/b972478731d67eb56d130801310f0d9c707d88b6))
- **infra:** resolve admin site path from infra root ([9e769c1](https://github.com/alternun-development/alternun/commit/9e769c131edd038f4abeacb4c237358d6e53ff4f))
- **infra:** resolve Authentik OIDC config per-stage from SSM ([5907127](https://github.com/alternun-development/alternun/commit/5907127d0fe106bc4ed29a0f7660b504f4d90bda))
- **infra:** shorten admin pipeline resource names ([3165901](https://github.com/alternun-development/alternun/commit/316590118cae7153158ff012e9970496ad0b046e))
- **infra:** shorten dashboard pipeline resource names ([4f1cbfd](https://github.com/alternun-development/alternun/commit/4f1cbfdd04962f3fcfe154f806d977291322e294))
- **infra:** sync renamed identity domains safely ([1e20dbd](https://github.com/alternun-development/alternun/commit/1e20dbdef7373c98e737e488950cc8019021d192))
- **mobile,admin:** address react-doctor warnings ([e309d47](https://github.com/alternun-development/alternun/commit/e309d47488ed6d64c88cbadde6d37529b7ede63b))
- **mobile:** collapse video controls to icon-only on narrow cards ([42b62f9](https://github.com/alternun-development/alternun/commit/42b62f9d0f1e474530be7539acdc9fe39ca58056))
- **mobile:** fix auth modal scroll clipping on narrow screens ([d5cd5d3](https://github.com/alternun-development/alternun/commit/d5cd5d358e3017422235acc89d37faf0576d1be5))
- **mobile:** fix footer overflow on narrow/mobile screens ([72d3700](https://github.com/alternun-development/alternun/commit/72d370080fabc3eace5aef588e25ce506b9f1049))
- **mobile:** remove deleted authSession.ts import from auth.tsx ([14768e0](https://github.com/alternun-development/alternun/commit/14768e0e7536323bddd8da0a0dce235a71ef919a))
- **mobile:** transform valtio through Babel to eliminate import.meta SES error ([392a574](https://github.com/alternun-development/alternun/commit/392a57432e1ee64c096818291d2e4a6a4cf78229))
- pass google auth creds to identity pipelines ([4c5b7fb](https://github.com/alternun-development/alternun/commit/4c5b7fb005e52401c6a50eaddf31b33ad0bf44e0))
- repair pnpm lockfile for audit ([700f26f](https://github.com/alternun-development/alternun/commit/700f26f3379d306e64e6c312efa6ff721f5a7cbc))
- restore authentication_flow on Google Authentik source ([93f0cce](https://github.com/alternun-development/alternun/commit/93f0cce61b10ba2a14b552bfc202c1a71a87f561))
- **security:** clear remaining codeql alerts ([7b0289b](https://github.com/alternun-development/alternun/commit/7b0289b1d97c250189a94349cd56c34352c56e10))
- **security:** patch simple-git critical advisory ([909210d](https://github.com/alternun-development/alternun/commit/909210dab21c90a31f46078ab871d4ad786f88b8))
- unify authentik web auth flow ([82bf095](https://github.com/alternun-development/alternun/commit/82bf0952d0d877831ba866c0d1e0a1030f3ea27e))
- update versioning and handlebars override ([937e024](https://github.com/alternun-development/alternun/commit/937e024df4dab0d6686f2009660b2c6fc711eda9))
- use localhost admin oidc in identity dev pipeline ([60b60b0](https://github.com/alternun-development/alternun/commit/60b60b0fa3b45e5348561e85e6b321e2b07c47a9))

### Features

- add authentik redirect preservation and v1.4.2 exports ([8d6922f](https://github.com/alternun-development/alternun/commit/8d6922f29eff4894ef4b24ec7c4c591d8f6aabd7))
- **admin:** secure hosted authentik sign-in ([a723f7f](https://github.com/alternun-development/alternun/commit/a723f7f13ca207179c185d0b05f88865f3e37af6))
- **admin:** show deployed release on login ([fac3d55](https://github.com/alternun-development/alternun/commit/fac3d556096e2e503da55277bc79b6e4bba88e23))
- **auth,infra:** use authentik v1.4.2 preset helpers and fix mobile redirect URIs ([c5af2fd](https://github.com/alternun-development/alternun/commit/c5af2fdcdff1cb8b478a24b422e26340cac3c0d3))
- **auth:** add settings dropdown to auth modal header, fix password icon overflow ([128057f](https://github.com/alternun-development/alternun/commit/128057fd034e5a7de00016effdbeba1fdce0bf58))
- **auth:** Authentik OIDC + vendor-independent Supabase user sync — v1.0.5 ([8ba5b86](https://github.com/alternun-development/alternun/commit/8ba5b86e57d94935a2c239b67e26b8d3cee412fb))
- **auth:** extract AuthentikOidcClient into @alternun/auth package ([1c4c423](https://github.com/alternun-development/alternun/commit/1c4c4233fcac25b3caa3192cdf685180e29618d4))
- **auth:** upgrade to @edcalderon/auth 1.3.0 with canonical AuthentikOidcClient ([fa06519](https://github.com/alternun-development/alternun/commit/fa0651940a2926d22587d5ced77a4d90a2ec575e))
- **docs:** add decap cms admin auth ([8d9fa82](https://github.com/alternun-development/alternun/commit/8d9fa824d5edfe160da3f6fc370d47f3d86555e2))
- **docs:** add testnet api fallback flag for decap ([3364e43](https://github.com/alternun-development/alternun/commit/3364e430e02a56a8dd34cddc2de215a508ed159a))
- **docs:** enable production decap github oauth ([5ab8d16](https://github.com/alternun-development/alternun/commit/5ab8d16a2a8ea0667cae9053d3c6973eaadef19b))
- **identity:** back up acme state to s3 ([c2d8e10](https://github.com/alternun-development/alternun/commit/c2d8e10bf1fd3b530a6997635679194a1e8b20a6))
- **identity:** rename auth host to sso ([d93ce37](https://github.com/alternun-development/alternun/commit/d93ce379aea759d2f9fc5aacd59754ca937b3ce8))
- **identity:** split testnet dns01 and prod alb tls ([d102c7c](https://github.com/alternun-development/alternun/commit/d102c7c5a5e37f58ac7266c3af358c804575ec06))
- **mobile:** add subtle floating animation to footer glow orbs ([14aff64](https://github.com/alternun-development/alternun/commit/14aff64d304b92e510ef5171e39fd2c5094daf0f))
- **platform:** add dashboard api admin pipelines ([2e994a4](https://github.com/alternun-development/alternun/commit/2e994a40ecf4cb979f0861bc1d41f07646b8bb64))
- **theme:** centralized palette tokens + full light/dark mode on auth card ([c16a53c](https://github.com/alternun-development/alternun/commit/c16a53c768d8a76982a0210daafc993bb548d017))

## [1.0.7-dev.1](https://github.com/alternun-development/alternun/compare/v1.0.4...v1.0.7-dev.1) (2026-04-04)

### Bug Fixes

- add explicit authentik social login mode ([499db0f](https://github.com/alternun-development/alternun/commit/499db0fa24dbd0bc5b72df420808b3fa54e3c97d))
- **admin:** harden authentik sign-in flow ([7505182](https://github.com/alternun-development/alternun/commit/7505182f1ddf9e7f7c6c8b3f06f590e253634e3d))
- **admin:** stop userinfo cors failures ([740b900](https://github.com/alternun-development/alternun/commit/740b900d3d972e770c1ca9fa1bf8694ad647c4c6))
- **admin:** use provider-specific oidc issuer ([af7731a](https://github.com/alternun-development/alternun/commit/af7731a66fd197523b8b14b3cfd7fecf008f85cb))
- **admin:** wire authentik oidc login ([698e815](https://github.com/alternun-development/alternun/commit/698e815558424fd3567220912d39811aabe54a7a))
- **api:** bundle swagger ui assets ([1b92fc7](https://github.com/alternun-development/alternun/commit/1b92fc7795e8d7f33744b3648763c0332e15cca5))
- **api:** harden decap oauth popup bridge ([6cfdf8c](https://github.com/alternun-development/alternun/commit/6cfdf8c234489295e6668cab42b708a9c64d5a8d))
- **api:** initialize lambda proxy before fastify ready ([8252e56](https://github.com/alternun-development/alternun/commit/8252e56d1f1958320d99c3c739f10b13b40c7247))
- **api:** stabilize decap oauth state crypto helpers ([1741b4e](https://github.com/alternun-development/alternun/commit/1741b4e07fcf3527c9ac6218c41e8a12e896babe))
- **auth:** bypass Authentik login page for Google/Discord OAuth ([8209666](https://github.com/alternun-development/alternun/commit/8209666a0a3a4b02cc68ee41c4af41ac0c8225ba))
- **auth:** capture OIDC callback search at module load time ([60f23e7](https://github.com/alternun-development/alternun/commit/60f23e730e8ae27c37e2adb4382855063e956f6d))
- **auth:** fix settings dropdown z-index stacking over card content ([3abb30e](https://github.com/alternun-development/alternun/commit/3abb30e4392fb4180cfa8ba341e5e58e7ed1c37a))
- **auth:** fix Supabase setSession this-binding and inject Authentik env into CI ([caf0cf8](https://github.com/alternun-development/alternun/commit/caf0cf8cefd3cfab572f4275caa82dbe0f3916e2))
- **auth:** improve settings dropdown — solid bg, no chevron, active gear state ([3a8a7a5](https://github.com/alternun-development/alternun/commit/3a8a7a580657bed3e19855ed3b4624d684901501))
- **auth:** remove Google source authentication_flow + keep spinner during OIDC callback ([7f166bf](https://github.com/alternun-development/alternun/commit/7f166bfaa71db252c71d264a2e10edf7c455b37f))
- **auth:** resolve @edcalderon/auth/authentik via local re-export ([51588e9](https://github.com/alternun-development/alternun/commit/51588e9561e00af1701b05cc9a6e70d32571029e))
- **ci:** align identity dev pipeline database mode ([966ae9c](https://github.com/alternun-development/alternun/commit/966ae9c961820c96239e1a8b32be791e9ea6400f))
- **ci:** reduce duplicate and slow checks ([1a239d8](https://github.com/alternun-development/alternun/commit/1a239d84ec6b8451687415731353b35c2dd0968f))
- **ci:** sync lockfile and fix CodeQL insecure-randomness alert ([a1e3f38](https://github.com/alternun-development/alternun/commit/a1e3f3829fb43c1d3ea69ef18e6b51bfefb87ed4))
- **ci:** unblock release checks and code scanning ([e04377f](https://github.com/alternun-development/alternun/commit/e04377f66aba7182cdb6a0a31af0e3c5ce347aba))
- derive authentik redirect uri ([8b46d80](https://github.com/alternun-development/alternun/commit/8b46d806cb87ca639f9df8f0ec55c49b433c5975))
- **identity:** keep admin policy bootstrap app-scoped ([8b5bfa9](https://github.com/alternun-development/alternun/commit/8b5bfa961b996a79835d3ade1518c3b26c13f3b4))
- **identity:** promote internal google admins ([1a3ca2f](https://github.com/alternun-development/alternun/commit/1a3ca2f2aa7de8bc82f2c4138de364dfb10b9525))
- **infra:** allow dedicated non-expo stack deploys ([ad22218](https://github.com/alternun-development/alternun/commit/ad22218e8788a62f349ab9b74333dc0749eb4645))
- **infra:** auto-provision api custom domain certs ([4b57f33](https://github.com/alternun-development/alternun/commit/4b57f3334f6a64f214d2aa22da7d2cd017a1fbed))
- **infra:** export resolved route53 zone for deploys ([2292b0c](https://github.com/alternun-development/alternun/commit/2292b0cbfa9df20c023a6af84eeb660ea2dc9520))
- **infra:** fail build on SSM errors, warn only on ParameterNotFound ([35fe88c](https://github.com/alternun-development/alternun/commit/35fe88c201bde21ad15f7f1fbc047b11b46c689f))
- **infra:** guard managed pipeline reconciliation ([0a5b07a](https://github.com/alternun-development/alternun/commit/0a5b07a3e5e7abaa304958a7a54d2a7b0964e1fd))
- **infra:** inject Authentik OIDC env vars into Expo SST build ([fb35b23](https://github.com/alternun-development/alternun/commit/fb35b23b04f82174e5d3de16f1587fdd9e2a6fea))
- **infra:** keep identity runtime sync logs off stdout ([67a7fd4](https://github.com/alternun-development/alternun/commit/67a7fd4b7f98c0c9bf8e47b5d329f65e693398b3))
- **infra:** migrate identity runtime sync templates ([c3845d8](https://github.com/alternun-development/alternun/commit/c3845d86bf8faf5e15923dd26f8c2ce6c5b0a897))
- **infra:** protect dashboard deploys and bootstrap admin oidc ([b972478](https://github.com/alternun-development/alternun/commit/b972478731d67eb56d130801310f0d9c707d88b6))
- **infra:** resolve admin site path from infra root ([9e769c1](https://github.com/alternun-development/alternun/commit/9e769c131edd038f4abeacb4c237358d6e53ff4f))
- **infra:** resolve Authentik OIDC config per-stage from SSM ([5907127](https://github.com/alternun-development/alternun/commit/5907127d0fe106bc4ed29a0f7660b504f4d90bda))
- **infra:** shorten admin pipeline resource names ([3165901](https://github.com/alternun-development/alternun/commit/316590118cae7153158ff012e9970496ad0b046e))
- **infra:** shorten dashboard pipeline resource names ([4f1cbfd](https://github.com/alternun-development/alternun/commit/4f1cbfdd04962f3fcfe154f806d977291322e294))
- **infra:** sync renamed identity domains safely ([1e20dbd](https://github.com/alternun-development/alternun/commit/1e20dbdef7373c98e737e488950cc8019021d192))
- **mobile,admin:** address react-doctor warnings ([e309d47](https://github.com/alternun-development/alternun/commit/e309d47488ed6d64c88cbadde6d37529b7ede63b))
- **mobile:** collapse video controls to icon-only on narrow cards ([42b62f9](https://github.com/alternun-development/alternun/commit/42b62f9d0f1e474530be7539acdc9fe39ca58056))
- **mobile:** fix auth modal scroll clipping on narrow screens ([d5cd5d3](https://github.com/alternun-development/alternun/commit/d5cd5d358e3017422235acc89d37faf0576d1be5))
- **mobile:** fix footer overflow on narrow/mobile screens ([72d3700](https://github.com/alternun-development/alternun/commit/72d370080fabc3eace5aef588e25ce506b9f1049))
- **mobile:** remove deleted authSession.ts import from auth.tsx ([14768e0](https://github.com/alternun-development/alternun/commit/14768e0e7536323bddd8da0a0dce235a71ef919a))
- **mobile:** transform valtio through Babel to eliminate import.meta SES error ([392a574](https://github.com/alternun-development/alternun/commit/392a57432e1ee64c096818291d2e4a6a4cf78229))
- pass google auth creds to identity pipelines ([4c5b7fb](https://github.com/alternun-development/alternun/commit/4c5b7fb005e52401c6a50eaddf31b33ad0bf44e0))
- repair pnpm lockfile for audit ([700f26f](https://github.com/alternun-development/alternun/commit/700f26f3379d306e64e6c312efa6ff721f5a7cbc))
- restore authentication_flow on Google Authentik source ([93f0cce](https://github.com/alternun-development/alternun/commit/93f0cce61b10ba2a14b552bfc202c1a71a87f561))
- **security:** clear remaining codeql alerts ([7b0289b](https://github.com/alternun-development/alternun/commit/7b0289b1d97c250189a94349cd56c34352c56e10))
- **security:** patch simple-git critical advisory ([909210d](https://github.com/alternun-development/alternun/commit/909210dab21c90a31f46078ab871d4ad786f88b8))
- unify authentik web auth flow ([82bf095](https://github.com/alternun-development/alternun/commit/82bf0952d0d877831ba866c0d1e0a1030f3ea27e))
- update versioning and handlebars override ([937e024](https://github.com/alternun-development/alternun/commit/937e024df4dab0d6686f2009660b2c6fc711eda9))
- use localhost admin oidc in identity dev pipeline ([60b60b0](https://github.com/alternun-development/alternun/commit/60b60b0fa3b45e5348561e85e6b321e2b07c47a9))

### Features

- add authentik redirect preservation and v1.4.2 exports ([8d6922f](https://github.com/alternun-development/alternun/commit/8d6922f29eff4894ef4b24ec7c4c591d8f6aabd7))
- **admin:** secure hosted authentik sign-in ([a723f7f](https://github.com/alternun-development/alternun/commit/a723f7f13ca207179c185d0b05f88865f3e37af6))
- **admin:** show deployed release on login ([fac3d55](https://github.com/alternun-development/alternun/commit/fac3d556096e2e503da55277bc79b6e4bba88e23))
- **auth,infra:** use authentik v1.4.2 preset helpers and fix mobile redirect URIs ([c5af2fd](https://github.com/alternun-development/alternun/commit/c5af2fdcdff1cb8b478a24b422e26340cac3c0d3))
- **auth:** add settings dropdown to auth modal header, fix password icon overflow ([128057f](https://github.com/alternun-development/alternun/commit/128057fd034e5a7de00016effdbeba1fdce0bf58))
- **auth:** Authentik OIDC + vendor-independent Supabase user sync — v1.0.5 ([8ba5b86](https://github.com/alternun-development/alternun/commit/8ba5b86e57d94935a2c239b67e26b8d3cee412fb))
- **auth:** extract AuthentikOidcClient into @alternun/auth package ([1c4c423](https://github.com/alternun-development/alternun/commit/1c4c4233fcac25b3caa3192cdf685180e29618d4))
- **auth:** upgrade to @edcalderon/auth 1.3.0 with canonical AuthentikOidcClient ([fa06519](https://github.com/alternun-development/alternun/commit/fa0651940a2926d22587d5ced77a4d90a2ec575e))
- **docs:** add decap cms admin auth ([8d9fa82](https://github.com/alternun-development/alternun/commit/8d9fa824d5edfe160da3f6fc370d47f3d86555e2))
- **docs:** add testnet api fallback flag for decap ([3364e43](https://github.com/alternun-development/alternun/commit/3364e430e02a56a8dd34cddc2de215a508ed159a))
- **docs:** enable production decap github oauth ([5ab8d16](https://github.com/alternun-development/alternun/commit/5ab8d16a2a8ea0667cae9053d3c6973eaadef19b))
- **identity:** back up acme state to s3 ([c2d8e10](https://github.com/alternun-development/alternun/commit/c2d8e10bf1fd3b530a6997635679194a1e8b20a6))
- **identity:** rename auth host to sso ([d93ce37](https://github.com/alternun-development/alternun/commit/d93ce379aea759d2f9fc5aacd59754ca937b3ce8))
- **identity:** split testnet dns01 and prod alb tls ([d102c7c](https://github.com/alternun-development/alternun/commit/d102c7c5a5e37f58ac7266c3af358c804575ec06))
- **mobile:** add subtle floating animation to footer glow orbs ([14aff64](https://github.com/alternun-development/alternun/commit/14aff64d304b92e510ef5171e39fd2c5094daf0f))
- **platform:** add dashboard api admin pipelines ([2e994a4](https://github.com/alternun-development/alternun/commit/2e994a40ecf4cb979f0861bc1d41f07646b8bb64))
- **theme:** centralized palette tokens + full light/dark mode on auth card ([c16a53c](https://github.com/alternun-development/alternun/commit/c16a53c768d8a76982a0210daafc993bb548d017))

## [1.0.4](https://github.com/alternun-development/alternun/compare/v1.0.3...v1.0.4) (2026-03-09)

### Bug Fixes

- canonicalize expo app path for ci asset deploys ([04a6558](https://github.com/alternun-development/alternun/commit/04a6558f7523ec5baf9475df07af58ad25e23510))
- force canonical cert overrides in ci ([31dfb74](https://github.com/alternun-development/alternun/commit/31dfb741b6b2ed5962c4f6d8f9f2904ddd2e0066))
- force canonical infra domains in ci ([51420d3](https://github.com/alternun-development/alternun/commit/51420d35d4af0647d31b0bfdf46fe951f9c8a46d))
- harden infra deploy DNS and cert checks ([e138f32](https://github.com/alternun-development/alternun/commit/e138f32f4bbe1b92cb406026495c56aec604b8ed))
- **identity:** harden ec2 bootstrap and traefik host rule ([dbe5618](https://github.com/alternun-development/alternun/commit/dbe5618d2cc1f23590a728ba7b485a239b6e9257))
- **infra:** guard identity stacks from accidental disable ([0d590f8](https://github.com/alternun-development/alternun/commit/0d590f8006a631cd3868d3972d9d9e20702d84a2))
- **infra:** isolate identity provisioning to dedicated stacks ([45d2cf6](https://github.com/alternun-development/alternun/commit/45d2cf69007cafba25d16c62d1540091fe9bbd42))
- **infra:** resolve authentik templates in sst runtime ([2076bc8](https://github.com/alternun-development/alternun/commit/2076bc85439409ce7305c25a4fccc3d4bdec6528))
- make cert pruning non-interactive ([466e439](https://github.com/alternun-development/alternun/commit/466e4391ed320f7e8aa416de6691729a596f18b4))
- make legacy state pruning non-fatal ([3a29baf](https://github.com/alternun-development/alternun/commit/3a29baf216f6d1174df92c1bf11579cd38703b12))
- prune legacy cert state before deploy ([70dfd82](https://github.com/alternun-development/alternun/commit/70dfd8205e7dce9e867196917d5eb2e83b5adecb))
- restore auth package build compatibility ([da68fdd](https://github.com/alternun-development/alternun/commit/da68fdda8d20dfacb261942cd999ea7a9630e206))
- restore relative expo app path for sst ([0a31442](https://github.com/alternun-development/alternun/commit/0a314420b8d4387efc36017ca1a95a46db806618))
- reuse explicit certs in ci deploys ([f466aa6](https://github.com/alternun-development/alternun/commit/f466aa686e9d71368af0abb9f3664dd66d7a2804))
- run sst deploy from repo infra root ([abbca8e](https://github.com/alternun-development/alternun/commit/abbca8e4dac852acf82fb5068014a68a57c93573))
- speed up ci deploy and prune cert state correctly ([b458669](https://github.com/alternun-development/alternun/commit/b458669bd13842b6e3ac2d27f55b144d283c42e7))
- stabilize ci install and infra env resolution ([580474b](https://github.com/alternun-development/alternun/commit/580474ba3bce5edd2beac8ce0e04581c0b46823a))
- sync web media assets without internal sst imports ([0336740](https://github.com/alternun-development/alternun/commit/03367402c08b82a70c0e761403ca2a3f7eaa5adb))
- use infra wrapper in codebuild deploy ([ae3af9a](https://github.com/alternun-development/alternun/commit/ae3af9aceaa1a31bcc402a8513b7558c47013236))

### Features

- **auth:** support signup confirmation code + localized email guidance ([ef74ec8](https://github.com/alternun-development/alternun/commit/ef74ec88d1113c19debd8e9bd5d5012230012d6f))
- **email:** add multilingual Supabase auth templates ([3d21004](https://github.com/alternun-development/alternun/commit/3d2100490650c01867e514dc6c4ac0987f031a05))
- enforce authentik redisless version baseline ([ab2bb51](https://github.com/alternun-development/alternun/commit/ab2bb514bddff8e9e49fcde629b2a71b6955d22a))
- **identity:** rename dev auth domain and normalize instance naming ([65a597e](https://github.com/alternun-development/alternun/commit/65a597ea6b445be3b86ac44f9dfdb88d745b557a))
- **infra:** add dedicated identity pipeline target ([74bc283](https://github.com/alternun-development/alternun/commit/74bc2835be6d8beb037a59b85e77c4c9f5e001ef))
- **infra:** bootstrap authentik runtime on identity host ([994dd7b](https://github.com/alternun-development/alternun/commit/994dd7b87723a6e38eb7902e761e63ba27cb0c82))
- **infra:** harden identity deploy safety guards ([2439d40](https://github.com/alternun-development/alternun/commit/2439d406e51588398c6d408d435eddcb4dcf4bcb))
- **infra:** scope identity deploys by stage ([fc4fb6c](https://github.com/alternun-development/alternun/commit/fc4fb6ce65af3f23495f5661e9d586000b49ebb2))
- **infra:** support ec2-local postgres mode for identity-dev ([a18640a](https://github.com/alternun-development/alternun/commit/a18640acb4e9eaa6481500b0fb9d145761becceb))
- optimize deploy assets and web media delivery ([b6f37e8](https://github.com/alternun-development/alternun/commit/b6f37e8422cc34d82a4eb460a946e09d6e44e86e))
- provision identity infrastructure resources ([990dd9c](https://github.com/alternun-development/alternun/commit/990dd9cdce4e47c21bbc0a9a828f1d3e897fc68b))
- scaffold identity infrastructure config ([46401e5](https://github.com/alternun-development/alternun/commit/46401e516bec63eb1d05a9d7b31820eae858eaac))

## 1.0.3 (2026-03-07)

### Bug Fixes

- add build scripts to all packages to ignore turbo filter arguments ([3869a74](https://github.com/alternun-development/alternun/commit/3869a74ca5537270cfe26197bed7354aa6a4624a))
- add clean script to UI package ([3c14121](https://github.com/alternun-development/alternun/commit/3c141216dd1b4a80603e944ff26862765bcc1cc2))
- add empty args array to turbo build pipeline ([5be564c](https://github.com/alternun-development/alternun/commit/5be564c8227637840fdcf0462bdc3953b25cfd06))
- add NODE_ENV to turbo build pipeline ([dec0af8](https://github.com/alternun-development/alternun/commit/dec0af815f70404e250aaf224d204cde23d1503a))
- add ReactNode import to web app layout ([94d0d72](https://github.com/alternun-development/alternun/commit/94d0d72cd671ae58dbec771dafd68a21b4938200))
- add root tsconfig.json for ESLint compatibility ([c218c61](https://github.com/alternun-development/alternun/commit/c218c616b83c044e54caf3daa3999ca8cceb68ab))
- align Docusaurus theme version with core ([bea454c](https://github.com/alternun-development/alternun/commit/bea454cf545f6521462759fb53a5b0a65eae0721))
- **auth:** hide layout footer on auth route ([a8a06e7](https://github.com/alternun-development/alternun/commit/a8a06e7a63454c280d9f218516c33df7bf0d7b37))
- **auth:** pass supabase env via app provider options ([31a24ee](https://github.com/alternun-development/alternun/commit/31a24ee01e580dc3c538b767e26e1df708fbd965))
- **ci:** enforce primary reachability and make redirect checks configurable ([3816ae8](https://github.com/alternun-development/alternun/commit/3816ae81e7a63cb8a697ae84aa06d10973fbc31c))
- **ci:** require reachability script when check is enabled ([71dfb6c](https://github.com/alternun-development/alternun/commit/71dfb6ca859eb41889c123c511413e84d79dcbb4))
- **ci:** run reachability checks inline to avoid source artifact drift ([24ffa96](https://github.com/alternun-development/alternun/commit/24ffa9639fceccbe44767dabc487e72ecff84cf9))
- **ci:** source AWS env credentials from secrets manager ([97e57be](https://github.com/alternun-development/alternun/commit/97e57be9073ddaf5ade8c4f4060b70b49dcbd86f))
- **ci:** use codebuild iam role instead of static aws keys ([fd46e11](https://github.com/alternun-development/alternun/commit/fd46e11b395fd81c5af4ff21862796f7fa65a667))
- correct docs status badge URL in README ([cb480be](https://github.com/alternun-development/alternun/commit/cb480be8518f4a8a37b04f744b99fff4aeb9ad83))
- correct versioning commands and update Node.js requirements ([b84785f](https://github.com/alternun-development/alternun/commit/b84785f6cf1998cefc51305a43a375026228c0d9))
- create build script to ignore turbo filter arguments ([022bff4](https://github.com/alternun-development/alternun/commit/022bff4159bdfc814ec1cf6644d784018be4ebb9))
- disable passThruArgs in turbo build pipeline ([84d6f3d](https://github.com/alternun-development/alternun/commit/84d6f3dbf965958de08a921224e5b6d2bdd70fec))
- exclude apps/web from root ESLint configuration ([aeab949](https://github.com/alternun-development/alternun/commit/aeab949971466d66a8fed31f08f37aba545ca31c))
- exclude footer from vortex animation ([bfdbdfc](https://github.com/alternun-development/alternun/commit/bfdbdfc78117714f3b38f9eb3e8a1351e21c6991))
- format code with Prettier ([304d086](https://github.com/alternun-development/alternun/commit/304d086a1540fc00e1783e28e14bacd9829c6a9b))
- improve hero section styling and light mode support ([a726548](https://github.com/alternun-development/alternun/commit/a72654812eda2ae922519ff01be06aef7bf248dc))
- **infra:** force managed cert mode in CI runtime ([eac9b86](https://github.com/alternun-development/alternun/commit/eac9b866608890730b0eb429f6f743205cb5b9e0))
- **infra:** harden dev deploy and redirect certificate handling ([bc84a11](https://github.com/alternun-development/alternun/commit/bc84a11c0d690c05fae0034fb2f5e992681beed6))
- **infra:** implement true 308 redirects via route-level edge injection ([0d1e8b1](https://github.com/alternun-development/alternun/commit/0d1e8b1de6201b68428c4d8c9f3340bbc8e58b2e))
- **infra:** prevent secret sync from breaking codebuild ([cf464cb](https://github.com/alternun-development/alternun/commit/cf464cb27c6a0ebb0e62f918d3d46e37388872b1))
- **infra:** reset viewer cert when cloudfront alias list is emptied ([2a272f4](https://github.com/alternun-development/alternun/commit/2a272f40f5a2fdbf03a1cabcd062a49a8a49b100))
- **mobile-web:** pin metro react resolution for single runtime ([8ef1c27](https://github.com/alternun-development/alternun/commit/8ef1c27313653fd4160817a1c0566cee0671f66d))
- move layout.tsx to app directory for Next.js app router ([d48eb3f](https://github.com/alternun-development/alternun/commit/d48eb3f6ffdf24d284a05db551ff93131287b613))
- **onboarding:** prevent overlapping intro video audio ([c4add4f](https://github.com/alternun-development/alternun/commit/c4add4f23709671fa9aff5430ea695d1a239dcc8))
- patch Next.js critical security vulnerability ([07a016a](https://github.com/alternun-development/alternun/commit/07a016aa061537adb4dbfdfa16fb74716a86daeb))
- **predeploy:** warn instead of fail when dns auto-remove is disabled ([b399c74](https://github.com/alternun-development/alternun/commit/b399c744f7876d1b2881135c8bed7d3628f7bcdf))
- remove default Docusaurus footer ([4fe0630](https://github.com/alternun-development/alternun/commit/4fe063080b585356b66a8d47462f2ee13599dd27))
- remove invalid args key from turbo.json ([3b225e2](https://github.com/alternun-development/alternun/commit/3b225e224333c35962da809b7bbf301c746c65bf))
- remove invalid passThruArgs from turbo.json ([6610f81](https://github.com/alternun-development/alternun/commit/6610f814000463f3cc446783af9748c4951afcaa))
- remove license link from footer ([520f201](https://github.com/alternun-development/alternun/commit/520f201aaf42de838b4f29ebf18ea6165772c062))
- reorder pnpm and Node.js setup in deploy workflow ([277bd45](https://github.com/alternun-development/alternun/commit/277bd456f75c18aa67c9ea78fbef0ef5942ad5a6))
- reorder pnpm setup before Node.js in GitHub Actions ([0aa7bf0](https://github.com/alternun-development/alternun/commit/0aa7bf0e4ee8ec8bf029b4e38f3d6a97cdfe484c))
- resolve CI/CD failures for pnpm migration ([e97c14c](https://github.com/alternun-development/alternun/commit/e97c14c38c1d0a183882c6bc0b2633a500f63172))
- resolve pnpm workspace dependency issues ([28b7ff6](https://github.com/alternun-development/alternun/commit/28b7ff676d254a1bb3e17b7161b5fc7893df2f62))
- update branch protection to support both main and master ([ef022eb](https://github.com/alternun-development/alternun/commit/ef022eb72b7db573137a0e82915cf432cc32bcc0))
- update deploy workflow to use pnpm and v4 actions ([501540a](https://github.com/alternun-development/alternun/commit/501540a0c4d762d7f487542d2f44875a1786b053))
- update GitHub Actions cache to use pnpm instead of npm ([ab43a79](https://github.com/alternun-development/alternun/commit/ab43a793ea35f3cb7f6a27ae03a39e53741f496a))
- update Next.js and adjust security audit level ([ffaacc6](https://github.com/alternun-development/alternun/commit/ffaacc65ea7723c45bde65c3294f94dcb341e5c3))
- update Node.js requirement to 22.22.0 and fix package-lock sync ([8c017f6](https://github.com/alternun-development/alternun/commit/8c017f6e96d009c77b5afd76849b02bc51c2ddc1))
- update test-deploy workflow to use pnpm ([9685b9f](https://github.com/alternun-development/alternun/commit/9685b9fd85c694b82e51874a6514a150351195ae))
- update upload-artifact to v4 ([5188ea3](https://github.com/alternun-development/alternun/commit/5188ea358713715949630de9c8e36881007d797a))
- **web:** hard-pin react runtime in metro resolver ([790a79f](https://github.com/alternun-development/alternun/commit/790a79f4e7fa587dbf1cbc1de69a8ea079f12455))

### Features

- add animated features section and futuristic footer ([91955ed](https://github.com/alternun-development/alternun/commit/91955ed2a5263883b717d0d43b4f05484f74d4d6))
- add animated hero landing page foundation ([dd82b12](https://github.com/alternun-development/alternun/commit/dd82b12de3d98e058ff02242bf33d6da9653efbf))
- add comprehensive documentation and development infrastructure ([879ee6d](https://github.com/alternun-development/alternun/commit/879ee6dd9555d5f9039b44e91f3f584be6de9cd7))
- add internationalization for footer and legal pages ([149ee00](https://github.com/alternun-development/alternun/commit/149ee00a4b59256cfc8162e83b575648ad7eb070))
- add privacy, terms, and cookies policy pages ([8330706](https://github.com/alternun-development/alternun/commit/8330706f99fd2a9dff2336dc7bfabd6d334d14d2))
- **auth:** add runtime footer with version source and auth host ([49d8ef1](https://github.com/alternun-development/alternun/commit/49d8ef162761e57c3b759658fce52af8c6328870))
- **auth:** add wrapper package and mobile web3 auth foundation ([bec0853](https://github.com/alternun-development/alternun/commit/bec085303b41712d3b9fe959a37e103e29b606f0))
- **ci:** enforce post-deploy reachability and reconcile infra drift ([e69860d](https://github.com/alternun-development/alternun/commit/e69860dc34c7c4047af45e4801426c60fc8de495))
- enforce branch protection workflow requiring PR to develop ([b2b7556](https://github.com/alternun-development/alternun/commit/b2b7556720f8c12527b950090b378981f7133882))
- faqs ([95a9fbc](https://github.com/alternun-development/alternun/commit/95a9fbcfb7f94abf7596e7f46707b7fb2c19a691))
- github actions ([f4e4eb4](https://github.com/alternun-development/alternun/commit/f4e4eb4b9deec8fec509a0bae5f9d420bec9f600))
- github actions ([5544a27](https://github.com/alternun-development/alternun/commit/5544a2797d6f056fc469a3ac8415132a08bc34c3))
- github actions ([5f89a6c](https://github.com/alternun-development/alternun/commit/5f89a6ca53bd988087293fd840614f741974c0a7))
- github actions ([13116fd](https://github.com/alternun-development/alternun/commit/13116fd7168f14c02add1c349eae486d4d433062))
- github actions ([330c046](https://github.com/alternun-development/alternun/commit/330c046d8d5e0d7e3fc6cbbcb0648acce651fbd5))
- github actions ([9403ddd](https://github.com/alternun-development/alternun/commit/9403ddddefc96e2d57e77f777d1015c1ac40ca12))
- github actions ([fd82e6b](https://github.com/alternun-development/alternun/commit/fd82e6bf8963e344469f677eae79c084624b34ee))
- github actions ([93b5133](https://github.com/alternun-development/alternun/commit/93b51339a3672d8c0ccb7650cbca3e9886e443db))
- github actions ([db2276c](https://github.com/alternun-development/alternun/commit/db2276c35ea591e29218632e77ec96eee612161e))
- github actions ([ac18e39](https://github.com/alternun-development/alternun/commit/ac18e39e7509fa37c0dbeb825ef9f3adc1922e18))
- github actions ([0701d57](https://github.com/alternun-development/alternun/commit/0701d57b426eae797b41b9333d7e21197391a991))
- github actions ([cf52c3a](https://github.com/alternun-development/alternun/commit/cf52c3a1be0fff4960cf94df667dd1eb989570cd))
- github actions ([c7df9f2](https://github.com/alternun-development/alternun/commit/c7df9f2707256fbd33f6fae82ac134d91e557cfb))
- i18n ([056f4c5](https://github.com/alternun-development/alternun/commit/056f4c57bcb2ac0b3d43e14af193eeef9b00623d))
- i18n ([9f1ca23](https://github.com/alternun-development/alternun/commit/9f1ca234d6d167122af63e8885b90184d506ea73))
- i18n ([d8727a4](https://github.com/alternun-development/alternun/commit/d8727a4d27097fbd81a318c5ec87e0ba2de31eb1))
- implement proper i18n for interactive neural vortex hero ([32bb671](https://github.com/alternun-development/alternun/commit/32bb671c8d16c25f655953e8341013bc50116c73))
- **infra:** move dev domain to testnet and add redirect stack ([84970be](https://github.com/alternun-development/alternun/commit/84970beaddb0c87406fbb73a777f1e0c15b9f8e1))
- initialize versioning configuration for monorepo ([c49af9b](https://github.com/alternun-development/alternun/commit/c49af9b2091616301d938236f0327bbe9ab12fac))
- integrate wallet auth, onboarding, and infra changes ([9341e8f](https://github.com/alternun-development/alternun/commit/9341e8fbb7cf0688a1a4dc759a0a6cd806442b4b))
- migrate from npm to pnpm as main package manager ([4f7e54b](https://github.com/alternun-development/alternun/commit/4f7e54b119d527ad84722909ef18cf6e45019d3b))
- **mobile:** add AIRS intro experience and app scaffolding ([cd6c8a0](https://github.com/alternun-development/alternun/commit/cd6c8a06ec6d6c8305b71f764872b5fbe07adef9))
- **mobile:** add reusable app footer and wire into global layout ([5c7148e](https://github.com/alternun-development/alternun/commit/5c7148e12ed8ceb68171b740d41d89339e4b05de))
- polish mobile experience and release tooling ([abc7c86](https://github.com/alternun-development/alternun/commit/abc7c8605f4fc34c1f8dbbddb14c4c5788964258))
- refresh AIRS experience and release workflow ([303707c](https://github.com/alternun-development/alternun/commit/303707cb9bab75cd38e52be311d2e2ac45bbf831))
- th 18n ([8c4b5ba](https://github.com/alternun-development/alternun/commit/8c4b5ba8d581f926ef8a5864ac7f78fd12bba017))
- th 18n ([a54b8bf](https://github.com/alternun-development/alternun/commit/a54b8bf4321c9ca4da0324069555260e4b3f406b))

### Performance Improvements

- **ci:** skip slow post-deploy dns sync by default ([1acd800](https://github.com/alternun-development/alternun/commit/1acd800b6e77b23b3859899f67784809a430a67e))

# Changelog

All notable changes to this project will be documented in this file.
