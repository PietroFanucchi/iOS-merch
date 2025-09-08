import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Stores from "./pages/Stores";
import StoreDetails from "./pages/StoreDetails";
import Tables from "./pages/Tables";
import TableConfiguration from "./pages/TableConfiguration";
import Devices from "./pages/Devices";
import PriceTags from "./pages/PriceTags";
import Tacticians from "./pages/Tacticians";
import Visits from "./pages/Visits";
import Launches from "./pages/Launches";
import LaunchDetails from "./pages/LaunchDetails";
import Activities from "./pages/Activities";
import ActivityDetails from "./pages/ActivityDetails";
import EmailTemplates from "./pages/EmailTemplates";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import CartelliPrezzo from "./pages/CartelliPrezzo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cartelli_prezzo/:launchSlug/:storeSlug" element={<CartelliPrezzo />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="stores" element={<Stores />} />
            <Route path="stores/:storeSlug" element={<StoreDetails />} />
            <Route path="launches" element={<Launches />} />
            <Route path="launches/:launchSlug" element={<LaunchDetails />} />
            
            {/* Admin-only routes */}
            <Route path="visits" element={<AdminRoute><Visits /></AdminRoute>} />
            <Route path="activities" element={<AdminRoute><Activities /></AdminRoute>} />
            <Route path="activities/:activityId" element={<AdminRoute><ActivityDetails /></AdminRoute>} />
            <Route path="email-templates" element={<AdminRoute><EmailTemplates /></AdminRoute>} />
            <Route path="tables" element={<AdminRoute><Tables /></AdminRoute>} />
            <Route path="tables/:tableId/configure" element={<AdminRoute><TableConfiguration /></AdminRoute>} />
            <Route path="devices" element={<AdminRoute><Devices /></AdminRoute>} />
            <Route path="price-tags" element={<AdminRoute><PriceTags /></AdminRoute>} />
            <Route path="tacticians" element={<AdminRoute><Tacticians /></AdminRoute>} />
            <Route path="stores/:storeSlug/tables" element={<AdminRoute><Tables /></AdminRoute>} />
              <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
