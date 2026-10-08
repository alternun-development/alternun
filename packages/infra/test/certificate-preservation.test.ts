import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  planCertificatePreservation,
  preserveCertificateState,
} from '../scripts/preserve-certificate-state.mjs';

const prefix = 'airs-redir-devCdnSsl';
const urn = (name: string) => `urn:pulumi:dev::app::type::${name}`;
const component = { urn: urn(prefix), type: 'sst:aws:Certificate' };
const cname = {
  urn: urn(`${prefix}CNAMERecordToken`),
  parent: component.urn,
  type: 'aws:route53/record:Record',
};
const fixture = (): {
  latest: {
    resources: Array<{
      urn: string;
      type: string;
      parent?: string;
      outputs?: Record<string, unknown>;
    }>;
  };
} => ({
  latest: {
    resources: [
      component,
      {
        urn: urn(`${prefix}Certificate`),
        parent: component.urn,
        type: 'aws:acm/certificate:Certificate',
      },
      cname,
      {
        urn: urn(`${prefix}Validation`),
        parent: component.urn,
        type: 'aws:acm/certificateValidation:CertificateValidation',
      },
      { urn: urn('unrelated'), type: 'aws:route53/record:Record' },
    ],
  },
});

void test('migration preserves every certificate descendant leaf-first, leaving unrelated resources managed', () => {
  const state = fixture();
  const calls: string[][] = [];
  const count = preserveCertificateState(
    'dev',
    [prefix],
    (_cmd: string, args: string[], options: { input?: string }) => {
      calls.push(args);
      if (args[2] === 'export') return JSON.stringify(state);
      assert.equal(args[2], 'remove');
      assert.equal(options.input, 'y\n');
      const name = args[3];
      const resource = state.latest.resources.find((item) => item.urn === urn(name));
      assert.ok(resource);
      assert.ok(
        !state.latest.resources.some((item) => item.parent === resource.urn),
        'children must be preserved before their parent'
      );
      state.latest.resources = state.latest.resources.filter((item) => item !== resource);
      return '';
    }
  );
  assert.equal(count, 4);
  assert.deepEqual(
    state.latest.resources.map((item) => item.urn),
    [urn('unrelated')]
  );
  assert.ok(calls.some((args) => args[3] === `${prefix}CNAMERecordToken`));
  assert.equal(calls.at(-1)?.[2], 'export');
});

void test('migration stops on export, removal, or verification failure without leaking CLI output', () => {
  for (const failure of ['export', 'remove', 'verification']) {
    let exports = 0;
    let mutations = 0;
    assert.throws(
      () =>
        preserveCertificateState('dev', [prefix], (_cmd: string, args: string[]) => {
          if (args[2] === 'export') {
            exports++;
            if (failure === 'export') throw new Error('private state secret');
            return JSON.stringify(fixture());
          }
          mutations++;
          if (failure === 'remove') throw new Error('private state secret');
          return '';
        }),
      /^Error: Certificate state preservation failed;/
    );
    if (failure === 'export') assert.equal(mutations, 0);
    if (failure === 'remove') assert.equal(mutations, 1);
    if (failure === 'verification') assert.equal(exports, 2);
  }
});

void test('migration rejects uncertain state before any mutation', () => {
  assert.throws(() => planCertificatePreservation({}, [prefix]), /format/);
  assert.throws(
    () => planCertificatePreservation({ latest: { resources: [cname] } }, [prefix]),
    /unresolved parent/
  );
  const state = fixture();
  state.latest.resources.push({
    ...cname,
    urn: `urn:pulumi:other::app::type::${prefix}CNAMERecordToken`,
  });
  assert.throws(() => planCertificatePreservation(state, [prefix]), /Ambiguous/);
  assert.deepEqual(planCertificatePreservation({ latest: { resources: [] } }, [prefix]), []);
});

void test('pending operations only block migration when their resource still exists in state', () => {
  const state = fixture();
  const activeState = {
    latest: {
      ...state.latest,
      pending_operations: [{ type: 'creating', resource: { urn: component.urn } }],
    },
  };
  assert.throws(() => planCertificatePreservation(activeState, [prefix]), /pending operations/);

  const orphanedState = {
    latest: {
      ...state.latest,
      pending_operations: [{ type: 'creating', resource: { urn: urn('long-gone') } }],
    },
  };
  assert.deepEqual(
    planCertificatePreservation(orphanedState, [prefix]),
    planCertificatePreservation(state, [prefix])
  );
});

void test('a stale creating operation does not block migration once its resource recorded outputs', () => {
  const state = fixture();
  state.latest.resources.push({
    urn: urn('unrelated-builder'),
    type: 'command:local:Command',
    outputs: { stdout: 'done' },
  });
  const staleState = {
    latest: {
      ...state.latest,
      pending_operations: [{ type: 'creating', resource: { urn: urn('unrelated-builder') } }],
    },
  };
  assert.deepEqual(
    planCertificatePreservation(staleState, [prefix]),
    planCertificatePreservation(state, [prefix])
  );

  const stillCreatingState = {
    latest: {
      ...state.latest,
      pending_operations: [{ type: 'creating', resource: { urn: urn('unrelated-builder') } }],
      resources: state.latest.resources.map((item) =>
        item.urn === urn('unrelated-builder') ? { ...item, outputs: {} } : item
      ),
    },
  };
  assert.throws(
    () => planCertificatePreservation(stillCreatingState, [prefix]),
    /pending operations/
  );
});

void test('ACM DNS checks never delete renewal records, even with all legacy cleanup flags enabled', () => {
  const source = fs.readFileSync('scripts/predeploy-checks.sh', 'utf8');
  const start = source.indexOf('check_acm_validation_cname_records() {');
  const end = source.indexOf('\ncheck_stage_domain_validation_cname_records()', start);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'acm-preservation-'));
  try {
    const log = path.join(directory, 'aws.log');
    fs.writeFileSync(
      path.join(directory, 'aws'),
      '#!/bin/sh\nprintf "%s\\n" "$*" >> "$AWS_TEST_LOG"\n[ "${AWS_TEST_FAIL:-false}" != true ] || exit 1\nprintf \'[{"Name":"_token.airs.example.com."}]\\n\'\n',
      { mode: 0o700 }
    );
    const script = `set -euo pipefail\nreport_managed_cert_conflict() { return 0; }\n${source.slice(
      start,
      end
    )}\ncheck_acm_validation_cname_records zone airs.example.com CERT explicit`;
    const env = {
      ...process.env,
      PATH: `${directory}:${process.env.PATH}`,
      AWS_TEST_LOG: log,
      AUTO_REMOVE_CONFLICTING_DNS: 'true',
      INFRA_REMOVE_ACM_VALIDATION_CNAME: 'true',
      INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS: 'true',
    };
    execFileSync('bash', ['-c', script], { env, stdio: 'pipe' });
    assert.match(fs.readFileSync(log, 'utf8'), /list-resource-record-sets/);
    assert.doesNotMatch(fs.readFileSync(log, 'utf8'), /change-resource-record-sets/);
    assert.throws(() =>
      execFileSync('bash', ['-c', script], {
        env: { ...env, AWS_TEST_FAIL: 'true' },
        stdio: 'pipe',
      })
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
