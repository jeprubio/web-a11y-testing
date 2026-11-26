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
        .hasTitle(/DuckOps/)
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
          'h1 Rubber duck debugging, as a service',
          'h2 Why engineering teams choose DuckOps',
          'h3 Active listening',
          'h3 Zero judgement',
          'h3 Works offline',
          'h2 Four steps to working code',
          'h2 Book your duck',
          'h2 Frequently asked questions',
        ]),
    );
  });

  test('section headings are real headings', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('page-title').isHeading(1);
      await e.element('features-title').isHeading(2);
      await e.element('how-title').isHeading(2);
      await e.element('book-title').isHeading(2);
      await e.element('faq-title').isHeading(2);
      // Body text must not be marked up as a heading.
      await e.element('hero-lead').isNotHeading();
    });
  });

  test('images and icons are described or hidden correctly', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('how-diagram').hasRole('img').hasAccessibleNameContaining('you explain the bug to the duck');
      // The logo icon is decorative: hidden from assistive technology.
      await e.locator(page.getByTestId('brand').locator('svg'), 'brand icon').isHiddenFromAccessibility();
    });
  });

  test('links and buttons have meaningful names', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('skip-link').hasRole('link').hasAccessibleName('Skip to main content');
      await e.element('hero-register').hasRole('link').hasAccessibleName('Book a duck');
      await e.element('open-details').hasRole('button').hasAccessibleName('Meet the duck');
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
              - link "Features"
            - listitem:
              - link "How it works"
            - listitem:
              - link "Book a duck"
            - listitem:
              - link "FAQ"
      `);
    });
  });

  test('how it works is an ordered list of steps', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('steps-list').matchesAriaSnapshot(`
        - list:
          - listitem:
            - strong: Step 1
            - text: Place the duck next to your keyboard
          - listitem:
            - strong: Step 2
            - text: Explain your code to it, line by line, out loud
          - listitem:
            - strong: Step 3
            - text: /Stop when you hear yourself say/
          - listitem:
            - strong: Step 4
            - text: Fix the bug and thank the duck
      `);
    });
  });
});
