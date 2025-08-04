import React, { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function AuthButton({ user }) {
  const [authenticating, setAuthenticating] = useState(false);

  const handleLogin = async () => {
    if (authenticating) return;
    setAuthenticating(true);
    try {
      googleProvider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (e.code !== "auth/cancelled-popup-request") {
        console.error("認証エラー:", e);
        alert("認証に失敗しました");
      }
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("サインアウトエラー:", e);
      alert("サインアウトに失敗しました");
    }
  };

  if (user) {
    return (
      <div style={{ marginBottom: 16 }}>
        <span>こんにちは、{user.displayName} さん</span>
        <button onClick={handleLogout} style={{ marginLeft: 8 }}>
          サインアウト
        </button>
      </div>
    );
  }

  return (
    <button onClick={handleLogin} disabled={authenticating}>
      {authenticating ? "認証中..." : "Google でサインイン"}
    </button>
  );
}
