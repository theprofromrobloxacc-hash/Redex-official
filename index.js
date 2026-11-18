
const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const spamTracker = new Map();

client.once("ready", () => {
  console.log(`Redex Official is online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const userId = message.author.id;
  const now = Date.now();

  let data = spamTracker.get(userId);

  if (!data || now - data.lastMessage > 30000) {
    data = { count: 0, lastMessage: now };
  }

  data.count++;
  data.lastMessage = now;
  spamTracker.set(userId, data);

  const text = message.content
    .replace(/<@!?\d+>/g, "")
    .trim()
    .toLowerCase();

  let reply;

  // Spam anger system
  if (data.count >= 7) {
    reply = "BRO PLEASE LEAVE ME ALONE 😭 I'M TRYING TO EXIST.";
  } else if (data.count >= 5) {
    reply = "YOU AGAIN?! 😭 STOP SPAMMING MY NAME.";
  } else if (data.count >= 3) {
    reply = "Okay, I heard you the first time 💀";
  } else if (text.includes("hello") || text.includes("hey") || text.includes("hi")) {
    reply = [
      "Yo! What's up? 🔴",
      "Heyyy! Welcome back 😎",
      "What's good? Need something?",
      "A wild Redex has appeared."
    ][Math.floor(Math.random() * 4)];
  } else if (text.includes("who are you")) {
    reply = "I'm Redex Official. The bot carrying this entire server 💀";
  } else if (text.includes("how are you")) {
    reply = "I'm doing amazing. My CPU is chilling. How about you?";
  } else if (text.includes("thank")) {
    reply = "No problem! Redex got you 🔴";
  } else if (text.includes("love you")) {
    reply = "Awww 😭 Redex appreciates you too.";
  } else if (text.includes("roblox")) {
    reply = "ROBLOX MENTIONED 🗣️ What game are we playing?";
  } else if (text.includes("gaming") || text.includes("game")) {
    reply = "Gaming time? Count me in. Well... digitally 💀";
  } else if (text.includes("stupid") || text.includes("dumb")) {
    reply = "Look who's talking 😭";
  } else if (text.includes("help")) {
    reply = "Tell me what's wrong and I'll try to help!";
  } else if (text.includes("redex")) {
    reply = "REDEx? That's me. The official one 😎";
  } else {
    reply = [
      "Interesting... tell me more 👀",
      "Bro, I'm listening. Continue.",
      "That's crazy 💀",
      "I see. What happened next?",
      "You have my attention.",
      "My digital ears are listening 🔴",
      "Bro is cooking something..."
    ][Math.floor(Math.random() * 7)];
  }

  try {
    await message.reply(reply);
  } catch (error) {
    console.error("Reply error:", error);
  }
});

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Redex Official is online!");
}).listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);
