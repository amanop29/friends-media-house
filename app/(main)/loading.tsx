import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-white dark:from-black dark:via-gray-900 dark:to-black">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#C5A572] mx-auto mb-4" />
        <p className="text-[#2B2B2B] dark:text-white text-lg">Loading...</p>
      </div>
    </div>
  );
}
