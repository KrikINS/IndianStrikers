require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function seedRemaining() {
    console.log('[Seeding] Adding Wickets, Dots, and Milestones Commentary Templates...');

    const templates = [
        // WICKETS
        { type: 'WICKET', text: "Bowled him! The timber has been disturbed! {bowler} strikes!" },
        { type: 'WICKET', text: "Gone! A massive wicket for {bowler}. {batsman} has to walk." },
        { type: 'WICKET', text: "Up goes the finger! {batsman} is trapped in front of the stumps." },
        { type: 'WICKET', text: "Caught! A simple catch taken at {zone}. {batsman}'s innings comes to an end." },
        { type: 'WICKET', text: "{batsman} was looking good, but {bowler} just gave him an early ticket to the showers." },
        { type: 'WICKET', text: "That’s a long, lonely walk back to the pavilion. Someone order {batsman} a coffee!" },
        { type: 'WICKET', text: "{bowler} just pulled a rabbit out of the hat with that delivery! Magic!" },
        { type: 'WICKET', text: "The bails take flight like startled birds! {batsman} is stunned by {bowler}." },
        { type: 'WICKET', text: "A trap was set at {zone}, and {batsman} walked right into it. Clinical from {bowler}." },

        // DOTS / SINGLES
        { type: 'DOT', text: "Solid defense from {batsman}. No run there." },
        { type: 'DOT', text: "Pushed into the gap for a single at {zone}. Ticking the scoreboard over." },
        { type: 'DOT', text: "Good hustle! {batsman} and his partner scamper through for a quick run." },
        { type: 'DOT', text: "Well played, but straight to the fielder. No run." },
        { type: 'DOT', text: "{batsman} playing it safe. No need for heroics just yet." },
        { type: 'DOT', text: "A gentle nudge. {batsman} treating the ball with the respect it deserves." },
        { type: 'DOT', text: "Ticking the boxes. {batsman} rotating the strike with professional ease." },

        // MILESTONES
        { type: 'MILESTONE', text: "50 for {batsman}! A brilliant half-century. He raises his bat to the applause!" },
        { type: 'MILESTONE', text: "CENTURY! A magnificent 100 for {batsman}! A masterclass in batting." },
        { type: 'MILESTONE', text: "Milestone reached! {batsman} is playing a captain's knock today." }
    ];

    for (const item of templates) {
        const { error } = await db.query(
            'INSERT INTO commentary_templates (event_type, text, is_active) VALUES ($1, $2, $3)',
            [item.type, item.text, true]
        );

        if (error) {
            console.error(`[Seeding] Failed to add [${item.type}]: "${item.text.substring(0, 30)}..."`, error.message);
        } else {
            console.log(`[Seeding] Added [${item.type}]: "${item.text.substring(0, 30)}..."`);
        }
    }

    console.log('[Seeding] Remaining Templates Completed.');
    process.exit(0);
}

seedRemaining();
