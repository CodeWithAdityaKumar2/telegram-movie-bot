require("dotenv").config();

const XLSX = require("xlsx");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

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

// CHANGE THESE Row-1
// const START_ROW = 1;
// const END_ROW = 10;

// Reverce Order Row-1
const START_ROW = 14818;
const END_ROW = 22226;

// const START_ROW = 7409;
// const END_ROW = 14818;

// const START_ROW = 1;
// const END_ROW = 7409;

async function main() {
  await client.connect();

  console.log("Telegram Connected");

  const workbook =
    XLSX.readFile("movies.xlsx");

  const sheet =
    workbook.Sheets[
    workbook.SheetNames[0]
    ];

  const rows =
    XLSX.utils.sheet_to_json(sheet);

  //   const selectedRows =
  //     rows.slice(
  //       START_ROW - 1,
  //       END_ROW
  //     );


  // Reverce Order 
  const selectedRows = rows
    .slice(START_ROW - 1, END_ROW)
    .reverse();

  console.log(
    `Processing ${selectedRows.length} rows`
  );

  for (const row of selectedRows) {

    try {

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
          message.document.mimeType.startsWith("video/")
        );

      if (!isVideo) {
        console.log(
          `Skipping ${messageId} - Not a video`
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

      console.log(
        `Done ${messageId}`
      );

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            5000
          )
      );

    } catch (e) {

      console.log(
        `Error row ${row.message_id}`,
        e.message
      );

    }
  }

  console.log("Finished");

  process.exit();
}

main();