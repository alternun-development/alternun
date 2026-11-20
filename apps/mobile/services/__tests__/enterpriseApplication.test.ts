/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import {
  enterpriseApplicationProblem,
  submitEnterpriseApplication,
  type EnterpriseApplicationRequest,
} from '../enterpriseApplication';

const valid: EnterpriseApplicationRequest = {
  companyName: 'Hoteles Taybo',
  legalName: '',
  sector: 'Hotelería',
  location: 'Santa Marta, Colombia',
  websiteUrl: '',
  companySize: '',
  offer: 'Noches de hospedaje',
  interest: '',
  contactName: 'Gloria',
  contactRole: '',
  contactEmail: 'Gloria@Taybo.test',
  contactPhone: '',
  language: 'es',
  faxNumber: '',
};

describe('enterpriseApplicationProblem', () => {
  it('accepts a minimal valid application and points at the first bad field', () => {
    expect(enterpriseApplicationProblem(valid)).toBeNull();
    expect(enterpriseApplicationProblem({ ...valid, companyName: 'X' })).toBe('companyName');
    expect(enterpriseApplicationProblem({ ...valid, websiteUrl: 'taybo' })).toBe('websiteUrl');
    expect(enterpriseApplicationProblem({ ...valid, offer: '' })).toBe('offer');
    expect(enterpriseApplicationProblem({ ...valid, contactEmail: 'nope' })).toBe('contactEmail');
    expect(enterpriseApplicationProblem({ ...valid, contactPhone: 'call me' })).toBe(
      'contactPhone'
    );
    expect(enterpriseApplicationProblem({ ...valid, companySize: '9' as never })).toBe(
      'companySize'
    );
  });
});

describe('submitEnterpriseApplication', () => {
  it('posts trimmed data and leaves empty optional fields out', async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true });
    await submitEnterpriseApplication(
      {
        ...valid,
        companyName: ' Hoteles Taybo ',
        websiteUrl: 'https://taybo.test',
        companySize: '11-50',
      },
      { fetcher, apiBaseUrl: 'http://api.test/' }
    );
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('http://api.test/v1/enterprise-applications');
    const body = JSON.parse(init.body);
    expect(body.companyName).toBe('Hoteles Taybo');
    expect(body.contactEmail).toBe('gloria@taybo.test');
    expect(body.companySize).toBe('11-50');
    expect('legalName' in body).toBe(false);
  });

  it('distinguishes the rate limit from other failures', async () => {
    await expect(
      submitEnterpriseApplication(valid, {
        fetcher: jest.fn().mockResolvedValue({ ok: false, status: 429 }),
      })
    ).rejects.toThrow('ENTERPRISE_APPLICATION_RATE_LIMITED');
    await expect(
      submitEnterpriseApplication(valid, {
        fetcher: jest.fn().mockResolvedValue({ ok: false, status: 500 }),
      })
    ).rejects.toThrow('ENTERPRISE_APPLICATION_SUBMISSION_FAILED');
  });
});
