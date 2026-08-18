import test from 'node:test';
import assert from 'node:assert/strict';
import smtpConfigModule from '../infra/email/scripts/common.cjs';

const { getSupabaseProjectRef } = smtpConfigModule;

function withEnvironment(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('getSupabaseProjectRef resolves the canonical production project', () => {
  withEnvironment(
    {
      SUPABASE_ENVIRONMENT: 'production',
      SUPABASE_PROJECT_REF: undefined,
    },
    () => {
      assert.equal(getSupabaseProjectRef({}), 'rjebeugdvwbjpaktrrbx');
    }
  );
});

test('getSupabaseProjectRef requires an explicit environment', () => {
  withEnvironment(
    {
      SUPABASE_ENVIRONMENT: undefined,
      SUPABASE_PROJECT_REF: undefined,
    },
    () => {
      assert.throws(() => getSupabaseProjectRef({}), /SUPABASE_ENVIRONMENT is required/);
    }
  );
});

test('getSupabaseProjectRef rejects a project ref that conflicts with the selected environment', () => {
  withEnvironment(
    {
      SUPABASE_ENVIRONMENT: 'production',
      SUPABASE_PROJECT_REF: 'aznfyazjndfniwsocdka',
    },
    () => {
      assert.throws(() => getSupabaseProjectRef({}), /does not match the production project/i);
    }
  );
});
