import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="grid-bg min-h-screen">
      <Sidebar />
      <Navbar />
      <div
        className="min-h-screen"
        style={{ paddingLeft: '208px', paddingTop: '72px' }}
      >
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
