import type { ElementTarget } from './locate';

export type StepAction =
  | 'navigate'
  | 'go_back'
  | 'go_forward'
  | 'reload'
  | 'click'
  | 'fill'
  | 'type'
  | 'press'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'focus'
  | 'wait';

export interface RecordedStep {
  sequence: number;
  action: StepAction;
  target?: ElementTarget;
  value?: string;
  url?: string;
  key?: string;
  condition?: string;
}

const SENSITIVE_PATTERN = /pass|pwd|secret|token|api[\s_-]*key|otp|cvv|credential/i;

/** Placeholders keep a recorded step replayable without ever holding the real secret. */
export function redactValue(
  value: string,
  target: ElementTarget,
  isPasswordField: boolean,
): string {
  if (isPasswordField || looksSensitive(target)) {
    return '{{password}}';
  }
  return value;
}

export function looksSensitive(target: ElementTarget): boolean {
  return Object.values(target).some(
    (value) => typeof value === 'string' && SENSITIVE_PATTERN.test(value),
  );
}

/**
 * In-memory step log for one session. It records what the agent did in a
 * Playwright-independent shape, so a later phase can turn it into a test case.
 */
export class StepRecorder {
  private readonly steps: RecordedStep[] = [];
  private sequence = 0;

  constructor(public recording: boolean = true) {}

  record(step: Omit<RecordedStep, 'sequence'>): void {
    if (!this.recording) {
      return;
    }
    this.sequence += 1;
    this.steps.push({ sequence: this.sequence, ...step });
  }

  list(): RecordedStep[] {
    return this.steps.map((step) => ({ ...step }));
  }

  clear(): number {
    const cleared = this.steps.length;
    this.steps.length = 0;
    this.sequence = 0;
    return cleared;
  }
}
