import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { TRPCProvider } from "@/providers/trpc-provider";

export const metadata: Metadata = {
  title: "DapDip - Social Network",
  description: "A modern social network platform with AI integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* ფონტები */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-dark-bg text-text-primary">
        <AuthProvider>
          <TRPCProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <script dangerouslySetInnerHTML={{
                __html: `
                  // Force dark mode
                  document.documentElement.classList.add('dark');
                `
              }} />
              {children}
            </ThemeProvider>
          </TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  );
}