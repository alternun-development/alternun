import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { BenefitCategoryDto, BenefitItemDto } from './dto/benefit.dto';

type Locale = 'en' | 'es' | 'th';

function resolveSupabase(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return { url, key };
}

async function supabaseGet<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const cfg = resolveSupabase();
  if (!cfg) return [];

  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${cfg.url.replace(/\/$/, '')}/rest/v1/${path}${qs ? `?${qs}` : ''}`, {
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase query failed [${res.status}]: ${text}`);
  }

  return res.json() as Promise<T[]>;
}

@Injectable()
export class BenefitsService {
  private readonly logger = new Logger(BenefitsService.name);

  async getCategories(locale: Locale = 'en'): Promise<BenefitCategoryDto[]> {
    try {
      const rows = await supabaseGet<{
        slug: string;
        rating: number;
        is_top_rated: boolean;
        atn_min: number;
        cover_urls: string[];
        benefit_category_content: Array<{
          title: string;
          meta: string;
          description: string;
          info_body: string;
          cta_label: string;
          tag1: string;
          tag2: string;
        }>;
      }>('benefit_categories', {
        select:
          'slug,rating,is_top_rated,atn_min,cover_urls,benefit_category_content!inner(title,meta,description,info_body,cta_label,tag1,tag2)',
        'benefit_category_content.locale': `eq.${locale}`,
        order: 'sort_order.asc',
      });

      return rows.map((row) => {
        const content = row.benefit_category_content[0];
        return {
          slug: row.slug,
          title: content?.title ?? row.slug,
          meta: content?.meta ?? '',
          description: content?.description ?? '',
          infoBody: content?.info_body ?? '',
          ctaLabel: content?.cta_label ?? '',
          tags: [content?.tag1 ?? '', content?.tag2 ?? ''].filter(Boolean),
          rating: Number(row.rating),
          isTopRated: row.is_top_rated,
          atnMin: row.atn_min,
          coverUrls: row.cover_urls ?? [],
        };
      });
    } catch (err) {
      this.logger.warn(`getCategories failed, falling back to static data: ${String(err)}`);
      return getStaticCategories(locale);
    }
  }

  async getItemsByCategory(categorySlug: string, locale: Locale = 'en'): Promise<BenefitItemDto[]> {
    try {
      const categories = await supabaseGet<{ id: string }>('benefit_categories', {
        slug: `eq.${categorySlug}`,
        select: 'id',
        limit: '1',
      });

      if (!categories.length) throw new NotFoundException(categorySlug);

      const rows = await supabaseGet<{
        slug: string;
        image_url: string;
        atn_price: number;
        is_featured: boolean;
        benefit_item_content: Array<{ title: string; description: string }>;
      }>('benefit_items', {
        select:
          'slug,image_url,atn_price,is_featured,benefit_item_content!inner(title,description)',
        category_id: `eq.${categories[0].id}`,
        'benefit_item_content.locale': `eq.${locale}`,
        is_active: 'eq.true',
        order: 'sort_order.asc',
      });

      return rows.map((row) => {
        const content = row.benefit_item_content[0];
        return {
          slug: row.slug,
          title: content?.title ?? row.slug,
          description: content?.description ?? '',
          imageUrl: row.image_url,
          atnPrice: row.atn_price,
          isFeatured: row.is_featured,
        };
      });
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.warn(`getItemsByCategory failed: ${String(err)}`);
      return [];
    }
  }
}

// ── Static fallback (used when Supabase is unconfigured / unreachable) ─────────

function getStaticCategories(locale: Locale): BenefitCategoryDto[] {
  const data: Record<Locale, BenefitCategoryDto[]> = {
    en: [
      {
        slug: 'eco',
        title: 'Eco Products',
        meta: 'Regenerative agriculture',
        description: 'Organic and sustainable products verified by the Alternun ecosystem.',
        infoBody:
          'Access exclusive discounts on sustainable products from our allied brands. From organic clothing to ecological cleaning products.',
        ctaLabel: 'Shop Now',
        tags: ['Organic', 'Sustainable'],
        rating: 4.8,
        isTopRated: true,
        atnMin: 120,
        coverUrls: [
          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2070&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070&auto=format&fit=crop',
        ],
      },
      {
        slug: 'experiencias',
        title: 'Experiences',
        meta: 'Curated escapes',
        description:
          'Discover curated trips, retreats, and experiences designed to reward positive impact.',
        infoBody:
          'Discover curated trips, retreats, and nature experiences designed to reward positive impact. Each experience connects you with regenerative ecosystems around the world.',
        ctaLabel: 'Explore Experiences',
        tags: ['Travel', 'Adventure'],
        rating: 4.9,
        isTopRated: false,
        atnMin: 240,
        coverUrls: [
          'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
        ],
      },
      {
        slug: 'premium',
        title: 'Premium',
        meta: 'Premium access',
        description:
          'Unlock exclusive perks, priority access, and elevated support across the ecosystem.',
        infoBody:
          'Enjoy priority access, elevated support, and exclusive perks throughout the ecosystem. Premium membership unlocks the best Alternun has to offer.',
        ctaLabel: 'Live the Experience',
        tags: ['Exclusive', 'Members'],
        rating: 4.7,
        isTopRated: false,
        atnMin: 400,
        coverUrls: [
          'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?q=80&w=1974&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=2069&auto=format&fit=crop',
        ],
      },
      {
        slug: 'cursos',
        title: 'Courses',
        meta: 'Education',
        description:
          'Learn practical regenerative skills with courses, workshops, and verified guidance.',
        infoBody:
          'Learn practical regenerative skills with expert-led courses, workshops, and verified certifications. Build knowledge that translates directly into positive impact.',
        ctaLabel: 'Start Learning',
        tags: ['Learning', 'Verified'],
        rating: 4.6,
        isTopRated: false,
        atnMin: 80,
        coverUrls: [
          'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070&auto=format&fit=crop',
        ],
      },
    ],
    es: [],
    th: [],
  };
  // For es/th fall back to en static data
  return data[locale].length ? data[locale] : data.en;
}
