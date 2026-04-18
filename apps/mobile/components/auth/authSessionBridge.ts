import type { User, } from '@alternun/auth';

export function shouldClearOidcSessionOnAuthStateChange(options: {
  hasReceivedAuthState: boolean;
  previousUser: User | null | undefined;
  nextUser: User | null;
},): boolean {
  return options.hasReceivedAuthState && options.previousUser != null && options.nextUser == null;
}
