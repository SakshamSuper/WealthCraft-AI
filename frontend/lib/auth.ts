/**
 * WealthCraft AI Authentication & Session Manager
 * Ensures robust offline/online session continuity across all routes.
 */

export const DEMO_USER_PROFILE = {
  id: 1,
  email: "investor@wealthcraft.ai",
  full_name: "Demo Investor",
  risk_appetite: "Moderate Aggressive",
  risk_score: 50,
  investment_horizon_years: 10,
  monthly_income: 150000,
  sip_amount: 15000,
};

export const TOKEN_KEYS = ["wealthcraft_token", "stockify_token"] as const;

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  for (const k of TOKEN_KEYS) {
    const val = localStorage.getItem(k);
    if (val) return val;
  }
  return null;
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  for (const k of TOKEN_KEYS) {
    localStorage.setItem(k, token);
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  for (const k of TOKEN_KEYS) {
    localStorage.removeItem(k);
  }
  localStorage.removeItem("wealthcraft_user_profile");
}

/**
 * Ensures an active session exists.
 * If no token is found, seeds a default demo session so that pages never crash or unexpectedly bounce users.
 */
export function ensureSession(): string {
  if (typeof window === "undefined") return "server_session";
  const existing = getAuthToken();
  if (existing) {
    // Also make sure profile exists
    if (!localStorage.getItem("wealthcraft_user_profile")) {
      localStorage.setItem("wealthcraft_user_profile", JSON.stringify(DEMO_USER_PROFILE));
    }
    return existing;
  }

  const demoToken = "demo_jwt_token_" + Date.now();
  setAuthToken(demoToken);
  localStorage.setItem("wealthcraft_user_profile", JSON.stringify(DEMO_USER_PROFILE));
  return demoToken;
}
