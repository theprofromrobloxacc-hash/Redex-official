
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Redex Official is online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.mentions.has(client.user)) return;

  const text = message.content
    .replace(/<@!?\d+>/g, "")
    .trim()
    .toLowerCase();

  let reply;

  if (text.includes("hello") || text.includes("hey") || text.includes("hi")) {
    reply = "Hey! Welcome to Redex! 🔴";
  } else if (text.includes("who are you")) {
    reply = "I'm Redex Official, your friendly Redex Discord bot!";
  } else if (text.includes("how are you")) {
    reply = "I'm doing great! How about you? 😎";
  } else if (text.includes("help")) {
    reply = "Need help with Redex? Tell me what you need!";
  } else {
    reply = "Hey! I'm listening. Tell me more! 🔴";
  }

  await message.reply(reply);
});
const http = require("http");

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Redex Official is online!");
}).listen(process.env.PORT || 3000);
client.login(process.env.DISCORD_TOKEN);
