import { clearAuth } from '../lib/auth';

export default function Sidebar({ active, navigate, user, open, onClose }) {
  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navItems = user?.role === 'child'
    ? [{ key: 'courses', label: 'Mina arbetsområden', path: '/child/courses' }]
    : [
        { key: 'courses', label: 'Mina arbetsområden', path: '/parent/courses' },
        { key: 'children', label: 'Barn', path: '/parent/children' },
      ];

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 sm:hidden" onClick={onClose} />}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform sm:relative sm:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Lärmig</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => { navigate(item.path); onClose?.(); }}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active === item.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50"
          >
            Logga ut
          </button>
        </div>
      </div>
    </>
  );
}
