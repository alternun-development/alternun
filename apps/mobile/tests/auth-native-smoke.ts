import { AuthProvider, useAuth } from "@edcalderon/auth";
import type {
  AuthClient,
  OAuthFlow,
  SignInOptions,
  User,
} from "@edcalderon/auth";
import { FirebaseNativeClient } from "@edcalderon/auth/firebase-native";
import { HybridNativeClient } from "@edcalderon/auth/hybrid-native";
import { SupabaseClient } from "@edcalderon/auth/supabase";
import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import type { Auth, AuthCredential } from "firebase/auth";

// Compile-time smoke test for React Native support in @edcalderon/auth v1.1.3.
type NativeFlow = Extract<OAuthFlow, "native">;
type _AuthClient = AuthClient;
type _SignInOptions = SignInOptions;
type _User = User;

declare const supabase: SupabaseClientType;
declare const firebaseAuth: Auth;
declare const signInWithEmailAndPassword: (
  auth: Auth,
  email: string,
  password: string
) => Promise<unknown>;
declare const signInWithCredential: (
  auth: Auth,
  credential: AuthCredential
) => Promise<unknown>;
declare const signOut: (auth: Auth) => Promise<void>;
declare const onAuthStateChanged: (
  auth: Auth,
  nextOrObserver: (user: unknown) => void
) => () => void;

const firebaseNativeClient = new FirebaseNativeClient({
  auth: firebaseAuth,
  methods: {
    signInWithEmailAndPassword,
    signInWithCredential,
    signOut,
    onAuthStateChanged,
  },
  oauthHandlers: {
    google: async (_options: SignInOptions) => ({} as AuthCredential),
  },
});

const hybridNativeClient = new HybridNativeClient({
  supabase,
  firebaseAuth,
  firebaseMethods: {
    signInWithCredential,
    signOut,
  },
  oauthHandlers: {
    google: async (_options: SignInOptions) => ({
      credential: {} as AuthCredential,
      idToken: "mock-id-token",
    }),
  },
});

// Supabase adapter constructor should support both object and direct client forms.
new SupabaseClient({ supabase });
new SupabaseClient(supabase);

async function smokeSignIn(client: AuthClient, flow: NativeFlow) {
  await client.signIn({ provider: "google", flow });
}

void AuthProvider;
void useAuth;
void firebaseNativeClient;
void hybridNativeClient;
void smokeSignIn;
