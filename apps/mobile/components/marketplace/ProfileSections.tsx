import React from 'react';
import { CalendarDays, Leaf, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  DetailPalette,
  EnterpriseEventDetails,
  EnterpriseProduct,
  EnterpriseSite,
  PartnershipStatus,
  ProfileContact,
  ProfileLocation,
  Translate,
} from './types';

const CONTACT_FIELDS = ['web', 'email', 'phone', 'whatsapp', 'instagram', 'facebook'] as const;

/**
 * Link for a public contact value, or null when it should render as plain text (placeholders such
 * as "POR CONFIRMAR", or anything that is not a safe https URL, email or phone number).
 */
export function contactHref(field: keyof ProfileContact, value: string): string | null {
  const trimmed = value.trim();
  if (field === 'email')
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? `mailto:${trimmed}` : null;
  if (field === 'phone' || field === 'whatsapp') {
    const digits = trimmed.replace(/[^\d+]/g, '');
    if (!/^\+?\d{7,15}$/.test(digits)) return null;
    return field === 'whatsapp' ? `https://wa.me/${digits.replace('+', '')}` : `tel:${digits}`;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function formatAirs(product: EnterpriseProduct, t: Translate): string {
  const { airsMin: min, airsMax: max } = product;
  let amount: string;
  if (min === null && max === null) amount = t('explorer.profile.airsPending');
  else if (min !== null && max === null) amount = t('explorer.profile.airsFrom', { min });
  else if (min === null || min === max)
    amount = t('explorer.profile.airsExact', { min: min ?? max });
  else amount = t('explorer.profile.airsRange', { min, max });
  // "Airs to be defined" already says it; a "POR DEFINIR" note would only repeat it.
  return product.airsNote && (min !== null || max !== null)
    ? `${amount} · ${product.airsNote}`
    : amount;
}

function joinLocation(location: ProfileLocation | undefined): string {
  return [location?.address, location?.municipality, location?.department]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .join(', ');
}

function Section({
  title,
  palette,
  children,
  testID,
}: {
  title: string;
  palette: DetailPalette;
  children: React.ReactNode;
  testID?: string;
}): React.JSX.Element {
  return (
    <View
      testID={testID}
      style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      {children}
    </View>
  );
}

export function PartnershipBadge({
  status,
  palette,
  t,
}: {
  status: PartnershipStatus | undefined;
  palette: DetailPalette;
  t: Translate;
}): React.JSX.Element | null {
  if (!status) return null;
  return (
    <View testID='profile-partnership' style={[styles.badge, { backgroundColor: palette.mist }]}>
      <Text style={[styles.badgeText, { color: palette.primaryDeep }]}>
        {t(`explorer.profile.partnership.${status}`)}
      </Text>
    </View>
  );
}

export function LocationSection({
  location,
  palette,
  t,
}: {
  location: ProfileLocation | undefined;
  palette: DetailPalette;
  t: Translate;
}): React.JSX.Element | null {
  const place = joinLocation(location);
  if (!place && !location?.coverage) return null;
  return (
    <Section testID='profile-location' title={t('explorer.profile.location')} palette={palette}>
      {place ? (
        <View style={styles.row}>
          <MapPin size={16} color={palette.muted} />
          <Text style={[styles.body, { color: palette.text }]}>{place}</Text>
        </View>
      ) : null}
      {location?.coverage ? (
        <Text style={[styles.body, { color: palette.muted }]}>
          {t('explorer.profile.coverage')}: {location.coverage}
        </Text>
      ) : null}
    </Section>
  );
}

export function ContactSection({
  contact,
  palette,
  t,
  openUrl,
}: {
  contact: ProfileContact | undefined;
  palette: DetailPalette;
  t: Translate;
  openUrl: (url: string) => Promise<unknown>;
}): React.JSX.Element | null {
  const entries = CONTACT_FIELDS.flatMap((field) => {
    const value = contact?.[field]?.trim();
    return value ? [{ field, value, href: contactHref(field, value) }] : [];
  });
  if (entries.length === 0) return null;
  return (
    <Section testID='profile-contact' title={t('explorer.profile.contact')} palette={palette}>
      {entries.map(({ field, value, href }) => (
        <View key={field} style={styles.contactRow}>
          <Text style={[styles.label, { color: palette.muted }]}>
            {t(`explorer.profile.contactFields.${field}`)}
          </Text>
          {href ? (
            <Pressable
              testID={`profile-contact-${field}`}
              accessibilityRole='link'
              onPress={() => void openUrl(href)}
              style={styles.contactValue}
            >
              <Text style={[styles.body, { color: palette.primaryDeep }]}>{value}</Text>
            </Pressable>
          ) : (
            <Text
              testID={`profile-contact-${field}`}
              style={[styles.body, styles.contactValue, { color: palette.text }]}
            >
              {value}
            </Text>
          )}
        </View>
      ))}
    </Section>
  );
}

export function EventSection({
  event,
  palette,
  t,
}: {
  event: EnterpriseEventDetails | undefined;
  palette: DetailPalette;
  t: Translate;
}): React.JSX.Element | null {
  if (!event?.date && !event?.venue) return null;
  const venue = [event.venue?.name, joinLocation(event.venue)].filter(Boolean).join(' · ');
  return (
    <Section testID='profile-event' title={t('explorer.profile.event')} palette={palette}>
      {event.date ? (
        <View style={styles.row}>
          <CalendarDays size={16} color={palette.muted} />
          <Text style={[styles.body, { color: palette.text }]}>
            {t('explorer.profile.eventDate')}: {event.date}
          </Text>
        </View>
      ) : null}
      {venue ? (
        <View style={styles.row}>
          <MapPin size={16} color={palette.muted} />
          <Text style={[styles.body, { color: palette.text }]}>
            {t('explorer.profile.venue')}: {venue}
          </Text>
        </View>
      ) : null}
    </Section>
  );
}

export function SitesSection({
  sites,
  palette,
  t,
}: {
  sites: EnterpriseSite[] | undefined;
  palette: DetailPalette;
  t: Translate;
}): React.JSX.Element | null {
  if (!sites?.length) return null;
  return (
    <Section testID='profile-sites' title={t('explorer.profile.sites')} palette={palette}>
      {sites.map((site, index) => (
        <View key={`${site.name}-${index}`} style={styles.item}>
          <Text style={[styles.itemTitle, { color: palette.text }]}>{site.name}</Text>
          {site.address ? (
            <Text style={[styles.body, { color: palette.muted }]}>{site.address}</Text>
          ) : null}
          {typeof site.rooms === 'number' ? (
            <Text style={[styles.body, { color: palette.muted }]}>
              {t('explorer.profile.rooms', { count: site.rooms })}
            </Text>
          ) : null}
        </View>
      ))}
    </Section>
  );
}

export function ProductsSection({
  products,
  palette,
  t,
}: {
  products: EnterpriseProduct[] | undefined;
  palette: DetailPalette;
  t: Translate;
}): React.JSX.Element | null {
  if (!products?.length) return null;
  return (
    <Section testID='profile-products' title={t('explorer.profile.products')} palette={palette}>
      {products.map((product) => (
        <View key={product.id} testID={`profile-product-${product.id}`} style={styles.item}>
          <Text style={[styles.itemTitle, { color: palette.text }]}>{product.name}</Text>
          {product.description ? (
            <Text style={[styles.body, { color: palette.muted }]}>{product.description}</Text>
          ) : null}
          <View style={styles.row}>
            <Leaf size={15} color={palette.primary} />
            <Text style={[styles.airs, { color: palette.primaryDeep }]}>
              {formatAirs(product, t)}
            </Text>
          </View>
        </View>
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 10 },
  sectionTitle: { fontFamily: 'Sculpin-Bold', fontSize: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
  label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', width: 92 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  contactValue: { flex: 1 },
  item: { gap: 4, paddingVertical: 4 },
  itemTitle: { fontSize: 15, fontWeight: '800' },
  airs: { fontSize: 14, fontWeight: '800' },
  badge: { alignSelf: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '900' },
});
