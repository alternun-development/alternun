/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-floating-promises */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  ContactSection,
  EventSection,
  LocationSection,
  PartnershipBadge,
  ProductsSection,
  SitesSection,
  contactHref,
  formatAirs,
} from '../ProfileSections';
import type { EnterpriseProduct } from '../types';

const palette = {
  background: '#fafafa',
  surface: '#fff',
  border: '#ddd',
  text: '#111',
  muted: '#666',
  primary: '#0f766e',
  primaryDeep: '#075440',
  fill: '#0f766e',
  mist: '#e6f4ef',
};
const t = ((key: string, params?: Record<string, unknown>): string =>
  params ? `${key}:${JSON.stringify(params)}` : key) as never;

function product(overrides: Partial<EnterpriseProduct>): EnterpriseProduct {
  return {
    id: 'p1',
    name: 'Noche',
    description: null,
    airsMin: null,
    airsMax: null,
    airsNote: null,
    ...overrides,
  };
}

function render(element: React.JSX.Element): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(element);
  });
  return renderer!;
}

function texts(renderer: ReactTestRenderer): string {
  const collect = (node: unknown): string[] => {
    if (typeof node === 'string') return [node];
    if (Array.isArray(node)) return node.flatMap(collect);
    if (node && typeof node === 'object' && 'children' in node)
      return collect((node as { children: unknown }).children);
    return [];
  };
  return collect(renderer.toJSON()).join('');
}

describe('contactHref', () => {
  it('links only safe https URLs, emails and phone numbers', () => {
    expect(contactHref('web', 'https://batisbatis.org')).toBe('https://batisbatis.org/');
    expect(contactHref('web', 'POR CONFIRMAR')).toBeNull();
    expect(contactHref('web', 'http://insecure.example')).toBeNull();
    // eslint-disable-next-line no-script-url -- asserts that script URLs are never linked
    expect(contactHref('web', 'javascript:alert(1)')).toBeNull();
    expect(contactHref('email', 'info@batisbatis.org')).toBe('mailto:info@batisbatis.org');
    expect(contactHref('email', 'POR CONFIRMAR')).toBeNull();
    expect(contactHref('phone', '+57 313 591 9685')).toBe('tel:+573135919685');
    expect(contactHref('phone', '(604) 444 3835')).toBe('tel:6044443835');
    expect(contactHref('whatsapp', '+57 300 913 0494')).toBe('https://wa.me/573009130494');
    expect(contactHref('phone', 'POR CONFIRMAR')).toBeNull();
  });
});

describe('formatAirs', () => {
  it('describes exact amounts, ranges, minimums and pending scales', () => {
    expect(formatAirs(product({ airsMin: 15, airsMax: 15 }), t)).toBe(
      'explorer.profile.airsExact:{"min":15}'
    );
    expect(formatAirs(product({ airsMin: 25, airsMax: 125, airsNote: 'según capacidad' }), t)).toBe(
      'explorer.profile.airsRange:{"min":25,"max":125} · según capacidad'
    );
    expect(formatAirs(product({ airsMin: 5, airsNote: 'por noche' }), t)).toBe(
      'explorer.profile.airsFrom:{"min":5} · por noche'
    );
    expect(formatAirs(product({ airsNote: 'POR DEFINIR' }), t)).toBe(
      'explorer.profile.airsPending'
    );
  });
});

describe('profile sections', () => {
  it('render nothing without data', () => {
    for (const element of [
      <LocationSection key='l' location={{}} palette={palette} t={t} />,
      <ContactSection key='c' contact={{}} palette={palette} t={t} openUrl={jest.fn()} />,
      <EventSection key='e' event={{}} palette={palette} t={t} />,
      <SitesSection key='s' sites={[]} palette={palette} t={t} />,
      <ProductsSection key='p' products={undefined} palette={palette} t={t} />,
      <PartnershipBadge key='b' status={undefined} palette={palette} t={t} />,
      <PartnershipBadge key='signed' status='signed' palette={palette} t={t} />,
    ]) {
      expect(render(element).toJSON()).toBeNull();
    }
  });

  it('shows placeholders as text and opens real contact links', () => {
    const openUrl = jest.fn(async () => undefined);
    const renderer = render(
      <ContactSection
        contact={{ web: 'POR CONFIRMAR', email: 'info@batisbatis.org' }}
        palette={palette}
        t={t}
        openUrl={openUrl}
      />
    );
    const web = renderer.root.findByProps({ testID: 'profile-contact-web' });
    expect(web.props.onPress).toBeUndefined();
    act(() => {
      renderer.root.findByProps({ testID: 'profile-contact-email' }).props.onPress();
    });
    expect(openUrl).toHaveBeenCalledWith('mailto:info@batisbatis.org');
  });

  it('renders location, coverage, event, sites, products and partnership state', () => {
    const renderer = render(
      <>
        <LocationSection
          location={{ municipality: 'La Estrella', department: 'Antioquia', coverage: 'Medellín' }}
          palette={palette}
          t={t}
        />
        <EventSection
          event={{ date: 'POR CONFIRMAR', venue: { name: 'Club', municipality: 'Cajicá' } }}
          palette={palette}
          t={t}
        />
        <SitesSection
          sites={[{ name: 'Hotel Taybo Kai', address: 'Cra. 2 #5-60', rooms: 26 }]}
          palette={palette}
          t={t}
        />
        <ProductsSection
          products={[product({ name: 'Podio', description: 'Oro', airsMin: 15, airsMax: 15 })]}
          palette={palette}
          t={t}
        />
        <PartnershipBadge status='postponed' palette={palette} t={t} />
      </>
    );
    const content = texts(renderer);
    expect(content).toContain('La Estrella, Antioquia');
    expect(content).toContain('Club · Cajicá');
    expect(content).toContain('Hotel Taybo Kai');
    expect(content).toContain('explorer.profile.rooms:{"count":26}');
    expect(content).toContain('Podio');
    expect(content).toContain('explorer.profile.partnership.postponed');
  });
});
