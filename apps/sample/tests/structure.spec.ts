import { test } from '@playwright/test';
import { a11y } from '@jeprubio/playwright-a11y';
import { openPage } from './support';

test.describe('Page structure and ARIA', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('page has a language, a title, landmarks and no positive tabindex', async ({ page }) => {
    await a11y(page).pageChecks((p) =>
      p
        .hasLanguage('en')
        .hasTitle(/Equinox Night/)
        .hasLandmarks(['banner', 'navigation', 'main', 'contentinfo'])
        .hasNoPositiveTabindex()
        .imagesHaveAlt(),
    );
  });

  test('headings form a logical outline', async ({ page }) => {
    await a11y(page).pageChecks((p) =>
      p
        .hasSingleH1()
        .hasNoSkippedHeadingLevels()
        .hasHeadingOutline([
          'h1 Equinox Night: stargazing for everyone',
          'h2 About the night',
          'h3 Guided sky tours',
          'h3 Tactile star maps',
          'h3 Step-free site',
          'h2 Programme',
          'h2 Reserve a free ticket',
          'h2 Frequently asked questions',
        ]),
    );
  });

  test('section headings are real headings', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('page-title').isHeading(1);
      await e.element('about-title').isHeading(2);
      await e.element('programme-title').isHeading(2);
      await e.element('register-title').isHeading(2);
      await e.element('faq-title').isHeading(2);
      // Body text must not be marked up as a heading.
      await e.element('hero-lead').isNotHeading();
    });
  });

  test('images and icons are described or hidden correctly', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('sky-image').hasRole('img').hasAccessibleNameContaining('constellation');
      // The logo icon is decorative: hidden from assistive technology.
      await e.locator(page.getByTestId('brand').locator('svg'), 'brand icon').isHiddenFromAccessibility();
    });
  });

  test('links and buttons have meaningful names', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('skip-link').hasRole('link').hasAccessibleName('Skip to main content');
      await e.element('hero-register').hasRole('link').hasAccessibleName('Reserve a free ticket');
      await e.element('open-details').hasRole('button').hasAccessibleName('Event details');
      await e.element('footer-top').hasNonBlankAccessibleName();
      await e.elementWithRole('navigation', 'Main').hasRole('navigation');
    });
  });

  test('main navigation matches its accessibility tree snapshot', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('main-nav').matchesAriaSnapshot(`
        - navigation "Main":
          - list:
            - listitem:
              - link "About"
            - listitem:
              - link "Programme"
            - listitem:
              - link "Register"
            - listitem:
              - link "FAQ"
      `);
    });
  });

  test('programme is an ordered list of timed events', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('programme-list').matchesAriaSnapshot(`
        - list:
          - listitem:
            - time: "19:30"
            - text: Doors open and welcome
          - listitem:
            - time: "20:00"
            - text: /Talk/
          - listitem:
            - time: "20:45"
            - text: Guided telescope tours
          - listitem:
            - time: "22:30"
            - text: Closing and hot chocolate
      `);
    });
  });
});
