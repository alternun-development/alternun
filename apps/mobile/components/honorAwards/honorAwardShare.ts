import { resolvePublicAppUrl } from '../share/shareTargets';
import type { ShareContent } from '../share/share.types';
import type { HonorAward } from '../../utils/honorAwards';
import { presetBadge } from './honorAwardArt';
import { canDrawHonorShareCard, renderHonorShareCard } from './honorAwardShareCard';
import { honorPartnerLine, honorText } from './honorAwardTheme';
import type { HonorShareCard, Translate } from './honorAwards.types';

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

/** Runs `make` once and hands every caller the same promise (the preview and the shared file). */
function once<T>(make: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending) pending = make();
    return pending;
  };
}

/**
 * What sharing a legacy medal sends: the message, the link to the project it supports and the
 * image. On the web the image is the medal on a card with the person's name, as milestones are
 * shared; elsewhere it is the medal itself (its own image, or the bundled art of its preset).
 */
export function honorShareContent(
  award: HonorAward,
  t: Translate,
  holderName?: string | null
): ShareContent {
  const { recipe, partner, project } = award;
  const base = resolvePublicAppUrl();
  const name = `airs-${slug(recipe.title)}`;
  const bundled = presetBadge(recipe.artPreset, recipe.tier);
  const medal = recipe.badgeImageUrl
    ? { source: recipe.badgeImageUrl, fileName: `${name}.${extension(recipe.badgeImageUrl)}` }
    : bundled
    ? { source: bundled, fileName: `${name}.webp` }
    : recipe.frontImageUrl
    ? { source: recipe.frontImageUrl, fileName: `${name}.${extension(recipe.frontImageUrl)}` }
    : null;
  const card: HonorShareCard = {
    brand: 'Airs by Alternun',
    title: recipe.title,
    detail: [
      honorText(t, 'profile.honorAwards.share.cardLabel', 'Medalla de legado'),
      honorPartnerLine(partner),
    ]
      .filter(Boolean)
      .join(' · '),
    holder: holderName?.trim() ?? '',
    site: 'airs.alternun.co',
  };
  const medals = [recipe.badgeImageUrl, bundled, recipe.frontImageUrl].filter(
    (source): source is NonNullable<typeof source> => !!source
  );
  return {
    title: honorText(t, 'profile.honorAwards.share.title', 'Comparte tu medalla de legado'),
    message: partner
      ? honorText(
          t,
          'profile.honorAwards.shareMessageWithPartner',
          '¡Obtuve la medalla de legado "{{title}}" con {{partner}} en Airs by Alternun! 🌱 #Airs #Alternun',
          { title: recipe.title, partner: partner.displayName }
        )
      : honorText(
          t,
          'profile.honorAwards.shareMessage',
          '¡Obtuve la medalla de legado "{{title}}" en Airs by Alternun! 🌱 #Airs #Alternun',
          { title: recipe.title }
        ),
    url: project?.slug ? `${base}/explore/${project.slug}` : base,
    image: canDrawHonorShareCard()
      ? { fileName: `${name}.png`, load: once(() => renderHonorShareCard(card, medals)) }
      : medal,
  };
}
