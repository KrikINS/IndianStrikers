const token = process.argv[2];

async function testEndpoint() {
  try {
    const res = await fetch('http://localhost:4001/api/strategies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        name: 'PostTest',
        batter_hand: 'RHB',
        match_phase: 'Powerplay',
        positions: [ { playerId: 1, left: 50, top: 50 } ]
      })
    });
    console.log(res.status);
    const json = await res.json();
    console.log(json);
  } catch (e) {
    console.error(e);
  }
}
testEndpoint();
