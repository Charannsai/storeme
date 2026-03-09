"use client";

import { useEffect, useState, useCallback } from "react";

interface StorageInfo {
    repo_size_mb: number;
    repo_size_display: string;
    file_count: number;
    image_count: number;
    video_count: number;
}

export default function DashboardPage() {
    const [storage, setStorage] = useState<StorageInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [githubConnected, setGithubConnected] = useState(false);
    const [mounted, setMounted] = useState(false);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        try {
            const res = await fetch("/api/storage", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.success) {
                setStorage(data.data);
                setGithubConnected(true);
            }
        } catch {
            // GitHub not connected yet
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, [fetchData]);

    const user = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("user") || "{}")
        : {};

    const connectGitHub = () => {
        const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "";
        const redirectUri = encodeURIComponent(
            `${window.location.origin}/api/github/callback`
        );
        const scope = encodeURIComponent("repo");
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    };

    return (
        <div className={mounted ? "animate-fade-in" : ""}>
            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>
                    Dashboard
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                    Welcome back, <span style={{ color: "var(--accent-primary)" }}>{user.email || "user"}</span>
                </p>
            </div>

            {/* Stats Grid */}
            {loading ? (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "16px",
                        marginBottom: "32px",
                    }}
                >
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton" style={{ height: "120px" }} />
                    ))}
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "16px",
                        marginBottom: "32px",
                    }}
                >
                    <div className="stat-card">
                        <div className="stat-value">
                            {storage?.repo_size_display || "0 B"}
                        </div>
                        <div className="stat-label">Storage Used</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{storage?.file_count || 0}</div>
                        <div className="stat-label">Total Files</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{storage?.image_count || 0}</div>
                        <div className="stat-label">Photos</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{storage?.video_count || 0}</div>
                        <div className="stat-label">Videos</div>
                    </div>
                </div>
            )}

            {/* GitHub Connection */}
            {!githubConnected && !loading && (
                <div
                    className="glass-card"
                    style={{
                        padding: "32px",
                        textAlign: "center",
                        marginBottom: "32px",
                    }}
                >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔗</div>
                    <h2
                        style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}
                    >
                        Connect Your GitHub
                    </h2>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            fontSize: "14px",
                            marginBottom: "24px",
                            maxWidth: "400px",
                            margin: "0 auto 24px",
                        }}
                    >
                        Link your GitHub account to create a private repository for your
                        media storage.
                    </p>
                    <button
                        id="connect-github-btn"
                        onClick={connectGitHub}
                        className="btn-primary"
                        style={{ padding: "14px 28px" }}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        Connect GitHub
                    </button>
                </div>
            )}

            {/* Quick actions */}
            <div style={{ marginBottom: "32px" }}>
                <h2
                    style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}
                >
                    Quick Actions
                </h2>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "12px",
                    }}
                >
                    <a
                        href="/gallery"
                        className="glass-card"
                        style={{
                            padding: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            textDecoration: "none",
                            color: "var(--text-primary)",
                        }}
                    >
                        <span style={{ fontSize: "24px" }}>🖼️</span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: "14px" }}>
                                View Gallery
                            </div>
                            <div
                                style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                            >
                                Browse your media
                            </div>
                        </div>
                    </a>
                    <a
                        href="/settings"
                        className="glass-card"
                        style={{
                            padding: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            textDecoration: "none",
                            color: "var(--text-primary)",
                        }}
                    >
                        <span style={{ fontSize: "24px" }}>⚙️</span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: "14px" }}>Settings</div>
                            <div
                                style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                            >
                                Manage your account
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
