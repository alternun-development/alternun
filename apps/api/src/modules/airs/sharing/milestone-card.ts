import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import * as PImage from 'pureimage';

export const MILESTONES: Record<string, number> = {
  first_10_airs: 10,
  fifty_airs: 50,
  first_100_airs: 100,
  first_500_airs: 500,
  first_1000_airs: 1000,
  first_5000_airs: 5000,
  first_10000_airs: 10000,
  first_50000_airs: 50000,
};

function assetDirectory(): string {
  const candidates = [
    resolve(process.cwd(), 'milestone-assets'),
    resolve(process.cwd(), 'dist-lambda/milestone-assets'),
    resolve(process.cwd(), 'apps/mobile/assets/badges/milestones-share'),
    resolve(process.cwd(), '../mobile/assets/badges/milestones-share'),
  ];
  const found = candidates.find((path) => existsSync(resolve(path, '10.png')));
  if (!found) throw new Error('Milestone rendering assets are missing');
  return found;
}

export async function renderMilestoneCard(amount: number, displayName: string): Promise<Buffer> {
  const directory = assetDirectory();
  const fontPath = [
    resolve(directory, 'Sculpin-Bold.ttf'),
    resolve(directory, '../../fonts/Sculpin-Bold.ttf'),
  ].find(existsSync);
  if (!fontPath) throw new Error('Milestone font is missing');
  await PImage.registerFont(fontPath, 'AirsShare').load();
  const card = await PImage.decodePNGFromStream(
    createReadStream(resolve(directory, `${amount}.png`))
  );
  const context = card.getContext('2d');
  context.fillStyle = '#f3e8cf';
  let size = 44;
  context.font = `${size}pt AirsShare`;
  while (context.measureText(displayName).width > 920 && size > 18) {
    context.font = `${--size}pt AirsShare`;
  }
  // One line with an ellipsis for exceptionally wide names.
  let name = displayName;
  while (context.measureText(name).width > 920 && name.length > 1) {
    name = `${Array.from(name.replace(/…$/, '')).slice(0, -1).join('')}…`;
  }
  const textWidth = context.measureText(name).width;
  context.fillText(name, (1080 - textWidth) / 2, 895);
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  await PImage.encodePNGToStream(card, stream);
  return Buffer.concat(chunks);
}

export function milestoneShareHtml(card: {
  displayName: string;
  amount: number;
  imageUrl: string;
  shareUrl: string;
}): string {
  const escape = (value: string): string =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        }[char]!)
    );
  const title = escape(`${card.displayName} reached ${card.amount.toLocaleString('en-US')} AIRS`);
  const image = escape(card.imageUrl);
  const url = escape(card.shareUrl);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="Celebrate a milestone on AIRS by Alternun."><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1080"><meta property="og:image:height" content="1080"><meta property="og:image:alt" content="${title}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:image" content="${image}">
<style>body{margin:0;padding:24px;background:#071d19;color:#f3e8cf;font-family:system-ui;text-align:center}img{width:100%;max-width:600px;border-radius:24px}a{color:#18d9ac}</style></head><body><h1>${title}</h1><img src="${image}" alt="${title}"><p><a href="https://airs.alternun.co">Explore AIRS by Alternun</a></p></body></html>`;
}
