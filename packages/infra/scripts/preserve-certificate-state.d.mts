export function planCertificatePreservation(checkpoint: unknown, prefixes: string[]): string[];
export function preserveCertificateState(
  stage: string,
  prefixes: string[],
  run?: (
    command: string,
    args: string[],
    options: {
      encoding: string;
      input?: string;
      maxBuffer: number;
      stdio: string[];
      env: NodeJS.ProcessEnv;
    }
  ) => string
): number;
