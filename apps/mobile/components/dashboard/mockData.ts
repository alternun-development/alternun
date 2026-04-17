import { ImpactToken, PoolPosition, AIRSEntry, SBTCertificate, Project, } from './types';

export const MOCK_TOKENS: ImpactToken[] = [
  { tokenId: 'TKN-001', state: 'Free', acquisitionPrice: 250, projectName: 'Amazon Reforestation', },
  {
    tokenId: 'TKN-002',
    state: 'Deposited',
    acquisitionPrice: 300,
    projectName: 'Solar Farm Delta',
  },
  { tokenId: 'TKN-003', state: 'Free', acquisitionPrice: 180, projectName: 'Ocean Cleanup Beta', },
  { tokenId: 'TKN-004', state: 'Consumed', acquisitionPrice: 220, projectName: 'Wind Energy Park', },
  {
    tokenId: 'TKN-005',
    state: 'Deposited',
    acquisitionPrice: 400,
    projectName: 'Mangrove Restore',
  },
  { tokenId: 'TKN-006', state: 'Free', acquisitionPrice: 275, projectName: 'Carbon Capture X', },
];

export const MOCK_POSITIONS: PoolPosition[] = [
  {
    positionId: 'POS-001',
    totalValueUSD: 5000,
    soldUSD: 3750,
    remainingUSD: 1250,
    profitShare: 12,
    isClosed: false,
    tokenId: 'TKN-002',
  },
  {
    positionId: 'POS-002',
    totalValueUSD: 8000,
    soldUSD: 8000,
    remainingUSD: 0,
    profitShare: 15,
    isClosed: true,
    tokenId: 'TKN-005',
  },
  {
    positionId: 'POS-003',
    totalValueUSD: 3200,
    soldUSD: 960,
    remainingUSD: 2240,
    profitShare: 10,
    isClosed: false,
    tokenId: 'TKN-002',
  },
];

export const MOCK_AIRS: AIRSEntry[] = [
  {
    id: '1',
    reason: 'Allied commerce purchase',
    referenceType: 'allied_commerce',
    amountAIRS: 50,
    timestamp: new Date(Date.now() - 1000 * 60 * 30,),
    reference: '0x4a3b2c1d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
    sourceAmount: 10,
    sourceCurrency: 'USD',
  },
  {
    id: '2',
    reason: 'Validated regenerative action',
    referenceType: 'validated_regenerative_action',
    amountAIRS: 120,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2,),
    reference: '0x1f2e3d4c5b6a7988c7d6e5f4a3b2c1d0e9f8a7b6',
    sourceAmount: 24,
    sourceCurrency: 'USD',
  },
  {
    id: '3',
    reason: 'Carbon compensation',
    referenceType: 'compensation',
    amountAIRS: 75,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5,),
    reference: '0x9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b',
    sourceAmount: 15,
    sourceCurrency: 'USD',
  },
  {
    id: '4',
    reason: 'Profile completion bonus',
    referenceType: 'profile_completion_bonus',
    amountAIRS: 200,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24,),
    reference: '0x3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f',
  },
  {
    id: '5',
    reason: 'Ledger correction',
    referenceType: 'correction',
    amountAIRS: 340,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48,),
    reference: '0x7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c',
  },
];

export const MOCK_CERTIFICATES: SBTCertificate[] = [
  {
    id: 'SBT-001',
    projectName: 'Amazon Reforestation',
    impactAmount: 2.5,
    impactUnit: 'tCO₂',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3,),
    onChainRef: '0x4a3b2c1d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
    metadata: { project: 'Amazon Reforestation', registry: 'Verra', vintage: '2024', },
  },
  {
    id: 'SBT-002',
    projectName: 'Solar Farm Delta',
    impactAmount: 1.8,
    impactUnit: 'tCO₂',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10,),
    onChainRef: '0x1f2e3d4c5b6a798827d6e5f4a3b2c1d0e9f8a7b6',
    metadata: { project: 'Solar Farm Delta', registry: 'Gold Standard', vintage: '2024', },
  },
  {
    id: 'SBT-003',
    projectName: 'Ocean Cleanup Beta',
    impactAmount: 0.5,
    impactUnit: 'tPlastic',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20,),
    onChainRef: '0x9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b',
    metadata: {
      project: 'Ocean Cleanup Beta',
      registry: 'Plastic Credit Exchange',
      vintage: '2024',
    },
  },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Amazon Reforestation',
    description: 'Plant trees in the Amazon basin',
    category: 'Reforestation',
  },
  {
    id: 'proj-2',
    name: 'Solar Farm Delta',
    description: 'Renewable solar energy in Delta region',
    category: 'Renewable Energy',
  },
  {
    id: 'proj-3',
    name: 'Ocean Cleanup Beta',
    description: 'Remove plastic from ocean ecosystems',
    category: 'Ocean Health',
  },
  {
    id: 'proj-4',
    name: 'Wind Energy Park',
    description: 'Clean wind power generation',
    category: 'Renewable Energy',
  },
  {
    id: 'proj-5',
    name: 'Mangrove Restore',
    description: 'Restore coastal mangrove ecosystems',
    category: 'Blue Carbon',
  },
];
