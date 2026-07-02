const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const connectionString = process.env.DATABASE_URL;
const isPg = !!connectionString;

let sqliteDb = null;
let pgPool = null;

if (isPg) {
  console.log('Using PostgreSQL database connection.');
  pgPool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false // Supabase 및 Neon 연결용 SSL 활성화
    }
  });
} else {
  console.log('Using local SQLite database connection.');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Database connection error:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
    }
  });
}

// 공통 쿼리 실행 래퍼 함수
function query(sql, params = []) {
  if (isPg) {
    // SQLite의 '?' 파라미터를 PostgreSQL의 '$1, $2...' 파라미터로 자동 변환
    let pgSql = sql;
    let index = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${index++}`);
    }
    return pgPool.query(pgSql, params).then(res => res.rows);
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// INSERT / UPDATE / DELETE 실행 래퍼 함수
function execute(sql, params = []) {
  if (isPg) {
    let pgSql = sql;
    let index = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${index++}`);
    }
    return pgPool.query(pgSql, params);
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
}

// 데이터베이스 테이블 초기화
async function initDatabase() {
  const sql = `CREATE TABLE IF NOT EXISTS schedules (
    date TEXT PRIMARY KEY,
    current_owner TEXT NOT NULL,
    status TEXT NOT NULL
  )`;
  try {
    await execute(sql);
    console.log('Database schedules table initialized.');
  } catch (err) {
    console.error('Error initializing table:', err.message);
    throw err;
  }
}

// 홀짝 규칙에 따른 기본 소유자 결정
function getOriginalOwner(dateString) {
  // dateString format: YYYY-MM-DD
  const day = parseInt(dateString.split('-')[2], 10);
  return day % 2 !== 0 ? '운형' : '정록';
}

// 특정 월의 모든 날짜 상태 가져오기
async function getSchedulesForMonth(yearMonth) {
  const sql = `SELECT * FROM schedules WHERE date LIKE ?`;
  const rows = await query(sql, [`${yearMonth}-%`]);

  // 저장된 변경 사항 맵 생성
  const dbSchedules = {};
  rows.forEach((row) => {
    dbSchedules[row.date] = {
      current_owner: row.current_owner,
      status: row.status,
      is_modified: true,
    };
  });

  // 해당 월의 모든 날짜 생성 (1일 ~ 마지막 날)
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const schedules = [];

  for (let d = 1; d <= lastDay; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${yearMonth}-${dayStr}`;
    const originalOwner = getOriginalOwner(dateStr);

    if (dbSchedules[dateStr]) {
      schedules.push({
        date: dateStr,
        original_owner: originalOwner,
        current_owner: dbSchedules[dateStr].current_owner,
        status: dbSchedules[dateStr].status,
        is_modified: true,
      });
    } else {
      // 기본 홀짝 권한 적용
      schedules.push({
        date: dateStr,
        original_owner: originalOwner,
        current_owner: originalOwner,
        status: 'normal',
        is_modified: false,
      });
    }
  }

  return schedules;
}

// 특정 날짜의 단일 스케줄 조회
async function getSchedule(date) {
  const sql = `SELECT * FROM schedules WHERE date = ?`;
  const rows = await query(sql, [date]);
  const originalOwner = getOriginalOwner(date);
  
  if (rows && rows.length > 0) {
    const row = rows[0];
    return {
      date: row.date,
      original_owner: originalOwner,
      current_owner: row.current_owner,
      status: row.status,
      is_modified: true,
    };
  } else {
    return {
      date: date,
      original_owner: originalOwner,
      current_owner: originalOwner,
      status: 'normal',
      is_modified: false,
    };
  }
}

// 내 턴인 날 양도(또는 재양도)하기
async function yieldSchedule(date, owner) {
  const schedule = await getSchedule(date);
  
  // 권한 검증: 현재 최종 소유자가 본인이어야 양도할 수 있음
  if (schedule.current_owner !== owner) {
    throw new Error('양도 권한이 없습니다. (현재 최종 사용자가 아닙니다)');
  }

  // 이미 양도된 상태라면 추가 작업 생략
  if (schedule.status === 'yielded') {
    return schedule;
  }

  // 재양도(반납) 판단: 원래 소유자가 본인이 아닐 때
  const targetOwner = schedule.original_owner === owner ? owner : schedule.original_owner;

  // ON CONFLICT 구문은 SQLite와 PostgreSQL 둘 다 호환됨
  const sql = `INSERT INTO schedules (date, current_owner, status) 
               VALUES (?, ?, 'yielded') 
               ON CONFLICT(date) DO UPDATE SET current_owner = ?, status = 'yielded'`;
  
  await execute(sql, [date, targetOwner, targetOwner]);
  
  return {
    date,
    original_owner: schedule.original_owner,
    current_owner: targetOwner,
    status: 'yielded',
    is_modified: true,
  };
}

// 양도된 날 가져오기
async function claimSchedule(date, claimer) {
  const schedule = await getSchedule(date);

  // 권한 검증: 양도 상태('yielded')여야 가져올 수 있음
  if (schedule.status !== 'yielded') {
    throw new Error('가져올 수 없는 상태의 날짜입니다. 상대방이 먼저 양도해야 합니다.');
  }

  if (schedule.current_owner === claimer) {
    throw new Error('이미 본인이 소유하고 있는 날짜입니다.');
  }

  const sql = `INSERT INTO schedules (date, current_owner, status) 
               VALUES (?, ?, 'normal') 
               ON CONFLICT(date) DO UPDATE SET current_owner = ?, status = 'normal'`;
  
  await execute(sql, [date, claimer, claimer]);
  
  return {
    date,
    original_owner: schedule.original_owner,
    current_owner: claimer,
    status: 'normal',
    is_modified: true,
  };
}

// 스케줄 초기화 (기본 홀짝 상태로 되돌리기)
async function resetSchedule(date) {
  const sql = `DELETE FROM schedules WHERE date = ?`;
  await execute(sql, [date]);
  
  const originalOwner = getOriginalOwner(date);
  return {
    date,
    original_owner: originalOwner,
    current_owner: originalOwner,
    status: 'normal',
    is_modified: false,
  };
}

module.exports = {
  initDatabase,
  getSchedulesForMonth,
  getSchedule,
  yieldSchedule,
  claimSchedule,
  resetSchedule,
};
