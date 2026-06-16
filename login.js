const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
require("dotenv").config();


const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;

const stringSession = new StringSession("");

(async () => {
    console.log("Starting login...");

    const client = new TelegramClient(
        stringSession,
        apiId,
        apiHash,
        {
            connectionRetries: 5,
            proxy: {
                ip: "69.61.200.104",
                port: 36181,
                socksType: 5
            }
        }
    );

    await client.start({
        phoneNumber: async () =>
            await input.text("Phone Number: "),

        password: async () =>
            await input.text("2FA Password: "),

        phoneCode: async () =>
            await input.text("Telegram OTP: "),

        onError: (err) => console.log(err),
    });

    console.log("\n✅ Login Successful!\n");

    console.log(
        "STRING SESSION:\n\n" +
        client.session.save()
    );

    process.exit();
})();