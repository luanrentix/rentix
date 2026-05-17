"use client";

import { usePathname } from "next/navigation";
import AppShell from "./app-shell";
import AuthGuard from "@/components/auth/auth-guard";

type AppFrameProps = {
  children: React.ReactNode;
};

export default function AppFrame({ children }: AppFrameProps) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  if (pathname === "/configuracoes") {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return <AppShell>{children}</AppShell>;
}
