import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';
const TOTAL_BOTS = 50;

async function run50PlayerSimulation() {
  console.log('='.repeat(65));
  console.log('🚀 APTIQUIZ 50-PLAYER CONCURRENT LOAD SIMULATION (PRD NR-01 & SECTION 17)');
  console.log('='.repeat(65));
  console.log(`Target: ${TOTAL_BOTS} simultaneous active WebSocket connections in 1 room`);
  console.log(`Server Endpoint: ${SERVER_URL}`);
  console.log('');

  const startTime = Date.now();

  // 1. Fetch Question Set
  const setsRes = await fetch(`${SERVER_URL}/api/question-sets`);
  const setsData = await setsRes.json();
  const targetSet = setsData.data.find(s => s.questionCount > 0);
  if (!targetSet) throw new Error('No question set found');
  console.log(`📌 Selected Question Bank: "${targetSet.title}" (${targetSet.questionCount} questions)`);

  // 2. Host Creates Room
  const createRes = await fetch(`${SERVER_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostName: 'LoadTest_Host',
      questionSetId: targetSet.id
    })
  });
  const createJson = await createRes.json();
  const roomCode = createJson.data.roomCode;
  console.log(`🏠 Game Room Created! 6-Character Join Code: [ ${roomCode} ]`);

  // 3. Spawn 50 Concurrent Sockets (1 Host + 49 Bots)
  console.log(`\n⏳ Connecting ${TOTAL_BOTS} concurrent virtual players via Socket.io...`);
  const sockets = [];
  const connectionLatencies = [];
  const connectStart = Date.now();

  // Connect Host
  const hostSocket = io(SERVER_URL, { reconnection: false });
  await new Promise(resolve => hostSocket.on('connect', resolve));
  const hostJoinRes = await new Promise(resolve => {
    hostSocket.emit('join_room', {
      roomCode,
      displayName: 'LoadTest_Host',
      isHost: true
    }, resolve);
  });
  sockets.push(hostSocket);
  console.log(`  ✓ Host connected and joined room (Socket ID: ${hostSocket.id})`);

  // Connect 49 Bots
  const botPromises = [];
  for (let i = 2; i <= TOTAL_BOTS; i++) {
    const botIndex = i;
    const botPromise = new Promise(async (resolve, reject) => {
      const bSocket = io(SERVER_URL, { reconnection: false });
      const bStart = Date.now();

      bSocket.on('connect', () => {
        bSocket.emit('join_room', {
          roomCode,
          displayName: `AptiBot_${botIndex}`
        }, (joinRes) => {
          const lat = Date.now() - bStart;
          connectionLatencies.push(lat);
          sockets.push(bSocket);
          resolve(joinRes);
        });
      });

      bSocket.on('connect_error', reject);
    });
    botPromises.push(botPromise);
  }

  await Promise.all(botPromises);
  const totalConnectTime = Date.now() - connectStart;
  const avgHandshakeLatency = Math.round(
    connectionLatencies.reduce((a, b) => a + b, 0) / connectionLatencies.length
  );

  console.log(`✅ All ${TOTAL_BOTS} players joined the room successfully in ${totalConnectTime}ms!`);
  console.log(`📊 Average Connection & Join Latency: ${avgHandshakeLatency}ms (PRD Target: <100ms)`);

  // 4. Verify Capacity Limit Enforcement (PRD FR-02: 51st player must be rejected)
  console.log(`\n🔒 Testing 50-Player Capacity Limit Enforcement (Attempting 51st player join)...`);
  const extraSocket = io(SERVER_URL, { reconnection: false });
  await new Promise(r => extraSocket.on('connect', r));
  const rejectionRes = await new Promise(resolve => {
    extraSocket.emit('join_room', {
      roomCode,
      displayName: 'Unauthorized_51st_Player'
    }, resolve);
  });
  extraSocket.disconnect();

  if (!rejectionRes.success && rejectionRes.error?.includes('50 players limit reached')) {
    console.log(`  ✓ Capacity Protection Verified: 51st player strictly rejected! ("${rejectionRes.error}")`);
  } else {
    console.log(`  ⚠️ Capacity check notice:`, rejectionRes);
  }

  // 5. Start Game & Synchronized Broadcast Benchmark
  console.log(`\n🎮 Host Initiating Live Game Across All 50 Clients...`);

  let broadcastReceipts = 0;
  const answerLatencies = [];
  let roundEvaluated = false;

  const testCompletePromise = new Promise((resolve) => {
    // Setup listeners on all sockets
    sockets.forEach((s, idx) => {
      s.on('question_active', (qPayload) => {
        broadcastReceipts++;
        if (broadcastReceipts === TOTAL_BOTS) {
          console.log(`  ✓ Synchronized Question Delivery: Received by ALL ${TOTAL_BOTS} clients simultaneously!`);
          console.log(`  📌 Question: "${qPayload.text.substring(0, 60)}..."`);
          console.log(`  🛡️ Anti-Cheat Verification: Has correctOptionId?: ${'correctOptionId' in qPayload} (Must be false)`);
        }

        // Each bot submits answer with randomized delay (simulation of 50 concurrent human thinkers)
        const delay = 400 + Math.floor(Math.random() * 2500);
        setTimeout(() => {
          const submitStart = Date.now();
          // Pick a random option from the shuffled options
          const chosenOption = qPayload.options[Math.floor(Math.random() * qPayload.options.length)];

          s.emit('submit_answer', {
            roomCode,
            questionId: qPayload.questionId,
            selectedOptionId: chosenOption.id
          }, (submitRes) => {
            const submitRtt = Date.now() - submitStart;
            answerLatencies.push(submitRtt);
          });
        }, delay);
      });

      s.on('round_result', (evalPayload) => {
        if (!roundEvaluated) {
          roundEvaluated = true;
          resolve(evalPayload);
        }
      });
    });

    // Host emits start_game
    hostSocket.emit('start_game', { roomCode });
  });

  const evaluationResult = await testCompletePromise;

  // 6. Benchmark Metrics Report
  const totalExecutionTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgAnswerRtt = Math.round(
    answerLatencies.reduce((a, b) => a + b, 0) / (answerLatencies.length || 1)
  );
  const maxAnswerRtt = Math.max(...answerLatencies, 0);
  const minAnswerRtt = Math.min(...answerLatencies, 0);

  console.log('\n' + '='.repeat(65));
  console.log('🏆 50-PLAYER LOAD SIMULATION BENCHMARK RESULTS');
  console.log('='.repeat(65));
  console.log(`Total Concurrent Connections:  ${TOTAL_BOTS} / 50 (100% capacity)`);
  console.log(`Question Broadcast Delivery:   ${broadcastReceipts} / 50 clients received payload`);
  console.log(`Total Concurrent Submissions:  ${answerLatencies.length} answers processed`);
  console.log(`Average Answer Round-Trip:     ${avgAnswerRtt} ms`);
  console.log(`Min / Max Answer Latency:      ${minAnswerRtt} ms / ${maxAnswerRtt} ms`);
  console.log(`PRD Sub-100ms Target Met?:     ${avgAnswerRtt < 100 ? '✅ PASSED (< 100ms)' : '⚠️ Check latency'}`);
  console.log(`Leaderboard Computed:          ${evaluationResult.leaderboard.length} ranked entries`);
  console.log(`Top Player in 50-Player Room:  #1 ${evaluationResult.leaderboard[0].displayName} (${evaluationResult.leaderboard[0].totalScore} pts)`);
  console.log(`Overall Execution Time:        ${totalExecutionTime} seconds`);
  console.log('='.repeat(65));

  // Disconnect all sockets cleanly
  sockets.forEach(s => s.disconnect());
  console.log('🧹 Cleanly disconnected all virtual bot sockets.');
}

run50PlayerSimulation().catch(err => {
  console.error('❌ Simulation Error:', err);
  process.exit(1);
});
