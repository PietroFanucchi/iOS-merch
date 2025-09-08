import { NavLink, useLocation } from 'react-router-dom';
import { Store, Table, BarChart3, Settings, Smartphone, Tag, Calendar, Rocket, Mail, Users, Activity } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfile } from '@/hooks/useProfile';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3, adminOnly: false },
  { name: 'Store', href: '/stores', icon: Store, adminOnly: false },
  { name: 'Lanci', href: '/launches', icon: Rocket, adminOnly: false },
  { name: 'Visite', href: '/visits', icon: Calendar, adminOnly: true },
  { name: 'Attività', href: '/activities', icon: Activity, adminOnly: true },
  { name: 'Template Email', href: '/email-templates', icon: Mail, adminOnly: true },
  { name: 'Tavoli Template', href: '/tables', icon: Table, adminOnly: true },
  { name: 'Dispositivi', href: '/devices', icon: Smartphone, adminOnly: true },
  { name: 'Cartelli Prezzo', href: '/price-tags', icon: Tag, adminOnly: true },
  { name: 'Tattici', href: '/tacticians', icon: Users, adminOnly: true },
  { name: 'Impostazioni', href: '/settings', icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isCollapsed = state === 'collapsed' && !isMobile;
  const { profile } = useProfile();

  const visibleNavigation = navigation.filter(item => 
    !item.adminOnly || profile?.role === 'admin'
  );

  const handleNavClick = () => {
    // Chiudi il sidebar su mobile dopo la navigazione
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className={isCollapsed ? 'w-16' : 'w-64'} collapsible={isMobile ? "offcanvas" : "icon"} variant="sidebar">
      <SidebarContent>
        <div className={`border-b border-border transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-6'}`}>
          <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Table className="w-5 h-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="transition-opacity duration-300">
                <h1 className="text-lg font-semibold text-foreground whitespace-nowrap">Table Manager</h1>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigazione</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        onClick={handleNavClick}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-secondary'
                        }`}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="font-medium">{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}