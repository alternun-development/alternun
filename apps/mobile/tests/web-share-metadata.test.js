const { describe, expect, it } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

// Link crawlers (WhatsApp, Telegram, X) do not run JavaScript, so the share
// preview must come from the static HTML template that `expo export` copies.
const publicDir = path.resolve(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

const TITLE = 'Airs | ¿Cuál es tu score regenerativo?';
const DESCRIPTION =
  'Descubre cuánto suma lo que haces por el planeta. Crea tu cuenta gratis y comienza tu trayectoria.';

function meta(attribute, key) {
  const match = html.match(new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="([^"]*)"`));
  return match ? match[1] : null;
}

function metaContent(key) {
  return meta('property', key) ?? meta('name', key);
}

describe('web share preview metadata', () => {
  it('uses the Airs title and Spanish description everywhere', () => {
    expect(html).toContain(`<title>${TITLE}</title>`);
    expect(metaContent('og:title')).toBe(TITLE);
    expect(metaContent('twitter:title')).toBe(TITLE);
    expect(metaContent('description')).toBe(DESCRIPTION);
    expect(metaContent('og:description')).toBe(DESCRIPTION);
    expect(metaContent('twitter:description')).toBe(DESCRIPTION);
  });

  it('defines the Open Graph site, type, and URL', () => {
    expect(metaContent('og:type')).toBe('website');
    expect(metaContent('og:site_name')).toBe('Airs');
    expect(metaContent('og:url')).toBe('https://airs.alternun.co');
    // The preview image is the square logosymbol, so the small card keeps it uncropped.
    expect(metaContent('twitter:card')).toBe('summary');
  });

  it('points og:image and twitter:image to an absolute HTTPS Airs image, not the Alternun logo', () => {
    const image = metaContent('og:image');
    expect(image).toMatch(/^https:\/\/airs\.alternun\.co\/[\w.-]+\.png$/);
    expect(image).not.toMatch(/alternun-logo|og-image\.png/i);
    expect(metaContent('twitter:image')).toBe(image);
    expect(metaContent('og:image:alt')).toMatch(/Airs/);
    expect(metaContent('twitter:image:alt')).toBe(metaContent('og:image:alt'));

    const file = path.join(publicDir, new URL(image).pathname);
    expect(fs.existsSync(file)).toBe(true);
    const header = fs.readFileSync(file).subarray(16, 24);
    expect(Number(metaContent('og:image:width'))).toBe(header.readUInt32BE(0));
    expect(Number(metaContent('og:image:height'))).toBe(header.readUInt32BE(4));
  });

  it('shares only the square Airs logosymbol, so previews do not crop the logo', () => {
    const file = path.join(publicDir, new URL(metaContent('og:image')).pathname);
    const header = fs.readFileSync(file).subarray(16, 24);
    const width = header.readUInt32BE(0);
    expect(width).toBe(header.readUInt32BE(4));
    expect(width).toBeGreaterThanOrEqual(600);
    expect(metaContent('og:image')).toMatch(/symbol/i);
  });
});
