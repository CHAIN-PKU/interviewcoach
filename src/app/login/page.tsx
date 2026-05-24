import { headers } from "next/headers";
import { Suspense } from "react";
import { LoginClient } from "./login-client";

async function getCsrfToken() {
  const headerList = await headers();
  const cookie = headerList.get("cookie") ?? "";
  // Use internal URL for server-to-server fetch to avoid self-signed cert issues
  const internalUrl = process.env.NEXTAUTH_INTERNAL_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const res = await fetch(`${internalUrl}/api/auth/csrf`, {
    headers: { cookie },
    cache: "no-store",
  });

  if (!res.ok) return "";
  const data = await res.json();
  return data.csrfToken as string;
}

async function LoginContent() {
  const csrfToken = await getCsrfToken();
  const callbackUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard`;

  return <LoginClient csrfToken={csrfToken} callbackUrl={callbackUrl} />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-500 text-sm">加载中...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
