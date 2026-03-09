"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
    const [message, setMessage] = useState("Connecting your GitHub account...");

    useEffect(() => {
        const accessToken = searchParams.get("access_token");

        if (!accessToken) {
            setStatus("error");
            setMessage("No access token received from GitHub.");
            return;
        }

        const connectGitHub = async () => {
            const token = localStorage.getItem("access_token");

            if (!token) {
                setStatus("error");
                setMessage("You must be logged in to connect GitHub.");
                return;
            }

            try {
                const res = await fetch("/api/github/connect", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        access_token: accessToken,
                    }),
                });

                const data = await res.json();

                if (data.success) {
                    setStatus("success");
                    setMessage("GitHub connected! Creating your storage repo...");

                    // Auto-create repo
                    const repoRes = await fetch("/api/github/create-repo", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    const repoData = await repoRes.json();

                    if (repoData.success) {
                        setMessage("All set! Redirecting to dashboard...");
                    } else if (repoData.error?.includes("already exists")) {
                        setMessage("Repo exists! Redirecting to dashboard...");
                    }

                    setTimeout(() => router.push("/dashboard"), 2000);
                } else {
                    setStatus("error");
                    setMessage(data.error || "Failed to connect GitHub.");
                }
            } catch {
                setStatus("error");
                setMessage("Something went wrong. Please try again.");
            }
        };

        connectGitHub();
    }, [searchParams, router]);

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 10,
            }}
        >
            <div
                className="glass-card animate-slide-up"
                style={{ padding: "48px", textAlign: "center", maxWidth: "420px" }}
            >
                <div style={{ fontSize: "48px", marginBottom: "24px" }}>
                    {status === "processing"
                        ? "⏳"
                        : status === "success"
                            ? "✅"
                            : "❌"}
                </div>
                <h1
                    style={{ fontSize: "22px", fontWeight: 700, marginBottom: "12px" }}
                >
                    {status === "processing"
                        ? "Connecting..."
                        : status === "success"
                            ? "Connected!"
                            : "Connection Failed"}
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                    {message}
                </p>
                {status === "error" && (
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="btn-primary"
                        style={{ marginTop: "24px" }}
                    >
                        Go to Dashboard
                    </button>
                )}
            </div>
        </div>
    );
}

export default function GitHubCallbackPage() {
    return (
        <Suspense
            fallback={
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="skeleton" style={{ width: 420, height: 250 }} />
                </div>
            }
        >
            <CallbackContent />
        </Suspense>
    );
}
