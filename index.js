const express = require("express");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
require("dotenv").config();


const app = express();
app.use(express.json());

const apiId = process.env.API_ID;
const apiHash = process.env.API_HASH;

const stringSession = new StringSession(
  process.env.STRING_SESSION
);

const client = new TelegramClient(
  stringSession,
  Number(apiId),
  apiHash,
  {
    connectionRetries: 5,
  }
);

(async () => {
  await client.connect();
  console.log("Telegram Connected");
})();

app.post("/forward", async (req, res) => {
  try {
    const { sourceChannel, targetChannel, messageId } =
      req.body;

    const msg = await client.getMessages(
      sourceChannel,
      {
        ids: messageId,
      }
    );

    await client.forwardMessages(
      targetChannel,
      {
        messages: [msg],
      }
    );

    res.json({
      success: true,
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});

app.listen(process.env.PORT || 3000);