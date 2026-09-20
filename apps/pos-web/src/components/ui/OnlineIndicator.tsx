import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export default function OnlineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null; // don't show when online

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-medium animate-pulse-fast backdrop-blur-sm">
      <WifiOff size={12} />
      <span>Offline · Orders queued</span>
    </div>
  );
}
