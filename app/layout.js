import "./globals.css";

export const metadata = {
  title: "ZIP Merger",
  description: "Merge multiple ZIP files client-side and download a combined ZIP."
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
            <a href="/" className="button secondary" style={{ textDecoration: "none" }}>Tools</a>
            <a href="/auth" className="button secondary" style={{ textDecoration: "none" }}>Login / Signup</a>
            <a href="/admin" className="button secondary" style={{ textDecoration: "none" }}>Admin</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}