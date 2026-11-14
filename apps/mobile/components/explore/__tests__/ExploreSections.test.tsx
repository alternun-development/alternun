/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument */
import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Leaf } from 'lucide-react-native';
import { EnterpriseApplicationForm } from '../EnterpriseApplicationForm';
import { ExpandableCtaCard } from '../ExpandableCtaCard';
import { TipsSlider, wrapIndex } from '../TipsSlider';

jest.mock('@alternun/ui', () => ({
  // FormField only reads colors from the theme.
  useTheme: () => ({
    theme: new Proxy({}, { get: (_target, key) => (key === 'isDark' ? false : '#000') }),
  }),
}));

const palette = {
  surface: '#111',
  surfaceStrong: '#121',
  border: '#222',
  text: '#fff',
  muted: '#999',
  primary: '#0f0',
  primaryDeep: '#0a0',
  fill: '#070',
  mist: '#030',
};
const t = ((key: string) => key) as never;

async function render(element: React.JSX.Element): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(element);
  });
  return renderer!;
}
const host = (r: ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function')[0];
const input = (r: ReactTestRenderer, id: string) =>
  r.root.findAll((n) => n.props.testID === id && typeof n.props.onChangeText === 'function')[0];

describe('ExpandableCtaCard', () => {
  it('shows the call to action and renders the form only once opened', async () => {
    const onExpandedChange = jest.fn();
    const props = {
      testID: 'cta',
      title: 'Title',
      description: 'Desc',
      actionLabel: 'Open',
      closeLabel: 'Close',
      icon: Leaf,
      palette,
      onExpandedChange,
    };
    const closed = await render(
      <ExpandableCtaCard {...props} expanded={false}>
        <Text testID='form'>form</Text>
      </ExpandableCtaCard>
    );
    expect(closed.root.findAll((n) => n.props.testID === 'form')).toHaveLength(0);
    act(() => closed.root.findAll((n) => n.props.testID === 'cta-open')[0].props.onPress());
    expect(onExpandedChange).toHaveBeenCalledWith(true);

    const open = await render(
      <ExpandableCtaCard {...props} expanded>
        <Text testID='form'>form</Text>
      </ExpandableCtaCard>
    );
    expect(open.root.findAll((n) => n.props.testID === 'form').length).toBeGreaterThan(0);
    act(() => open.root.findAll((n) => n.props.testID === 'cta-close')[0].props.onPress());
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });
});

describe('TipsSlider', () => {
  const action = jest.fn();
  const tips = [
    { key: 'a', title: 'A', text: 'a', icon: Leaf, action: { label: 'Go', onPress: action } },
    { key: 'b', title: 'B', text: 'b', icon: Leaf },
  ];

  it('wraps endlessly in both directions', () => {
    expect(wrapIndex(2, 3)).toBe(2);
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(5, 0)).toBe(0);
  });

  it('runs the tip action and moves with the arrows and the timer', async () => {
    jest.useFakeTimers();
    try {
      const r = await render(<TipsSlider tips={tips} palette={palette} t={t} intervalMs={1000} />);
      expect(r.root.findAll((n) => n.props.testID === 'explorer-tip-a').length).toBeGreaterThan(0);
      act(() => host(r, 'explorer-tip-a-action').props.onPress());
      expect(action).toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(r.root.findAll((n) => n.props.testID === 'explorer-tip-b').length).toBeGreaterThan(0);
      act(() => {
        host(r, 'explorer-tips-next').props.onPress();
        jest.advanceTimersByTime(500);
      });
      // Past the last tip it starts over.
      expect(r.root.findAll((n) => n.props.testID === 'explorer-tip-a').length).toBeGreaterThan(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('renders nothing without tips', async () => {
    const r = await render(<TipsSlider tips={[]} palette={palette} t={t} intervalMs={0} />);
    expect(r.toJSON()).toBeNull();
  });
});

describe('EnterpriseApplicationForm', () => {
  async function fill(r: ReactTestRenderer, values: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(values)) {
      await act(async () => input(r, `enterprise-application-${field}`).props.onChangeText(value));
    }
  }

  it('flags the first invalid field instead of sending', async () => {
    const submit = jest.fn();
    const r = await render(
      <EnterpriseApplicationForm language='es' palette={palette} t={t} submit={submit} />
    );
    await act(async () => host(r, 'enterprise-application-submit').props.onPress());
    expect(submit).not.toHaveBeenCalled();
    expect(JSON.stringify(r.toJSON())).toContain('explorer.enterpriseForm.validationError');
  });

  it('sends a complete application, then clears it and confirms', async () => {
    const submit = jest.fn(async () => undefined);
    const r = await render(
      <EnterpriseApplicationForm language='es' palette={palette} t={t} submit={submit} />
    );
    await fill(r, {
      companyName: 'Hoteles Taybo',
      sector: 'Hotelería',
      location: 'Santa Marta',
      offer: 'Noches de hospedaje',
      contactName: 'Gloria',
      contactEmail: 'gloria@taybo.test',
    });
    await act(async () => host(r, 'enterprise-application-size-11-50').props.onPress());
    await act(async () => host(r, 'enterprise-application-submit').props.onPress());
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: 'Hoteles Taybo',
        companySize: '11-50',
        language: 'es',
      })
    );
    expect(JSON.stringify(r.toJSON())).toContain('explorer.enterpriseForm.sent');
    expect(input(r, 'enterprise-application-companyName').props.value).toBe('');
  });

  it('explains the rate limit', async () => {
    const submit = jest.fn(async () => {
      throw new Error('ENTERPRISE_APPLICATION_RATE_LIMITED');
    });
    const r = await render(
      <EnterpriseApplicationForm language='en' palette={palette} t={t} submit={submit} />
    );
    await fill(r, {
      companyName: 'Rotoingeniería',
      sector: 'Manufactura',
      location: 'La Estrella',
      offer: 'Sistemas sépticos',
      contactName: 'Jayson',
      contactEmail: 'j@roto.test',
    });
    await act(async () => host(r, 'enterprise-application-submit').props.onPress());
    expect(JSON.stringify(r.toJSON())).toContain('explorer.enterpriseForm.rateLimited');
  });
});
