import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Class Timetable Notifier | Real-time Lecture Alerts",
  description: "View classroom schedules and subscribe to receive real-time push notifications on your browser before your classes start.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0d1117" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Timetable Notifier" />
      </head>
      <body>
        <Navbar />
        <main className="slide-up" style={{ padding: "40px 0" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
