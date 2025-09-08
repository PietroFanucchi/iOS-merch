import { Bell, Search, User, LogOut } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';

export function Header() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const isMobile = useIsMobile();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-3 sm:px-6">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <SidebarTrigger />
        {!isMobile && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cerca store o tavoli..."
              className="pl-10 w-80 input-apple"
            />
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        <ThemeToggle />
        <Button variant="ghost" size="sm" className="btn-ghost min-h-[44px] min-w-[44px]">
          <Bell className="w-4 h-4" />
        </Button>
        {user && (
          <>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <div className="flex flex-col items-end">
                <span className="text-xs sm:text-sm">{user.email}</span>
                {profile && (
                  <span className="text-xs text-primary font-medium">
                    {profile.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="btn-ghost min-h-[44px] min-w-[44px]" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}