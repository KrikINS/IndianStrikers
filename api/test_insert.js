require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function testInsert() {
  try {
    const positions = [
      { playerId: 1, left: 50, top: 50 }
    ];
    
    console.log('Testing object insert without stringify...');
    let res1 = await db.getOne(
      'INSERT INTO strategies (name, batter_hand, match_phase, bowler_id, batter_id, positions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      ['Test1', 'RHB', 'Powerplay', null, null, positions]
    );
    console.log('Res1:', !!res1.data, res1.error ? res1.error.message : '');

    console.log('Testing stringified insert without cast...');
    let res2 = await db.getOne(
      'INSERT INTO strategies (name, batter_hand, match_phase, bowler_id, batter_id, positions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      ['Test2', 'RHB', 'Powerplay', null, null, JSON.stringify(positions)]
    );
    console.log('Res2:', !!res2.data, res2.error ? res2.error.message : '');

    console.log('Testing stringified insert with cast...');
    let res3 = await db.getOne(
      'INSERT INTO strategies (name, batter_hand, match_phase, bowler_id, batter_id, positions) VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *',
      ['Test3', 'RHB', 'Powerplay', null, null, JSON.stringify(positions)]
    );
    console.log('Res3:', !!res3.data, res3.error ? res3.error.message : '');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit();
  }
}

testInsert();
