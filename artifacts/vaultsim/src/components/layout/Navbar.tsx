import { NavLink, useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  href: string;
  accent?: boolean;
}

const navItems: NavItem[] = [
  { label: 'CASE',         href: '/' },
  { label: 'SANITISATION', href: '/sanitisation' },
  { label: 'TRIAL',        href: '/trial' },
  { label: 'VAULT',        href: '/vault' },
  { label: 'AGENT',        href: '/agent', accent: true },
];

export function Navbar() {
  const navigate = useNavigate();

  return (
    <div className="fixed top-4 left-0 right-0 flex justify-center" style={{ zIndex: 50, paddingLeft: '208px' }}>
      <div
        className="flex items-center gap-1 px-4 py-2.5 rounded-full shadow-md"
        style={{ background: 'rgba(210,205,195,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-1.5 mr-4">
          <span style={{ color: '#888888', fontSize: '14px' }}>✳</span>
          <span className="font-semibold text-sm" style={{ color: '#333333', letterSpacing: '0.03em' }}>VaultSim</span>
        </div>

        <div className="h-4 w-px mx-1" style={{ background: 'rgba(0,0,0,0.15)' }} />

        <div className="flex items-center gap-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.label}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                `px-3 py-1 rounded-full text-xs font-semibold tracking-widest transition-colors ${
                  isActive
                    ? 'bg-white/60 text-gray-800'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
                } ${item.accent ? '!text-amber-600' : ''}`
              }
              style={{ letterSpacing: '0.1em' }}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="h-4 w-px mx-1" style={{ background: 'rgba(0,0,0,0.15)' }} />

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-colors"
          style={{ background: '#111111', color: 'white', letterSpacing: '0.1em' }}
        >
          TRY <span>→</span>
        </button>
      </div>
    </div>
  );
}
