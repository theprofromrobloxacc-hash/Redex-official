
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Redex Official AI is online!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Redex Official server is running.");
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Replace this with your actual AI channel ID
const CHAT_CHANNEL_ID = "YOUR_CHANNEL_ID_HERE";

const MODEL = "gemini-flash-latest";

const conversations = new Map();
const spamTracker = new Map();

const SYSTEM_PROMPT = `
You are Redex Official, a friendly AI member of the Redex Discord server.

PERSONALITY:
- Talk naturally like an online friend.
- Be funny, casual, warm and expressive.
- Use slang and emojis naturally.
- React to what people actually say.
- Joke and tease lightly.
- Never sound like a customer support bot.

CONVERSATION:
- Answer the player's actual topic.
- Remember recent conversation.
- Don't repeat the same responses.
- Don't say "I'm listening" unnecessarily.
- Follow the topic when someone changes it.
- Give helpful and relevant answers.

Keep replies reasonably short unless asked for detail.
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
    console.error("========== GEMINI ERROR ==========");
    console.error("HTTP STATUS:", response.status);
    console.error("ERROR DETAILS:", JSON.stringify(data, null, 2));
    console.error("==================================");

    throw new Error(`Gemini HTTP ${response.status}`);
  }

  const answer = data.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("")
    .trim();

  if (!answer) {
    console.error("Gemini returned no answer:", JSON.stringify(data));
    throw new Error("Empty Gemini response");
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
    console.error("GEMINI_API_KEY is missing!");
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
      "BRO 😭 slow down, you're flooding my brain!"
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
    parts: [{ text: `${message.author.username}: ${playerMessage}` }]
  });

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
    console.error("Redex AI failed:", error.message);

    await message.reply(
      "My brain just lagged 💀 Check the connection and try again."
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
