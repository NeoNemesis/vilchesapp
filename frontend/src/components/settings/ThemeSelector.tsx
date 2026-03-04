import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Välj utseende för appen.
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
            theme === 'light'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className={`p-3 rounded-full ${
            theme === 'light' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
          }`}>
            <SunIcon className="h-6 w-6" />
          </div>
          <span className={`text-sm font-medium ${
            theme === 'light' ? 'text-blue-700' : 'text-gray-600'
          }`}>
            Ljust
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
            theme === 'dark'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className={`p-3 rounded-full ${
            theme === 'dark' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'bg-gray-100 text-gray-500'
          }`}>
            <MoonIcon className="h-6 w-6" />
          </div>
          <span className={`text-sm font-medium ${
            theme === 'dark' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600'
          }`}>
            Mörkt
          </span>
        </button>
      </div>
    </div>
  );
};

export default ThemeSelector;
