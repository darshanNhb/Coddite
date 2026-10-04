# Render Free Tier — Known Behavior

## Spin-Down on Inactivity

Render's free web services spin down after 15 minutes of inactivity. When a request arrives after spin-down:

- **Cold start time:** 30–60 seconds (sometimes longer depending on image size)
- **Effect on WebSockets:** Socket.IO connections will be dropped and need reconnection
- **Effect on BullMQ:** With `RUN_WORKER_IN_API=true`, background jobs pause during spin-down

## Impact on Coddite

- First request after inactivity will be slow (health check may time out)
- Real-time notifications will not work while the service is sleeping
- OTP emails will be delayed until the service wakes up
- Background moderation and embedding jobs will be delayed

## Mitigation Options

1. **Upgrade to Render paid tier** (~$7/month for an always-on instance) — eliminates spin-down entirely
2. **External pinger** — a free uptime monitor can keep the service warm by pinging `/health/live` every 14 minutes (but this works against Render's free tier intent)
3. **Accept the trade-off** — for development and demos, the 30-60 second wake time is tolerable

## For a Live Demo

If presenting the project:
1. Visit the API URL a minute before the demo to warm it up
2. Or upgrade to the paid tier for the demo period
