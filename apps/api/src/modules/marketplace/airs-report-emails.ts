import type { AirsReportEmailContent, AirsReportEmailContext } from './airs-report-emails.types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(name: string | null): string {
  const trimmed = (name ?? '').trim();
  return trimmed ? trimmed.split(/\s+/)[0] ?? '' : '';
}

function airsLabel(amount: number): string {
  return `${amount.toLocaleString('en-US')} Airs`;
}

function wrapHtml(blocks: string[]): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#10231c;line-height:1.5;max-width:560px;margin:0 auto">${blocks.join(
    ''
  )}</div>`;
}

function details(context: AirsReportEmailContext, labels: [string, string, string]): string[] {
  const { report, projectName } = context;
  const rows = [
    [labels[0], airsLabel(report.amount)],
    [labels[1], report.concept],
    ...(projectName ? [[labels[2], projectName]] : []),
  ];
  return rows.map(
    ([label, value]) =>
      `<p style="margin:4px 0"><strong>${escapeHtml(label ?? '')}:</strong> ${escapeHtml(
        value ?? ''
      )}</p>`
  );
}

/**
 * Email to the person who received Airs. A new person (no account yet) gets the link to
 * open their account and claim; an existing account is told the Airs were credited.
 * Spanish first, English below, because the language of a new person is unknown.
 */
export function renderAirsReportRecipientEmail(
  context: AirsReportEmailContext
): AirsReportEmailContent {
  const { report, appUrl } = context;
  const needsClaim = report.status === 'awaiting_claim';
  const greetingEs = firstName(report.recipientName)
    ? `Hola ${firstName(report.recipientName)}`
    : 'Hola';
  const greetingEn = firstName(report.recipientName)
    ? `Hi ${firstName(report.recipientName)}`
    : 'Hi';
  const link = `${appUrl}/`;

  const introEs = needsClaim
    ? `Tienes ${airsLabel(
        report.amount
      )} esperando por ti. Entra con este correo y confirma tu cuenta para reclamarlos.`
    : `Se acreditaron ${airsLabel(report.amount)} en tu cuenta.`;
  const introEn = needsClaim
    ? `You have ${airsLabel(
        report.amount
      )} waiting for you. Sign in with this email and confirm your account to claim them.`
    : `${airsLabel(report.amount)} were credited to your account.`;
  const ctaEs = needsClaim ? 'Reclamar mis Airs' : 'Abrir mi cuenta';
  const ctaEn = needsClaim ? 'Claim my Airs' : 'Open my account';

  const subject = needsClaim
    ? `Tienes ${airsLabel(report.amount)} para reclamar / You have ${airsLabel(
        report.amount
      )} to claim`
    : `Recibiste ${airsLabel(report.amount)} / You received ${airsLabel(report.amount)}`;

  const text = [
    `${greetingEs}:`,
    introEs,
    `Monto: ${airsLabel(report.amount)}`,
    `Motivo: ${report.concept}`,
    ...(context.projectName ? [`Proyecto: ${context.projectName}`] : []),
    `${ctaEs}: ${link}`,
    '',
    `${greetingEn}:`,
    introEn,
    `Amount: ${airsLabel(report.amount)}`,
    `Reason: ${report.concept}`,
    ...(context.projectName ? [`Project: ${context.projectName}`] : []),
    `${ctaEn}: ${link}`,
  ].join('\n');

  const button = (label: string): string =>
    `<p style="margin:16px 0"><a href="${escapeHtml(
      link
    )}" style="background:#0fb88a;color:#04120d;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(
      label
    )}</a></p>`;

  const html = wrapHtml([
    `<h2 style="margin:0 0 8px">${escapeHtml(greetingEs)}</h2>`,
    `<p>${escapeHtml(introEs)}</p>`,
    ...details(context, ['Monto', 'Motivo', 'Proyecto']),
    button(ctaEs),
    '<hr style="border:none;border-top:1px solid #d5e3dc;margin:24px 0" />',
    `<h2 style="margin:0 0 8px">${escapeHtml(greetingEn)}</h2>`,
    `<p>${escapeHtml(introEn)}</p>`,
    ...details(context, ['Amount', 'Reason', 'Project']),
    button(ctaEn),
  ]);

  return { subject, text, html };
}

/** Tracking email for the support mailbox: who issued what, to whom, and where it stands. */
export function renderAirsReportSupportEmail(
  context: AirsReportEmailContext
): AirsReportEmailContent {
  const { report, projectName } = context;
  const state = report.status === 'awaiting_claim' ? 'esperando reclamo' : 'acreditado';
  const subject = `Seguimiento de Airs: ${airsLabel(report.amount)} a ${
    report.recipientEmail
  } (${state})`;

  const lines: Array<[string, string]> = [
    ['Reporte', report.id],
    ['Estado', state],
    ['Destinatario', report.recipientEmail],
    ['Monto', airsLabel(report.amount)],
    ['Motivo', report.concept],
    ['Documento', report.documentNumber ?? '-'],
    ['Proyecto', projectName ?? report.projectId],
    ['Emitido por', `${report.submittedBy.issuer} / ${report.submittedBy.subject}`],
  ];

  return {
    subject,
    text: lines.map(([label, value]) => `${label}: ${value}`).join('\n'),
    html: wrapHtml([
      '<h2 style="margin:0 0 8px">Seguimiento de emisión de Airs</h2>',
      ...lines.map(
        ([label, value]) =>
          `<p style="margin:4px 0"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`
      ),
    ]),
  };
}
