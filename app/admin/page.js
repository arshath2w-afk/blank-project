"use client";

import React, { useState } from "react";

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState("");
  const [email, setEmail] = useState("");
  const [passthrough, setPassthrough] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function grant() {
    try {
      setStatus("Granting...");
      setError("");
      const body = {
        email: email || undefined,
        passthrough: passthrough || undefined,
        licenseKey: licenseKey || undefined,
      };
      if (durationDays) body.durationDays = parseInt(durationDays, 10);
      if (expiresAt) body.expiresAt = parseInt(expiresAt, 10);

      const res = await fetch("/api/admin/grant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Grant failed");
        setStatus("");
        return;
      }
      setStatus(`Granted. License: ${json.licenseKey}, Expires: ${new Date(json.expiresAt).toLocaleString()}`);
    } catch (e) {
      console.error(e);
      setError("Grant request failed.");
      setStatus("");
    }
  }

  return (
    <main className="container">
      <h1>Admin: Grant Pro</h1>
      <p className="subtitle">Issue or extend licenses manually. Protect this page by keeping your ADMIN_TOKEN secret.</p>

      <div className="card">
        <div className="actions" style={{ flexDirection: "column", gap: "0.75rem", alignItems: "stretch" }}>
          <input type="password" placeholder="Admin token" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} />
          <input type="email" placeholder="User email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="text" placeholder="Passthrough/ID (optional)" value={passthrough} onChange={(e) => setPassthrough(e.target.value)} />
          <input type="text" placeholder="License key (optional, auto-generated if empty)" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} />
          <input type="number" placeholder="Duration days (optional, default end of month)" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
          <input type="number" placeholder="ExpiresAt timestamp (ms, optional overrides duration)" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          <button className="button" onClick={grant}>Grant/Extend</button>
        </div>
        {status && <div className="status">{status}</div>}
        {error && <div className="error">{error}</div>}
      </div>
    </main>
  );
}