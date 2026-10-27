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

function staffEmail(
  subject: string,
  sections: Array<{ heading: string; intro: string; rows: Array<[string, string]> }>
): AirsReportEmailContent {
  const text = sections
    .map((section) =>
      [section.intro, ...section.rows.map(([label, value]) => `${label}: ${value}`)].join('\n')
    )
    .join('\n\n');
  const html = wrapHtml(
    sections.flatMap((section, index) => [
      ...(index > 0
        ? ['<hr style="border:none;border-top:1px solid #d5e3dc;margin:24px 0" />']
        : []),
      `<h2 style="margin:0 0 8px">${escapeHtml(section.heading)}</h2>`,
      `<p>${escapeHtml(section.intro)}</p>`,
      ...section.rows.map(
        ([label, value]) =>
          `<p style="margin:4px 0"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`
      ),
    ])
  );
  return { subject, text, html };
}

/** Email to the approvers and support: a report went over the automatic limits and waits. */
export function renderAirsReportReviewRequestEmail(
  context: AirsReportEmailContext
): AirsReportEmailContent {
  const { report, projectName, appUrl } = context;
  const rows = (
    labels: [string, string, string, string, string, string]
  ): Array<[string, string]> => [
    [labels[0], report.recipientEmail],
    [labels[1], airsLabel(report.amount)],
    [labels[2], report.concept],
    [labels[3], report.documentNumber ?? '-'],
    [labels[4], projectName ?? report.projectId],
    [labels[5], `${appUrl}/airs-reports`],
  ];
  return staffEmail(
    `Reporte de Airs por revisar: ${airsLabel(report.amount)} a ${
      report.recipientEmail
    } / Airs report to review`,
    [
      {
        heading: 'Reporte de Airs por revisar',
        intro: 'Un reporte superó los límites automáticos y espera a un aprobador.',
        rows: rows(['Destinatario', 'Monto', 'Motivo', 'Documento', 'Proyecto', 'Revisar en']),
      },
      {
        heading: 'Airs report to review',
        intro: 'A report went over the automatic limits and is waiting for an approver.',
        rows: rows(['Recipient', 'Amount', 'Reason', 'Document', 'Project', 'Review at']),
      },
    ]
  );
}

/** Email to the person who submitted a report, and to support, once an approver decided it. */
export function renderAirsReportDecisionEmail(
  context: AirsReportEmailContext
): AirsReportEmailContent {
  const { report, projectName } = context;
  const rejected = report.decision?.outcome === 'rejected';
  const reason = report.decision?.reason ?? '';
  const rows = (labels: [string, string, string, string]): Array<[string, string]> => [
    [labels[0], report.recipientEmail],
    [labels[1], airsLabel(report.amount)],
    [labels[2], projectName ?? report.projectId],
    ...(rejected && reason ? ([[labels[3], reason]] as Array<[string, string]>) : []),
  ];
  return staffEmail(
    rejected
      ? `Reporte de Airs rechazado: ${airsLabel(report.amount)} a ${
          report.recipientEmail
        } / Airs report rejected`
      : `Reporte de Airs aprobado: ${airsLabel(report.amount)} a ${
          report.recipientEmail
        } / Airs report approved`,
    [
      {
        heading: rejected ? 'Reporte de Airs rechazado' : 'Reporte de Airs aprobado',
        intro: rejected
          ? 'Un aprobador rechazó el reporte. No se acreditó ningún Air.'
          : 'Un aprobador aprobó el reporte. Los Airs ya siguen su camino al destinatario.',
        rows: rows(['Destinatario', 'Monto', 'Proyecto', 'Motivo del rechazo']),
      },
      {
        heading: rejected ? 'Airs report rejected' : 'Airs report approved',
        intro: rejected
          ? 'An approver rejected the report. No Airs were credited.'
          : 'An approver approved the report. The Airs are on their way to the recipient.',
        rows: rows(['Recipient', 'Amount', 'Project', 'Rejection reason']),
      },
    ]
  );
}
