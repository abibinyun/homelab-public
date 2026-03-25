import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { Button } from './ui/button';

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = window.location.pathname;

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    localStorage.clear();
    navigate('/login');
  };

  const NavContent = () => (
    <>
      <div className="p-5 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">🚀 Deployer</h1>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">{localStorage.getItem('username')}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <Button
          variant={currentPath === '/' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => { navigate('/'); setMobileOpen(false); }}
        >
          <LayoutDashboard className="h-5 w-5 mr-3" />
          Projects
        </Button>
      </nav>
      <div className="p-3 border-t border-border">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col flex-shrink-0">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col z-50">
            <NavContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-bold text-foreground">🚀 Deployer</span>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
