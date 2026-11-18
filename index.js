
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Redex Official is online!");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Redex Official server started.");
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Replace this with your actual chat channel ID
const CHAT_CHANNEL_ID = "1572516274339188778";

const histories = new Map();
const spam = new Map();

function getReply(text, history, user) {
  const lower = text.toLowerCase();

  if (lower.includes("hello") || lower.includes("hey") || lower.includes("hi")) {
    return `Yooo ${user}! What's up? 😭`;
  }

  if (lower.includes("how are you")) {
    return "I'm chilling bro, just watching the server 💀 How about you?";
  }

  if (lower.includes("roblox")) {
    return "ROBLOX MENTIONED 🔥 What game are you playing?";
  }

  if (lower.includes("game")) {
    return "What game are we talking about? 👀";
  }

  if (lower.includes("sad") || lower.includes("depressed")) {
    return "Hey bro, what's going on? You can talk to me. I'm listening ❤️";
  }

  if (lower.includes("joke")) {
    return "Why did the Roblox player cross the road? To get disconnected on the other side 💀";
  }

  if (lower.includes("bye")) {
    return "Later bro! Don't forget about Redex 😎";
  }

  if (lower.includes("?")) {
    return "Interesting question bro 👀 Give me a little more context so I can help.";
  }

  return "Wait bro, tell me more about that 😭";
}

client.once("ready", () => {
  console.log(`Redex Official online as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.channelId !== CHAT_CHANNEL_ID) return;

  const userId = message.author.id;
  const now = Date.now();

  const previous = spam.get(userId) || [];
  const recent = previous.filter(time => now - time < 10000);
  recent.push(now);
  spam.set(userId, recent);

  if (recent.length > 5) {
    await message.reply("BRO 😭 STOP SPAMMING ME. LET ME BREATHE.");
    return;
  }

  const history = histories.get(userId) || [];

  history.push({
    role: "user",
    content: message.content
  });

  if (history.length > 10) history.shift();

  histories.set(userId, history);

  const reply = getReply(
    message.content,
    history,
    message.author.username
  );

  await message.reply(reply);
});

client.login(process.env.DISCORD_TOKEN);
