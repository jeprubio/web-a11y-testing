import { test, type Page } from '@playwright/test';

/**
 * Web equivalent of `composeTestRule.onRoot().printToLog("A11Y")`.
 *
 * Captures the page's accessibility tree as a Playwright ARIA snapshot (YAML), attaches it
 * to the HTML report and returns it so it can be included in the error message.
 */
export async function attachTreeDump(page: Page, title: string): Promise<string> {
  let dump: string;
  try {
    const openDialog = page.locator('dialog[open]');
    const root = (await openDialog.count()) > 0 ? openDialog.first() : page.locator('body');
    dump = await root.ariaSnapshot({ timeout: 2_000 });
  } catch (error) {
    dump = `<could not capture accessibility tree: ${(error as Error).message}>`;
  }
  await test.info().attach(`a11y-tree: ${title}`, { body: dump, contentType: 'text/yaml' });
  return dump;
}
