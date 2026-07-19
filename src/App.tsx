import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";


const App = () => {
  // Request persistent storage agar IndexedDB tidak mudah dihapus browser
  // saat storage device hampir penuh (terutama penting untuk Android PWA).
  useEffect(() => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      navigator.storage.persist().then((granted) => {
        if (!granted) {
          console.warn(
            '[Storage] Persistent storage tidak diberikan — data mungkin dihapus browser saat storage penuh'
          );
        }
      }).catch(() => {});
    }
  }, []);


  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <PWAInstallPrompt />
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;

