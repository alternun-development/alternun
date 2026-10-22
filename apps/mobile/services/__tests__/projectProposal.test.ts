/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  resolveMarketplaceContactMailto,
  submitProjectProposal,
  validateProjectProposalInput,
} from '../projectProposal';

const proposal = {
  projectName: 'Community forest',
  location: 'Andes, Colombia',
  category: 'conservation' as const,
  message: '',
  contactEmail: 'proposer@example.com',
  contactName: 'Proposal Test',
  language: 'en' as const,
  website: '',
};

describe('project proposal client', () => {
  it('validates required fields and email before submission', () => {
    expect(validateProjectProposalInput(proposal)).toBe(true);
    expect(validateProjectProposalInput({ ...proposal, contactEmail: 'invalid' })).toBe(false);
    expect(validateProjectProposalInput({ ...proposal, projectName: ' ' })).toBe(false);
  });

  it('posts normalized proposal data to the versioned API', async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true });
    await submitProjectProposal(
      { ...proposal, projectName: '  Community forest ', contactEmail: ' Proposer@Example.com ' },
      { fetcher, apiBaseUrl: 'https://api.example.com/' }
    );

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.com/v1/project-proposals',
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      projectName: 'Community forest',
      contactEmail: 'proposer@example.com',
    });
  });

  it('throws when the API rejects a proposal', async () => {
    await expect(
      submitProjectProposal(proposal, {
        fetcher: jest.fn().mockResolvedValue({ ok: false }),
        apiBaseUrl: 'https://api.example.com',
      })
    ).rejects.toThrow('PROJECT_PROPOSAL_SUBMISSION_FAILED');
  });

  it('builds mailto only from a valid public contact variable', () => {
    expect(
      resolveMarketplaceContactMailto({
        EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL: ' Marketplace@Example.com ',
      })
    ).toBe('mailto:marketplace@example.com');
    expect(resolveMarketplaceContactMailto({})).toBeNull();
    expect(
      resolveMarketplaceContactMailto({ EXPO_PUBLIC_MARKETPLACE_CONTACT_EMAIL: 'invalid' })
    ).toBeNull();
  });
});
