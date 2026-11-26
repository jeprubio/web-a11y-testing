/**
 * Registration form with accessible client-side validation.
 *
 * Pattern (GOV.UK style error handling):
 *  - every field has a visible <label>;
 *  - an invalid field gets aria-invalid="true" and its error text is linked
 *    through aria-describedby, so screen readers read it with the field;
 *  - an error summary (role="alert") lists every problem and receives focus;
 *  - each summary entry is a link that moves focus to the field it describes;
 *  - success is announced through a role="status" live region.
 */

interface FieldRule {
  id: string;
  validate: (form: HTMLFormElement) => string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const rules: FieldRule[] = [
  {
    id: 'name',
    validate: (form) => {
      const value = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
      return value ? null : 'Enter your full name';
    },
  },
  {
    id: 'email',
    validate: (form) => {
      const value = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
      if (!value) return 'Enter your email address';
      if (!EMAIL_PATTERN.test(value)) return 'Enter an email address in the correct format, like name@example.com';
      return null;
    },
  },
  {
    id: 'terms',
    validate: (form) => {
      const checked = (form.elements.namedItem('terms') as HTMLInputElement).checked;
      return checked ? null : 'Promise to explain your code slowly to book a duck';
    },
  },
];

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function setFieldError(id: string, message: string | null): void {
  const input = byId<HTMLInputElement>(id);
  const error = byId<HTMLParagraphElement>(`${id}-error`);
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    error.textContent = `Error: ${message}`;
    error.hidden = false;
  } else {
    input.removeAttribute('aria-invalid');
    error.textContent = '';
    error.hidden = true;
  }
}

function renderSummary(errors: { id: string; message: string }[]): void {
  const summary = document.querySelector<HTMLElement>('[data-testid="error-summary"]')!;
  const list = summary.querySelector<HTMLUListElement>('ul')!;
  list.replaceChildren();

  if (errors.length === 0) {
    summary.hidden = true;
    return;
  }

  for (const { id, message } of errors) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = message;
    link.dataset.testid = `error-link-${id}`;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      byId<HTMLInputElement>(id).focus();
    });
    item.append(link);
    list.append(item);
  }
  summary.hidden = false;
  summary.focus();
}

export function setupForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-testid="register-form"]');
  const status = document.querySelector<HTMLElement>('[data-testid="form-status"]');
  if (!form || !status) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = '';

    const errors: { id: string; message: string }[] = [];
    for (const rule of rules) {
      const message = rule.validate(form);
      setFieldError(rule.id, message);
      if (message) errors.push({ id: rule.id, message });
    }
    renderSummary(errors);
    if (errors.length > 0) return;

    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
    const plan = form.querySelector<HTMLInputElement>('input[name="plan"]:checked')?.dataset.label ?? 'Junior Duck';
    form.reset();
    // `reset()` does not fire input events; tell listeners (the ticket preview) the form changed.
    form.dispatchEvent(new Event('input', { bubbles: true }));
    status.textContent = `Thank you, ${name}! Your ${plan} is on its way. Expect a quack in your inbox.`;
    // Purely visual celebration, handled in effects.ts.
    document.dispatchEvent(new CustomEvent('registration:success'));
  });
}
