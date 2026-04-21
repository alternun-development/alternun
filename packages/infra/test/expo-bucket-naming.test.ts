import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const expoConfigPath = path.resolve('config/expo.ts');
const infraConfigPath = path.resolve('infra.config.ts');
const syncPublicAssetsPath = path.resolve('scripts/sync-public-assets.sh');

void test('expo bucket naming is stage-scoped and organized', () => {
  const expoConfigSource = fs.readFileSync(expoConfigPath, 'utf8');
  const infraConfigSource = fs.readFileSync(infraConfigPath, 'utf8');
  const syncPublicAssetsSource = fs.readFileSync(syncPublicAssetsPath, 'utf8');

  assert.match(expoConfigSource, /export function createExpoWebSiteBucketName\(/);
  assert.match(expoConfigSource, /export function createExpoPublicAssetBucketName\(/);
  assert.match(expoConfigSource, /expo-web-site/);
  assert.match(expoConfigSource, /expo-public-assets/);

  assert.match(infraConfigSource, /createExpoWebSiteBucketName\(/);
  assert.match(infraConfigSource, /args\.type !== 'aws:s3\/bucketV2:BucketV2'/);
  assert.match(infraConfigSource, /resourceName\.includes\('expo-web'\)/);
  assert.match(infraConfigSource, /resourceName\.includes\('assetsbucket'\)/);
  assert.doesNotMatch(infraConfigSource, /props\.access !== 'public'/);
  assert.match(infraConfigSource, /if \(props\.bucket !== undefined\)/);
  assert.match(infraConfigSource, /bucket: expoSiteBucketName/);

  assert.match(syncPublicAssetsSource, /NEW_ASSET_BUCKET=/);
  assert.match(syncPublicAssetsSource, /LEGACY_ASSET_BUCKET=/);
  assert.match(syncPublicAssetsSource, /expo-public-assets/);
});
