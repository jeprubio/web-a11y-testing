import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** WCAG 2.0, 2.1 and 2.2, levels A and AA: the usual legal and contractual target. */
export const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export interface ScanOptions {
  /** CSS selectors to limit the scan to, for example `['dialog[open]']`. */
  include?: string[];
  /** CSS selectors to skip. */
  exclude?: string[];
  /** axe rule ids to disable, with a reason recorded in the report. */
  disableRules?: string[];
  /** Override the WCAG tags. */
  tags?: string[];
  /** Name for the JSON attachment in the HTML report. */
  label?: string;
}

/**
 * Runs axe-core and fails with a readable list of violations. The full axe JSON is
 * attached to the Playwright report for anyone who wants the details.
 */
export async function scan(page: Page, options: ScanOptions = {}): Promise<void> {
  const label = options.label ?? 'page';
  await test.step(`axe scan (${label})`, async () => {
    let builder = new AxeBuilder({ page }).withTags(options.tags ?? WCAG_AA_TAGS);
    for (const selector of options.include ?? []) builder = builder.include(selector);
    for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
    if (options.disableRules?.length) builder = builder.disableRules(options.disableRules);

    const results = await builder.analyze();
    await test.info().attach(`axe-results: ${label}`, {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });

    const report = results.violations
      .map((v) => {
        const nodes = v.nodes
          .slice(0, 5)
          .map((n) => `      - ${n.target.join(' ')}\n        ${n.failureSummary?.split('\n').join('\n        ')}`)
          .join('\n');
        return `  [${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n    ${v.helpUrl}\n${nodes}`;
      })
      .join('\n\n');

    expect(results.violations, `axe found ${results.violations.length} WCAG violation(s) on ${label}:\n\n${report}\n`).toEqual([]);
  }, { box: true });
}
