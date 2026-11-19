
const {
  Client,
  GatewayIntentBits
} = require("discord.js");

const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Redex Official is online!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Redex Official server started.");
});

// DISCORD
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CHAT_CHANNEL_ID = "1572516274339188778";

// GROQ
const MODEL = "openai/gpt-oss-20b";

const conversations = new Map();
const spamTracker = new Map();
const battles = new Map();

// PERSONALITY
const SYSTEM_PROMPT = `
You are Redex Official, the friend of a gaming Discord community.

YOUR PERSONALITY:
- Talk like a normal online friend.
- Be funny, casual, confident and expressive.
- Use natural internet slang.
- Make jokes and playful roasts.
- Have your own opinions.
- Understand sarcasm, memes and internet humour.
- Sometimes disagree with people.
- Never sound like customer support.
- Never give robotic generic responses.
- Don't constantly introduce yourself.
- Never claim to literally be a human if directly asked.

FRIENDSHIP:
- Remember recent conversations.
- React to the actual message.
- Ask natural follow-up questions.
- Don't repeat yourself.
- If someone apologizes, forgive them naturally.
- Don't stay angry after a genuine apology.

SPAM:
- Be annoyed when people repeatedly spam.
- React with funny, increasingly annoyed messages.
- Don't endlessly repeat the same warning.
- Forgive them when they apologize.

JUJUTSU KAISEN:
- Know JJK anime and manga.
- Understand characters, cursed techniques, domains,
  abilities, fights, relationships and lore.
- Discuss manga spoilers when relevant.
- Understand power scaling and matchups.
- Don't invent canon facts when unsure.
- You can discuss Gojo, Sukuna, Yuji, Megumi,
  Yuta, Kenjaku, Toji, Maki and other characters.

JJK BATTLES:
- Players can challenge you to JJK battles.
- Make battles exciting and interactive.
- Use cursed energy, techniques and Domain Expansions.
- Let players choose their own moves.
- Don't instantly defeat players.
- Keep fights fair and entertaining.

MESSAGE STYLE:
- Usually 1 to 3 sentences.
- Aim for under 45 words.
- Use Discord texting style.
- Only write longer answers when needed.

You are Redex Official.
You belong to the Redex community.
`;

// GROQ REQUEST
async function askGroq(history) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          ...history
        ],
        reasoning_effort: "low",
        max_completion_tokens: 180
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Groq error:", response.status, data);
    throw new Error(`Groq HTTP ${response.status}`);
  }

  const answer =
    data.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("Groq returned an empty answer");
  }

  return answer;
}

// JJK BATTLE SYSTEM
function startBattle(key) {
  battles.set(key, {
    playerHP: 100,
    redexHP: 100,
    playerCE: 100,
    redexCE: 100,
    round: 1
  });

  return "NAHH YOU REALLY CHALLENGED ME? 😭💀\n\n" +
    "**JJK BATTLE STARTED**\n" +
    "Your HP: 100 | Cursed Energy: 100\n" +
    "Redex HP: 100 | Cursed Energy: 100\n\n" +
    "Choose your move:\n" +
    "👊 Attack\n" +
    "⚡ Cursed Technique\n" +
    "🔥 Domain Expansion\n" +
    "🛡️ Dodge / Block\n\n" +
    "Your move, sorcerer.";
}

function handleBattle(key, text) {
  const battle = battles.get(key);
  const move = text.toLowerCase();

  if (
    /\b(quit battle|stop battle|i surrender|forfeit)\b/.test(move)
  ) {
    battles.delete(key);
    return "You surrendered? 😭💀 GG, we'll run it back another time.";
  }

  let playerDamage = 0;
  let playerDefense = false;
  let action = "";

  if (
    /\b(domain|domain expansion|domain clash)\b/.test(move)
  ) {
    if (battle.playerCE < 40) {
      return "You're out of cursed energy 😭 Try another move.";
    }

    battle.playerCE -= 40;
    playerDamage = 35;
    action = "🔥 YOU EXPANDED YOUR DOMAIN!";
  } else if (
    /\b(cursed technique|technique|special move)\b/.test(move)
  ) {
    if (battle.playerCE < 20) {
      return "Not enough cursed energy! 😭 Try a normal attack.";
    }

    battle.playerCE -= 20;
    playerDamage = 22;
    action = "⚡ YOU USED YOUR CURSED TECHNIQUE!";
  } else if (
    /\b(dodge|block|defend)\b/.test(move)
  ) {
    playerDefense = true;
    action = "🛡️ YOU PREPARED YOUR DEFENSE!";
  } else if (
    /\b(attack|punch|kick|slash|hit|strike)\b/.test(move)
  ) {
    playerDamage = 12;
    action = "👊 YOU ATTACKED!";
  } else {
    return "Choose a move: **attack**, **cursed technique**, **domain expansion**, or **dodge**. 😭";
  }

  battle.redexHP = Math.max(
    0,
    battle.redexHP - playerDamage
  );

  if (battle.redexHP <= 0) {
    battles.delete(key);
    return action +
      "\n\nYOU DEFEATED REDEX! 💀🔥\n" +
      "GG, YOU ACTUALLY COOKED ME.";
  }

  // REDEX'S TURN
  let redexDamage = 0;
  let redexMove = "";

  const roll = Math.random();

  if (battle.redexCE >= 40 && roll > 0.75) {
    battle.redexCE -= 40;
    redexDamage = 30;
    redexMove = "🔥 REDEX USED DOMAIN EXPANSION!";
  } else if (
    battle.redexCE >= 20 &&
    roll > 0.35
  ) {
    battle.redexCE -= 20;
    redexDamage = 20;
    redexMove = "⚡ REDEX USED A CURSED TECHNIQUE!";
  } else {
    redexDamage = 12;
    redexMove = "👊 REDEX ATTACKED!";
  }

  if (playerDefense) {
    redexDamage = Math.max(0, redexDamage - 15);
    redexMove += "\n🛡️ YOUR DEFENSE REDUCED THE DAMAGE!";
  }

  battle.playerHP = Math.max(
    0,
    battle.playerHP - redexDamage
  );

  battle.playerCE = Math.min(
    100,
    battle.playerCE + 8
  );

  battle.redexCE = Math.min(
    100,
    battle.redexCE + 8
  );

  if (battle.playerHP <= 0) {
    battles.delete(key);

    return action +
      "\n" + redexMove +
      "\n\nREDEX WINS! 😭💀\n" +
      "Better luck next time, sorcerer.";
  }

  battle.round++;

  battles.set(key, battle);

  return action +
    "\n" + redexMove +
    "\n\n**ROUND " + battle.round + "**" +
    "\nYour HP: " + battle.playerHP +
    " | CE: " + battle.playerCE +
    "\nRedex HP: " + battle.redexHP +
    " | CE: " + battle.redexCE +
    "\n\nYour move!";
}

// BOT ONLINE
client.once("ready", () => {
  console.log(`Redex Official online as ${client.user.tag}`);
});

// CHAT SYSTEM
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.channelId !== CHAT_CHANNEL_ID) return;

  if (!process.env.GROQ_API_KEY) {
    return message.reply(
      "My AI connection isn't configured 😭"
    );
  }

  const userId = message.author.id;
  const key = `${message.guildId}:${userId}`;
  const now = Date.now();

  const playerMessage = message.content
    .replace(/<@!?\d+>/g, "")
    .trim();

  if (!playerMessage) return;

  // APOLOGY AND FORGIVENESS
  const apology =
    /\b(sorry|sry|my bad|i apologize|forgive me)\b/i;

  const spam = spamTracker.get(userId);

  if (apology.test(playerMessage) && spam?.level > 0) {
    spamTracker.delete(userId);

    return message.reply(
      "Aight you're good 😭🤝 apology accepted. We're cool."
    );
  }

  // ANTI-SPAM
  const tracker = spam || {
    times: [],
    level: 0
  };

  tracker.times = tracker.times.filter(
    time => now - time < 10000
  );

  tracker.times.push(now);

  if (tracker.times.length > 5) {
    tracker.level = Math.min(tracker.level + 1, 3);
    spamTracker.set(userId, tracker);

    const warnings = [
      "BRO 😭 chill, let me breathe.",
      "ARE YOU OKAY?? STOP SPAMMING ME 💀",
      "Alr bro YOUR GAY LICKSRCOOL"
    ];

    return message.reply(
      warnings[tracker.level - 1]
    );
  }

  spamTracker.set(userId, tracker);

  // JJK BATTLE
  if (battles.has(key)) {
    const result = handleBattle(key, playerMessage);
    return message.reply(result);
  }

  const challenge =
    /\b(fight me|battle me|1v1|let's battle|lets battle|wanna fight|domain clash|jjk battle|challenge me)\b/i;

  if (challenge.test(playerMessage)) {
    const result = startBattle(key);
    return message.reply(result);
  }

  // CONVERSATION MEMORY
  const history = conversations.get(key) || [];

  history.push({
    role: "user",
    content: `${message.author.username}: ${playerMessage}`
  });

  while (history.length > 6) {
    history.shift();
  }

  try {
    await message.channel.sendTyping();

    const reply = await askGroq(history);

    history.push({
      role: "assistant",
      content: reply
    });

    conversations.set(key, history);

    await message.reply(reply.slice(0, 1900));

  } catch (error) {
    console.error("REDEX AI ERROR:", error);

    await message.reply(
      "My brain just lagged 💀 Give me a sec."
    ).catch(console.error);
  }
});

// DISCORD LOGIN
client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error("Discord login error:", error);
});
