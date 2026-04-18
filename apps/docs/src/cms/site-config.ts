import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type { DocsCmsCustomFields } from './types';

export function useDocsCmsConfig(): DocsCmsCustomFields {
  const { siteConfig } = useDocusaurusContext();
  return siteConfig.customFields.cms as DocsCmsCustomFields;
}
