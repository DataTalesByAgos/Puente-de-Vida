import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { TopBar } from '@/components/TopBar';

export const metadata: Metadata = {
  title: 'Puente de Vida — Coordinación de Emergencias',
  description:
    'Plataforma offline-first para reportar y coordinar emergencias. Ningún reporte debería perderse porque se cayó Internet.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/brand/v-mark.svg' },
  applicationName: 'Puente de Vida',
};

export const viewport: Viewport = {
  themeColor: '#ef3b56',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <AppProvider>
          <TopBar />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 pb-8 pt-2 text-center text-xs text-muted">
            Puente de Vida · Coordinación de emergencias offline-first · Hecho para Build4Venezuela
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
