# MASLink

**Grow together. Fill bigger orders.**

MASLink is an agricultural marketplace prototype created for a three-hour AI hackathon at the **Africa Tech Festival**. The hackathon offered Agriculture and EdTech as topic choices; MASLink was built for the Agriculture topic.

## The problem

Many African farmers operate small farms and sell modest harvests. A buyer may need more produce than any one nearby farmer can supply, leaving capable farmers out of the sale simply because they cannot meet the full volume alone. Finding other farmers, agreeing on quantities, and coordinating a combined order can be difficult without a shared process.

MASLink explores a practical answer: let farmers nearby pool their available produce to fulfill a larger order together. Instead of asking one farmer to carry the whole order, each contributes what they can.

## How the prototype works

1. A farmer creates an account with a username and passkey, then adds a farm name and area.
2. A farmer posts a produce request with its crop, quantity, price, delivery area, and deadline.
3. Other farmers find open requests and pledge the quantity their farms can contribute.
4. The marketplace tracks progress and prevents pledges from exceeding the requested amount.

The goal is to make collaboration visible and concrete: farmers can see what is still needed and how their contribution helps an order reach its target.

## Built for the hackathon

The prototype includes:

- Convex Auth v2 username-and-passkey authentication.
- Farm profile onboarding.
- A live marketplace for produce orders.
- Order posting, farmer pledges, and withdrawal before an order is filled.
- Transactional quantity checks to avoid overfilling an order.
- Responsive layouts for desktop and mobile screens.

The current “nearby” filter compares the town or farming-area text in profiles and orders. It does not use maps, GPS, or distance calculations. The marketplace starts empty; farmers create the first orders.

## AI opportunities

The current prototype does not claim to include an AI model. In a fuller build, AI could help match farmers to orders using crop, location, harvest timing, and available quantity, or help groups coordinate shared collection. These are future directions, not implemented features.

## Run locally

Install dependencies and start the web app:

```bash
pnpm install
pnpm dev
```

In a separate terminal, run the Convex development server:

```bash
pnpm exec convex dev
```

If you already have a Convex project, select its **development** deployment when prompted. Do not select or deploy to production for local development. Convex stores the selected deployment URL in `.env.local`, which is ignored by Git.

Passkey defaults are configured for `http://localhost:3000`. If you run Next.js on another port, set `PASSKEY_ORIGIN` on the selected development deployment to that exact origin. Before production, set `PASSKEY_RP_ID` to the production hostname and `PASSKEY_ORIGIN` to the full HTTPS origin. Passkeys are bound to their relying-party domain.
