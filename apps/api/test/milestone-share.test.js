const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { renderMilestoneCard, milestoneShareHtml } = require('../src/modules/airs/sharing/milestone-card');
const { MilestoneShareService } = require('../src/modules/airs/sharing/milestone-share.service');
const auth = require('../src/common/auth/resolve-user-id');
const repository = require('../src/modules/airs/airs.repository');

test('renders personalized PNG and escapes social metadata', async () => {
  const image = await renderMilestoneCard(10, 'Edward');
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), 1080);
  fs.writeFileSync('/tmp/airs-personalized-preview.png', image);
  const html = milestoneShareHtml({ displayName: '<script>"Edward"</script>', amount: 10, imageUrl: 'https://cdn.example/card.png', shareUrl: 'https://api.example/share/123' });
  assert.ok(html.includes('twitter:card'));
  assert.ok(html.includes('https://cdn.example/card.png'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('authenticates ownership, rejects locked and unknown milestones, and publishes verified names only', async (t) => {
  t.mock.method(auth, 'resolveUserId', async () => 'verified-user');
  t.mock.method(repository, 'getAirsDashboardSnapshot', async () => ({ airsBalance: 30, displayName: 'Verified Edward' }));
  t.mock.method(repository, 'getUserAchievements', async () => []);
  const service = new MilestoneShareService();
  const writes = [];
  service.storage = () => ({
    download: async () => ({ error: new Error('not found') }),
    getPublicUrl: path => ({ data: { publicUrl: 'https://cdn.example/' + path } }),
    upload: async (...args) => { writes.push(args); return { error: null }; },
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
