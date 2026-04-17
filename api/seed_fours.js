require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function seedFours() {
    console.log('[Seeding] Adding 4s Commentary Templates...');

    const templates = [
        "Shot! {batsman} threads the needle through {zone}. That is a classic boundary!",
        "Dashed away! {batsman} uses the pace and finds the ropes with ease.",
        "Four more to the total! {batsman} is looking in sublime touch today.",
        "Pure timing! {batsman} just leaned into that drive and it raced away.",
        "Splitting the fielders with surgical precision! {batsman} finds the gap at {zone}.",
        "The fielders were just spectators for that one! {batsman} didn't give them a prayer.",
        "A boundary so clean, it should come with a tax refund. Pure class from {batsman}.",
        "{batsman} is giving the boundary ropes a workout today! Another four!",
        "That ball had 'four' written all over it from the second it left {batsman}'s bat.",
        "{bowler} looks on in despair as {batsman} puts that delivery exactly where it belongs.",
        "Leaked through the gap like water through a sieve. Beautiful placement by {batsman}.",
        "A delicate caress of the ball. It whispers across the grass to the fence at {zone}.",
        "Whispering willow! {batsman} times it to perfection for four runs.",
        "The ball just kisses the turf as it races away. {batsman} in absolute control.",
        "Through the 'V'! A textbook straight drive from {batsman} for four.",
        "Over the bowler's head! One bounce and into the ropes. {batsman} on fire!"
    ];

    for (const text of templates) {
        const { error } = await db.query(
            'INSERT INTO commentary_templates (event_type, text, is_active) VALUES ($1, $2, $3)',
            ['FOUR', text, true]
        );

        if (error) {
            console.error(`[Seeding] Failed to add: "${text.substring(0, 30)}..."`, error.message);
        } else {
            console.log(`[Seeding] Added: "${text.substring(0, 30)}..."`);
        }
    }

    console.log('[Seeding] Completed.');
    process.exit(0);
}

seedFours();
