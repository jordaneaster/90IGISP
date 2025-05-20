import { Inter, Roboto_Mono } from 'next/font/google';
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header";
import "./globals.css";

// Initialize the fonts
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata = {
  title: "My Service",
  description: "Frontend for my microservice",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased">
        <AuthProvider>
          <Header />
          <main className={`container mx-auto p-4 ${robotoMono.className}`}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
