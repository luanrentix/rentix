"use client";

import { usePathname } from "next/navigation";
import AppShell from "./app-shell";

type AppFrameProps = {
  children: React.ReactNode;
};

export default function AppFrame({ children }: AppFrameProps) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
