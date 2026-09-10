import { useState } from "react";
import {
  useLogin,
  useResendLoginOtp,
  useVerifyLoginOtp,
  type OtpChallenge,
} from "@/hooks/useLogin";
import { Logo } from "@/components/layout/Logo";
import { HumanCheck } from "@/components/HumanCheck";
import { humanCheckEnabled } from "@/lib/humanCheck";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState("");
  // Off by default: the admin console is often opened on shared machines, so
  // the session ends with the browser unless the operator asks otherwise.
  const [remember, setRemember] = useState(false);
  const [humanToken, setHumanToken] = useState<string | null>(null);
  const [humanReset, setHumanReset] = useState(0);
  const { mutate, isPending } = useLogin();
  const verifyOtp = useVerifyLoginOtp();
  const resendOtp = useResendLoginOtp();

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Minimum 6 characters required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // A real <form> submit is what lets the phone keyboard show a "Go" key and
  // password managers offer to fill and save the credentials.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || !validate()) return;
    if (humanCheckEnabled && !humanToken) {
      toast.error("Confirm you're human first");
      return;
    }

    mutate(
      {
        userEmail: email,
        password,
        remember,
        turnstileToken: humanToken ?? undefined,
      },
      {
        // A correct password from a device the API does not recognise. No
        // session exists yet, so the card swaps to the code step rather than
        // navigating anywhere.
        onSuccess: (result) => {
          if (result.status === "otp-required") setChallenge(result.challenge);
        },
        // The token went out with that request and is spent either way.
        onError: () => setHumanReset((n) => n + 1),
      }
    );
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || verifyOtp.isPending || code.length !== 6) return;
    verifyOtp.mutate({ challengeId: challenge.challengeId, code, remember });
  };

  return (
    <div
      // dvh keeps the card centred while the mobile browser toolbar collapses;
      // overflow-hidden stops the decorative glows from widening the page.
      className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-black via-[#0a0a0a] to-black px-4 py-10 relative overflow-hidden"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Glow background */}
      <div
        aria-hidden="true"
        className="absolute w-56 h-56 sm:w-72 sm:h-72 bg-[#a3e635]/20 blur-[120px] rounded-full -top-10 -left-10 sm:top-10 sm:left-10"
      />
      <div
        aria-hidden="true"
        className="absolute w-56 h-56 sm:w-72 sm:h-72 bg-[#a3e635]/10 blur-[120px] rounded-full -bottom-10 -right-10 sm:bottom-10 sm:right-10"
      />

      {/* Card — the code step replaces the credentials rather than sitting
          below them, so there is only ever one thing being asked for. */}
      {challenge ? (
        <form
          onSubmit={handleVerify}
          noValidate
          className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <Logo className="h-10 sm:h-12" />
          </div>

          <h1 className="text-white text-xl sm:text-2xl font-bold text-center mb-1">
            Confirm it's you
          </h1>
          <p className="text-gray-500 text-sm text-center mb-6">
            Every admin sign-in needs a code. We've emailed a 6-digit one
            {challenge.email ? (
              <> to <span className="text-gray-300">{challenge.email}</span></>
            ) : null}
            . It expires in {challenge.expiresInMinutes} minutes.
          </p>

          <div className="mb-6">
            <label htmlFor="login-otp" className="text-gray-400 text-sm">
              Code
            </label>
            <input
              id="login-otp"
              // A single field, not six boxes: `one-time-code` on one input is
              // what lets the OS offer the code straight from the email.
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              className="w-full mt-1.5 px-4 py-3 min-h-[48px] rounded-lg bg-black/50 border border-white/10 text-white text-center text-2xl font-bold tracking-[0.5em] placeholder:text-gray-600 placeholder:tracking-normal focus:outline-none focus:border-[#a3e635] transition"
              placeholder="000000"
              value={code}
              // Digits only, so pasting "Your code is 483920" leaves the code.
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </div>

          <button
            type="submit"
            disabled={verifyOtp.isPending || code.length !== 6}
            className="w-full bg-[#a3e635] text-black font-semibold min-h-[48px] rounded-lg hover:bg-[#bef264] active:scale-[0.99] transition-all duration-150 shadow-lg disabled:opacity-60"
          >
            {verifyOtp.isPending ? "Checking…" : "Confirm and sign in"}
          </button>

          <div className="mt-5 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setChallenge(null);
                setCode("");
                setPassword("");
                // The widget re-mounts with the credentials form and issues a
                // fresh token; the one used for the code step is spent.
                setHumanToken(null);
              }}
              className="text-gray-400 hover:text-white py-2"
            >
              Back
            </button>
            <button
              type="button"
              disabled={resendOtp.isPending}
              onClick={() => resendOtp.mutate(challenge.challengeId)}
              className="text-gray-400 hover:text-[#a3e635] py-2 disabled:opacity-60"
            >
              {resendOtp.isPending ? "Sending…" : "Resend code"}
            </button>
          </div>
        </form>
      ) : (
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl"
      >
        <div className="flex justify-center mb-6">
          <Logo className="h-10 sm:h-12" />
        </div>

        <h1 className="text-white text-xl sm:text-2xl font-bold text-center mb-1">
          Welcome back
        </h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Sign in to the DFT admin console
        </p>

        <div className="mb-4">
          <label htmlFor="login-email" className="text-gray-400 text-sm">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            aria-invalid={!!errors.email}
            className="w-full mt-1.5 px-4 py-3 min-h-[48px] rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#a3e635] transition"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && (
            <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>
          )}
        </div>

        <div className="mb-2">
          <label htmlFor="login-password" className="text-gray-400 text-sm">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className="w-full mt-1.5 px-4 py-3 min-h-[48px] rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#a3e635] transition"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && (
            <p className="text-red-400 text-xs mt-1.5">{errors.password}</p>
          )}
        </div>

        <label
          htmlFor="login-remember"
          className="flex items-center gap-2 mb-4 py-2 text-sm text-gray-400 cursor-pointer select-none"
        >
          <input
            id="login-remember"
            type="checkbox"
            className="h-4 w-4 accent-[#a3e635] cursor-pointer"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember me
        </label>

        <HumanCheck
          onToken={setHumanToken}
          resetKey={humanReset}
          onError={(message) => toast.error(message)}
        />

        {/* Live while the human check runs: a disabled button swallowed the
            click, so empty fields showed no errors and the "confirm you're
            human" prompt in handleSubmit could never appear. */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#a3e635] text-black font-semibold min-h-[48px] rounded-lg hover:bg-[#bef264] active:scale-[0.99] transition-all duration-150 shadow-lg disabled:opacity-60"
        >
          {isPending ? "Logging in…" : "Login"}
        </button>
      </form>
      )}
    </div>
  );
}
