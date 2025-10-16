"use client";

import React, { useState } from "react";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function submit() {
    try {
      const url = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.ok) {
        setStatus(json.error || "Auth failed");
        return;
      }
      if (mode === "signup") {
        setStatus("Signup successful. Please log in.");
        setMode("login");
      } else {
        setStatus("Logged in.");
      }
    } catch (e) {
      setStatus("Auth request failed.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setStatus("Logged out.");
  }

  return (
    <main className="container">
      <h1>Login / Signup</h1>
      <p className="subtitle">Use email and password to create an account or log in.</p>

      <div className="card">
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <button className={`button ${mode === "login" ? "primary" : "secondary"}`} type="button" onClick={() => setMode("login")}>
            Login
          </button>
          <button className={`button ${mode === "signup" ? "primary" : "secondary"}`} type="button" onClick={() => setMode("signup")}>
            Sign up
          </button>
          <button className="button secondary" type="button" onClick={logout}>
            Logout
          </button>
        </div>

        <label className="label">Email</label>
        <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="label" style={{ marginTop: "0.75rem" }}>Password</label>
        <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />

        <div className="actions">
          <button className="button" type="button" onClick={submit}>
            {mode === "signup" ? "Create account" : "Login"}
          </button>
        </div>

        {status && <div className="status">{status}</div>}
      </div>
    </main>
  );
}