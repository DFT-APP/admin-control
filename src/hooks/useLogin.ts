import { useMutation } from "@tanstack/react-query";
import { useAuthStore, type AdminAccount } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";

/**
 * A sign-in the API has not finished: the password was right, but the device is
 * not one it recognises, so it wants a code from the operator's inbox first.
 */
export type OtpChallenge = {
  challengeId: string;
  /** Masked by the server, e.g. "k•••@example.com". */
  email: string | null;
  expiresInMinutes: number;
};

type LoginResponse = {
  data: {
    token?: string;
    otpRequired?: boolean;
    challengeId?: string;
    email?: string | null;
    expiresInMinutes?: number;
  };
};

export type LoginResult =
  | { status: "otp-required"; challenge: OtpChallenge }
  | { status: "signed-in"; token: string; account: AdminAccount };

/**
 * Trade a token for an admin session, or refuse it.
 *
 * The admin check happens first on the server: login is sent with
 * `scope: "admin"`, so a non-admin is refused before any code is emailed. This
 * second check is still the authority — it asks an admin-only endpoint with the
 * new token, and nothing is stored until that answer comes back.
 */
async function claimAdminSession(token: string): Promise<LoginResult> {
  try {
    const account = await apiClient<{ data: AdminAccount }>(
      "/api/admin/settings/account",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { status: "signed-in", token, account: account.data };
  } catch {
    throw new Error("This account does not have admin access");
  }
}

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  const setAccount = useAuthStore((s) => s.setAccount);
  const navigate = useNavigate();

  return useMutation({
    // `remember` rides along for onSuccess; it is a browser choice and never
    // goes to the server.
    mutationFn: async ({
      userEmail,
      password,
      turnstileToken,
    }: {
      userEmail: string;
      password: string;
      remember: boolean;
      /** From the "I'm a human" widget, when it is shown. */
      turnstileToken?: string;
    }): Promise<LoginResult> => {
      const res = await apiClient<LoginResponse>("/api/users/login", {
        method: "POST",
        // `scope` asks the server to refuse a non-admin before it emails a code.
        body: JSON.stringify({
          userEmail,
          password,
          deviceType: "web",
          scope: "admin",
          turnstileToken,
        }),
      });

      // No token in this response on purpose — the API is holding the session
      // back until the emailed code comes in.
      if (res.data.otpRequired && res.data.challengeId) {
        return {
          status: "otp-required",
          challenge: {
            challengeId: res.data.challengeId,
            email: res.data.email ?? null,
            expiresInMinutes: res.data.expiresInMinutes ?? 10,
          },
        };
      }

      if (!res.data.token) throw new Error("Login failed");

      return claimAdminSession(res.data.token);
    },

    // Only fires for a device the API already knows. A challenged sign-in
    // finishes in useVerifyLoginOtp instead; the page reads the result to tell
    // which happened.
    onSuccess: (result, { remember }) => {
      if (result.status !== "signed-in") return;
      login(result.token, remember);
      setAccount(result.account);
      toast.success(`Welcome back, ${result.account.userName}`);
      navigate("/dashboard");
    },

    onError: (error: Error) => {
      toast.error(error.message || "Login failed");
    },
  });
}

/** The second half: the code, then the same admin-role check as above. */
export function useVerifyLoginOtp() {
  const login = useAuthStore((s) => s.login);
  const setAccount = useAuthStore((s) => s.setAccount);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      challengeId,
      code,
    }: {
      challengeId: string;
      code: string;
      remember: boolean;
    }): Promise<LoginResult> => {
      const res = await apiClient<LoginResponse>("/api/users/login/verify-otp", {
        method: "POST",
        body: JSON.stringify({ challengeId, code }),
      });

      if (!res.data.token) throw new Error("Login failed");

      return claimAdminSession(res.data.token);
    },

    onSuccess: (result, { remember }) => {
      if (result.status !== "signed-in") return;
      login(result.token, remember);
      setAccount(result.account);
      toast.success(`Welcome back, ${result.account.userName}`);
      navigate("/dashboard");
    },

    onError: (error: Error) => {
      toast.error(error.message || "That code did not work");
    },
  });
}

/** Ask for a fresh code against a challenge already open. */
export function useResendLoginOtp() {
  return useMutation({
    mutationFn: async (challengeId: string) => {
      await apiClient("/api/users/otp/resend", {
        method: "POST",
        body: JSON.stringify({ challengeId, purpose: "login" }),
      });
    },
    // Within two minutes of the first send this is the same code, so the copy
    // does not promise a new one.
    onSuccess: () => toast.success("Code sent. Check your inbox."),
    onError: (error: Error) =>
      toast.error(error.message || "Could not send a new code"),
  });
}
