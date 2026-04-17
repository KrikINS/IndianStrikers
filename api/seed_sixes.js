require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function seedSixes() {
    console.log('[Seeding] Adding 6s Commentary Templates...');

    const templates = [
        "That ball needs a passport! {batsman} just hit it into the next zip code.",
        "NASA just confirmed: that ball from {batsman} has officially entered low earth orbit.",
        "Someone check the parking lot! I think {batsman} just met a windshield at {zone}.",
        "{bowler}'s ego just took a bigger hit than that ball. Absolute savage from {batsman}.",
        "That’s not a hit, that’s a domestic flight! {batsman} is going aerial!",
        "A glorious arc into the Riyadh night! {batsman} paints the sky with a massive six.",
        "The sound of willow on leather was sweet, but the silence of the fielders was sweeter.",
        "A calculated aerial assault! {batsman} clears the ropes at {zone} with ease.",
        "Clean. Pure. Destructive. {batsman} holding the pose as the ball sails for six.",
        "Smashed! {batsman} didn't just hit that; he insulted it. Six runs!",
        "Straight as a die! {batsman} goes downtown and it's a massive six!",
        "The sightscreen better watch out! {batsman} is hitting them straight and long."
    ];

    for (const text of templates) {
        // We use a simple check to avoid duplicates if possible, or just insert
        const { error } = await db.query(
            'INSERT INTO commentary_templates (event_type, text, is_active) VALUES ($1, $2, $3)',
            ['SIX', text, true]
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

seedSixes();
