import "./globals.css";
import CommandSearch from "./components/CommandSearch";

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
      </body>
    </html>
  );
}