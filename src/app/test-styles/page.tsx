"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FixStyles } from "../fix-styles";

export default function TestStyles() {
  const [mounted, setMounted] = useState(false);

  // Client-side only code
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: 'hsl(var(--background))'
    }}>
      <FixStyles />
      <div style={{
        maxWidth: '28rem',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 'bold',
            color: 'hsl(var(--foreground))'
          }}>
            სტილების ტესტი
          </h1>
          <p style={{
            marginTop: '0.5rem',
            color: 'hsl(var(--muted-foreground))'
          }}>
            ეს გვერდი განკუთვნილია TailwindCSS სტილების ტესტირებისთვის
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            padding: '1rem',
            borderRadius: '0.5rem'
          }}>
            პირველადი ფერი (Primary Color)
          </div>

          <div style={{
            backgroundColor: 'hsl(var(--secondary))',
            color: 'hsl(var(--secondary-foreground))',
            padding: '1rem',
            borderRadius: '0.5rem'
          }}>
            მეორეული ფერი (Secondary Color)
          </div>

          <div style={{
            backgroundColor: 'hsl(var(--accent))',
            color: 'hsl(var(--accent-foreground))',
            padding: '1rem',
            borderRadius: '0.5rem'
          }}>
            აქცენტის ფერი (Accent Color)
          </div>

          <div style={{
            backgroundColor: 'hsl(var(--muted))',
            color: 'hsl(var(--muted-foreground))',
            padding: '1rem',
            borderRadius: '0.5rem'
          }}>
            მიჩქმალული ფერი (Muted Color)
          </div>

          <div style={{
            backgroundColor: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            padding: '1rem',
            borderRadius: '0.5rem',
            borderWidth: '1px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            ბარათის ფერი (Card Color)
          </div>

          <div style={{
            backgroundColor: 'hsl(var(--destructive))',
            color: 'hsl(var(--destructive-foreground))',
            padding: '1rem',
            borderRadius: '0.5rem'
          }}>
            დესტრუქციული ფერი (Destructive Color)
          </div>

          <div style={{
            marginTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <button style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              borderRadius: '0.375rem',
              transition: 'background-color 0.2s ease'
            }}>
              ღილაკი
            </button>

            <Link
              href="/"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'hsl(var(--secondary))',
                color: 'hsl(var(--secondary-foreground))',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                transition: 'background-color 0.2s ease'
              }}
            >
              მთავარ გვერდზე დაბრუნება
            </Link>
          </div>
        </div>
        
        <div style={{
          paddingTop: '2rem',
          marginTop: '2rem',
          borderTopWidth: '1px',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'hsl(var(--muted-foreground))'
        }}>
          <p>თუ ხედავთ სხვადასხვა ფერად ბლოკებს, ეს ნიშნავს რომ სტილები სწორად მუშაობს</p>
          <p style={{ marginTop: '0.5rem' }}>კომპონენტი: {mounted ? "დამონტაჟებულია" : "მონტაჟდება..."}</p>
        </div>
      </div>
    </div>
  );
}