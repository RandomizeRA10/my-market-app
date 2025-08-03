// src/components/GoogleSignInButton.jsx
import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Google sign-in error:", e);
      alert("Google 認証に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={loading}
      style={{
        background: "#4285F4",
        color: "#fff",
        padding: "8px 16px",
        borderRadius: 4,
        border: "none",
        cursor: "pointer"
      }}
    >
      {loading ? "認証中…" : "Google でログイン"}
    </button>
  );
}
