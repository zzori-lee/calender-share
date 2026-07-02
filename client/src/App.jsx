import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Calendar from './components/Calendar';
import DateModal from './components/DateModal';
import { CalendarRange, Activity, RefreshCw } from 'lucide-react';

const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.startsWith('192.168.');

const API_BASE_URL = isLocal 
  ? `http://${window.location.hostname}:3001/api` 
  : `${window.location.protocol}//${window.location.host}/api`;

export default function App() {
  const [currentUser, setCurrentUser] = useState('운형');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'

  // 테마 관리 (다크 모드 기본 적용)
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // 서버로부터 스케줄 데이터 로드
  const fetchSchedules = async (month) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/schedules?month=${month}`);
      if (!response.ok) {
        throw new Error('데이터 로드 실패');
      }
      const data = await response.json();
      setSchedules(data);

      // 만약 모달이 열려 있다면, 변경된 해당 날짜의 최신 스케줄 데이터로 업데이트
      if (selectedSchedule) {
        const updatedSelected = data.find((s) => s.date === selectedSchedule.date);
        if (updatedSelected) {
          setSelectedSchedule(updatedSelected);
        }
      }
    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 월이 변경될 때마다 데이터 패치
  useEffect(() => {
    fetchSchedules(currentMonth);
  }, [currentMonth]);

  // 실시간 동기화 (SSE EventSource) 설정
  useEffect(() => {
    setConnectionStatus('connecting');
    const eventSource = new EventSource(`${API_BASE_URL}/schedules/stream`);

    eventSource.onopen = () => {
      console.log('SSE connection established.');
      setConnectionStatus('connected');
    };

    // 서버에서 업데이트 이벤트가 수신되었을 때
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          console.log('Real-time update received:', data);
          // 현재 활성화된 월의 데이터를 갱신
          fetchSchedules(currentMonth);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setConnectionStatus('disconnected');
      // 브라우저가 자동 재연결을 시도할 것이므로 상태만 표시
    };

    return () => {
      eventSource.close();
      console.log('SSE connection closed.');
    };
  }, [currentMonth, selectedSchedule]); // 모달 동기화를 위해 의존성 주입

  // API 1. 양도하기
  const handleYield = async (date, owner) => {
    const response = await fetch(`${API_BASE_URL}/schedules/yield`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, owner }),
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || '양도 처리 중 에러가 발생했습니다.');
    }
    return await response.json();
  };

  // API 2. 가져오기
  const handleClaim = async (date, claimer) => {
    const response = await fetch(`${API_BASE_URL}/schedules/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, claimer }),
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || '가져오기 처리 중 에러가 발생했습니다.');
    }
    return await response.json();
  };

  // API 3. 초기화
  const handleReset = async (date) => {
    const response = await fetch(`${API_BASE_URL}/schedules/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || '초기화 처리 중 에러가 발생했습니다.');
    }
    return await response.json();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300 relative overflow-hidden pb-12">
      {/* 백그라운드 디자인 그라데이션 장식 */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-blue-500/10 dark:bg-blue-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] aspect-square rounded-full bg-indigo-500/10 dark:bg-indigo-600/5 blur-[120px] pointer-events-none" />

      {/* 헤더 */}
      <Header 
        currentUser={currentUser} 
        setCurrentUser={setCurrentUser} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
      />

      {/* 메인 레이아웃 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-2.5 sm:px-6 py-4 sm:py-8 flex flex-col gap-4 sm:gap-6 z-10">
        
        {/* 설명 및 실시간 상태 지시계 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200/50 dark:border-gray-800/40 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <CalendarRange size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">
                접속자 규칙 가이드
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                홀수 날짜는 <span className="font-bold text-blue-600 dark:text-blue-400">운형</span>, 
                짝수 날짜는 <span className="font-bold text-indigo-600 dark:text-indigo-400">정록</span>의 기본 소유일입니다.
              </p>
            </div>
          </div>

          {/* SSE 실시간 연결 안내 표시 */}
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100/80 dark:bg-gray-800/50 border border-gray-200/40 dark:border-gray-700/40">
            <span className={`w-2 h-2 rounded-full relative flex`}>
              {connectionStatus === 'connected' && (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              )}
              {connectionStatus === 'connecting' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse"></span>
              )}
              {connectionStatus === 'disconnected' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {connectionStatus === 'connected' && '실시간 서버 동기화 활성화'}
              {connectionStatus === 'connecting' && '서버 연결 시도 중...'}
              {connectionStatus === 'disconnected' && '서버 연결 끊김 (자동 재시도)'}
            </span>
          </div>
        </div>

        {/* 로딩 인디케이터 (데이터 동기화 시 상단에 미세하게 작동) */}
        {loading && !selectedSchedule && (
          <div className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <RefreshCw size={14} className="animate-spin" />
            <span>일정을 갱신하고 있습니다...</span>
          </div>
        )}

        {/* 캘린더 그리드 */}
        <Calendar 
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          schedules={schedules}
          currentUser={currentUser}
          onDateClick={(sched) => setSelectedSchedule(sched)}
        />

        {/* 하단 컬러 정보 가이드(범례) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/40 dark:bg-gray-900/30 rounded-xl border border-gray-200/50 dark:border-gray-800/40 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-blue-100/90 border border-blue-400 dark:bg-blue-950/70 dark:border-blue-500/70 shadow-sm shadow-blue-500/5" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">내가 사용할 수 있는 날</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-slate-100/65 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800/80 opacity-75" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">상대방이 사용하는 날</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-amber-100/90 border border-amber-400 dark:bg-amber-950/75 dark:border-amber-500/70 pulse-yellow-glow border-2" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">상대방 양도 (가져오기 가능)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-diagonal-stripes border border-amber-300 dark:border-amber-800" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">내가 양도한 날</span>
          </div>
        </div>

      </main>

      {/* 인터랙션 상세 모달 */}
      {selectedSchedule && (
        <DateModal 
          schedule={selectedSchedule}
          currentUser={currentUser}
          onClose={() => setSelectedSchedule(null)}
          onYield={handleYield}
          onClaim={handleClaim}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
