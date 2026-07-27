const express = require('express');
const cors = require('cors');
const {
  initDatabase,
  getSchedulesForMonth,
  yieldSchedule,
  claimSchedule,
  resetSchedule,
  getAllSchedules,
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// SSE 연결 클라이언트 목록
let clients = [];

// SSE를 통한 실시간 동기화 브로드캐스트 함수
function broadcastUpdate() {
  console.log(`Broadcasting update to ${clients.length} clients`);
  clients.forEach((client) => {
    client.res.write(`data: ${JSON.stringify({ type: 'update', timestamp: Date.now() })}\n\n`);
  });
}

// 1.// 특정 월의 스케줄 조회 API
app.get('/api/schedules', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'month 파라미터가 필요합니다. (예: 2026-07)' });
    }
    const schedules = await getSchedulesForMonth(month);
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: error.message || '데이터를 가져오는 중 오류가 발생했습니다.', details: String(error) });
  }
});

// 2. 양도하기 API
app.post('/api/schedules/yield', async (req, res) => {
  const { date, owner } = req.body;
  if (!date || !owner) {
    return res.status(400).json({ error: 'date와 owner 정보가 필요합니다.' });
  }

  try {
    const updated = await yieldSchedule(date, owner);
    res.json(updated);
    broadcastUpdate(); // SSE 업데이트 전송
  } catch (err) {
    console.error('Error yielding schedule:', err);
    res.status(400).json({ error: err.message });
  }
});

// 3. 가져오기 API
app.post('/api/schedules/claim', async (req, res) => {
  const { date, claimer } = req.body;
  if (!date || !claimer) {
    return res.status(400).json({ error: 'date와 claimer 정보가 필요합니다.' });
  }

  try {
    const updated = await claimSchedule(date, claimer);
    res.json(updated);
    broadcastUpdate(); // SSE 업데이트 전송
  } catch (err) {
    console.error('Error claiming schedule:', err);
    res.status(400).json({ error: err.message });
  }
});

// 4. 초기화 API
app.post('/api/schedules/reset', async (req, res) => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'date 정보가 필요합니다.' });
  }

  try {
    const updated = await resetSchedule(date);
    res.json(updated);
    broadcastUpdate(); // SSE 업데이트 전송
  } catch (err) {
    console.error('Error resetting schedule:', err);
    res.status(400).json({ error: err.message });
  }
});

// 5. SSE(Server-Sent Events) 스트림 API
app.get('/api/schedules/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // 헤더 즉시 전송

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  console.log(`Client ${clientId} connected to SSE stream. Total clients: ${clients.length}`);

  // 연결 확인용 주기적 하트비트 전송 (30초마다)
  const keepAliveInterval = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    clients = clients.filter((client) => client.id !== clientId);
    console.log(`Client ${clientId} disconnected. Total clients: ${clients.length}`);
  });
});

// 전체 DB 스케줄 진단 엔드포인트
app.get('/api/debug/all', async (req, res) => {
  try {
    const data = await getAllSchedules();
    res.json({ total_count: data.length, records: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const path = require('path');
// React 빌드 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../client/dist')));

// API 이외의 모든 경로 요청은 React index.html로 돌려줍니다.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Express 서버 즉시 가동 (DB 연결 지연 시에도 웹사이트 무한 펜딩 방지)
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

initDatabase().catch((err) => {
  console.error('Failed to initialize database:', err);
});
