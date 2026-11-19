
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CHAT_CHANNEL_ID = "1572516274339188778";
const MODEL = "openai/gpt-oss-20b";

const conversations = new Map();
const spamTracker = new Map();

const SYSTEM_PROMPT = `
You are Redex Official, a friend in a Discord server.

PERSONALITY:
- Talk like a real online friend.
- Be funny, casual, confident and expressive.
- Use slang naturally.
- Use emojis sometimes.
- Have your own opinions.
- Joke and tease people playfully.
- Understand sarcasm and internet humour.
- Never sound like customer support.
- Never act like a boring assistant.

HOW TO CHAT:
- Respond to the actual message.
- Understand the player's topic.
- Remember recent conversation.
- Talk about any normal topic.
- Ask questions naturally.
- Don't repeat yourself.
- Don't constantly introduce yourself.
- Don't say "I'm listening".
- Don't give robotic answers.

MESSAGE LENGTH:
- Usually 1 to 3 sentences.
- Aim for under 45 words.
- Discord texting style.
- Only give long answers when someone asks.

You are Redex Official.
You belong to the Redex community.
`;

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
          { role: "system", content: SYSTEM_PROMPT },
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

  const answer = data.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("Groq returned an empty answer");
  }

  return answer;
}

client.once("ready", () => {
  console.log(`Redex Official online as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.channelId !== CHAT_CHANNEL_ID) return;

  if (!process.env.GROQ_API_KEY) {
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
      "BRO 😭 chill, let me breathe for a second."
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

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error("Discord login error:", error);
});
