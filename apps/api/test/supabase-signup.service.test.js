const assert = require('node:assert/strict');
const test = require('node:test');

const { SupabaseSignupService } = require('../src/modules/auth-exchange/services/supabase-signup.service.ts');

function withEnv(env, fn) {
  const originalEnv = { ...process.env };
  Object.assign(process.env, env);

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      process.env = originalEnv;
    });
}

test('SupabaseSignupService posts to the normalized signup endpoint', async () => {
  await withEnv(
    {
      SUPABASE_URL: 'https://supabase.example/',
      SUPABASE_ANON_KEY: 'supabase-anon-key',
    },
    async () => {
      const observed = {
        url: null,
        init: null,
      };

      const service = new SupabaseSignupService();
      const result = await service.signUp('ada@example.com', 'Password123!', 'es', {
        fetchFn: async (url, init) => {
          observed.url = String(url);
          observed.init = init;

          return {
            ok: true,
            async json() {
              return { user: { id: 'user-123' } };
            },
          };
        },
      });

      assert.equal(observed.url, 'https://supabase.example/auth/v1/signup');
      assert.equal(observed.init.method, 'POST');
      assert.equal(observed.init.headers['Content-Type'], 'application/json');
      assert.equal(observed.init.headers.apikey, 'supabase-anon-key');
      assert.deepEqual(JSON.parse(observed.init.body), {
        email: 'ada@example.com',
        password: 'Password123!',
        data: { locale: 'es' },
      });
      assert.deepEqual(result, {
        needsEmailVerification: true,
        emailAlreadyRegistered: false,
        confirmationEmailSent: true,
      });
    }
  );
});

test('SupabaseSignupService returns a fast failure when signup times out', async () => {
  await withEnv(
    {
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_ANON_KEY: 'supabase-anon-key',
    },
    async () => {
      const observed = {
        url: null,
      };

      const service = new SupabaseSignupService();
      const result = await service.signUp('ada@example.com', 'Password123!', undefined, {
        timeoutMs: 1,
        fetchFn: async (url, init) => {
          observed.url = String(url);

          await new Promise((resolve, reject) => {
            const abortError = () => reject(new DOMException('The operation was aborted.', 'AbortError'));

            if (init.signal.aborted) {
              abortError();
              return;
            }

            init.signal.addEventListener('abort', abortError, { once: true });
          });

          return {
            ok: true,
            async json() {
              return { user: { id: 'user-123' } };
            },
          };
        },
      });

      assert.equal(observed.url, 'https://supabase.example/auth/v1/signup');
      assert.deepEqual(result, {
        needsEmailVerification: false,
        error: 'Unable to create account. Please try again.',
      });
    }
  );
});
