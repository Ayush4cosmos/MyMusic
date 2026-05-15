module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui"],
        body: ["Manrope", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glass: "0 18px 40px rgba(15, 23, 42, 0.15)",
        soft: "0 8px 24px rgba(15, 23, 42, 0.12)"
      },
      colors: {
        ink: "#0f172a",
        mist: "#f8fafc"
      }
    }
  },
  plugins: []
};
