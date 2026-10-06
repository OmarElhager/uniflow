import "./globals.css";
import CommandSearch from "./components/CommandSearch";
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <CommandSearch />
        <Analytics />
      </body>
    </html>
  );
}