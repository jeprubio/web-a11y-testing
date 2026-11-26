import { test, type Page } from '@playwright/test';
import { attachTreeDump } from './tree-dump.js';

type Step = { title: string; run: () => Promise<void> };

/**
 * A queue of assertion steps shared by the builders of one DSL chain.
 *
 * Playwright APIs are async, but the Kotlin DSL reads like a synchronous chain
 * (`next() shouldFocus "x"`). To keep that shape, each DSL method only *records*
 * a step and returns a builder; awaiting the builder runs the queued steps in order.
 */
export class StepQueue {
  private steps: Step[] = [];

  constructor(private readonly page: Page) {}

  add(title: string, run: () => Promise<void>): void {
    this.steps.push({ title, run });
  }

  async run(): Promise<void> {
    while (this.steps.length > 0) {
      const step = this.steps.shift()!;
      await test.step(
        step.title,
        async () => {
          try {
            await step.run();
          } catch (error) {
            this.steps = []; // abandon the rest of the chain
            const dump = await attachTreeDump(this.page, step.title);
            throw decorate(error, step.title, dump);
          }
        },
        { box: true },
      );
    }
  }
}

function decorate(error: unknown, title: string, dump: string): Error {
  const original = error instanceof Error ? error : new Error(String(error));
  const message =
    `A11y assertion failed: ${title}\n\n${original.message}\n\n` +
    `Accessibility tree at the time of failure (also attached to the report):\n${indent(dump)}`;
  const decorated = new Error(message);
  decorated.stack = `${message}\n${original.stack?.split('\n').slice(1).join('\n') ?? ''}`;
  return decorated;
}

function indent(text: string): string {
  const lines = text.split('\n');
  const shown = lines.slice(0, 60).map((l) => `    ${l}`);
  if (lines.length > 60) shown.push(`    ... (${lines.length - 60} more lines, see attachment)`);
  return shown.join('\n');
}

/** Base class that makes a DSL builder awaitable. */
export abstract class Chain implements PromiseLike<void> {
  protected constructor(protected readonly queue: StepQueue) {}

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.queue.run().then(onfulfilled, onrejected);
  }
}
