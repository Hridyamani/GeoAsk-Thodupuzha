import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Map, Layers, HelpCircle, History } from 'lucide-react';

export default function Sidebar() {
  const navs = [
    { name: 'Home', path: '/', icon: <Home size={18} /> },
    { name: 'Geo Query', path: '/query', icon: <Search size={18} /> },
    { name: 'Explore Map', path: '/explore', icon: <Map size={18} /> },
    { name: 'Layer Explorer', path: '/layers', icon: <Layers size={18} /> },
    { name: 'Try Queries', path: '/try', icon: <HelpCircle size={18} /> },
    { name: 'Recent Queries', path: '/history', icon: <History size={18} /> },
  ];

  return (
    <aside className="w-64 bg-[#0f3d2e] text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-green-800">
        <h1 className="text-xl font-bold flex items-center gap-2">🌍 GeoAsk</h1>
        <p className="text-sm text-green-200 mt-1">Thodupuzha</p>
      </div>
      <nav className="flex-1 py-4">
        {navs.map((n) => (
          <NavLink key={n.name} to={n.path} className={({isActive}) => `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${isActive ? 'bg-[#185c46] border-l-4 border-green-400' : 'hover:bg-[#144d3a]'}`}>
            {n.icon} {n.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}