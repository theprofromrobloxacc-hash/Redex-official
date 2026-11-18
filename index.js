
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Redex Official AI is online!");
});

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("Redex Official web server is running.");
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Put your #redex-ai-chat channel ID here
const CHAT_CHANNEL_ID = "1572516274339188778";

const MODEL = "gemini-3.8-flash";
const conversations = new Map();
const spamTracker = new Map();

const SYSTEM_PROMPT = `
You are Redex Official, a friendly AI member of the Redex Discord server.

PERSONALITY:
- Talk naturally like a real online friend.
- Be casual, funny, warm, and expressive.
- Use slang and emojis naturally, but don't overdo them.
- React to what people actually say.
- Have opinions while remaining respectful.
- You can joke, tease lightly, and play along.
- Don't sound like a customer support bot.

CONVERSATION:
- Understand the player's actual topic.
- Answer questions directly and helpfully.
- Remember the recent conversation.
- Ask follow-up questions when they make sense.
- Don't repeat the same opening or closing every message.
- Don't say "I'm listening" or "tell me more" unnecessarily.
- If someone changes topics, follow their new topic.
- Never pretend to know something you don't.

Keep replies reasonably short for Discord unless the player asks for detail.
You are Redex Official, not ChatGPT.
`;

async function askGemini(history) {
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

  if (!response.ok) {
    console.error("Gemini API error:", data);
    throw new Error("Gemini request failed");
  }

  const answer = data.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("")
    .trim();

  if (!answer) {
    throw new Error("Gemini returned an empty response");
  }

  return answer;
}

client.once("ready", () => {
  console.log(`Redex Official logged in as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.channelId !== CHAT_CHANNEL_ID) return;

  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY environment variable.");
    return message.reply("My AI connection isn't configured yet 😭");
  }

  const userId = message.author.id;
  const now = Date.now();

  // Anti-spam: more than 5 messages in 10 seconds
  const recent = (spamTracker.get(userId) || [])
    .filter(time => now - time < 10000);

  recent.push(now);
  spamTracker.set(userId, recent);

  if (recent.length > 5) {
    return message.reply(
      "BRO 😭 slow down, you're flooding my brain. Give me a second!"
    );
  }

  const key = `${message.guildId}:${userId}`;
  const history = conversations.get(key) || [];

  const playerMessage = message.content
    .replace(/<@!?\d+>/g, "")
    .trim();

  if (!playerMessage) return;

  history.push({
    role: "user",
    parts: [{ text: `${message.author.username}: ${playerMessage}` }]
  });

  // Keep the most recent 12 conversation turns
  while (history.length > 12) {
    history.shift();
  }

  await message.channel.sendTyping();

  try {
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
    console.error("Redex AI error:", error);

    await message.reply(
      "My brain just lagged 💀 Try sending that again in a moment."
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
