import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import AppFrame from '@/components/layout/app-frame';

const siteUrl = 'https://www.contrx.com.br';
const siteDescription = 'Contrx Gestão de Contratos SaaS';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Contrx',
    template: '%s | Contrx',
  },
  description: siteDescription,
  applicationName: 'Contrx',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Contrx',
    description: siteDescription,
    url: siteUrl,
    siteName: 'Contrx',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/logo-contrx.png',
        width: 1536,
        height: 1024,
        alt: 'Contrx',
      },
    ],
  },
  icons: {
    icon: '/logo-contrx.svg',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}
