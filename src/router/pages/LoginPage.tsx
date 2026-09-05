import { useState } from "react";
import { useLogin } from "@/hooks/useLogin";
import { Logo } from "@/components/layout/Logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const { mutate, isPending } = useLogin();

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

    mutate({
      userEmail: email,
      password,
    });
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

      {/* Card */}
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

        <div className="flex justify-end mb-6">
          <span className="text-xs text-gray-400 hover:text-[#a3e635] cursor-pointer py-2">
            Forgot password?
          </span>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#a3e635] text-black font-semibold min-h-[48px] rounded-lg hover:bg-[#bef264] active:scale-[0.99] transition-all duration-150 shadow-lg disabled:opacity-60"
        >
          {isPending ? "Logging in…" : "Login"}
        </button>
      </form>
    </div>
  );
}
