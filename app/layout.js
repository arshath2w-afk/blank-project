import "./globals.css";

export const metadata = {
  title: "JDK Geneste",
  description: "JDK Geneste — modern client-side utilities for archives, images, and PDFs. Fast, private, and pro-ready."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="https://fav.farm/zip" />
      </head>
      <body>
        <header style={{ background: "#0b1220", borderBottom: "1px solid #1f2937" }}>
          <nav className="container" style={{ display: "flex", gap: "1rem", alignItems: "center", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
            <span style={{ fontWeight: 600, letterSpacing: 0.5 }}>JDK Geneste</span>
            <a href="/" className="button secondary" style={{ textDecoration: "none" }}>Tools</a>
            <a href="/auth" className="button secondary" style={{ textDecoration: "none" }}>Login / Signup</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}