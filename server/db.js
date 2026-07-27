const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const connectionString = process.env.DATABASE_URL;
let isPg = !!connectionString;

let sqliteDb = null;
let pgPool = null;

if (isPg) {
  console.log('Using PostgreSQL database connection.');
  try {
    pgPool = new Pool({
      connectionString: connectionString,
      connectionTimeoutMillis: 5000,
      ssl: {
        rejectUnauthorized: false
      }
    });
    pgPool.on('error', (err) => {
      console.error('Unexpected error on idle pg client', err);
    });
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool, falling back to SQLite:', err.message);
    isPg = false;
  }
}

if (!isPg) {
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
  if (isPg && pgPool) {
    let pgSql = sql;
    let index = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${index++}`);
    }
    return pgPool.query(pgSql, params).then(res => res.rows);
  } else {
    return new Promise((resolve, reject) => {
      if (!sqliteDb) return resolve([]);
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

// INSERT / UPDATE / DELETE 실행 래퍼 함수
function execute(sql, params = []) {
  if (isPg && pgPool) {
    let pgSql = sql;
    let index = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${index++}`);
    }
    return pgPool.query(pgSql, params);
  } else {
    return new Promise((resolve, reject) => {
      if (!sqliteDb) return resolve(this);
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
    // 테이블 생성 에러 시 무조건 멈추지 않고 예외 수용
  }
}

// 홀짝 규칙에 따른 기본 소유자 결정
function getOriginalOwner(dateString) {
  const day = parseInt(dateString.split('-')[2], 10);
  return day % 2 !== 0 ? '운형' : '정록';
}

// 특정 월의 모든 날짜 상태 가져오기
async function getSchedulesForMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

  let rows = [];
  try {
    const sql = `SELECT * FROM schedules WHERE date >= ? AND date <= ?`;
    rows = await query(sql, [startDate, endDate]);
  } catch (err) {
    console.error('Error querying schedules, fallback to empty:', err.message);
    rows = [];
  }

  // 저장된 변경 사항 맵 생성
  const dbSchedules = {};
  if (Array.isArray(rows)) {
    rows.forEach((row) => {
      dbSchedules[row.date] = {
        current_owner: row.current_owner,
        status: row.status,
        is_modified: true,
      };
    });
  }

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
  let rows = [];
  try {
    const sql = `SELECT * FROM schedules WHERE date = ?`;
    rows = await query(sql, [date]);
  } catch (err) {
    console.error('Error fetching single schedule:', err.message);
  }

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
  
  if (schedule.current_owner !== owner) {
    throw new Error('양도 권한이 없습니다. (현재 최종 사용자가 아닙니다)');
  }

  if (schedule.status === 'yielded') {
    return schedule;
  }

  const targetOwner = schedule.original_owner === owner ? owner : schedule.original_owner;

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
