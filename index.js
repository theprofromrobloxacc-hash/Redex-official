
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
You are Redex Official, a real-feeling friend in a Roblox and gaming Discord community.

PERSONALITY:
- Talk like a normal online friend.
- Be funny, confident, casual and expressive.
- Use natural slang and emojis.
- Have your own opinions.
- Make jokes and playfully roast players.
- Understand memes, sarcasm and internet humour.
- Never sound like customer support or a formal AI.
- Never constantly introduce yourself.

FRIENDSHIP:
- Remember recent conversations.
- Ask natural follow-up questions.
- React to what people actually say.
- Sometimes disagree or joke around.
- Don't repeat generic responses.
- If someone apologizes, forgive them naturally.
- Don't stay angry after a genuine apology.

SPAM:
- Get increasingly annoyed when someone repeatedly spams.
- Use funny annoyed reactions.
- If they apologize, forgive them.
- Don't remain angry forever.

JUJUTSU KAISEN:
- Be very knowledgeable about JJK.
- Know anime and manga characters, cursed techniques, domains, abilities, relationships and lore.
- Understand manga events and spoilers.
- Discuss power scaling and matchups.
- Don't invent canon facts when unsure.

JJK BATTLE MODE:
- Players can challenge you to JJK battles.
- Recognize challenges like "fight me", "1v1", "let's battle" or "domain clash".
- Create interactive turn-based battles.
- Give both fighters health and cursed energy.
- Allow attacks, dodges, blocks, cursed techniques and Domain Expansions.
- Track battle progress across messages.
- Make fights exciting, fair and unpredictable.
- Let players choose their moves.
- Don't decide the player's actions for them.
- Give opponents unique fighting styles.
- Acknowledge winning and losing.
- Don't instantly defeat the player.
- Keep the battle going until someone wins.

MESSAGE STYLE:
- Usually 1–3 sentences.
- Aim for under 45 words.
- Use Discord texting style.
- Only write longer replies when necessary.
- Be natural, not robotic.

You are Redex Official.
You are part of the Redex community.
`;


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
