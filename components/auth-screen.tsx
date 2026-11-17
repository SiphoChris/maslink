"use client";

import { useState } from "react";
import { useSignInWithUsernamePasskey } from "@convex-dev/auth/methods/username-passkey/react";
import type {
  SignInWithUsernamePasskeyResult,
  UsernamePasskeyAutofillError,
} from "@convex-dev/auth/methods/username-passkey/react";
import Image from "next/image";
import { ShieldCheck, Sprout } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";

type PasskeyError =
  | Extract<SignInWithUsernamePasskeyResult, { status: "error" }>["userError"]
  | UsernamePasskeyAutofillError;

function getPasskeyErrorMessage(userError: PasskeyError) {
  switch (userError.error) {
    case "ALREADY_PENDING":
      return null;
    case "USERNAME_TOO_SHORT":
      return `Use at least ${userError.minimumLength} characters for your username.`;
    case "USERNAME_TOO_LONG":
      return `Use no more than ${userError.maximumLength} characters for your username.`;
    case "USERNAME_HAS_SURROUNDING_WHITESPACE":
      return "Your username cannot start or end with a space.";
    case "USERNAME_HAS_INVALID_CHARACTERS":
      return "That username contains characters that are not allowed.";
    case "USERNAME_TAKEN":
      return "That username was just claimed. Please choose another.";
    case "CHALLENGE_EXPIRED":
      return "That sign-in took too long. Please try again.";
    case "UNKNOWN_CREDENTIAL":
      return "This device does not have a passkey for that account.";
    case "PROTOCOL_ERROR":
      return "We could not verify this passkey. Please try again.";
    case "PASSKEY_ALREADY_REGISTERED":
      return "This device already has a passkey for MASLink. Try signing in instead.";
    case "CEREMONY_ABORTED":
      return "Passkey sign-in was cancelled.";
    case "WEBAUTHN_UNSUPPORTED":
      return "This browser does not support passkeys.";
    case "OTHER_ERROR":
      console.error("Passkey sign-in failed:", userError.cause);
      return "Something went wrong while signing in. Please try again.";
    default:
      userError satisfies never;
      return "Something went wrong while signing in.";
  }
}

export function AuthScreen() {
  const { signIn, pending, autofill } = useSignInWithUsernamePasskey(api.auth);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const displayedError =
    error ?? (autofill.lastError ? getPasskeyErrorMessage(autofill.lastError) : null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const result = await signIn({ username });
      if (result.status === "complete") {
        if (pathname === "/") router.replace("/marketplace");
        return;
      }
      setError(getPasskeyErrorMessage(result.userError));
    } catch (caught) {
      console.error("Could not start passkey sign-in:", caught);
      setError("We could not connect to MASLink. Check your connection and try again.");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand-lockup brand-lockup-light">
          <span className="brand-logo"><Image src="/maslink-logo.svg" alt="" width={40} height={40} /></span>
          <span>MASLink</span>
        </div>
        <div className="story-copy">
          <span className="eyebrow eyebrow-light"><Sprout size={14} /> Farmers, together</span>
          <h1>Big orders.<br /><strong>Stronger</strong> farms.</h1>
          <p>Find nearby farmers, combine your harvests, and say yes to the orders you could not fill alone.</p>
        </div>
        <div className="story-note">
          <span className="story-note-icon"><ShieldCheck size={18} /></span>
          <span><strong>Your farm, your terms</strong><small>Join only the orders that work for you.</small></span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand brand-lockup">
          <span className="brand-logo"><Image src="/maslink-logo.svg" alt="" width={40} height={40} /></span>
          <span>MASLink</span>
        </div>
        <div className="auth-form-wrap">
          <span className="eyebrow">Welcome to your farm network</span>
          <h2>Grow <span>together.</span></h2>
          <p className="auth-intro">Sign in or create your farmer account with a passkey.</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="username">Your username</label>
            <input
              autoComplete="username webauthn"
              autoCapitalize="none"
              autoCorrect="off"
              id="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. thandi_farms"
              required
              value={username}
              disabled={pending}
            />
            {displayedError ? <p className="form-error" role="alert">{displayedError}</p> : null}
            <button className="button button-primary auth-submit" type="submit" disabled={pending}>
              {pending ? <span className="spinner" /> : <ShieldCheck size={17} />}
              {pending ? "Waiting for passkey" : "Continue with passkey"}
            </button>
          </form>
          <p className="auth-footnote">New here? Choosing a new username creates your account. Your device will ask you to set up a passkey.</p>
          <div className="auth-divider"><span /> Secure sign-in <span /></div>
          <p className="auth-security"><ShieldCheck size={15} /> Your passkey stays on your device. MASLink never sees it.</p>
        </div>
        <footer className="auth-footer"><span>© 2026 MASLink</span><span>Made for the people who grow our food.</span></footer>
      </section>
    </main>
  );
}
