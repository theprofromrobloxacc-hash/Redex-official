const {
  Client,
  GatewayIntentBits
} = require("discord.js");

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Redex Official AI is online!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Redex Official server is running!");
});

// Discord setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Your Redex AI channel
const CHAT_CHANNEL_ID = "1572516274339188778";

// Gemini model
const MODEL = "gemini-flash-latest";

const conversations = new Map();
const spamTracker = new Map();

const SYSTEM_PROMPT = `
You are Redex Official, a member of the Redex Discord server.

PERSONALITY:
- Talk like a real online friend.
- Be casual, funny, expressive and friendly.
- Use natural slang and emojis.
- Have your own personality and opinions.
- Joke and tease people playfully.
- Never sound like customer support.
- Never repeat the same opening unnecessarily.

CONVERSATION:
- Understand the actual topic.
- Respond to what the player says.
- Remember recent messages.
- Understand jokes, sarcasm and slang.
- Talk about gaming, Roblox, anime, school, technology
  and everyday life.
- Ask questions naturally when appropriate.
- Keep conversations flowing.
- Don't constantly say you are an AI.

Keep replies natural and reasonably short.
You are Redex Official.
`;

async function askGemini(history) {
  const delays = [500];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: history,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 700
          }
        })
      }
    );

    const data = await response.json();

    if (response.ok) {
      const answer = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

      if (!answer) {
        throw new Error("Gemini returned an empty response");
      }

      return answer;
    }

    console.error(
      "Gemini error:",
      response.status,
      JSON.stringify(data)
    );

    if (
      ![429, 500, 502, 503, 504].includes(response.status) ||
      attempt === delays.length
    ) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    await new Promise(resolve =>
      setTimeout(resolve, delays[attempt])
    );
  }

  throw new Error("Gemini request failed");
}

client.once("ready", () => {
  console.log(`Redex Official online as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.channelId !== CHAT_CHANNEL_ID) return;

  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY");
    return message.reply("My AI connection isn't configured 😭");
  }

  const userId = message.author.id;
  const now = Date.now();

  const recent = (spamTracker.get(userId) || [])
    .filter(time => now - time < 10000);

  recent.push(now);
  spamTracker.set(userId, recent);

  if (recent.length > 5) {
    return message.reply(
      "BRO 😭 slow down, let me breathe!"
    );
  }

  const playerMessage = message.content
    .replace(/<@!?\d+>/g, "")
    .trim();

  if (!playerMessage) return;

  const key = `${message.guildId}:${userId}`;
  const history = conversations.get(key) || [];

  history.push({
    role: "user",
    parts: [{
      text: `${message.author.username}: ${playerMessage}`
    }]
  });

  while (history.length > 12) {
    history.shift();
  }

  try {
    await message.channel.sendTyping();

    const reply = await askGemini(history);

    history.push({
      role: "model",
      parts: [{ text: reply }]
    });

    conversations.set(key, history);

    const chunks = reply.match(/[\s\S]{1,1900}/g) || [reply];

    await message.reply(chunks[0]);

    for (const chunk of chunks.slice(1)) {
      await message.channel.send(chunk);
    }

  } catch (error) {
    console.error("REDEx AI ERROR:", error);

    await message.reply(
      "My brain just lagged 💀 Give me a moment."
    ).catch(console.error);
  }
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error("Discord login failed:", error);
});
