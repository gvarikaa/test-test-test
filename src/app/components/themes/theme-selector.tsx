"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { api } from "@/lib/trpc/api";
import { useSession } from "next-auth/react";
import { MoonIcon, SunIcon, MonitorIcon } from "lucide-react";

type Theme = "light" | "dark" | "system" | "daisy";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: session } = useSession();
  const { mutate: updateProfile } = api.user.updateProfile.useMutation();

  // Save theme preference to user profile when logged in
  useEffect(() => {
    if (session?.user && theme && theme !== "system") {
      updateProfile({
        theme,
      });
    }
  }, [theme, session?.user, updateProfile]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = theme || "system";
  
  const themes: { value: Theme; label: string; icon: JSX.Element }[] = [
    {
      value: "light",
      label: "Light",
      icon: <SunIcon className="h-4 w-4" />,
    },
    {
      value: "dark",
      label: "Dark",
      icon: <MoonIcon className="h-4 w-4" />,
    },
    {
      value: "system",
      label: "System",
      icon: <MonitorIcon className="h-4 w-4" />,
    },
    {
      value: "daisy",
      label: "Daisy",
      icon: <span className="text-yellow-400">⚘</span>,
    },
  ];

  // Find the current theme object
  const activeTheme = themes.find((t) => {
    if (t.value === "daisy") {
      return document.documentElement.classList.contains("daisy-theme");
    }
    return t.value === currentTheme;
  });

  const setThemeAndClass = (newTheme: Theme) => {
    if (newTheme === "daisy") {
      document.documentElement.classList.add("daisy-theme");
      // Determine if we should use dark or light daisy theme
      if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    } else {
      document.documentElement.classList.remove("daisy-theme");
      setTheme(newTheme);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        className="flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
        aria-label="Select theme"
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeTheme?.icon}
        <span className="ml-2 text-sm">{activeTheme?.label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 rounded-md bg-popover shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {themes.map((item) => (
              <button
                key={item.value}
                className={`${
                  currentTheme === item.value ? "bg-muted" : ""
                } flex items-center w-full px-4 py-2 text-sm text-left hover:bg-muted`}
                role="menuitem"
                onClick={() => setThemeAndClass(item.value)}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}