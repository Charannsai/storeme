"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface GalleryItem {
    id: string;
    filename: string;
    file_type: string;
    size: number;
    github_path: string;
    uploaded_at: string;
    raw_url: string;
}

export default function GalleryPage() {
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "image" | "video">("all");
    const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
    const [uploading, setUploading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchGallery = useCallback(async () => {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        try {
            const typeParam = filter !== "all" ? `&type=${filter}` : "";
            const res = await fetch(`/api/gallery?limit=100${typeParam}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.success) {
                setItems(data.data.items);
            }
        } catch {
            console.error("Failed to fetch gallery");
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        setMounted(true);
        fetchGallery();
    }, [fetchGallery]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const token = localStorage.getItem("access_token");

        for (const file of Array.from(files)) {
            try {
                // Read file as base64
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const result = reader.result as string;
                        resolve(result.split(",")[1]); // Remove data:... prefix
                    };
                    reader.readAsDataURL(file);
                });

                // Generate hash-based filename
                const timestamp = Date.now();
                const hash = Math.random().toString(36).substring(2, 8);
                const ext = file.name.split(".").pop();
                const filename = `${timestamp}_${hash}.${ext}`;

                // Determine file type
                const fileType = file.type.startsWith("video/") ? "video" : "image";

                await fetch("/api/files", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        filename,
                        file_type: fileType,
                        size: file.size,
                        content: base64,
                        hash: `${timestamp}_${hash}`,
                    }),
                });
            } catch {
                console.error(`Failed to upload ${file.name}`);
            }
        }

        setUploading(false);
        fetchGallery();
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDelete = async (item: GalleryItem) => {
        if (!confirm(`Delete ${item.filename}?`)) return;

        const token = localStorage.getItem("access_token");
        try {
            await fetch("/api/file", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ file_id: item.id }),
            });
            setSelectedItem(null);
            fetchGallery();
        } catch {
            console.error("Delete failed");
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    return (
        <div className={mounted ? "animate-fade-in" : ""}>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "32px",
                    flexWrap: "wrap",
                    gap: "16px",
                }}
            >
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>
                        Gallery
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                        {items.length} file{items.length !== 1 ? "s" : ""} synced
                    </p>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {/* Filter */}
                    <div style={{ display: "flex", gap: "4px" }}>
                        {(["all", "image", "video"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    border: "1px solid",
                                    borderColor:
                                        filter === f
                                            ? "var(--accent-primary)"
                                            : "var(--border-color)",
                                    background:
                                        filter === f
                                            ? "rgba(139, 92, 246, 0.1)"
                                            : "var(--bg-card)",
                                    color:
                                        filter === f
                                            ? "var(--accent-primary)"
                                            : "var(--text-secondary)",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    fontFamily: "inherit",
                                }}
                            >
                                {f === "all" ? "All" : f === "image" ? "Photos" : "Videos"}
                            </button>
                        ))}
                    </div>
                    {/* Upload */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleUpload}
                        style={{ display: "none" }}
                        id="file-upload"
                    />
                    <button
                        id="upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-primary"
                        disabled={uploading}
                        style={{ opacity: uploading ? 0.7 : 1 }}
                    >
                        {uploading ? (
                            "Uploading..."
                        ) : (
                            <>
                                <svg
                                    width="16"
                                    height="16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                </svg>
                                Upload
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Gallery Grid */}
            {loading ? (
                <div className="gallery-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div
                            key={i}
                            className="skeleton"
                            style={{ aspectRatio: "1", borderRadius: "12px" }}
                        />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div
                    className="glass-card"
                    style={{ padding: "60px 24px", textAlign: "center" }}
                >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>📸</div>
                    <h2
                        style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}
                    >
                        No media yet
                    </h2>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            fontSize: "14px",
                            marginBottom: "24px",
                        }}
                    >
                        Upload your first photo or video to get started.
                    </p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-primary"
                    >
                        Upload Files
                    </button>
                </div>
            ) : (
                <div className="gallery-grid">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="gallery-item"
                            onClick={() => setSelectedItem(item)}
                        >
                            {item.file_type === "video" ? (
                                <video src={item.raw_url} muted />
                            ) : (
                                <img
                                    src={item.raw_url}
                                    alt={item.filename}
                                    loading="lazy"
                                />
                            )}
                            <div className="gallery-item-overlay">
                                <p
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {item.filename}
                                </p>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                    {formatSize(item.size)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedItem && (
                <div
                    className="modal-overlay"
                    onClick={() => setSelectedItem(null)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: "700px", padding: "24px" }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "16px",
                            }}
                        >
                            <h3
                                style={{
                                    fontSize: "16px",
                                    fontWeight: 600,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: "80%",
                                }}
                            >
                                {selectedItem.filename}
                            </h3>
                            <button
                                onClick={() => setSelectedItem(null)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-secondary)",
                                    cursor: "pointer",
                                    fontSize: "20px",
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div
                            style={{
                                borderRadius: "12px",
                                overflow: "hidden",
                                marginBottom: "16px",
                                background: "var(--bg-primary)",
                            }}
                        >
                            {selectedItem.file_type === "video" ? (
                                <video
                                    src={selectedItem.raw_url}
                                    controls
                                    style={{ width: "100%", maxHeight: "400px" }}
                                />
                            ) : (
                                <img
                                    src={selectedItem.raw_url}
                                    alt={selectedItem.filename}
                                    style={{
                                        width: "100%",
                                        maxHeight: "400px",
                                        objectFit: "contain",
                                    }}
                                />
                            )}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <div>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--text-muted)",
                                        marginBottom: "4px",
                                    }}
                                >
                                    {formatSize(selectedItem.size)} •{" "}
                                    {new Date(selectedItem.uploaded_at).toLocaleDateString()}
                                </p>
                                <p
                                    style={{
                                        fontSize: "11px",
                                        color: "var(--text-muted)",
                                        wordBreak: "break-all",
                                    }}
                                >
                                    {selectedItem.github_path}
                                </p>
                            </div>
                            <button
                                id="delete-file-btn"
                                onClick={() => handleDelete(selectedItem)}
                                className="btn-danger"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
