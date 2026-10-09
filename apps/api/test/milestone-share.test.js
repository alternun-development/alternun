const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Readable } = require('node:stream');
const { test } = require('node:test');
const fs = require('node:fs');
const PImage = require('pureimage');
const {
  renderMilestoneCard,
  milestoneShareHtml,
} = require('../src/modules/airs/sharing/milestone-card');
const { MilestoneShareService } = require('../src/modules/airs/sharing/milestone-share.service');
const auth = require('../src/common/auth/resolve-user-id');
const repository = require('../src/modules/airs/airs.repository');

test('renders personalized PNG and escapes social metadata', async () => {
  const image = await renderMilestoneCard(10, 'Edward');
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), 1080);
  fs.writeFileSync('/tmp/airs-personalized-preview.png', image);
  const html = milestoneShareHtml({
    displayName: '<script>"Edward"</script>',
    amount: 10,
    imageUrl: 'https://cdn.example/card.png',
    shareUrl: 'https://api.example/share/123',
  });
  assert.ok(html.includes('twitter:card'));
  assert.ok(html.includes('https://cdn.example/card.png'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('preserves counters in personalized milestone names', async () => {
  const image = await renderMilestoneCard(10, 'Alternun Ocho Pedro Gómez');
  const card = await PImage.decodePNGFromStream(Readable.from(image));
  assert.deepEqual([...card.getPixelRGBA_separate(531, 884)], [7, 29, 25, 255]);
});

test('authenticates ownership, rejects locked and unknown milestones, and publishes verified names only', async (t) => {
  t.mock.method(auth, 'resolveUserId', async () => 'verified-user');
  t.mock.method(repository, 'getAirsDashboardSnapshot', async () => ({
    airsBalance: 30,
    displayName: 'Verified Edward',
  }));
  t.mock.method(repository, 'getUserAchievements', async () => []);
  const service = new MilestoneShareService();
  const writes = [];
  service.storage = () => ({
    download: async () => ({ error: new Error('not found') }),
    getPublicUrl: (path) => ({ data: { publicUrl: 'https://cdn.example/' + path } }),
    upload: async (...args) => {
      writes.push(args);
      return { error: null };
    },
  });
  const prior = process.env.AIRS_SHARE_PUBLIC_API_URL;
  process.env.AIRS_SHARE_PUBLIC_API_URL = 'https://api.example';
  try {
    await assert.rejects(() => service.create('Bearer valid', '__proto__'), /Unknown/);
    await assert.rejects(() => service.create('Bearer valid', 'fifty_airs'), /not been earned/);
    assert.equal(writes.length, 0);
    const result = await service.create('Bearer valid', 'first_10_airs');
    assert.equal(result.displayName, 'Verified Edward');
    assert.match(result.shareUrl, /\/v1\/airs\/milestones\/share\/[a-f0-9]{64}$/);
    assert.equal(writes.length, 2);
    assert.equal(writes[0][2].contentType, 'image/png');
    assert.ok(!writes[1][1].includes('verified-user'));
    await assert.rejects(() => service.find('../secret'), /Not Found/);
  } finally {
    if (prior === undefined) delete process.env.AIRS_SHARE_PUBLIC_API_URL;
    else process.env.AIRS_SHARE_PUBLIC_API_URL = prior;
  }
});

test('uses v2 milestone ids and does not reuse v1 cache entries', async (t) => {
  const userId = 'versioned-user';
  const milestone = 'first_10_airs';
  const displayName = 'Nora Versionada';
  const idFor = (version) =>
    createHash('sha256')
      .update(JSON.stringify([version, userId, milestone, displayName]))
      .digest('hex');
  const oldId = idFor('v1');
  const newId = idFor('v2');
  t.mock.method(auth, 'resolveUserId', async () => userId);
  t.mock.method(repository, 'getAirsDashboardSnapshot', async () => ({
    airsBalance: 10,
    displayName,
  }));
  t.mock.method(repository, 'getUserAchievements', async () => []);
  const reads = [];
  const writes = [];
  const service = new MilestoneShareService();
  service.storage = () => ({
    download: async (path) => {
      reads.push(path);
      return { error: path === `${oldId}.json` ? null : new Error('not found') };
    },
    getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.example/${path}` } }),
    upload: async (...args) => {
      writes.push(args);
      return { error: null };
    },
  });
  const prior = process.env.AIRS_SHARE_PUBLIC_API_URL;
  process.env.AIRS_SHARE_PUBLIC_API_URL = 'https://api.example';
  try {
    const result = await service.create('Bearer valid', milestone);
    assert.deepEqual(reads, [`${newId}.json`]);
    assert.equal(result.imageUrl, `https://cdn.example/${newId}.png`);
    assert.equal(result.shareUrl, `https://api.example/v1/airs/milestones/share/${newId}`);
    assert.deepEqual(
      writes.map(([path]) => path),
      [`${newId}.png`, `${newId}.json`]
    );
  } finally {
    if (prior === undefined) delete process.env.AIRS_SHARE_PUBLIC_API_URL;
    else process.env.AIRS_SHARE_PUBLIC_API_URL = prior;
  }
});
