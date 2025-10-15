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
      <body>{children}</body>
    </html>
  );
}