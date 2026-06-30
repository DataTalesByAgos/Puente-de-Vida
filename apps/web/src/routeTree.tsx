import { createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { AppProvider } from '@/components/AppProvider';
import { TopBar } from '@/components/TopBar';
import { PrivacyFooter } from '@/components/PrivacyFooter';
import DashboardPage from '@/pages/Dashboard';
import AdminPage from '@/pages/Admin';
import MapaPage from '@/pages/Mapa';
import ReportarPage from '@/pages/Reportar';
import ReportesPage from '@/pages/Reportes';
import WhatsappPage from '@/pages/Whatsapp';

const rootRoute = createRootRoute({
  component: () => (
    <AppProvider>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
      <PrivacyFooter />
    </AppProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminPage,
});

const mapaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mapa',
  component: MapaPage,
});

const reportarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reportar',
  component: ReportarPage,
});

const reportesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reportes',
  component: ReportesPage,
});

const whatsappRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/whatsapp',
  component: WhatsappPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  adminRoute,
  mapaRoute,
  reportarRoute,
  reportesRoute,
  whatsappRoute,
]);

export const router = createRouter({ routeTree });
