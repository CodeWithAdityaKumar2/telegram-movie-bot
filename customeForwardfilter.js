require("dotenv").config();

const express = require("express");
const XLSX = require("xlsx");

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const app = express();

app.use(express.json());

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;

const client = new TelegramClient(
    new StringSession(process.env.STRING_SESSION),
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

const SOURCE_CHANNEL = Number(
    process.env.SOURCE_CHANNEL
);

const TARGET_CHANNEL = Number(
    process.env.TARGET_CHANNEL
);

let rows = [];

let isRunning = false;
let currentRow = 0;
let totalProcessed = 0;
let totalSuccess = 0;
let totalSkipped = 0;
let totalErrors = 0;

function loadExcel() {
    const workbook = XLSX.readFile(
        "movies.xlsx"
    );

    const sheet =
        workbook.Sheets[
        workbook.SheetNames[0]
        ];

    rows =
        XLSX.utils.sheet_to_json(sheet);

    console.log(
        `Loaded ${rows.length} rows`
    );
}

async function sleep(ms) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}

async function processRows(
    startRow,
    endRow,
    reverse = true
) {

    if (isRunning) {
        return;
    }

    isRunning = true;

    let selectedRows =
        rows.slice(
            startRow - 1,
            endRow
        );

    if (reverse) {
        selectedRows.reverse();
    }

    console.log(
        `Processing ${selectedRows.length} rows`
    );

    for (const row of selectedRows) {

        if (!isRunning) {
            console.log(
                "Process stopped"
            );
            break;
        }

        try {

            currentRow++;

            const messageId =
                Number(row.message_id);

            console.log(
                `Sending ${messageId}`
            );

            const msg =
                await client.getMessages(
                    SOURCE_CHANNEL,
                    {
                        ids: [messageId]
                    }
                );

            const message =
                Array.isArray(msg)
                    ? msg[0]
                    : msg;

            if (
                !message ||
                !message.media
            ) {

                totalSkipped++;

                console.log(
                    `Skipping ${messageId}`
                );

                continue;
            }

            const isVideo =
                message.video ||
                (
                    message.document &&
                    message.document.mimeType &&
                    message.document.mimeType.startsWith(
                        "video/"
                    )
                );

            if (!isVideo) {

                totalSkipped++;

                console.log(
                    `Skipping ${messageId} - Not Video`
                );

                continue;
            }

            await client.sendFile(
                TARGET_CHANNEL,
                {
                    file: message.media,
                    caption:
                        message.message || ""
                }
            );

            totalSuccess++;

            console.log(
                `Done ${messageId}`
            );

            await sleep(5000);

        } catch (err) {

            totalErrors++;

            console.log(
                `Error row ${row.message_id}`,
                err.message
            );
        }

        totalProcessed++;
    }

    isRunning = false;

    console.log(
        "Process Finished"
    );
}

app.post(
    "/start",
    async (req, res) => {

        try {

            const {
                startRow,
                endRow,
                reverse = true
            } = req.body;

            if (isRunning) {
                return res.status(400)
                    .json({
                        error:
                            "Already running"
                    });
            }

            processRows(
                Number(startRow),
                Number(endRow),
                reverse
            );

            res.json({
                success: true,
                startRow,
                endRow,
                reverse
            });

        } catch (err) {

            res.status(500)
                .json({
                    error:
                        err.message
                });
        }
    }
);

app.post(
    "/stop",
    (req, res) => {

        isRunning = false;

        res.json({
            success: true,
            message:
                "Stopping process"
        });
    }
);

app.get(
    "/status",
    (req, res) => {

        res.json({
            running: isRunning,
            currentRow,
            totalProcessed,
            totalSuccess,
            totalSkipped,
            totalErrors
        });
    }
);

app.get(
    "/health",
    (req, res) => {

        res.json({
            status: "ok"
        });
    }
);

(async () => {

    await client.connect();

    console.log(
        "Telegram Connected"
    );

    loadExcel();

    app.listen(
        process.env.PORT || 3000,
        () => {

            console.log(
                `Server Running`
            );
        }
    );

})();