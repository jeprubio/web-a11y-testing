import { expect, test } from '@playwright/test';
import { a11y } from './a11y';
import { openPage } from './support';

test.describe('Registration form', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('every field has a label, hint and required state', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('name').hasRole('textbox').hasAccessibleNameContaining('Full name').isRequired().isValid();
      await e
        .element('email')
        .hasRole('textbox')
        .hasAccessibleNameContaining('Email address')
        .hasAccessibleDescription('We only use it to send your ticket.')
        .isRequired();
      await e.element('ticket-group').hasRole('group').hasAccessibleName('Ticket type');
      await e.element('ticket-standard').hasRole('radio').hasAccessibleName('Standard').isChecked();
      await e.element('newsletter').hasRole('checkbox').hasAccessibleName('Send me news about future events');
      await e.element('terms').hasRole('checkbox').hasAccessibleNameContaining('event rules').isRequired();
      await e.element('submit').hasRole('button').hasAccessibleName('Reserve ticket');
    });
  });

  test('submitting empty shows an error summary, focuses it and links errors to fields', async ({ page }) => {
    await a11y(page).keyboardFocus((k) => k.tabTo('submit').press('Enter').shouldFocus('error-summary'));

    await a11y(page).elementChecks(async (e) => {
      await e.element('error-summary').hasRole('alert').hasAccessibleName('There is a problem');
      await e.element('name').isInvalid().hasAccessibleDescription('Error: Enter your full name');
      await e
        .element('email')
        .isInvalid()
        .hasAccessibleDescriptionContaining('Error: Enter your email address');
      await e.element('terms').isInvalid().hasAccessibleDescriptionContaining('Accept the event rules');
    });
  });

  test('error summary links move focus to the field with the problem', async ({ page }) => {
    await page.getByTestId('submit').click();
    await a11y(page).keyboardFocus((k) =>
      k
        .assertFocusOn('error-summary')
        .next().focusedHasName('Enter your full name')
        .press('Enter').shouldFocusVisibly('name'),
    );
  });

  test('an invalid email gets a specific error message', async ({ page }) => {
    await page.getByTestId('name').fill('Ada Lovelace');
    await page.getByTestId('email').fill('ada-at-example');
    await page.getByTestId('terms').check();
    await page.getByTestId('submit').click();

    await a11y(page).elementChecks(async (e) => {
      await e.element('name').isValid();
      await e.element('email').isInvalid().hasAccessibleDescriptionContaining('correct format');
      await e.element('terms').isValid();
    });
  });

  test('a valid submission is announced through a status live region', async ({ page }) => {
    await page.getByTestId('name').fill('Ada Lovelace');
    await page.getByTestId('email').fill('ada@example.com');
    await page.getByTestId('ticket-tactile').check();
    await page.getByTestId('terms').check();
    await page.getByTestId('submit').click();

    await a11y(page).elementChecks(async (e) => {
      await e.element('form-status').hasRole('status').hasTextContaining('Thank you, Ada Lovelace');
      await e.element('form-status').hasTextContaining('Tactile tour');
      await e.element('name').isValid();
    });
    await expect(page.getByTestId('error-summary')).toBeHidden();
  });
});
