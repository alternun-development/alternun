import { resolvePublicAppUrl } from '../share/shareTargets';
import type { ShareContent } from '../share/share.types';
import type { HonorAward } from '../../utils/honorAwards';
import { presetBadge } from './honorAwardArt';
import { honorText } from './honorAwardTheme';
import type { Translate } from './honorAwards.types';

function slug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'medalla'
  );
}

function extension(url: string): string {
  const match = /\.(png|jpe?g|webp)(?:[?#].*)?$/i.exec(url);
  return match ? match[1].toLowerCase() : 'png';
}

/**
 * What sharing a legacy medal sends: the message, the link to the project it supports and the
 * medal itself to download (its own image, or the bundled art of its preset).
 */
export function honorShareContent(award: HonorAward, t: Translate): ShareContent {
  const { recipe, partner, project } = award;
  const base = resolvePublicAppUrl();
  const name = `airs-${slug(recipe.title)}`;
  const bundled = presetBadge(recipe.artPreset, recipe.tier);
  const image = recipe.badgeImageUrl
    ? { source: recipe.badgeImageUrl, fileName: `${name}.${extension(recipe.badgeImageUrl)}` }
    : bundled
    ? { source: bundled, fileName: `${name}.webp` }
    : recipe.frontImageUrl
    ? { source: recipe.frontImageUrl, fileName: `${name}.${extension(recipe.frontImageUrl)}` }
    : null;
  return {
    title: honorText(t, 'profile.honorAwards.share.title', 'Comparte tu medalla de legado'),
    message: honorText(
      t,
      'profile.honorAwards.shareMessage',
      'Obtuve la medalla de legado "{{title}}" en Airs{{partner}}.',
      { title: recipe.title, partner: partner ? ` · ${partner.displayName}` : '' }
    ),
    url: project?.slug ? `${base}/explore/${project.slug}` : base,
    image,
  };
}
