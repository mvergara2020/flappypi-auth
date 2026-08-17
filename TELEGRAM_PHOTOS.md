# Shared photos to Telegram

Shared game photos are stored in R2 and indexed in D1 before a small delivery
job is written to a dedicated Cloudflare Queue. The queue consumer reads the
photo from R2, sends it with its comment through Telegram `sendPhoto`, and
stores the delivery result in D1.

The browser never receives the Telegram bot token.

## Environment mapping

| Runtime | Wrangler target | Label | Queue |
| --- | --- | --- | --- |
| Localhost | local `wrangler dev` | `LOCALHOST` | local Queue simulator |
| Testnet | `--env qa` | `TESTNET` | `flappypi-photo-telegram-testnet` |
| Mainnet | top-level configuration | `MAINNET` | `flappypi-photo-telegram-mainnet` |

Local Telegram delivery is disabled unless `TELEGRAM_LOCAL_ENABLED=true` is
present in the local `.dev.vars` file. Testnet and mainnet delivery are enabled
by their Wrangler variables and require secrets to be configured separately.

## Required bindings and secrets

- `TELEGRAM_PHOTO_QUEUE`: environment-specific Queue binding.
- `GAME_PHOTOS`: environment-specific R2 bucket.
- `DB`: environment-specific D1 database.
- `TELEGRAM_BOT_TOKEN`: Telegram Bot API token; always store it as a secret.
- `TELEGRAM_CHAT_ID`: destination group or supergroup ID; stored as a secret to
  keep deployment-specific configuration out of Git.
- `TELEGRAM_MESSAGE_THREAD_ID`: optional forum topic ID; also stored as a
  secret when used.

Never add a Telegram token to `wrangler.toml`, frontend JavaScript, logs, or a
committed environment file.

## First-time Cloudflare setup

Create the queues before the first deployment:

```powershell
npx wrangler queues create flappypi-photo-telegram-testnet
npx wrangler queues create flappypi-photo-telegram-testnet-dlq
npx wrangler queues create flappypi-photo-telegram-mainnet
npx wrangler queues create flappypi-photo-telegram-mainnet-dlq
```

Apply the delivery-state migration:

```powershell
npx wrangler d1 execute DB --env qa --remote --file migrations/2026-08-16-game-photo-telegram-v7.sql
npx wrangler d1 execute DB --remote --file migrations/2026-08-16-game-photo-telegram-v7.sql
```

## Configure testnet

Each command prompts for its value without putting the value in source code:

```powershell
npx wrangler secret put TELEGRAM_BOT_TOKEN --env qa
npx wrangler secret put TELEGRAM_CHAT_ID --env qa
```

For a Telegram forum topic:

```powershell
npx wrangler secret put TELEGRAM_MESSAGE_THREAD_ID --env qa
```

Deploy testnet:

```powershell
npx wrangler deploy --env qa
```

## Configure mainnet

The top-level Wrangler target uses the production D1 database and R2 bucket:

```powershell
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put TELEGRAM_MESSAGE_THREAD_ID
npx wrangler deploy --env=""
```

Omit `TELEGRAM_MESSAGE_THREAD_ID` when the destination is not a forum topic.

## Configure localhost

Create an untracked `.dev.vars` file in this repository:

```dotenv
TELEGRAM_LOCAL_ENABLED=true
TELEGRAM_BOT_TOKEN=replace-locally
TELEGRAM_CHAT_ID=replace-locally
# TELEGRAM_MESSAGE_THREAD_ID=optional
```

Use a sandbox Telegram group for localhost. If `TELEGRAM_LOCAL_ENABLED` is
absent or false, photos still save locally but their delivery status is
recorded as `disabled` and nothing is sent to Telegram.

This project already keeps authentication credentials in `.env.local`.
Wrangler normally chooses `.dev.vars` instead of loading both files, so start
the local Worker through the repository script:

```powershell
.\start-local-worker.ps1
```

The script explicitly loads `.env.local` first and `.dev.vars` second. This
preserves `JWT_SECRET` and the existing login configuration while adding the
local Telegram settings. Neither file is committed to Git.

## Delivery states

The `game_photo_telegram_deliveries` table uses `(photo_id, environment)` as
its primary key. Expected states are:

- `disabled`: local delivery intentionally disabled.
- `configuration_missing`: a required binding or secret is absent.
- `queued`: Cloudflare accepted the delivery job.
- `sending`: the consumer is calling Telegram.
- `retrying`: Telegram or the network returned a transient error.
- `sent`: Telegram confirmed the message; its message ID is stored.
- `failed`: Telegram returned a permanent error.
- `enqueue_failed`: the Queue did not accept the job.

The Queue retries transient failures up to ten times and then moves the job to
the environment-specific dead-letter queue.

## Safe runtime check

`GET /__debug/runtime` exposes booleans indicating whether the queue, token and
chat ID exist, but never returns their values. Check this endpoint immediately
after deploying each environment.
