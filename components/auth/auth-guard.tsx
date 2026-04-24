"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthGuardProps = {
  children: React.ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const isLogged = localStorage.getItem("rentix_logged");

    if (!isLogged) {
      router.replace("/");
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  if (!isAuthorized) return null;

  return <>{children}</>;
}