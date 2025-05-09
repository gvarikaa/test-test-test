/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  // Enhanced content patterns for Tailwind v4 to ensure all components get processed
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
    "./src/providers/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom colors for dark theme
      colors: {
        "dark-bg": "#1a1a1b",
        "darker-bg": "#121213",
        "card-bg": "#272729",
        "hover-bg": "#2d2d30",
        "border-color": "#343536",
        "text-primary": "#d7dadc",
        "text-secondary": "#818384",
        "text-tertiary": "#6e7578",
        "accent-blue": "#0079d3",
        "accent-blue-hover": "#1484d7",
        "accent-green": "#46d160",
        "accent-red": "#ff585b",
        "accent-orange": "#ff4500",
        "header-bg": "#1a1a1b",
        "input-bg": "#272729",
        "sidebar-bg": "#1a1a1b",
        "card-secondary-bg": "#1e1e20",
        "button-disabled-bg": "#343536",
        "divider-color": "#343536",
      },
      spacing: {
        'header-height': '56px',
        'sidebar-width': '280px',
        'rightbar-width': '320px',
      },
      borderRadius: {
        'card': '8px',
        'btn': '6px',
      },
      boxShadow: {
        'sm-custom': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'md-custom': '0 4px 6px rgba(0, 0, 0, 0.3)',
        'lg-custom': '0 10px 15px rgba(0, 0, 0, 0.3)',
        'inner-custom': 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulse: {
          '0%': { opacity: '0.6' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.6' },
        },
        skeletonLoading: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-in-out',
        'pulse': 'pulse 1.5s infinite',
        'skeleton-loading': 'skeletonLoading 1.5s infinite linear',
      },
    },
  },
  plugins: [
    // Add any Tailwind plugins you need here
  ],
};