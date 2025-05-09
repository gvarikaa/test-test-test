"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { useSession } from "next-auth/react";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { data: session } = useSession();
  const [mounted, setMounted] = React.useState(false);

  // Get user's theme preference from their profile
  const userTheme = session?.user && 'theme' in session.user ?
    (session.user as { theme?: string }).theme :
    undefined;

  React.useEffect(() => {
    // Apply the daisy theme class if the user has chosen it
    if (mounted && userTheme === "daisy") {
      document.documentElement.classList.add("daisy-theme");
    }
  }, [userTheme, mounted]);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <NextThemesProvider
      {...props}
      forcedTheme={!mounted ? undefined : props.forcedTheme}
      defaultTheme={userTheme || props.defaultTheme}
    >
      {children}
    </NextThemesProvider>
  );
}