export interface DocsCmsCustomFields {
  auth: {
    issuer: string;
    clientId: string;
    audience: string;
    allowedGroups: string[];
  };
  backend: {
    mode: 'github' | 'test-repo';
    repo: string;
    branch: string;
    baseUrl: string;
    authEndpoint: string;
  };
  media: {
    folder: string;
    publicFolder: string;
  };
}

export interface CmsAuthIdentity {
  email?: string;
  name: string;
  groups: string[];
}

export interface CmsWindow extends Window {
  CMS_MANUAL_INIT?: boolean;
  CMS?: {
    init: (options?: { config?: Record<string, unknown> }) => void;
  };
}
