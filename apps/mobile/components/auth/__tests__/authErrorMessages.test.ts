import {
  getAuthErrorMessage,
  getSignupErrorMessage,
  getSocialSignInErrorMessage,
} from '../authErrorMessages';

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
type TestFn = (name: string, fn: () => void) => void;
type ExpectFn = (actual: unknown) => {
  toBe: (expected: unknown) => void;
};

const { describe, expect, it } = globalThis as unknown as {
  describe: TestFn;
  expect: ExpectFn;
  it: TestFn;
};

describe('authErrorMessages', () => {
  it('maps 404 social sign-in errors to the unavailable message', () => {
    const message = getSocialSignInErrorMessage(
      { status: 404, statusText: 'Not Found' },
      {
        unavailable: 'unavailable',
        serverError: 'server-error',
        timeout: 'timeout',
        fallback: 'fallback',
      }
    );

    expect(message).toBe('unavailable');
  });

  it('maps 5xx social sign-in errors to the server error message', () => {
    const message = getSocialSignInErrorMessage(
      { status: 500, statusText: 'Internal Server Error' },
      {
        unavailable: 'unavailable',
        serverError: 'server-error',
        timeout: 'timeout',
        fallback: 'fallback',
      }
    );

    expect(message).toBe('server-error');
  });

  it('maps 408 social sign-in errors to the timeout message', () => {
    const message = getSocialSignInErrorMessage(
      { status: 408, statusText: 'Request Timeout' },
      {
        unavailable: 'unavailable',
        serverError: 'server-error',
        timeout: 'timeout',
        fallback: 'fallback',
      }
    );

    expect(message).toBe('timeout');
  });

  it('strips known auth prefixes from generic error messages', () => {
    expect(getAuthErrorMessage('CONFIG_ERROR: Missing issuer', 'fallback')).toBe('Missing issuer');
    expect(getAuthErrorMessage('PROVIDER_ERROR: Bad Gateway', 'fallback')).toBe('Bad Gateway');
  });

  it('extracts the human-readable message from JSON validation errors', () => {
    expect(
      getAuthErrorMessage(
        '[\n  {\n    "code": "too_small",\n    "minimum": 8,\n    "type": "string",\n    "inclusive": true,\n    "exact": false,\n    "message": "Password must be at least 8 characters.",\n    "path": []\n  }\n]',
        'fallback'
      )
    ).toBe('Password must be at least 8 characters.');
  });

  it('redacts common sign-up auth failures to the generic signup message', () => {
    expect(getSignupErrorMessage('Invalid email or password', 'signup-failed')).toBe(
      'signup-failed'
    );
    expect(getSignupErrorMessage('User already exists', 'signup-failed')).toBe('signup-failed');
  });

  it('falls back to the provided generic auth message when no status is present', () => {
    const message = getSocialSignInErrorMessage(new Error('Something broke'), {
      unavailable: 'unavailable',
      serverError: 'server-error',
      timeout: 'timeout',
      fallback: 'fallback',
    });

    expect(message).toBe('Something broke');
  });
});
