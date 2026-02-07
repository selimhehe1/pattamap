/**
 * @vitest-environment jsdom
 */
/**
 * SEOHead Component Tests
 *
 * Tests for the SEOHead component:
 * - Renders without crashing
 * - Sets page title
 * - Sets description meta tag
 * - Sets og:title meta tag
 * - Sets noindex meta when specified
 *
 * Total: 5 tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import SEOHead from '../SEOHead';

// Capture Helmet props for assertions
let lastHelmetChildren: React.ReactNode[] = [];

vi.mock('@dr.pogodin/react-helmet', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => {
    // Store children for inspection
    lastHelmetChildren = React.Children.toArray(children);
    return null;
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock logger
vi.mock('../../../utils/logger');

/**
 * Helper to find a child element by type and matching props.
 */
function findHelmetChild(
  type: string,
  matchProps?: Record<string, string>
): React.ReactElement | undefined {
  return lastHelmetChildren.find((child) => {
    if (!React.isValidElement(child)) return false;
    if (child.type !== type) return false;
    if (matchProps) {
      for (const [key, value] of Object.entries(matchProps)) {
        if ((child.props as Record<string, any>)[key] !== value) return false;
      }
    }
    return true;
  }) as React.ReactElement | undefined;
}

describe('SEOHead Component', () => {
  const defaultProps = {
    title: 'Test Page',
    description: 'A test description for this page',
  };

  it('should render without crashing', () => {
    const { container } = render(<SEOHead {...defaultProps} />);
    expect(container).toBeTruthy();
    expect(lastHelmetChildren.length).toBeGreaterThan(0);
  });

  it('should set the page title with site name suffix', () => {
    render(<SEOHead {...defaultProps} />);

    const titleEl = findHelmetChild('title');
    expect(titleEl).toBeTruthy();
    expect(titleEl!.props.children).toBe('Test Page | PattaMap - Pattaya Nightlife Directory');
  });

  it('should set description meta tag', () => {
    render(<SEOHead {...defaultProps} />);

    const descMeta = findHelmetChild('meta', { name: 'description' });
    expect(descMeta).toBeTruthy();
    expect(descMeta!.props.content).toBe('A test description for this page');
  });

  it('should set og:title meta tag', () => {
    render(<SEOHead {...defaultProps} />);

    const ogTitle = findHelmetChild('meta', { property: 'og:title' });
    expect(ogTitle).toBeTruthy();
    expect(ogTitle!.props.content).toBe('Test Page | PattaMap - Pattaya Nightlife Directory');
  });

  it('should set noindex meta when noindex prop is true', () => {
    render(<SEOHead {...defaultProps} noindex={true} />);

    const robotsMeta = findHelmetChild('meta', { name: 'robots' });
    expect(robotsMeta).toBeTruthy();
    expect(robotsMeta!.props.content).toBe('noindex,nofollow');
  });

  it('should include hreflang tags for all supported languages plus x-default', () => {
    render(<SEOHead {...defaultProps} />);

    const hreflangLinks = lastHelmetChildren.filter((child) => {
      if (!React.isValidElement(child)) return false;
      return child.type === 'link' && (child.props as any).rel === 'alternate' && (child.props as any).hrefLang;
    }) as React.ReactElement[];

    // 8 languages + x-default = 9
    expect(hreflangLinks.length).toBe(9);

    // Check x-default exists
    const xDefault = hreflangLinks.find((el) => (el.props as any).hrefLang === 'x-default');
    expect(xDefault).toBeTruthy();

    // Check zh-CN mapping for 'cn'
    const zhLink = hreflangLinks.find((el) => (el.props as any).hrefLang === 'zh-CN');
    expect(zhLink).toBeTruthy();
    expect((zhLink!.props as any).href).toContain('?lang=cn');
  });

  it('should set og:locale dynamically based on current language', () => {
    render(<SEOHead {...defaultProps} />);

    const ogLocale = findHelmetChild('meta', { property: 'og:locale' });
    expect(ogLocale).toBeTruthy();
    expect(ogLocale!.props.content).toBe('en_US');
  });
});
