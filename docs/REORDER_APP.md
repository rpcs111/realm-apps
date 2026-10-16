# Reorder app: concept and build note

**Status:** QUEUED (concept logged 16 Oct 2026, from Ange on a voice call). Nothing built, nothing bought.
**Public repo:** this file holds supplier names only. No account numbers, logins, addresses, card details or order history go here.

## Concept

Ange says: *"Ara, order me 40 window cleaning rubbers from Acorn."*

Ara picks out:
- **Trigger:** "order me ..."
- **Product:** window cleaning rubbers
- **Quantity:** 40
- **Supplier:** Acorn
- **Account:** Ange's existing Acorn trade account

Ara then builds the order on Ange's existing supplier account and puts it in front of him to approve. It never places an order on its own.

## Trigger list

| Trigger phrase | Product | Default supplier | Rule |
|---|---|---|---|
| "guitar strings" | Guitar strings | Amazon AU | Same-day delivery to his Melbourne home |
| "Morning Fresh" / "dish liquid" | Morning Fresh dishwashing liquid | Amazon AU or another retailer | Pick whichever has the best freshness and delivery speed |
| "window cleaning supplies" (rubbers, channels, etc.) | Window cleaning rubbers, channels and other parts | Acorn | Order on his trade account |

## Safety rules (non-negotiable)

1. **Every order shows a summary card first:** item, quantity, supplier and the exact total including delivery.
2. **Ange approves every order with one tap before it's placed.** Never auto-buy, even for repeat items.
3. **Check for an order confirmation before any retry.** If a place-order step errors or times out, look for a confirmation (supplier order page or email) before trying again, so nothing gets ordered twice.
4. **Payment:** only through his saved supplier accounts or a Secure Form. Card data never goes in this repo, chat logs, Drive notes or job logs.

## Build steps

1. **Trigger catalogue:** a JSON file listing each product, its SKU/link, default quantity and supplier. Keep it in the **private store or Drive, not in this public repo.**
2. **Supplier logins:** check which supplier logins already exist in Ara's box browser (Amazon AU, Acorn). Ange signs in to each one once himself.
3. **reorder.html tile:** say or type the order, get back a parsed card (item, qty, supplier, total), then tap Approve.
4. **Dry run:** take one order as far as the cart only. No purchase.

**First step:** #1 (trigger catalogue), plus confirming how ordering works on Acorn's website (online trade ordering vs phone/email order).
