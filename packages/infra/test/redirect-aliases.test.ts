import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const expoConfigPath = path.resolve('config/expo.ts');
const infraConfigPath = path.resolve('infra.config.ts');
const predeployChecksPath = path.resolve('scripts/predeploy-checks.sh');
const sstDeployPath = path.resolve('scripts/sst-deploy.sh');
const postdeployReachabilityPath = path.resolve('scripts/postdeploy-reachability-check.sh');
const deploymentExamplePath = path.resolve('config/deployment.config.example.json');

void test('infra redirect config supports demo and beta aliases for testnet', () => {
  const expoConfigSource = fs.readFileSync(expoConfigPath, 'utf8');
  const infraConfigSource = fs.readFileSync(infraConfigPath, 'utf8');
  const predeploySource = fs.readFileSync(predeployChecksPath, 'utf8');
  const sstDeploySource = fs.readFileSync(sstDeployPath, 'utf8');
  const postdeploySource = fs.readFileSync(postdeployReachabilityPath, 'utf8');
  const exampleConfig = JSON.parse(fs.readFileSync(deploymentExamplePath, 'utf8')) as {
    redirects?: { devToTestnetSourceDomains?: string[] };
  };

  assert.match(expoConfigSource, /devToTestnetSourceDomains: normalizeDomainList\(/);
  assert.match(expoConfigSource, /`demo\.\$\{subdomain\}\.\$\{rootDomain\}`/);
  assert.match(expoConfigSource, /`beta\.\$\{subdomain\}\.\$\{rootDomain\}`/);

  assert.match(infraConfigSource, /INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES/);
  assert.match(infraConfigSource, /devToTestnetRedirectAliases/);
  assert.match(infraConfigSource, /createDnsValidatedCertificate\(/);
  assert.match(infraConfigSource, /dev-redir-\$\{stage\}-wildcard-cert/);
  assert.match(
    infraConfigSource,
    /createExternalDomainRedirect\(\{\s*id: `dev-redir-\$\{stage\}`/s
  );

  assert.match(predeploySource, /INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES/);
  assert.match(sstDeploySource, /INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES/);
  assert.match(postdeploySource, /INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES/);

  assert.deepEqual(exampleConfig.redirects?.devToTestnetSourceDomains, [
    'dev.airs.alternun.co',
    'demo.airs.alternun.co',
    'beta.airs.alternun.co',
  ]);
});
