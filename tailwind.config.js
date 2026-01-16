/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3C3C4E', // Exact Navy/Charcoal from site analysis
          light: '#4d4d62',
          dark: '#1B1B1E',
        },
        accent: {
          teal: '#40B1B6', // Exact Teal from site analysis
          lime: '#E8E857', // Exact Lime from site analysis
        },
        background: {
          DEFAULT: '#F9FAFB', // Light clean background
          paper: '#FFFFFF',
          dark: '#3C3C4E',
        },
        text: {
          primary: '#1B1B1E', // Dark Gray text
          secondary: '#666666',
          light: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Raleway', 'sans-serif'], // Changed from Inter to Raleway
      },
      borderRadius: { // Overriding defaults to reinforce the "square" look
        'none': '0',
        'sm': '0', // Force small radius to 0
        'DEFAULT': '0', // Force default to 0
        'md': '0',
        'lg': '0',
        'xl': '0',
        '2xl': '0',
      }
    },
  },
  plugins: [],
}
