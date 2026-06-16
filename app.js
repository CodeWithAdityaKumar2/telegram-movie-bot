const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const XLSX = require("xlsx");
require("dotenv").config();

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;

// First run: empty string
// After login: save generated string session here
// const stringSession = new StringSession("");
const stringSession = new StringSession(
    process.env.STRING_SESSION || ""
);

// const CHANNEL_ID = -1001842237124;
const CHANNEL_ID = Number(process.env.CHANNEL_ID);

(async () => {
    const client = new TelegramClient(
        stringSession,
        apiId,
        apiHash,
        {
            connectionRetries: 5,
            proxy: {
                ip: "69.61.200.104",
                port: 36181,
                socksType: 5,
            },
        }
    );

    await client.start({
        phoneNumber: async () => await input.text("Phone: "),
        password: async () => await input.text("2FA Password: "),
        phoneCode: async () => await input.text("Code: "),
        onError: (err) => console.log(err),
    });

    console.log("Logged in!");

    console.log(
        "Save this session for future logins:\n",
        client.session.save()
    );

    const rows = [];

    let offsetId = 0;

    while (true) {
        const messages = await client.getMessages(CHANNEL_ID, {
            limit: 100,
            offsetId,
        });

        if (!messages.length) {
            break;
        }

        for (const msg of messages) {
            if (!msg.media) continue;

            let fileName = "";
            let mediaType = "";
            let fileSize = "";

            try {
                if (msg.document) {
                    mediaType = "document";

                    fileSize =
                        msg.document.size || "";

                    const attrs =
                        msg.document.attributes || [];

                    const fileAttr = attrs.find(
                        (a) => a.fileName
                    );

                    if (fileAttr) {
                        fileName = fileAttr.fileName;
                    }
                }

                rows.push({
                    message_id: msg.id,
                    file_name: fileName,
                    caption: msg.message || "",
                    media_type: mediaType,
                    file_size: fileSize,
                    date: msg.date,
                    message_link:
                        `https://t.me/c/1842237124/${msg.id}`,
                });
            } catch (e) {
                console.log(
                    `Skipping ${msg.id}`,
                    e.message
                );
            }
        }

        offsetId = messages[messages.length - 1].id;

        console.log(
            `Processed ${rows.length} messages...`
        );
    }

    const worksheet =
        XLSX.utils.json_to_sheet(rows);

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Movies"
    );

    XLSX.writeFile(
        workbook,
        "movies.xlsx"
    );

    console.log(
        `Done! Exported ${rows.length} records`
    );

    await client.disconnect();
})();