"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    const validEmail = "luan@rentix.com";
    const validPassword = "123456";

    if (
      email.toLowerCase() === validEmail &&
      password === validPassword
    ) {
      localStorage.setItem("rentix_logged", "true");

      localStorage.setItem(
        "rentix_user",
        JSON.stringify({
          name: "Luan",
          email: validEmail,
        })
      );

      router.push("/dashboard");
    } else {
      alert("Invalid email or password");
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT SIDE */}
      <div className="w-1/2 bg-orange-500 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-80">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Welcome to Rentix
          </h2>

          <input
            type="email"
            placeholder="E-mail"
            className="w-full mb-4 p-3 border rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full mb-4 p-3 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            className="w-full bg-orange-500 text-white p-3 rounded-lg font-semibold hover:bg-orange-600 transition"
          >
            Login
          </button>

          <p className="text-center text-sm mt-4 text-gray-500">
            Forgot your password?
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-1/2 bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">
            Simple, fast and intelligent rental management
          </h1>

          <p className="text-gray-600">
            Manage properties, tenants, contracts, payments and expenses in a
            modern and professional platform.
          </p>

          <div className="flex justify-center gap-4 mt-6">
            <div className="bg-white p-4 rounded-xl shadow">
              <p className="font-semibold">Properties</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow">
              <p className="font-semibold">Contracts</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow">
              <p className="font-semibold">Financial</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}