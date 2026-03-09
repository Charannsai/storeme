"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Hero Section */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--accent-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            📦
          </div>
          <span
            style={{
              fontSize: "22px",
              fontWeight: 800,
              background: "var(--accent-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            StoreMe
          </span>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <a href="/login" className="btn-secondary">
            Log In
          </a>
          <a href="/login?mode=signup" className="btn-primary">
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero Content */}
      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "80px 24px 60px",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
        className={mounted ? "animate-slide-up" : ""}
      >
        <div
          className="badge badge-success"
          style={{ margin: "0 auto 24px", width: "fit-content" }}
        >
          <span style={{ fontSize: "8px" }}>●</span> Privacy First
        </div>
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: "24px",
            letterSpacing: "-0.02em",
          }}
        >
          Your photos.{" "}
          <span
            style={{
              background: "var(--accent-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Your cloud.
          </span>
          <br />
          Zero middlemen.
        </h1>
        <p
          style={{
            fontSize: "18px",
            color: "var(--text-secondary)",
            maxWidth: "560px",
            margin: "0 auto 40px",
            lineHeight: 1.7,
          }}
        >
          StoreMe backs up your photos and videos to your own private GitHub
          repository. No third-party servers. No data mining. Just your files in
          your repo.
        </p>
        <div
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a href="/login?mode=signup" className="btn-primary" style={{ padding: "16px 32px", fontSize: "16px" }}>
            Start Storing Free
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="https://github.com"
            target="_blank"
            className="btn-secondary"
            style={{ padding: "16px 32px", fontSize: "16px" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View on GitHub
          </a>
        </div>
      </main>

      {/* Feature Cards */}
      <section
        style={{
          maxWidth: "1000px",
          margin: "40px auto",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {[
          {
            icon: "🔒",
            title: "True Privacy",
            desc: "Files go directly to your GitHub repo. We never see, store, or process your media.",
          },
          {
            icon: "⚡",
            title: "Smart Sync",
            desc: "Background upload queue with compression. Batch processing respects GitHub rate limits.",
          },
          {
            icon: "📱",
            title: "Mobile + Web",
            desc: "Access your gallery from your phone or any browser. Cached locally for speed.",
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="glass-card"
            style={{
              padding: "32px",
              opacity: mounted ? 1 : 0,
              animation: mounted
                ? `slideUp 0.5s ease ${0.2 + i * 0.1}s forwards`
                : "none",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                marginBottom: "16px",
              }}
            >
              {feature.icon}
            </div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              {feature.title}
            </h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: "14px" }}>
              {feature.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Architecture Section */}
      <section
        style={{
          maxWidth: "700px",
          margin: "80px auto",
          padding: "0 24px",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>
          How it works
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "40px",
            fontSize: "15px",
          }}
        >
          A simple, transparent flow — no black boxes.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            alignItems: "center",
          }}
        >
          {[
            { step: "1", label: "Sign up & connect GitHub", icon: "🔑" },
            { step: "2", label: "We create your private repo", icon: "📁" },
            { step: "3", label: "Pick photos from your gallery", icon: "🖼️" },
            { step: "4", label: "Files sync to your GitHub", icon: "☁️" },
            { step: "5", label: "View anywhere, delete anytime", icon: "👁️" },
          ].map((s, i) => (
            <div
              key={i}
              className="glass-card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px 24px",
                width: "100%",
                maxWidth: "400px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "var(--accent-gradient)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "18px",
                }}
              >
                {s.icon}
              </div>
              <div style={{ textAlign: "left" }}>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--accent-primary)",
                    fontWeight: 600,
                  }}
                >
                  STEP {s.step}
                </span>
                <p style={{ fontSize: "14px", fontWeight: 500 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section
        style={{
          textAlign: "center",
          padding: "60px 24px 80px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>
          Ready to own your cloud?
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "32px",
            fontSize: "15px",
          }}
        >
          Set up in under 2 minutes. Completely free.
        </p>
        <a href="/login?mode=signup" className="btn-primary" style={{ padding: "16px 40px", fontSize: "16px" }}>
          Create Your Vault
        </a>
        <p
          style={{
            color: "var(--text-muted)",
            marginTop: "16px",
            fontSize: "13px",
          }}
        >
          No credit card. Free forever. Your data stays yours.
        </p>
      </section>
    </div>
  );
}
