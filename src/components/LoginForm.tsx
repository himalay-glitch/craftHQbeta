import { useState, type FormEvent } from "react";
import type { LoginErrorBody } from "@/types/auth";
import { AlertCircleIcon } from "@/components/icons";

// Labels stay in the accessibility tree; the filled fields carry placeholders visually.
const labelClass = "sr-only";

// Field + button styling follows muse.ai: 54px soft grey fields (radius 20), 44px pill button.
const inputClass =
  "h-[54px] w-full rounded-[20px] border-none bg-[var(--field-bg)] px-4 text-[16px] leading-[22px] text-foreground " +
  "[font-family:inherit] placeholder:text-muted-foreground transition-[background-color,box-shadow] duration-150 " +
  "hover:bg-[var(--field-bg-hover)] focus:bg-[var(--field-bg-focus)] focus:outline-none " +
  "focus:shadow-[0_0_0_1.5px_var(--focus),0_0_0_5px_var(--focus-ring)]";

const buttonClass =
  "mt-2 h-11 w-full cursor-pointer rounded-full border-none bg-[var(--cta)] text-[16px] font-medium " +
  "text-white [font-family:inherit] transition-[background-color,transform] duration-150 " +
  "data-[ready=false]:bg-[color-mix(in_srgb,var(--cta)_36%,#fff)] enabled:data-[ready=true]:hover:bg-[var(--cta-hover)] " +
  "enabled:active:translate-y-px disabled:cursor-default disabled:opacity-70";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.assign("/");
        return;
      }
      const body: LoginErrorBody | null = await res.json().catch(() => null);
      if (res.status === 429) {
        const retry = body?.retry_after_seconds;
        setError(
          `Too many attempts — try again in ${
            typeof retry === "number" ? `${retry} seconds` : "a few minutes"
          }.`,
        );
      } else {
        setError(body?.error ?? "sign-in failed");
      }
    } catch {
      setError("network error — try again");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        handleSubmit(e).catch(console.error);
      }}
    >
      <div>
        <label className={labelClass} htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          className={inputClass}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="login-email"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          className={inputClass}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="login-password"
        />
      </div>
      {error ? (
        <div
          className="flex items-start gap-2 rounded-[16px] bg-[color-mix(in_srgb,var(--danger-ink)_8%,transparent)] px-4 py-3 text-left text-[13px] leading-[1.45] text-danger-ink"
          role="alert"
          data-testid="login-error"
        >
          <AlertCircleIcon className="mt-px flex-none" />
          <span>{error}</span>
        </div>
      ) : null}
      <button
        className={buttonClass}
        type="submit"
        disabled={pending}
        data-ready={email.length > 0 && password.length > 0}
        data-testid="login-submit"
      >
        Sign in
      </button>
      <p className="mt-1 text-center text-[13px] leading-[18px] text-muted-foreground">
        Use the email your instance operator registered for you.
      </p>
    </form>
  );
}
