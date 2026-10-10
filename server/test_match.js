import { io } from 'socket.io-client';

async function runTest() {
  console.log('🧪 Starting Live Match Integration Test...');

  // 1. Fetch available sets
  const setsRes = await fetch('http://localhost:5000/api/question-sets');
  const setsData = await setsRes.json();
  const targetSet = setsData.data.find(s => s.questionCount > 0);
  console.log(`Using Question Set: "${targetSet.title}" (${targetSet.questionCount} Qs)`);

  // 2. Create room
  const createRes = await fetch('http://localhost:5000/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostName: 'Host_Test',
      questionSetId: targetSet.id
    })
  });
  const createJson = await createRes.json();
  if (!createJson.success) {
    throw new Error('Create room failed: ' + JSON.stringify(createJson));
  }
  const roomCode = createJson.data.roomCode;
  console.log('Room created with code:', roomCode);

  // 3. Connect Host & Player 2
  const host = io('http://localhost:5000');
  await new Promise(r => host.on('connect', r));
  await new Promise(r => host.emit('join_room', { roomCode, displayName: 'Host_Test', isHost: true }, r));

  const p2 = io('http://localhost:5000');
  await new Promise(r => p2.on('connect', r));
  await new Promise(r => p2.emit('join_room', { roomCode, displayName: 'Competitor_1' }, r));

  console.log('2 Players joined. Starting game...');

  // Listeners for Question Active
  host.on('question_active', (qPayload) => {
    console.log('[Anti-Cheat Check] Question received. Has correctOptionId?:', 'correctOptionId' in qPayload);
    console.log('Active Q Text:', qPayload.text.substring(0, 50) + '...');
    console.log('Shuffled options count:', qPayload.options.length);

    // Host submits first option in shuffled list after 800ms
    setTimeout(() => {
      host.emit('submit_answer', {
        roomCode,
        questionId: qPayload.questionId,
        selectedOptionId: qPayload.options[0].id
      }, (res) => {
        console.log('Host answer submit result:', JSON.stringify(res));
      });
    }, 800);

    // Player 2 submits second option in shuffled list after 1200ms
    setTimeout(() => {
      p2.emit('submit_answer', {
        roomCode,
        questionId: qPayload.questionId,
        selectedOptionId: qPayload.options[1].id
      }, (res) => {
        console.log('Player 2 answer submit result:', JSON.stringify(res));
      });
    }, 1200);
  });

  // Listeners for Round Result
  host.on('round_result', (rResult) => {
    console.log('🎉 Round Evaluation Result Broadcasted!');
    console.log('Correct Option Revealed:', rResult.correctOptionId);
    console.log('Explanation provided:', !!rResult.explanation);
    console.log('Live Leaderboard with Rank Deltas:');
    rResult.leaderboard.forEach(item => {
      console.log(`  Rank #${item.rank} (${item.delta}): ${item.displayName} -> Score: ${item.totalScore} (+${item.roundPoints} pts)`);
    });

    host.disconnect();
    p2.disconnect();
    console.log('✅ Section 4 Automated Live Gameplay Test PASSED!');
    process.exit(0);
  });

  // Host starts game
  host.emit('start_game', { roomCode }, (res) => {
    console.log('start_game acknowledged by server:', res);
  });
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
