/* eslint-disable */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AirsReportReasonDto,
  ApproveAirsReportDto,
  ListAirsReportsQueryDto,
  SubmitAirsReportDto,
} from '../src/modules/marketplace/airs-report.dto';
import { AIRS_REPORT_STATUSES } from '../src/modules/marketplace/airs-report.types';

async function errorsFor(type: any, value: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(type, value) as object);
  return errors.map((error) => error.property).sort();
}

const validSubmit = {
  recipientEmail: 'guest@example.test',
  recipientName: 'Guest Example',
  amount: 40,
  concept: 'Stayed two nights at the pilot hotel',
  documentNumber: 'INV-0001',
};

test('report statuses match the state machine', () => {
  assert.deepEqual(AIRS_REPORT_STATUSES, [
    'draft',
    'auto_approved',
    'pending_approval',
    'approved',
    'awaiting_claim',
    'released',
    'rejected',
    'cancelled',
    'reversed',
  ]);
});

test('submit schema accepts a complete report and an existing-user report without a name', async () => {
  assert.deepEqual(await errorsFor(SubmitAirsReportDto, validSubmit), []);
  const { recipientName: _name, ...minimal } = validSubmit;
  assert.deepEqual(await errorsFor(SubmitAirsReportDto, minimal), []);
});

test('submit schema requires a document number', async () => {
  const { documentNumber: _document, ...withoutDocument } = validSubmit;
  assert.deepEqual(await errorsFor(SubmitAirsReportDto, withoutDocument), ['documentNumber']);
  assert.deepEqual(
    await errorsFor(SubmitAirsReportDto, { ...validSubmit, documentNumber: '   ' }),
    ['documentNumber']
  );
  assert.deepEqual(await errorsFor(SubmitAirsReportDto, { ...validSubmit, documentNumber: '' }), [
    'documentNumber',
  ]);
});

test('submit schema rejects invalid email, amount, concept, medal and document hash', async () => {
  assert.deepEqual(
    await errorsFor(SubmitAirsReportDto, {
      ...validSubmit,
      recipientEmail: 'not-an-email',
      amount: 0,
      concept: 'short',
      medalId: 'medal',
      documentSha256: 'ABC',
    }),
    ['amount', 'concept', 'documentSha256', 'medalId', 'recipientEmail']
  );
  assert.deepEqual(await errorsFor(SubmitAirsReportDto, { ...validSubmit, amount: 1.5 }), [
    'amount',
  ]);
  assert.deepEqual(await errorsFor(SubmitAirsReportDto, { ...validSubmit, amount: -5 }), [
    'amount',
  ]);
});

test('approve, reason and list schemas validate their single field', async () => {
  assert.deepEqual(await errorsFor(ApproveAirsReportDto, { snapshotHash: 'a'.repeat(64) }), []);
  assert.deepEqual(await errorsFor(ApproveAirsReportDto, { snapshotHash: 'A'.repeat(64) }), [
    'snapshotHash',
  ]);
  assert.deepEqual(await errorsFor(AirsReportReasonDto, { reason: '' }), ['reason']);
  assert.deepEqual(await errorsFor(AirsReportReasonDto, { reason: 'Duplicate invoice' }), []);
  assert.deepEqual(await errorsFor(ListAirsReportsQueryDto, { status: 'paid' }), ['status']);
  assert.deepEqual(await errorsFor(ListAirsReportsQueryDto, { status: 'awaiting_claim' }), []);
});
