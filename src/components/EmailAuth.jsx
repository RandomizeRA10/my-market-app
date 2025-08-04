import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

export default function AuthForm() {
  const [mode, setMode] = useState("signup"); // "signup" または "login"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const auth = getAuth();

    if (mode === "signup") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccess("新規登録に成功しました！");
      } catch (err) {
        setError("登録エラー: " + err.message);
      }
    } else {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess("ログインに成功しました！");
      } catch (err) {
        setError("ログインエラー: " + err.message);
      }
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
          style={{ fontWeight: mode === "signup" ? "bold" : "normal" }}
        >
          新規登録
        </button>
        <button
          onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
          style={{ fontWeight: mode === "login" ? "bold" : "normal", marginLeft: 8 }}
        >
          ログイン
        </button>
      </div>

      <h2>{mode === "signup" ? "新規登録" : "ログイン"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="submit">{mode === "signup" ? "登録" : "ログイン"}</button>
      </form>

      {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
      {success && <div style={{ color: "green", marginTop: 16 }}>{success}</div>}
    </div>
  );
}
