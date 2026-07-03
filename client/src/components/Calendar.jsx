import React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Calendar as CalendarIcon, ArrowLeftRight } from 'lucide-react';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function Calendar({ 
  currentMonth, 
  setCurrentMonth, 
  schedules, 
  currentUser, 
  onDateClick 
}) {
  const [year, month] = currentMonth.split('-').map(Number);

  // 이전 달로 이동
  const handlePrevMonth = () => {
    const prevDate = new Date(year, month - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
    setCurrentMonth(`${prevYear}-${prevMonth}`);
  };

  // 다음 달로 이동
  const handleNextMonth = () => {
    const nextDate = new Date(year, month, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
    setCurrentMonth(`${nextYear}-${nextMonth}`);
  };

  // 오늘 날짜로 이동
  const handleToday = () => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    setCurrentMonth(`${todayYear}-${todayMonth}`);
  };

  // 달력 격자 구성을 위한 빈 날짜 계산
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const lastDay = new Date(year, month, 0).getDate();

  const emptyDays = Array(firstDayIndex).fill(null);
  const daysInMonth = Array.from({ length: lastDay }, (_, i) => i + 1);

  // 날짜 클릭 핸들러
  const handleDayClick = (day) => {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${currentMonth}-${dayStr}`;
    const schedule = schedules.find((s) => s.date === dateStr);
    if (schedule) {
      onDateClick(schedule);
    }
  };

  return (
    <div className="glass-panel w-full rounded-2xl p-3 sm:p-6 shadow-xl border border-white/20 dark:border-white/5 transition-colors duration-300">
      {/* 캘린더 네비게이션 헤더 */}
      <div className="flex flex-row justify-between items-center gap-2 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-blue-500 dark:text-blue-400" size={20} />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {year}년 {month}월
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/50 transition-colors"
            title="이전 달"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/50 transition-colors"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/50 transition-colors"
            title="다음 달"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2.5 mb-1 sm:mb-2 text-center">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={`text-[10px] sm:text-xs font-semibold py-1 sm:py-2 uppercase tracking-wider ${
              idx === 0
                ? 'text-red-500'
                : idx === 6
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {/* 이전 달의 빈 공간 */}
        {emptyDays.map((_, index) => (
          <div
            key={`empty-${index}`}
            className="aspect-square bg-gray-50/30 dark:bg-gray-900/10 rounded-xl border border-transparent"
          />
        ))}

        {/* 이번 달 날짜 */}
        {daysInMonth.map((day) => {
          const dayStr = String(day).padStart(2, '0');
          const dateStr = `${currentMonth}-${dayStr}`;
          const schedule = schedules.find((s) => s.date === dateStr) || {
            date: dateStr,
            original_owner: day % 2 !== 0 ? '운형' : '정록',
            current_owner: day % 2 !== 0 ? '운형' : '정록',
            status: 'normal',
            is_modified: false,
          };

          const { current_owner, status, original_owner, is_modified } = schedule;
          const isMyTurn = current_owner === currentUser && status === 'normal';
          const isTheirTurn = current_owner !== currentUser && status === 'normal';
          const isMyYield = current_owner === currentUser && status === 'yielded';
          const isTheirYield = current_owner !== currentUser && status === 'yielded';

          // 상태별 클래스 매핑
          let cellClass = '';
          let statusText = '';
          let mobileStatusText = '';
          
          if (isMyTurn) {
            // 내가 사용할 수 있는 날 (선명한 파란색 / 네온 보더)
            cellClass = 'bg-blue-100/90 text-blue-900 border-blue-400 hover:bg-blue-200/80 hover:border-blue-600 dark:bg-blue-950/70 dark:text-blue-100 dark:border-blue-500/70 dark:hover:bg-blue-900/60 dark:hover:border-blue-400 shadow-md shadow-blue-500/10 font-bold';
            statusText = '사용 가능';
            mobileStatusText = '사용';
          } else if (isTheirTurn) {
            // 상대방이 사용하는 날 (차분한 슬레이트/그레이)
            cellClass = 'bg-slate-100/65 text-slate-400 border-slate-200 hover:border-slate-350 dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800/80 dark:hover:border-slate-700/50 opacity-65 hover:opacity-100';
            statusText = `${current_owner} 사용 중`;
            mobileStatusText = `${current_owner === '운형' ? '운' : '정'} 사용`;
          } else if (isTheirYield) {
            // 상대방이 안 쓴다고 양도한 날 (가져오기 가능)
            cellClass = 'bg-amber-100/90 text-amber-900 border-amber-400 hover:bg-amber-200 hover:border-amber-600 dark:bg-amber-950/75 dark:text-amber-100 dark:border-amber-500/70 dark:hover:bg-amber-900/60 dark:hover:border-amber-400 pulse-yellow-glow font-bold border-2';
            statusText = `${original_owner} 양도 (가져오기)`;
            mobileStatusText = '가져오기';
          } else if (isMyYield) {
            // 내가 양도한 날 (선명한 빗금 패턴 및 흐린 오렌지)
            cellClass = 'bg-diagonal-stripes text-amber-800/95 border-amber-300 dark:text-amber-300/95 dark:border-amber-800 hover:border-amber-400/80 dark:hover:border-amber-600/60 font-semibold';
            statusText = `${original_owner} 양도 완료`;
            mobileStatusText = '양도완료';
          }

          // 주말 텍스트 색상 분리 (그 외 상태 텍스트에 오버레이되지 않도록)
          const dateObj = new Date(year, month - 1, day);
          const dayOfWeek = dateObj.getDay();
          const isSunday = dayOfWeek === 0;

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDayClick(day);
              }}
              className={`group flex flex-col justify-between aspect-square p-1 sm:p-2 rounded-xl border text-left transition-all duration-300 relative cursor-pointer overflow-hidden ${cellClass}`}
            >
              {/* 날짜 번호 및 현재 소유자 표시 */}
              <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center w-full gap-0.5">
                <span className={`text-xs sm:text-base font-bold leading-none ${
                  isSunday && status === 'normal' && current_owner !== currentUser
                    ? 'text-red-500/80 dark:text-red-400/70' 
                    : 'text-inherit'
                }`}>
                  {day}
                </span>

                {/* 현재 소유자 뱃지 (가져가서 바뀐 경우 인디고 강조 테두리 적용) */}
                <span className={`text-[7px] sm:text-[9px] px-0.5 sm:px-1 py-0.5 rounded font-extrabold transition-colors leading-none truncate ${
                  original_owner !== current_owner
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                }`}>
                  <span className="hidden sm:inline">{original_owner !== current_owner ? '소유:' : '기본:'}</span>
                  {current_owner}
                </span>
              </div>

              {/* 상태 텍스트 및 변경 마크 */}
              <div className="flex flex-col gap-0.5 items-start mt-auto w-full z-10 pb-0.5">
                {original_owner !== current_owner && (
                  <span className="flex items-center gap-0.5 text-[7px] sm:text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">
                    <span className="hidden sm:inline"><ArrowLeftRight size={8} /></span> 변경됨
                  </span>
                )}
                
                {/* PC 화면 텍스트 */}
                <span className="hidden sm:block text-[10px] sm:text-xs font-semibold leading-tight truncate w-full">
                  {statusText}
                </span>
                
                {/* 모바일 화면 텍스트 */}
                <span className="block sm:hidden text-[8px] sm:text-[9px] font-black leading-none truncate w-full text-center tracking-tighter">
                  {mobileStatusText}
                </span>
              </div>

              {/* 배경 미세 장식 요소 */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent dark:from-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
