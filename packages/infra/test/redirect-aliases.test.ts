import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const expoConfigPath = path.resolve('config/expo.ts');
const infraConfigPath = path.resolve('infra.config.ts');
const redirectsPath = path.resolve('modules/redirects.ts');
const loadInfraEnvPath = path.resolve('scripts/_load-infra-env.sh');
const predeployChecksPath = path.resolve('scripts/predeploy-checks.sh');
const sstDeployPath = path.resolve('scripts/sst-deploy.sh');
const postdeployReachabilityPath = path.resolve('scripts/postdeploy-reachability-check.sh');
const deploymentExamplePath = path.resolve('config/deployment.config.example.json');

void test('infra redirect config supports demo and beta aliases for testnet', () => {
  const expoConfigSource = fs.readFileSync(expoConfigPath, 'utf8');
  const infraConfigSource = fs.readFileSync(infraConfigPath, 'utf8');
  const redirectsSource = fs.readFileSync(redirectsPath, 'utf8');
  const loadInfraEnvSource = fs.readFileSync(loadInfraEnvPath, 'utf8');
  const predeploySource = fs.readFileSync(predeployChecksPath, 'utf8');
  const sstDeploySource = fs.readFileSync(sstDeployPath, 'utf8');
  const postdeploySource = fs.readFileSync(postdeployReachabilityPath, 'utf8');
  const exampleConfig = JSON.parse(fs.readFileSync(deploymentExamplePath, 'utf8')) as {
    redirects?: { devToTestnetSourceDomains?: string[] };
  };

  assert.match(expoConfigSource, /const devToTestnetSourceDomains = normalizeDomainList\(/);
  assert.match(expoConfigSource, /`demo\.\$\{subdomain\}\.\$\{rootDomain\}`/);
  assert.match(expoConfigSource, /`beta\.\$\{subdomain\}\.\$\{rootDomain\}`/);

  assert.match(infraConfigSource, /INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES/);
  assert.match(infraConfigSource, /devToTestnetRedirectAliases/);
  assert.match(infraConfigSource, /createDnsValidatedCertificate\(/);
  assert.match(infraConfigSource, /dev-redir-\$\{stage\}-wildcard-cert/);
  assert.match(infraConfigSource, /aliases:\s*\[\s*`root-domain-redirect-\$\{stage\}`/s);
  assert.match(infraConfigSource, /aliases:\s*\[\s*`airs-domain-redirect-\$\{stage\}`/s);
  assert.match(infraConfigSource, /aliases:\s*\[\s*`dev-domain-redirect-\$\{stage\}`/s);
  assert.match(
    infraConfigSource,
    /aliases:\s*\[\s*`dev-domain-redirect-\$\{stage\}-wildcard-cert`/s
  );
  assert.match(
    infraConfigSource,
    /createExternalDomainRedirect\(\{\s*id: `dev-redir-\$\{stage\}`/s
  );
  assert.match(redirectsSource, /sst\.aws\.dns\(\{\s*override:\s*true\s*\}\)/s);

  assert.match(
    loadInfraEnvSource,
    /dev_to_testnet_source_primary=\$\{INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:/
  );
  assert.match(
    loadInfraEnvSource,
    /dev_to_testnet_source_demo=\$\{dev_to_testnet_source_primary\/#dev\.\//
  );
  assert.match(
    loadInfraEnvSource,
    /dev_to_testnet_source_beta=\$\{dev_to_testnet_source_primary\/#dev\.\//
  );
  assert.match(loadInfraEnvSource, /printf -v AWS_SESSION_TOKEN '%s' "\$\{AWS_SESSION\}"/);

  assert.match(predeploySource, /dev_source_primary=\$\{INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:/);
  assert.match(predeploySource, /dev_source_demo=\$\{dev_source_primary\/#dev\.\//);
  assert.match(predeploySource, /dev_source_beta=\$\{dev_source_primary\/#dev\.\//);
  assert.match(predeploySource, /INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES/);
  assert.match(sstDeploySource, /dev_source_primary=\$\{INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:/);
  assert.match(sstDeploySource, /dev_source_demo=\$\{dev_source_primary\/#dev\.\//);
  assert.match(sstDeploySource, /dev_source_beta=\$\{dev_source_primary\/#dev\.\//);
  assert.match(sstDeploySource, /INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES/);
  assert.doesNotMatch(sstDeploySource, /aliases\+=\("\$\{DOMAIN\}"\)/);
  assert.match(postdeploySource, /dev_source_primary=\$\{INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:/);
  assert.match(postdeploySource, /dev_source_demo=\$\{dev_source_primary\/#dev\.\//);
  assert.match(postdeploySource, /dev_source_beta=\$\{dev_source_primary\/#dev\.\//);
  assert.match(postdeploySource, /INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES/);
  assert.match(postdeploySource, /run_reachability_checks_in_parallel\(\)/);
  assert.match(postdeploySource, /launch_reachability_check\(/);
  assert.match(sstDeploySource, /remove_cloudfront_aliases_from_distribution\(/);
  assert.match(sstDeploySource, /declare -A dist_aliases=/);
  assert.match(sstDeploySource, /\.Aliases \|= del\(\.Items\)/);
  assert.ok(sstDeploySource.includes('remove_cloudfront_aliases "${cleanup_aliases[@]}"'));
  assert.ok(sstDeploySource.includes('aws cloudfront wait distribution-deployed --id "$dist_id"'));

  assert.deepEqual(exampleConfig.redirects?.devToTestnetSourceDomains, [
    'dev.airs.alternun.co',
    'demo.airs.alternun.co',
    'beta.airs.alternun.co',
  ]);
});
