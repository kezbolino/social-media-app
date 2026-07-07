/*
 * greetings.js — cheeky home-screen greetings for the Wingman.
 *
 * A fresh one is picked at random every time the home screen shows. Add, remove
 * or reword lines freely — it's just a list of strings. Keep the tone: casual
 * London street-food banter, addressed to Tommy / Boss man, a bit of cheek.
 */
window.GREETINGS = [
  "Alright Tommy? Let's get you famous.",
  "Morning, Boss man. Wings won't post themselves.",
  "Look who it is. Ready to feed the feed, Tommy?",
  "Boss man's in the building. 🐔",
  "Let's make some noise, Tommy.",
  "Wagwan Boss man. Photo in, caption out.",
  "Back again, bitch? Good. Let's cook.",
  "Tommy, my man. The internet's hungry.",
  "Right then Boss man, what we posting today?",
  "Chef's here. Chef being you, Tommy.",
  "Oi oi, Boss man. Time to show off them wings.",
  "Tommy the legend returns.",
  "Let's get this bread — and wings — Boss man.",
  "Sup bitch. Grab a photo, let's roll.",
  "Boss man! The people demand content.",
  "Tommy, you beautiful bastard. Post something.",
  "Here he is. The wing king, Boss man himself.",
  "Alright bitch, quit lurking and post.",
  "Tommy's on the clock. Let's move.",
  "Boss man reporting for duty. 🫡",
  "Feed 'em good today, Tommy.",
  "Well well, Boss man. Fancy seeing you here.",
  "Time to flex them wings, Tommy.",
  "Get in, bitch. Let's make a banger.",
  "Boss man! Camera ready?",
  "Tommy, the feed's looking dry. Fix it.",
  "Another day, another wing, Boss man.",
  "Let's go, Tommy. No days off in this game.",
  "Boss man's back and the grill's hot.",
  "Sup Tommy. Ready to go viral (or close enough)?",
  "Move it, bitch. Wings are getting cold.",
  "Top of the morning, Boss man. Or whenever this is.",
  "Tommy! The algorithm misses you.",
  "Right Boss man, let's give 'em something to drool over.",
  "You again, Tommy? Love that for us.",
  "Wings up, phone out, Boss man.",
  "Come on then bitch, dazzle me.",
  "Tommy's here to run the streets. And the feed.",
  "Boss man, your public awaits.",
  "Let's turn photos into punters, Tommy.",
  "Ayy Boss man. Big day for wings.",
  "Tommy — legend, myth, wing merchant.",
  "Clock in, Boss man. Content don't sleep.",
  "Alright bitch, best behaviour… nah, post anyway.",
  "Boss man in the mix. Let's cook up a caption.",
  "Tommy, the grease is calling.",
  "Here we go again, Boss man. And I love it.",
  "Show 'em who runs the wings, Tommy.",
  "Oi Boss man, less staring, more posting.",
  "Good to see you, Tommy. Now feed the beast.",
];

// Pick a random greeting, avoiding an immediate repeat of the last one.
window.pickGreeting = (function () {
  let last = -1;
  return function () {
    const g = window.GREETINGS;
    if (!g || !g.length) return "";
    let i = Math.floor(Math.random() * g.length);
    if (g.length > 1 && i === last) i = (i + 1) % g.length;
    last = i;
    return g[i];
  };
})();
