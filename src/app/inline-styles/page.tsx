"use client";

import Link from "next/link";

// ინლაინ სტილები, საჭიროების შემთხვევაში
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    backgroundColor: "#ffffff",
  },
  box: {
    maxWidth: "28rem",
    width: "100%",
  },
  title: {
    fontSize: "2.25rem",
    fontWeight: "bold",
    textAlign: "center" as const,
    marginBottom: "0.5rem",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#6b7280",
    textAlign: "center" as const,
    marginBottom: "2rem",
  },
  card: {
    padding: "1rem",
    borderRadius: "0.5rem",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    marginBottom: "1rem",
  },
  primary: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
  },
  secondary: {
    backgroundColor: "#1f2937",
    color: "#ffffff",
  },
  accent: {
    backgroundColor: "#0ea5e9",
    color: "#ffffff",
  },
  muted: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  destructive: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
  },
  button: {
    padding: "0.5rem 1rem",
    borderRadius: "0.375rem",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    fontWeight: "medium",
    textDecoration: "none",
    display: "inline-block",
  },
  secondaryButton: {
    padding: "0.5rem 1rem",
    borderRadius: "0.375rem",
    backgroundColor: "#1f2937",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    fontWeight: "medium",
    textDecoration: "none",
    display: "inline-block",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "2rem",
  },
  footer: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "2rem",
    marginTop: "2rem",
    textAlign: "center" as const,
    fontSize: "0.875rem",
    color: "#6b7280",
  },
};

export default function InlineStylesPage() {
  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div>
          <h1 style={styles.title}>ინლაინ სტილების ტესტი</h1>
          <p style={styles.subtitle}>
            ეს გვერდი იყენებს ინლაინ სტილებს Tailwind CSS-ის ნაცვლად
          </p>
        </div>

        <div>
          <div style={{...styles.card, ...styles.primary}}>
            პირველადი ფერი (Primary Color)
          </div>
          
          <div style={{...styles.card, ...styles.secondary}}>
            მეორეული ფერი (Secondary Color)
          </div>
          
          <div style={{...styles.card, ...styles.accent}}>
            აქცენტის ფერი (Accent Color)
          </div>
          
          <div style={{...styles.card, ...styles.muted}}>
            მიჩქმალული ფერი (Muted Color)
          </div>
          
          <div style={styles.card}>
            ბარათის ფერი (Card Color)
          </div>
          
          <div style={{...styles.card, ...styles.destructive}}>
            დესტრუქციული ფერი (Destructive Color)
          </div>

          <div style={styles.buttonContainer}>
            <button style={styles.button}>ღილაკი</button>
            
            <Link href="/" style={styles.secondaryButton}>
              მთავარ გვერდზე დაბრუნება
            </Link>
          </div>
        </div>
        
        <div style={styles.footer}>
          <p>ეს გვერდი იყენებს JavaScript ინლაინ სტილებს TailwindCSS-ის ნაცვლად</p>
          <p style={{marginTop: "0.5rem"}}>თუ ეს გვერდი გამოჩნდა სწორად, მაშინ სტილების პრობლემა TailwindCSS-თან არის დაკავშირებული</p>
        </div>
      </div>
    </div>
  );
}