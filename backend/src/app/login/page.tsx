"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [mode, setMode] = useState<"login" | "signup">(
        searchParams.get("mode") === "signup" ? "signup" : "login"
    );
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!data.success) {
                setError(data.error || "Something went wrong");
                return;
            }

            // Store tokens
            localStorage.setItem("access_token", data.data.session.access_token);
            localStorage.setItem("refresh_token", data.data.session.refresh_token);
            localStorage.setItem("user", JSON.stringify(data.data.user));

            // Redirect to dashboard
            router.push("/dashboard");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                position: "relative",
                zIndex: 10,
            }}
        >
            <div
                className={`glass-card ${mounted ? "animate-slide-up" : ""}`}
                style={{
                    padding: "40px",
                    width: "100%",
                    maxWidth: "420px",
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        textAlign: "center",
                        marginBottom: "32px",
                    }}
                >
                    <div
                        style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "16px",
                            background: "var(--accent-gradient)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "28px",
                            margin: "0 auto 16px",
                        }}
                    >
                        📦
                    </div>
                    <h1
                        style={{
                            fontSize: "24px",
                            fontWeight: 800,
                            marginBottom: "8px",
                        }}
                    >
                        {mode === "signup" ? "Create your vault" : "Welcome back"}
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                        {mode === "signup"
                            ? "Start storing your media privately"
                            : "Sign in to access your gallery"}
                    </p>
                </div>

                {/* Error message */}
                {error && (
                    <div
                        style={{
                            padding: "12px 16px",
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            borderRadius: "10px",
                            color: "var(--error)",
                            fontSize: "13px",
                            marginBottom: "20px",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "16px" }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "var(--text-secondary)",
                                marginBottom: "6px",
                            }}
                        >
                            Email
                        </label>
                        <input
                            id="email-input"
                            type="email"
                            className="input-field"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: "24px" }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "var(--text-secondary)",
                                marginBottom: "6px",
                            }}
                        >
                            Password
                        </label>
                        <input
                            id="password-input"
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <button
                        id="submit-btn"
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "14px",
                            fontSize: "15px",
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading
                            ? "Please wait..."
                            : mode === "signup"
                                ? "Create Account"
                                : "Sign In"}
                    </button>
                </form>

                {/* Toggle */}
                <p
                    style={{
                        textAlign: "center",
                        marginTop: "24px",
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                    }}
                >
                    {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        id="toggle-mode-btn"
                        onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent-primary)",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "13px",
                        }}
                    >
                        {mode === "signup" ? "Sign in" : "Sign up"}
                    </button>
                </p>

                {/* Back to home */}
                <div style={{ textAlign: "center", marginTop: "16px" }}>
                    <a
                        href="/"
                        style={{
                            color: "var(--text-muted)",
                            fontSize: "12px",
                            textDecoration: "none",
                        }}
                    >
                        ← Back to home
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="skeleton" style={{ width: 420, height: 500 }} />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
