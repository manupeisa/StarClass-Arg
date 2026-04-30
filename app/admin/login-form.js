"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";

export default function LoginForm() {
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, password }),
    });

    if (response.ok) {
      window.location.reload();
      return;
    }

    const body = await response.json();
    setMessage(body.message || "No se pudo iniciar sesión.");
    setLoading(false);
  }

  return (
    <main className="admin-login">
      <form onSubmit={submit} className="login-card">
        <span className="login-mark">
          <img src="/stars-logo.svg" alt="" />
        </span>
        <p>Panel administrador</p>
        <h1>StarClass Argentina</h1>
        <label>
          Usuario
          <input value={user} onChange={(event) => setUser(event.target.value)} />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {message ? <strong className="form-message error">{message}</strong> : null}
        <button type="submit" disabled={loading}>
          <LockKeyhole size={18} />
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
