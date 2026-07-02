import React from 'react';
import { Sun, Moon, Users, ShieldAlert } from 'lucide-react';

export default function Header({ currentUser, setCurrentUser, darkMode, setDarkMode }) {
  return (
    <header className="glass-panel sticky top-0 z-40 w-full px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-2xl shadow-lg transition-colors duration-300">
      {/* 로고 & 타이틀 */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/20">
          <Users size={24} className="animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            ShareCal
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            실시간 아이디 공유 및 권한 관리 달력
          </p>
        </div>
      </div>

      {/* 접속자 토글 및 테마 토글 */}
      <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
        {/* 사용자 토글 컨트롤 */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-200/55 dark:border-gray-700/50 shadow-inner">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-2 select-none uppercase tracking-wider">
            User:
          </span>
          <button
            onClick={() => setCurrentUser('운형')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              currentUser === '운형'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
            }`}
          >
            운형
          </button>
          <button
            onClick={() => setCurrentUser('정록')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              currentUser === '정록'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
            }`}
          >
            정록
          </button>
        </div>

        {/* 테마 토글 버튼 */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shadow-sm"
          title={darkMode ? '라이트 모드' : '다크 모드'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
