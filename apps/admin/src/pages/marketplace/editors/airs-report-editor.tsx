import { useCallback, useEffect, useRef, useState } from 'react';
import { MarketplaceRequestError, requestMarketplace } from '../../../marketplace/api';
import {
  AIRS_REPORT_CONCEPT_MAX,
  airsReportOutcome,
  airsReportRecipientPath,
  airsReportReviewReason,
  airsReportsPath,
  buildSubmitAirsReportBody,
  canSubmitAirsReport,
  emptyAirsReportForm,
  formatAirs,
  isValidAirsReportEmail,
  newAirsReportRequestKey,
  summarizeAirsReports,
  validateAirsReportForm,
} from '../../../marketplace/airs-reports';
import type {
  AirsReportFormErrors,
  AirsReportFormValues,
  AirsReportRecipientLookup,
  AirsReportRecord,
  SubmitAirsReportResponse,
} from '../../../marketplace/airs-reports.types';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { SectionMessage } from '../components';
import { AirsReportHistory } from './airs-report-history';
import type {
  AirsReportEditorProps,
  FormStep,
  LookupState,
  RecentReportsState,
} from './airs-report-editor.types';

const copy = marketplaceCopy.airsReports;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? marketplaceCopy.common.notAvailable
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

const statusStyle: Record<AirsReportRecord['status'], string> = {
  draft: 'draft',
  auto_approved: 'published',
  pending_approval: 'draft',
  approved: 'published',
  awaiting_claim: 'draft',
  released: 'published',
  rejected: 'archived',
  cancelled: 'archived',
  reversed: 'paused',
};

export function AirsReportStatusPill({
  status,
}: {
  status: AirsReportRecord['status'];
}): JSX.Element {
  return (
    <span className={`status-pill marketplace-status marketplace-status-${statusStyle[status]}`}>
      {copy.status[status]}
    </span>
  );
}

export function AirsReportEditor({ project, roles }: AirsReportEditorProps): JSX.Element {
  const allowed = canSubmitAirsReport(roles);
  const [values, setValues] = useState<AirsReportFormValues>(emptyAirsReportForm);
  const [errors, setErrors] = useState<AirsReportFormErrors>({});
  const [lookup, setLookup] = useState<LookupState>({ kind: 'idle' });
  const [step, setStep] = useState<FormStep>('edit');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>();
  const [result, setResult] = useState<SubmitAirsReportResponse>();
  const [recent, setRecent] = useState<RecentReportsState>({ kind: 'loading' });
  const [openReportId, setOpenReportId] = useState<string>();
  // One key per form submission: pressing "Send" twice or retrying after a network error
  // replays the same report instead of creating a second one.
  const requestKey = useRef(newAirsReportRequestKey());

  const loadRecent = useCallback(() => {
    setRecent({ kind: 'loading' });
    requestMarketplace<AirsReportRecord[]>(airsReportsPath(project.id))
      .then((data) => setRecent({ kind: 'success', data }))
      .catch((requestError: unknown) =>
        setRecent(
          requestError instanceof MarketplaceRequestError && requestError.status === 403
            ? { kind: 'forbidden' }
            : { kind: 'error', error: requestError }
        )
      );
  }, [project.id]);

  useEffect(() => {
    if (allowed) loadRecent();
  }, [allowed, loadRecent]);

  const knownLookup: AirsReportRecipientLookup | null =
    lookup.kind === 'done' ? lookup.lookup : null;

  function update(field: keyof AirsReportFormValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setError(undefined);
    if (field === 'recipientEmail') setLookup({ kind: 'idle' });
  }

  async function checkEmail(): Promise<void> {
    if (!isValidAirsReportEmail(values.recipientEmail)) {
      setErrors((current) => ({ ...current, recipientEmail: copy.errors.email }));
      return;
    }
    setLookup({ kind: 'checking' });
    try {
      const found = await requestMarketplace<AirsReportRecipientLookup>(
        airsReportRecipientPath(project.id, values.recipientEmail)
      );
      setLookup({ kind: 'done', lookup: found });
      if (found.hasAccount) setValues((current) => ({ ...current, recipientName: '' }));
    } catch (requestError) {
      setLookup({ kind: 'error', error: requestError });
    }
  }

  function review(): void {
    const found = validateAirsReportForm(values, knownLookup);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep('confirm');
  }

  async function send(): Promise<void> {
    const found = validateAirsReportForm(values, knownLookup);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setStep('edit');
      return;
    }
    setSending(true);
    setError(undefined);
    try {
      const response = await requestMarketplace<SubmitAirsReportResponse>(
        airsReportsPath(project.id),
        { method: 'POST', body: buildSubmitAirsReportBody(values, knownLookup, requestKey.current) }
      );
      setResult(response);
      setStep('done');
      loadRecent();
    } catch (requestError) {
      setError(requestError);
      setStep('edit');
    } finally {
      setSending(false);
    }
  }

  function reset(): void {
    setValues(emptyAirsReportForm);
    setErrors({});
    setLookup({ kind: 'idle' });
    setResult(undefined);
    setError(undefined);
    setStep('edit');
    requestKey.current = newAirsReportRequestKey();
  }

  if (!allowed) {
    return (
      <section className='panel'>
        <h3>{copy.heading}</h3>
        <SectionMessage>{copy.permission}</SectionMessage>
      </section>
    );
  }

  return (
    <section className='panel'>
      <div className='panel-heading'>
        <div>
          <h3>{copy.heading}</h3>
          <p>{copy.intro}</p>
        </div>
      </div>

      {step === 'edit' ? (
        <div className='marketplace-inline-form'>
          {error ? (
            <p className='error-text' role='alert'>
              {marketplaceErrorMessage(error)}
            </p>
          ) : null}

          <label>
            <span>{copy.form.email}</span>
            <input
              autoComplete='off'
              placeholder={copy.form.emailPlaceholder}
              type='email'
              value={values.recipientEmail}
              onChange={(event) => update('recipientEmail', event.target.value)}
            />
            <small>{copy.form.emailHint}</small>
          </label>
          {errors.recipientEmail ? (
            <strong className='error-text'>{errors.recipientEmail}</strong>
          ) : null}
          <div className='marketplace-form-actions'>
            <button
              className='secondary-button'
              disabled={lookup.kind === 'checking'}
              onClick={() => void checkEmail()}
              type='button'
            >
              {lookup.kind === 'checking' ? copy.form.checking : copy.form.check}
            </button>
          </div>
          {lookup.kind === 'done' ? (
            <p role='status'>
              {lookup.lookup.hasAccount
                ? copy.form.hasAccount(lookup.lookup.displayName)
                : copy.form.noAccount}
            </p>
          ) : null}
          {lookup.kind === 'error' ? (
            <p className='error-text' role='alert'>
              {marketplaceErrorMessage(lookup.error)}
            </p>
          ) : null}

          {knownLookup?.hasAccount ? null : (
            <label>
              <span>{copy.form.name}</span>
              <input
                autoComplete='off'
                placeholder={copy.form.namePlaceholder}
                type='text'
                value={values.recipientName}
                onChange={(event) => update('recipientName', event.target.value)}
              />
            </label>
          )}
          {errors.recipientName ? (
            <strong className='error-text'>{errors.recipientName}</strong>
          ) : null}

          <label>
            <span>{copy.form.amount}</span>
            <input
              inputMode='numeric'
              type='text'
              value={values.amount}
              onChange={(event) => update('amount', event.target.value)}
            />
            <small>{copy.form.amountHint}</small>
          </label>
          {errors.amount ? <strong className='error-text'>{errors.amount}</strong> : null}

          <label>
            <span>{copy.form.concept}</span>
            <textarea
              maxLength={AIRS_REPORT_CONCEPT_MAX}
              rows={3}
              value={values.concept}
              onChange={(event) => update('concept', event.target.value)}
            />
            <small>{copy.form.conceptHint}</small>
          </label>
          {errors.concept ? <strong className='error-text'>{errors.concept}</strong> : null}

          <label>
            <span>{copy.form.documentNumber}</span>
            <input
              autoComplete='off'
              type='text'
              value={values.documentNumber}
              onChange={(event) => update('documentNumber', event.target.value)}
            />
            <small>{copy.form.documentHint}</small>
          </label>
          {errors.documentNumber ? (
            <strong className='error-text'>{errors.documentNumber}</strong>
          ) : null}

          <label>
            <span>{copy.form.medal}</span>
            <select disabled value=''>
              <option value=''>{copy.form.medalSoon}</option>
            </select>
          </label>

          <div className='marketplace-form-actions'>
            <button className='primary-button' onClick={review} type='button'>
              {copy.form.review}
            </button>
          </div>
        </div>
      ) : null}

      {step === 'confirm' ? (
        <div aria-modal='true' className='marketplace-confirmation' role='dialog'>
          <h4>{copy.form.confirmHeading}</h4>
          <p>{copy.form.confirmEffect}</p>
          <dl className='record-grid'>
            <div>
              <dt>{copy.form.email}</dt>
              <dd>{values.recipientEmail.trim().toLowerCase()}</dd>
            </div>
            {!knownLookup?.hasAccount && values.recipientName.trim() ? (
              <div>
                <dt>{copy.form.name}</dt>
                <dd>{values.recipientName.trim()}</dd>
              </div>
            ) : null}
            <div>
              <dt>{copy.form.amount}</dt>
              <dd>{formatAirs(Number(values.amount.trim()))}</dd>
            </div>
            <div>
              <dt>{copy.form.concept}</dt>
              <dd>{values.concept.trim()}</dd>
            </div>
            <div>
              <dt>{copy.form.documentNumber}</dt>
              <dd>{values.documentNumber.trim()}</dd>
            </div>
          </dl>
          <div className='marketplace-form-actions'>
            <button
              className='secondary-button'
              disabled={sending}
              onClick={() => setStep('edit')}
              type='button'
            >
              {copy.form.back}
            </button>
            <button
              className='primary-button'
              disabled={sending}
              onClick={() => void send()}
              type='button'
            >
              {sending ? copy.form.sending : copy.form.confirm}
            </button>
          </div>
        </div>
      ) : null}

      {step === 'done' && result ? <SubmittedPanel onAnother={reset} response={result} /> : null}

      <h4>{copy.list.heading}</h4>
      {recent.kind === 'loading' ? <p>{copy.list.loading}</p> : null}
      {recent.kind === 'forbidden' ? (
        <SectionMessage>{marketplaceCopy.errors.sectionForbidden}</SectionMessage>
      ) : null}
      {recent.kind === 'error' ? (
        <div role='alert'>
          <p className='error-text'>{marketplaceErrorMessage(recent.error)}</p>
          <button className='secondary-button' onClick={loadRecent} type='button'>
            {marketplaceCopy.common.retry}
          </button>
        </div>
      ) : null}
      {recent.kind === 'success' && recent.data.length === 0 ? (
        <SectionMessage>{copy.list.empty}</SectionMessage>
      ) : null}
      {recent.kind === 'success' && recent.data.length > 0 ? (
        <>
          <AirsReportSummaryStrip records={recent.data} />
          <div className='marketplace-card-grid'>
            {recent.data.map((report) => (
              <article
                className={`metric-card airs-report-card airs-report-card-${
                  statusStyle[report.status]
                }`}
                key={report.id}
              >
                <AirsReportStatusPill status={report.status} />
                <h4>{formatAirs(report.amount)}</h4>
                <p>{report.recipientName ?? report.recipientEmail}</p>
                <small>
                  {copy.list.document}:{' '}
                  {report.documentNumber ?? marketplaceCopy.common.notAvailable} ·{' '}
                  {formatDate(report.submittedAt)}
                </small>
                <button
                  className='secondary-button airs-report-toggle'
                  onClick={() =>
                    setOpenReportId((current) => (current === report.id ? undefined : report.id))
                  }
                  type='button'
                >
                  {openReportId === report.id ? copy.history.hide : copy.history.show}
                </button>
                {openReportId === report.id ? <AirsReportHistory reportId={report.id} /> : null}
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function AirsReportSummaryStrip({
  records,
}: {
  records: readonly AirsReportRecord[];
}): JSX.Element {
  const summary = summarizeAirsReports(records);
  const items: Array<[string, string, string]> = [
    [copy.summary.credited, String(summary.credited), formatAirs(summary.creditedAirs)],
    [copy.summary.waitingApproval, String(summary.waitingApproval), ''],
    [copy.summary.waitingClaim, String(summary.waitingClaim), ''],
    [copy.summary.airs, formatAirs(summary.totalAirs), ''],
  ];
  return (
    <div className='airs-report-summary' role='group' aria-label={copy.list.heading}>
      {items.map(([label, value, hint]) => (
        <div className='airs-report-summary-item' key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          {hint ? <small>{hint}</small> : null}
        </div>
      ))}
    </div>
  );
}

function SubmittedPanel({
  response,
  onAnother,
}: {
  response: SubmitAirsReportResponse;
  onAnother: () => void;
}): JSX.Element {
  const kind = airsReportOutcome(response);
  const amount = formatAirs(response.report.amount);
  const { totals } = response.autoApproval;
  const message =
    kind === 'credited'
      ? copy.outcome.credited(amount)
      : kind === 'waiting_claim'
      ? copy.outcome.waitingClaim(amount)
      : copy.outcome.inReview(amount);

  return (
    <div className='marketplace-inline-form' role='status'>
      <AirsReportStatusPill status={response.report.status} />
      <p>
        <strong>{message}</strong>
      </p>
      {kind === 'in_review' ? <p>{airsReportReviewReason(response)}</p> : null}
      <small>
        {copy.outcome.totals(
          totals.dailyTotal,
          totals.dailyLimit,
          totals.monthlyTotal,
          totals.monthlyLimit
        )}
      </small>
      <div className='marketplace-form-actions'>
        <button className='primary-button' onClick={onAnother} type='button'>
          {copy.outcome.another}
        </button>
      </div>
    </div>
  );
}
