# Jovie Admin Dashboard: User Manual

**Version:** Phase 11.5, 10 November 2026
**For:** everyone who works in the Jovie admin dashboard (`/admin`)
**Arabic version:** [admin-dashboard-manual.ar.md](admin-dashboard-manual.ar.md)

This manual explains each section of the dashboard, what each role can do, and how to handle everyday work such as orders, stock and messages. It describes the dashboard as it is built today. Where something is not built yet, it says so.

> **About the screenshots.** The places marked **[Screenshot S-xx]** are reserved for screenshots. Section 16 lists every screen to capture. Use test data only, never real customer details.

---

## Contents

1. [Signing in and your account](#1-signing-in-and-your-account)
2. [Finding your way around](#2-finding-your-way-around)
3. [Roles and permissions](#3-roles-and-permissions)
4. [Overview](#4-overview)
5. [Products](#5-products)
6. [Inventory](#6-inventory)
7. [Discounts and promo codes](#7-discounts-and-promo-codes)
8. [Orders](#8-orders)
9. [Sales and reports](#9-sales-and-reports)
10. [Contact messages](#10-contact-messages)
11. [Reviews](#11-reviews)
12. [Customers](#12-customers)
13. [Shipping and store settings](#13-shipping-and-store-settings)
14. [Admin users (super admins only)](#14-admin-users-super-admins-only)
15. [Audit log and notifications](#15-audit-log-and-notifications)
16. [Screens to capture](#16-screens-to-capture)
17. [Messages you may see and what to do](#17-messages-you-may-see-and-what-to-do)

---

## 1. Signing in and your account

- Open `/admin/login` and sign in with your work email and password.
- Accounts are created only by a **super admin**. There is no self sign-up.
- After **5 failed attempts in one minute**, sign-in is paused briefly. Wait a minute and try again.
- **Forgot your password?** Choose **Forgot your password?** on the sign-in page. The reset link is valid for **60 minutes**. You can ask for at most 3 links a minute.
- A new password must have **at least 12 characters, with upper-case and lower-case letters and a number**.
- Your session ends after a period of inactivity. You are then sent back to the sign-in page; sign in again and continue.
- If a super admin **deactivates** your account, you are signed out at once.

> **Important: email is not delivered in this environment.** The server writes emails to its log instead of sending them. Until a real mail service is set up, **password-reset and invitation emails do not reach anyone.** See [section 14.3](#143-invitations-the-current-email-limitation).

**[Screenshot S-01]** Sign-in page.

## 2. Finding your way around

- The **left menu** shows only the sections your role can use. On a phone, open it with the menu button.
- **Language:** switch between English and Arabic at any time. Arabic pages read right to left.
- **Times** are shown in **Egypt (Cairo) time**. **Money** is in Egyptian pounds (EGP).
- If you open a page your role cannot use, you see the page **"You do not have access to this section"**.
- **Two people editing at once:** if someone else (or the system) changed a record after you opened it, your change is **not saved**. The page tells you so and shows the current version. Check it and try again.
- Every important action asks for **confirmation** first. Actions that cannot be undone say so in the confirmation.

**[Screenshot S-02]** The dashboard with the left menu (English) · **[Screenshot S-03]** The same in Arabic.

## 3. Roles and permissions

Each admin has exactly **one role**, and the role decides what they can see and do. Roles and their permissions are fixed in the system; they cannot be edited from the dashboard.

### 3.1 The roles

| Role | Arabic name | Typical person | Sections |
|---|---|---|---|
| **Super admin** | مدير عام | Owner / IT lead | Everything, including admin users and the audit log |
| **Store manager** | مدير المتجر | Runs the online store | Products, discounts, inventory, orders, payments and reports, customers, shipping, reviews |
| **Product manager** | مدير المنتجات | Looks after the catalogue | Products, discounts, inventory, reviews |
| **Order manager** | مدير الطلبات | Handles orders and delivery | Orders (including recording cash on delivery), customers |
| **Content manager** | مدير المحتوى | Handles customer contact | Contact messages, reviews |
| **Content editor** | محرر محتوى | Edits website texts | Site content*, reading contact messages, reviews |
| **Support** | الدعم | Answers customers | Contact messages, viewing orders and customers |

\* **Site content:** the content editor's `content.manage` permission exists on the server, but **the dashboard has no page for editing website content yet.**

### 3.2 Permission matrix

✅ = allowed · — = not allowed

| Permission | What it allows | Super admin | Store manager | Product manager | Order manager | Content manager | Content editor | Support |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `admins.manage` | Admin users, audit log | ✅ | — | — | — | — | — | — |
| `settings.manage` | Store settings (checkout switches and amounts) | ✅ | — | — | — | — | — | — |
| `content.manage` | Website content (no dashboard page yet) | ✅ | — | — | — | — | ✅ | — |
| `messages.view` | Read contact messages | ✅ | — | — | — | ✅ | ✅ | ✅ |
| `messages.manage` | Change a message's status | ✅ | — | — | — | ✅ | — | ✅ |
| `catalog.manage` | Products, product discounts, promo codes | ✅ | ✅ | ✅ | — | — | — | — |
| `inventory.manage` | Stock, stock history, low-stock levels | ✅ | ✅ | ✅ | — | — | — | — |
| `orders.view` | See orders | ✅ | ✅ | — | ✅ | — | — | ✅ |
| `orders.manage` | Change order stages, internal note | ✅ | ✅ | — | ✅ | — | — | — |
| `payments.manage` | Payment details, reports, exports, record cash | ✅ | ✅ | — | — | — | — | — |
| `payments.record_cod` | Record cash on delivery **only** | ✅ | — | — | ✅ | — | — | — |
| `customers.view` | See customers (view only) | ✅ | ✅ | — | ✅ | — | — | ✅ |
| `shipping.manage` | Shipping fees and delivery per governorate | ✅ | ✅ | — | — | — | — | — |
| `reviews.manage` | Approve, hide or reject reviews | ✅ | ✅ | ✅ | — | ✅ | ✅ | — |

**Some actions need two permissions:**

| Action | Needs | Who can |
|---|---|---|
| Export the orders list to Excel | `orders.view` + `payments.manage` | Super admin, store manager |
| Sales and reports (and their exports) | `orders.view` + `payments.manage` | Super admin, store manager |
| Inventory report | `orders.view` + `payments.manage` + `inventory.manage` | Super admin, store manager |
| Put returned goods back in stock | `orders.manage` + `inventory.manage` | Super admin, store manager |
| Record cash on delivery as collected | `payments.manage` **or** `payments.record_cod` | Super admin, store manager, order manager |

### 3.3 Safety rules for accounts

- At least **one active super admin** must always remain.
- **Nobody can change their own role**, not even a super admin.
- A deactivated admin is **signed out immediately**. Their account and history are kept and they can be reactivated.

## 4. Overview

The first page after sign-in (`/admin`), available to every role. It shows the key figures and shortcuts that your role can use. Figures you are not allowed to see are not shown.

**[Screenshot S-04]** Overview (store manager).

## 5. Products

*Who: super admin, store manager, product manager.* · `/admin/products`

- The products of the Jovie store. **Each product has exactly one size**, with its own SKU, price (EGP) and stock.
- **Add** a product with **Add product**; open a product to edit its names (English and Arabic), descriptions, images, price and SKU.
- **Images:** upload, reorder and choose the main image.
- **Removing a product** hides it from the store; it can be **restored**. Past orders keep their own copy of the name and price, so they never change.
- A price change that would make an existing fixed discount invalid is refused, with an explanation.

**[Screenshot S-05]** Products list · **[Screenshot S-06]** Product form.

## 6. Inventory

*Who: super admin, store manager, product manager.* · `/admin/inventory`

- Shows the stock of each product, with **In stock / Low stock / Out of stock**.
- **Adjust stock:** choose a reason and the quantity:

| Reason | When to use | Note |
|---|---|---|
| New shipment | Goods arrived | Optional (for example the invoice number) |
| Stock count | After counting the shelf | Required |
| Correction | Fixing a mistake | Required |
| Damaged or missing | Write-off | Required |

- Orders change stock automatically: **Reserved by an order** when an order is placed, **Released** when it is cancelled or expires, **Returned to stock** after a return is checked.
- **Low-stock level:** set per product. The product shows as "low stock" when its stock is above 0 and at or below this number. This does not change the stock.
- **Stock history** (`/admin/inventory/movements`): every change, newest first. History **cannot be edited**: a mistake is corrected with a new adjustment.
- Admins who manage inventory get a **notification** when a product becomes low or out of stock.

**[Screenshot S-07]** Inventory list · **[Screenshot S-08]** Stock adjustment dialog · **[Screenshot S-09]** Stock history.

## 7. Discounts and promo codes

*Who: super admin, store manager, product manager.* · `/admin/discounts`

### 7.1 Product discounts

- Lowers what customers pay for one product. The **regular price stays as it is**; the store shows it crossed out.
- Type: **percentage (1–99%)** or **fixed amount** (below the price). It can be switched on or off, with optional start and end dates (Cairo time).
- A product cannot have its own discount and a "compare at" price at the same time.

### 7.2 Promo codes

- Codes customers type in the cart. Code: 3–32 characters (letters, numbers, `-`, `_`), not case-sensitive.
- Settings: percentage or fixed amount, minimum order, start/end dates, **total uses** and **uses per customer**, internal note.
- New codes start **off**. Codes are **never deleted**; switch them off instead.
- A promo code applies **only to products without their own discount**. Only one code per order.
- Uses are counted from orders; **cancelled and expired orders do not count**.

**Example:** `WELCOME10`, 10%, minimum order EGP 500, 100 uses in total, 1 per customer, valid all of December.

**[Screenshot S-10]** Product discounts · **[Screenshot S-11]** Promo codes list · **[Screenshot S-12]** Promo code form.

## 8. Orders

*Who: view: super admin, store manager, order manager, support. Change: super admin, store manager, order manager.* · `/admin/orders`

### 8.1 Two separate statuses

Every order has **two independent statuses**:

1. **Fulfillment stage**: where the order is in the work (New → Delivered).
2. **Payment status**: **Paid** or **Not paid**.

**Changing the stage never changes the payment status.** For example, marking a cash-on-delivery order as Delivered does **not** mark it as paid: the cash is recorded separately ([8.6](#86-cash-on-delivery)).

### 8.2 The stages

| Stage | Arabic | Meaning |
|---|---|---|
| **New** | طلب جديد | A cash-on-delivery order was placed and waits for confirmation. |
| **New – awaiting card payment** | طلب جديد – بانتظار الدفع بالبطاقة | A card order waits for its online payment. It becomes **Confirmed automatically** when the payment provider confirms the payment. |
| **Confirmed** | تم التأكيد | The order is accepted. |
| **Preparing** | جاري التحضير | The order is being packed. |
| **Prepared** | تم التحضير | Packed and ready for delivery. |
| **Delivered** | تم التسليم | The customer received it. |
| **Cancelled** | ملغي | Cancelled; reserved stock went back to inventory. **Final.** |
| **Returned** | مرتجع | Came back (refused at the door or returned after delivery). **Final.** |
| **Expired** | منتهٍ | A card order not paid in time; set by the system. **Final.** |

Customers see the same stage names in their account.

### 8.3 Moving an order

On the order page, the **Actions** panel shows only what is allowed now, for your role.

**Normal next step** (buttons, no note needed):
New → **Confirm order** → **Start preparing** → **Mark as prepared** → **Mark as delivered**.

**Cancel order:** possible from any stage **before Delivered**. A **reason is required**. The reserved stock goes back to inventory (once).

**Mark as returned:** possible from **Prepared** or **Delivered**. From Delivered, a note is required. The goods do **not** go back to stock automatically: check them first, then use **Put returned goods back in stock** (super admin and store manager; once per order).

**Correct the stage (manual fixes and exceptions):** under the buttons, **Correct the stage** lets you move the order to **any other working stage**, forward or back (for example from Delivered back to Preparing when the courier brings it back, or straight from New to Delivered for a hand-delivered order).

- **A note is required** for every correction. The confirmation shows "from" and "to" before anything changes.
- Moving **back** clears the dates of the later stages.
- The payment status does **not** change.

**Rules the system always keeps:**

- Cancelled, Returned and Expired are **final**; they cannot be reopened.
- A **delivered** order cannot be cancelled (use Returned).
- A **card order cannot be confirmed by hand before it is paid**, and a **paid card order cannot be cancelled** in the dashboard (refunds are not built yet).
- Card orders have no "New" stage to go back to.
- If someone else changed the order meanwhile, nothing is changed; the page reloads with the current state.

**[Screenshot S-13]** Order page: actions panel · **[Screenshot S-14]** Correct-the-stage picker · **[Screenshot S-15]** Correction confirmation with the required note.

### 8.4 Timeline and audit

- The **Timeline** on the order page lists every change: **from which stage to which stage**, **date and time**, **who** (admin name, customer, system or payment provider) and the **note**.
- Lines marked **internal** are never shown to the customer. Customers never see admin names or notes.
- Every stage change is also written to the **audit log** ([section 15](#15-audit-log-and-notifications)): "Order status changed", "Order cancelled" or "Order stage corrected (with a note)".
- The order header shows the stage and payment badges and **"Stage since …"** (when the stage last changed).

**[Screenshot S-16]** Timeline with a correction and its note.

### 8.5 Finding orders (list and filters)

The orders list shows, for each order: number, customer and phone, date placed, items, total, **payment method and payment badge**, **stage badge with "Stage since …"**, governorate and last update.

Filters (they can be combined):

| Filter | Notes |
|---|---|
| Search | Order number, customer name or phone |
| Order status | Any stage |
| Payment status | Paid / Not paid |
| Payment method | Cash on delivery / Card |
| Governorate | |
| From / To (date and time) | **Egypt (Cairo) time**, exact to the minute. "To" includes that whole minute. Choose both a date and a time. |

Choose **Apply filters**; **Clear filters** resets them (the tab included).

### 8.5.1 Status tabs

Above the filters, tabs group the stages. Each tab shows how many orders it holds **with the other filters applied**. Switching tabs keeps your search, dates, payment and other filters; only the stage filter resets, and it then offers only that tab's stages.

| Tab | Stages in it |
|---|---|
| All orders | Every stage |
| New | New, New – awaiting card payment |
| In progress | Confirmed, Preparing |
| Ready for delivery | Prepared |
| Delivered | Delivered |
| Cancelled / Returned | Cancelled, Returned, Expired (each keeps its own badge; use the stage filter to see only one) |

The **Excel export does not use the tab**: it uses the other filters (the hint under the button says so when a tab is open).

### 8.5.2 Actions from the list

Admins who can change orders (super admin, store manager, order manager) see an **Actions** column:

- **The next step button** (for example **Confirm order**, **Start preparing**, **Mark as prepared**, **Mark as delivered**) moves the order to its normal next stage after a simple confirmation. No note is needed.
- **Other actions ▾** opens a short menu with **Cancel order**, **Mark as returned** and **Move to "…"** (stage corrections). Each asks for a **required note**, which is saved in the order timeline and the audit log with your name and the time.
- Only the actions the system allows for that order and your role are shown; final orders show "—".
- After a change, the list refreshes with the same tab, filters and page, and the tab counts update. If the order changed meanwhile, nothing is done and the list shows its current state.

The **order page** keeps everything else: full details, payment, timeline, recording cash on delivery and the internal note.

**[Screenshot S-33]** Orders list with tabs and the Actions column · **[Screenshot S-34]** "Other actions" menu open.

**Example:** all *Prepared* cash orders *not paid yet*, placed between 1 Nov 09:00 and 10 Nov 18:30: Status = Prepared, Payment status = Not paid, Payment method = Cash on delivery, From = 01/11/2026 09:00, To = 10/11/2026 18:30.

**[Screenshot S-17]** Orders list with filters (desktop) · **[Screenshot S-18]** Orders list on a phone (cards).

### 8.6 Cash on delivery

- After a cash order is **Delivered**, use **Record cash as collected**. This marks it **Paid** and can be done **once**.
- Who: super admin, store manager and order manager.

### 8.7 Internal note

A free-text note for the team on each order, never shown to the customer (`orders.manage`).

### 8.8 Excel export

- **Export Excel** downloads **every order matching the filters**, not only the visible page (super admin and store manager).
- It never includes emails, phone numbers, addresses, notes or card data.
- Current limitations, unchanged in this phase: the sheet's filter labels say "From/To (Cairo date)" even when a time was chosen, the stage column uses the earlier names (for example "Shipped" for Prepared), and the file name contains the chosen date and time.

## 9. Sales and reports

*Who: super admin, store manager.* · `/admin/reports`

Four tabs: **Sales & revenue**, **Orders**, **Products**, **Inventory**. The figures are calculated by the server from saved orders, payments and stock history. **Nothing here changes any data.**

- **Order value is not money received.** The Sales tab shows collected money and outstanding amounts separately.
- **Test payments** (test mode) are kept apart.
- Each report can be exported as **CSV** or **Excel**. Excel files are in the chosen language; the Arabic ones read right to left.

**[Screenshot S-19]** Sales report · **[Screenshot S-20]** Export buttons.

## 10. Contact messages

*Who: read: super admin, content manager, content editor, support. Change status: super admin, content manager, support.* · `/admin/contact-messages`

- Messages sent through the Contact Us forms of the Octogenix and Jovie sites.
- Statuses: **New, Read, In progress, Replied, Resolved, Spam, Archived**.
- **Reply by email** opens your own email program with the address and subject filled in. The dashboard does not send the reply itself. Afterwards, choose **Mark as replied**.
- Admins who can read messages get a **notification** for each new message.

**[Screenshot S-21]** Messages list · **[Screenshot S-22]** One message.

## 11. Reviews

*Who: super admin, store manager, product manager, content manager, content editor.* · `/admin/reviews`

- New reviews wait as **Pending**. **Only approved reviews** appear in the store and count in the rating.
- Actions: **Approve**, **Hide from the store** (removes an approved review from the store) and **Reject**. **Rejected is final.**
- The review text is never changed in the dashboard.

**[Screenshot S-23]** Reviews list · **[Screenshot S-24]** One review.

## 12. Customers

*Who: super admin, store manager, order manager, support.* · `/admin/customers`

- Customer accounts, newest first. Open a customer to see their addresses and orders. **View only.**
- Guest orders (checkout without an account) appear in Orders, not here.

**[Screenshot S-25]** Customer details.

## 13. Shipping and store settings

`/admin/settings`

### 13.1 Shipping (super admin, store manager)

- One row per governorate: **shipping fee** (EGP; 0 = free) and **delivery on/off**.
- Delivery cannot be turned on where no fee is set.
- Changes apply to **new orders only**.

### 13.2 Store settings (super admin only)

| Setting | Meaning |
|---|---|
| Store open for orders | Turns checkout on or off |
| Cash on delivery | Allows cash on delivery |
| Cash-on-delivery fee | Added to cash orders |
| Card payments | Allows paying by card |
| Free shipping from | Items total from which shipping is free |
| Time to finish a card payment | After this, an unpaid card order expires and its stock is released |

Every change is confirmed before it is saved. Some values are **set on the server** and only shown for information.

**[Screenshot S-26]** Shipping · **[Screenshot S-27]** Store settings.

## 14. Admin users (super admins only)

`/admin/users`

### 14.1 What you can do

- List admins, search by name or email, filter by role or status, sort.
- **Create** an account, **change** name, email, role or language, **deactivate** or **reactivate**.
- You **cannot** see or set anyone's password. You cannot change your own role, and you cannot remove the last active super admin.

### 14.2 Creating an account: steps

1. Go to **Admin users** and choose **Add admin**.
2. Enter **Name**, **Email** (work email, must be unique), **Role** and **Language** (English/Arabic).
3. Check the line under the role: **"Sections this role can use: …"**.
4. Choose **Create account**.
5. Read the message:
   - *"…an invitation email was queued"*: the person receives a link (valid 60 minutes) to choose their own password.
   - *"…email is not delivered in this environment…"*: see 14.3.

**Examples** (sample names and addresses; use real work emails):

| Person | Email | Role | They will be able to… |
|---|---|---|---|
| Mona, online store lead | `mona@example.com` | Store manager | Run products, stock, orders, payments, reports, shipping, reviews |
| Karim, catalogue | `karim@example.com` | Product manager | Edit products and discounts, adjust stock, moderate reviews |
| Sara, orders desk | `sara@example.com` | Order manager | Move orders through the stages, record cash on delivery, view customers |
| Nour, customer care | `nour@example.com` | Content manager | Handle contact messages, moderate reviews |
| Omar, website texts | `omar@example.com` | Content editor | Read contact messages, moderate reviews (content page not built yet) |
| Hana, call centre | `hana@example.com` | Support | Handle contact messages, look up orders and customers (view only) |

**[Screenshot S-28]** Admin users list · **[Screenshot S-29]** Add admin form with the role line · **[Screenshot S-30]** "Email not delivered" message after creating an account.

### 14.3 Invitations: the current email limitation

- In this environment the mail setting is **"log"**: emails are written to the server log and **not sent**.
- The dashboard says this clearly after you create an account: **no invitation reaches the new admin**, so **they cannot set a password until a real mail service is set up.**
- The dashboard never shows invitation links or reset links, and they must not be shared in chat or email.
- **What to do now:** create the account (it is ready), and once email delivery is configured on the server, the person can use **Forgot your password?** on the sign-in page to get a link.

### 14.4 Deactivating

Choose **Deactivate** and confirm. The admin is signed out at once and cannot use the dashboard until reactivated. Their history stays in the audit log.

## 15. Audit log and notifications

### 15.1 Audit log (super admins only) · `/admin/audit-log`

- Every change made by an admin, newest first: **who**, **when**, **what** (before → after) and the **reason** where one was given.
- Areas: products, inventory, orders, shipping, store settings, reviews, admin accounts, discounts and promo codes, contact messages.
- Entries **cannot be edited or deleted**.

### 15.2 Notifications (everyone) · bell icon

| Notification | Who receives it |
|---|---|
| New order | Admins who can see orders |
| Low stock / out of stock | Admins who manage inventory |
| New review waiting | Admins who manage reviews |
| New contact message | Admins who can read messages |

Open a notification to go to the record; **Mark all as read** clears the counter.

**[Screenshot S-31]** Audit log · **[Screenshot S-32]** Notifications.

## 16. Screens to capture

Use a **test admin account and test data only**: no real customer names, phones, emails or addresses. Capture at a desktop width (about 1440 px) unless the item says "phone" (about 390 px). Save as PNG named after the ID, for example `S-13.png`, in `docs/admin-manual/screenshots/`.

| ID | Screen | Language |
|---|---|---|
| S-01 | Sign-in page | EN |
| S-02 | Dashboard with left menu | EN |
| S-03 | Dashboard with left menu | AR |
| S-04 | Overview | EN |
| S-05 | Products list | EN |
| S-06 | Product form | EN |
| S-07 | Inventory list | EN |
| S-08 | Stock adjustment dialog | EN |
| S-09 | Stock history | EN |
| S-10 | Product discounts | EN |
| S-11 | Promo codes list | EN |
| S-12 | Promo code form | EN |
| S-13 | Order page, actions panel (order in "Confirmed") | EN |
| S-14 | Order page, "Correct the stage" picker open | EN |
| S-15 | Correction confirmation with the note field | EN |
| S-16 | Timeline showing a correction with its note | EN |
| S-17 | Orders list with status + payment + date-time filters applied | EN |
| S-18 | Orders list on a phone | AR |
| S-19 | Sales report | EN |
| S-20 | Report export buttons | EN |
| S-21 | Contact messages list | EN |
| S-22 | One contact message | EN |
| S-23 | Reviews list | EN |
| S-24 | One review | EN |
| S-25 | Customer details | EN |
| S-26 | Shipping | EN |
| S-27 | Store settings | EN |
| S-28 | Admin users list | EN |
| S-29 | Add admin form with the "Sections this role can use" line | EN |
| S-30 | "Email not delivered" message after creating an account | EN |
| S-31 | Audit log | EN |
| S-32 | Notifications | AR |
| S-33 | Orders list with tabs and the Actions column | EN |
| S-34 | "Other actions" menu open on a row | EN |

## 17. Messages you may see and what to do

| Message | Meaning | What to do |
|---|---|---|
| *This order changed meanwhile…* (or the same for other records) | Someone else or the system changed it after you opened it | Review the current version shown and try again |
| *Add a note explaining this change: it is not the normal next step.* | You made a stage correction without a note | Write why, then confirm |
| *Please give a reason.* | Cancelling or a correction needs a reason | Write the reason |
| *You do not have access to this section* page | Your role cannot use this page | Ask a super admin if you need access |
| *Too many attempts. Please wait a minute and try again.* | Sign-in or reset requested too often | Wait a minute |
| *That did not work.* with details | The server refused the change; details explain why | Follow the details, or ask a super admin |
| Sent back to the sign-in page | Your session ended or your account was deactivated | Sign in again; if that fails, contact a super admin |

---

*No passwords, links or other secrets belong in this manual. Report any mistakes in this manual to the super admin.*
