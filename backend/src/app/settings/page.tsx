"use client";

import { useEffect, useState, useCallback } from "react";

interface StorageInfo {
    repo_size_mb: number;
    repo_size_display: string;
    file_count: number;
    image_count: number;
    video_count: number;
}

export default function SettingsPage() {
    const [storage, setStorage] = useState<StorageInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [creatingRepo, setCreatingRepo] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const user =
        typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("user") || "{}")
            : {};

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchStorage = useCallback(async () => {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        try {
            const res = await fetch("/api/storage", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.success) {
                setStorage(data.data);
            }
        } catch {
            // Ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchStorage();
    }, [fetchStorage]);

    const connectGitHub = () => {
        const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "";
        const redirectUri = encodeURIComponent(
            `${window.location.origin}/api/github/callback`
        );
        const scope = encodeURIComponent("repo");
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    };

    const createRepo = async () => {
        setCreatingRepo(true);
        const token = localStorage.getItem("access_token");

        try {
            const res = await fetch("/api/github/create-repo", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.success) {
                showToast("success", "Repository created successfully!");
                fetchStorage();
            } else {
                showToast(
                    data.error?.includes("already exists") ? "success" : "error",
                    data.error || "Failed to create repo"
                );
            }
        } catch {
            showToast("error", "Failed to create repository");
        } finally {
            setCreatingRepo(false);
        }
    };

    const handleLogout = async () => {
        const token = localStorage.getItem("access_token");
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch {
            // Still logout locally
        }
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
    };

    // Calculate storage percentage (GitHub soft limit ~1GB per repo)
    const storagePercent = storage
        ? Math.min((storage.repo_size_mb / 1024) * 100, 100)
        : 0;

    return (
        <div className={mounted ? "animate-fade-in" : ""}>
            {/* Toast */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}

            <h1
                style={{ fontSize: "28px", fontWeight: 800, marginBottom: "32px" }}
            >
                Settings
            </h1>

            {/* Account Info */}
            <div
                className="glass-card"
                style={{ padding: "24px", marginBottom: "20px" }}
            >
                <h2
                    style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        marginBottom: "16px",
                        color: "var(--text-secondary)",
                    }}
                >
                    Account
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "12px",
                            background: "var(--accent-gradient)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                            fontWeight: 700,
                            color: "white",
                        }}
                    >
                        {(user.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                        <p style={{ fontWeight: 600 }}>{user.email || "—"}</p>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            ID: {user.id ? `${user.id.substring(0, 8)}...` : "—"}
                        </p>
                    </div>
                </div>
            </div>

            {/* GitHub Connection */}
            <div
                className="glass-card"
                style={{ padding: "24px", marginBottom: "20px" }}
            >
                <h2
                    style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        marginBottom: "16px",
                        color: "var(--text-secondary)",
                    }}
                >
                    GitHub Connection
                </h2>
                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        flexWrap: "wrap",
                    }}
                >
                    <button
                        id="settings-connect-github"
                        onClick={connectGitHub}
                        className="btn-secondary"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        {storage ? "Reconnect GitHub" : "Connect GitHub"}
                    </button>
                    <button
                        id="create-repo-btn"
                        onClick={createRepo}
                        className="btn-primary"
                        disabled={creatingRepo}
                        style={{ opacity: creatingRepo ? 0.7 : 1 }}
                    >
                        {creatingRepo ? "Creating..." : "Create Storage Repo"}
                    </button>
                </div>
            </div>

            {/* Storage Usage */}
            <div
                className="glass-card"
                style={{ padding: "24px", marginBottom: "20px" }}
            >
                <h2
                    style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        marginBottom: "16px",
                        color: "var(--text-secondary)",
                    }}
                >
                    Storage Usage
                </h2>
                {loading ? (
                    <div>
                        <div
                            className="skeleton"
                            style={{ height: "20px", width: "200px", marginBottom: "12px" }}
                        />
                        <div
                            className="skeleton"
                            style={{ height: "6px", width: "100%" }}
                        />
                    </div>
                ) : storage ? (
                    <div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "12px",
                            }}
                        >
                            <span style={{ fontSize: "14px", fontWeight: 500 }}>
                                {storage.repo_size_display}
                            </span>
                            <span
                                style={{ fontSize: "13px", color: "var(--text-muted)" }}
                            >
                                of ~1 GB recommended
                            </span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${storagePercent}%` }}
                            />
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: "16px",
                                marginTop: "16px",
                            }}
                        >
                            <div>
                                <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-primary)" }}>
                                    {storage.file_count}
                                </p>
                                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                    Total Files
                                </p>
                            </div>
                            <div>
                                <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--success)" }}>
                                    {storage.image_count}
                                </p>
                                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                    Photos
                                </p>
                            </div>
                            <div>
                                <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--warning)" }}>
                                    {storage.video_count}
                                </p>
                                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                    Videos
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                        Connect GitHub to view storage usage.
                    </p>
                )}
            </div>

            {/* Danger Zone */}
            <div
                className="glass-card"
                style={{
                    padding: "24px",
                    borderColor: "rgba(239, 68, 68, 0.15)",
                }}
            >
                <h2
                    style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        marginBottom: "16px",
                        color: "var(--error)",
                    }}
                >
                    Danger Zone
                </h2>
                <p
                    style={{
                        color: "var(--text-secondary)",
                        fontSize: "13px",
                        marginBottom: "16px",
                    }}
                >
                    Logging out will remove your session tokens. Your files remain safe
                    in your GitHub repository.
                </p>
                <button
                    id="settings-logout-btn"
                    onClick={handleLogout}
                    className="btn-danger"
                >
                    Log Out
                </button>
            </div>
        </div>
    );
}
