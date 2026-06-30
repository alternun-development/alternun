// Shared stage detection, mirroring connection.ts's isTestnetAlignedDatabaseEnv so the wallet
// module's chain-RPC selection stays consistent with the database/domain testnet split
// (testnet.airs.alternun.co -> testnet RPCs, airs.alternun.co -> mainnet RPCs).
export function isTestnetStage(env: NodeJS.ProcessEnv = process.env): boolean {
  const stage = (env.SST_STAGE ?? env.STACK ?? '').trim().toLowerCase().replace(/_/g, '-');

  return (
    env.ALTERNUN_TESTNET_MODE === 'on' ||
    stage === 'dev' ||
    stage === 'testnet' ||
    stage.includes('testnet') ||
    stage.endsWith('-dev')
  );
}
