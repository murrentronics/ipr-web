import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Prevent repeated Supabase OAuth/code handling on refresh by stripping auth params from the URL
// after Supabase has had a chance to read them.
export function AuthUrlCleanup() {
  const location = useLocation();

  useEffect(() => {
    // Recovery flow relies on URL params on this route.
    if (location.pathname === "/update-password") return;

    const url = new URL(window.location.href);

    const SUPABASE_PARAMS = [
      "code",
      "access_token",
      "refresh_token",
      "expires_in",
      "token_type",
      "type",
      "error",
      "error_description",
    ];

    const hasQueryParams = SUPABASE_PARAMS.some((p) => url.searchParams.has(p));
    const hasHashTokens = /access_token=|refresh_token=|expires_in=|token_type=/.test(url.hash);
    if (!hasQueryParams && !hasHashTokens) return;

    // Remove only Supabase-related params; keep any custom params intact.
    SUPABASE_PARAMS.forEach((p) => url.searchParams.delete(p));

    // Never keep token hashes around.
    url.hash = "";

    const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
    window.history.replaceState({}, document.title, next);
  }, [location.pathname, location.search, location.hash]);

  return null;
}
