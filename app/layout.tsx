import type { Metadata, Viewport } from 'next';
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
        url: '/logo-contrx-light.png',
        width: 2250,
        height: 880,
        alt: 'Contrx',
      },
    ],
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-visual',
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=null;for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&(k==='contrx_theme_settings'||k.indexOf(':contrx_theme_settings')!==-1)){var v=localStorage.getItem(k);if(v){try{var p=JSON.parse(v);if(p&&(p.mode||p.accent)){t=p;break;}}catch(e){}}}}if(!t){var m=document.cookie.match(/(?:^|; )contrx_theme=([^;]*)/);if(m){try{t=JSON.parse(decodeURIComponent(m[1]));}catch(e){}}}if(t){var mode=t.mode||'light';if(mode==='grafite')mode='graphite';if(mode==='dark')mode='black';var acc=t.accent||'orange';if(acc==='amber')acc='gray';var isDark=mode!=='light';if(isDark){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}document.documentElement.dataset.contrxTheme=mode;document.documentElement.dataset.contrxAccent=acc;}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}
