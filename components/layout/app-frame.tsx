"use client";

import { usePathname } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import AppShell from "./app-shell";
import { isInternalRoute } from "@/services/app-routes";

type AppFrameProps = {
  children: React.ReactNode;
};

export default function AppFrame({ children }: AppFrameProps) {
  const pathname = usePathname();

  if (pathname === "/configuracoes") {
    return <AuthGuard>{children}</AuthGuard>;
  }

  if (isInternalRoute(pathname)) {
    return <AppShell>{children}</AppShell>;
  }

  return <>{children}</>;
}
