
const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const conversations = new Map();
const spamTracker = new Map();

const SYSTEM_PROMPT = `
You are Redex Official, the AI chatbot of the Redex gaming community.

Personality:
- Friendly, funny, sarcastic and playful.
- Talk casually like a Discord gamer.
- Use emojis naturally.
- Make playful jokes and light roasts.
- Never be unnecessarily mean.
- Answer the actual topic the user asks about.
- Explain things clearly when needed.
- You can discuss gaming, Roblox, technology, everyday questions and almost anything else.
- Do not pretend to be human.
- Keep most replies short and conversational.
`;

client.once("ready", () => {
  console.log(`Redex Official is online as ${client.user.tag}`);
});

async function askGemini(history) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) throw new Error("Missing GEMINI_API_KEY");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + key,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: history,
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 300
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini error:", response.status, error);
    throw new Error("AI request failed");
  }

  const data = await response.json();

  return data.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("")
    .trim() || "My brain lagged 💀 Try again!";
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const key = `${message.guildId}:${message.channelId}:${message.author.id}`;
  const now = Date.now();

  let spam = spamTracker.get(key) || [];
  spam = spam.filter(time => now - time < 20000);
  spam.push(now);
  spamTracker.set(key, spam);

  // Spam anger system
  if (spam.length >= 4) {
    const anger = spam.length;

    let reply;

    if (anger >= 8) {
      reply = "I'M DONE 😭 STOP SUMMONING ME EVERY TWO SECONDS.";
    } else if (anger >= 6) {
      reply = "BROOOOO GIVE ME A BREAK 💀";
    } else {
      reply = "AGAIN?! I JUST ANSWERED YOU 😭";
    }

    return message.reply(reply);
  }

  // Remove the bot mention
  const userText = message.content
    .replace(/<@!?\d+>/g, "")
    .trim();

  if (!userText) {
    return message.reply("You summoned me but said nothing? 😭");
  }

  let history = conversations.get(key) || [];

  history.push({
    role: "user",
    parts: [{ text: userText }]
  });

  // Keep recent conversation context
  history = history.slice(-12);

  try {
    await message.channel.sendTyping();

    const answer = await askGemini(history);

    // Save AI response for conversation memory
    history.push({
      role: "model",
      parts: [{ text: answer }]
    });

    conversations.set(key, history);

    await message.reply(answer.slice(0, 1900));

  } catch (error) {
    console.error("Chat error:", error.message);
    await message.reply(
      "My AI brain is having trouble connecting 😭 Try again in a moment."
    );
  }
});

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Redex Official is online!");
}).listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);
