import { Router, Route, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { ThemeProvider } from '@/lib/theme';
import { StoreProvider } from '@/lib/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/home';
import ChatPage from '@/pages/chat';

export default function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <TooltipProvider>
          <div className="h-screen bg-background text-foreground overflow-hidden">
            <Router hook={useHashLocation}>
              <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/chat/:id" component={ChatPage} />
                <Route>
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Страница не найдена
                  </div>
                </Route>
              </Switch>
            </Router>
          </div>
          <Toaster />
        </TooltipProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
