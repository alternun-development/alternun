import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const infraDefaultsPath = path.resolve('config/infrastructure-specs.ts');
const localInfraEnvPath = path.resolve('.env');
const deploymentConfigExamplePath = path.resolve('config/deployment.config.example.json');
const envExamplePath = path.resolve('.env.example');
const sstDeployPath = path.resolve('scripts/sst-deploy.sh');
const predeployChecksPath = path.resolve('scripts/predeploy-checks.sh');
const postdeployDnsPath = path.resolve('scripts/postdeploy-update-dns.sh');
const postdeployReachabilityPath = path.resolve('scripts/postdeploy-reachability-check.sh');
const readmePath = path.resolve('README.md');

void test('airs to testnet redirect is disabled by default everywhere it is configured', () => {
  const infraDefaultsSource = fs.readFileSync(infraDefaultsPath, 'utf8');
  const localInfraEnvSource = fs.readFileSync(localInfraEnvPath, 'utf8');
  const deploymentConfigExampleSource = fs.readFileSync(deploymentConfigExamplePath, 'utf8');
  const envExampleSource = fs.readFileSync(envExamplePath, 'utf8');
  const sstDeploySource = fs.readFileSync(sstDeployPath, 'utf8');
  const predeployChecksSource = fs.readFileSync(predeployChecksPath, 'utf8');
  const postdeployDnsSource = fs.readFileSync(postdeployDnsPath, 'utf8');
  const postdeployReachabilitySource = fs.readFileSync(postdeployReachabilityPath, 'utf8');
  const readmeSource = fs.readFileSync(readmePath, 'utf8');

  assert.match(infraDefaultsSource, /enableAirsToDev: false/);
  assert.match(localInfraEnvSource, /INFRA_REDIRECT_AIRS_TO_DEV=false/);
  assert.match(
    localInfraEnvSource,
    /INFRA_PIPELINES=production,dev,identity-dev,identity-prod,dashboard-dev,dashboard-prod/
  );
  assert.match(deploymentConfigExampleSource, /"enableAirsToDev": false/);
  assert.match(envExampleSource, /INFRA_REDIRECT_AIRS_TO_DEV=false/);
  assert.match(sstDeploySource, /INFRA_REDIRECT_AIRS_TO_DEV:-false/);
  assert.match(predeployChecksSource, /INFRA_REDIRECT_AIRS_TO_DEV:-false/);
  assert.match(postdeployDnsSource, /INFRA_REDIRECT_AIRS_TO_DEV:-false/);
  assert.match(postdeployReachabilitySource, /INFRA_REDIRECT_AIRS_TO_DEV:-false/);
  assert.match(readmeSource, /INFRA_REDIRECT_AIRS_TO_DEV` now defaults to `false/);
});
