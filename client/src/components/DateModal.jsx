import React, { useState } from 'react';
import { X, Calendar, AlertCircle, RefreshCw, HandHelping, Grab, RotateCcw } from 'lucide-react';

export default function DateModal({ 
  schedule, 
  currentUser, 
  onClose, 
  onYield, 
  onClaim, 
  onReset 
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!schedule) return null;

  const { date, original_owner, current_owner, status, is_modified } = schedule;
  
  // 날짜 포맷팅 (YYYY-MM-DD -> YYYY년 MM월 DD일)
  const formatDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(y, 10)}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
  };

  const isMyTurn = current_owner === currentUser && status === 'normal';
  const isTheirTurn = current_owner !== currentUser && status === 'normal';
  const isMyYield = current_owner === currentUser && status === 'yielded';
  const isTheirYield = current_owner !== currentUser && status === 'yielded';
  const isReYieldTurn = isMyTurn && original_owner !== currentUser;

  // API 호출 핸들러 감싸기 (로딩 및 에러 처리)
  const handleAction = async (actionFn) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await actionFn(date);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || '요청 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200/40 dark:border-gray-800/40">
          <div className="flex items-center gap-2 text-gray-800 dark:text-white">
            <Calendar size={18} className="text-blue-500" />
            <span className="font-bold text-sm sm:text-base">{formatDate(date)}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 모달 콘텐츠 */}
        <div className="p-6">
          {/* 상태 상세 요약 카드 */}
          <div className="mb-6 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/50 dark:border-gray-800/50 text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <div className="text-gray-400 dark:text-gray-500 font-semibold">기본 지정 소유자</div>
              <div className="text-gray-800 dark:text-gray-200 font-bold">사용자 {original_owner} (일자 홀짝 기준)</div>
              
              <div className="text-gray-400 dark:text-gray-500 font-semibold">최종 권한 소유자</div>
              <div className="text-gray-800 dark:text-gray-200 font-bold flex items-center gap-1.5">
                사용자 {current_owner}
                {status === 'yielded' && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
                    양도 대기중
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 질문 및 안내 문구 */}
          <div className="text-center mb-6">
            {isMyTurn && !isReYieldTurn && (
              <div>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                  이날 아이디를 사용하지 않으시겠습니까?
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  양도하시면 상대방이 내 아이디 권한을 가져갈 수 있게 됩니다.
                </p>
              </div>
            )}

            {isReYieldTurn && (
              <div>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                  상대방에게 받은 권한을 다시 반납하시겠습니까?
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  재양도(반납)하시면 원래 주인(상대방)이 양도해둔 최초 상태로 되돌아갑니다.
                </p>
              </div>
            )}

            {isTheirYield && (
              <div>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                  상대방이 양도한 날입니다.
                </p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                  이날 권한을 가져오시겠습니까?
                </p>
              </div>
            )}

            {isMyYield && (
              <div>
                <p className="text-base font-semibold text-amber-600 dark:text-amber-400">
                  이미 권한을 양도한 날짜입니다.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  상대방이 가져가기 전까지는 양도를 취소(초기화)할 수 있습니다.
                </p>
              </div>
            )}

            {isTheirTurn && (
              <div>
                <p className="text-base font-semibold text-gray-600 dark:text-gray-400">
                  사용자 {current_owner}님이 사용하는 날입니다.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  상대방이 양도하기 전에는 가져올 수 없습니다.
                </p>
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2 text-xs font-semibold">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex flex-col gap-2">
            {/* 1. 양도하기 / 재양도하기 버튼 */}
            {isMyTurn && (
              <button
                type="button"
                onClick={() => handleAction((d) => onYield(d, currentUser))}
                disabled={loading}
                className={`w-full py-3 px-4 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isReYieldTurn 
                    ? 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300 shadow-rose-500/10' 
                    : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-300 shadow-amber-500/10'
                }`}
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : isReYieldTurn ? (
                  <RotateCcw size={16} />
                ) : (
                  <HandHelping size={16} />
                )}
                {isReYieldTurn ? '재양도하기 (반납)' : '양도하기'}
              </button>
            )}

            {/* 2. 가져오기 버튼 */}
            {isTheirYield && (
              <button
                type="button"
                onClick={() => handleAction((d) => onClaim(d, currentUser))}
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/15"
              >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <Grab size={16} />}
                가져오기
              </button>
            )}

            {/* 3. 변경 이력 초기화 버튼 */}
            {is_modified && (
              <button
                type="button"
                onClick={() => handleAction(onReset)}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-gray-200/60 dark:border-gray-700/50"
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <RotateCcw size={14} />}
                기본 규칙으로 초기화
              </button>
            )}

            {/* 4. 닫기 버튼 */}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-transparent hover:bg-gray-100/55 dark:hover:bg-gray-800/40 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium rounded-xl transition-all cursor-pointer"
            >
              닫기
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
