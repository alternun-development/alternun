import { type EmailLocale } from './i18n';
export interface AirsWelcomeEmailInput {
  locale?: EmailLocale | (string & {}) | null;
  displayName?: string | null;
  dashboardUrl?: string | null;
  bonusAirs?: number;
  airsPerDollar?: number;
}
export interface AirsWelcomeEmail {
  locale: EmailLocale;
  subject: string;
  preview: string;
  greeting: string;
  intro: string;
  body: string;
  ctaLabel: string;
  dashboardUrl: string;
  text: string;
  html: string;
}
export declare function renderAirsWelcomeEmail(input: AirsWelcomeEmailInput): AirsWelcomeEmail;
