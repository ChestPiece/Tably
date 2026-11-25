# Tably: portfolio project entry

Paste each block into the matching field at chestpiece.vercel.app/admin/collections/projects.

## Title
Tably: QR Table Ordering for Restaurants

## Description
(153 characters. Doubles as the meta description.)

QR table ordering for dine-in restaurants. Guests scan, order from their phone and the kitchen sees it live. Next.js and Supabase, in English and Arabic.

## Category
Web App

## Tags
Next.js, Supabase, PostgreSQL, TypeScript, Tailwind CSS, Realtime, QR Ordering, Restaurant Tech, RTL / Arabic, Multi-tenant SaaS

## Thumbnail
`tably-00-thumbnail.png`

Alt text: Tably logo next to three phone screens from the guest app: table welcome, menu and order tracker.

## Gallery (in this order)
0. `tably-01-cover.png`. Alt: Tably owner dashboard with a phone showing the guest menu, next to the headline "Put your menu on every table."
1. `tably-02-guest.png`. Alt: Four phone screens from the guest app: menu, dish options, live order tracker and the Arabic menu.
2. `tably-04-kitchen.png`. Alt: Tably staff board next to a guest phone showing the order tracker.
3. `tably-03-owner.png`. Alt: Tably owner dashboard with orders by hour, profit after food and wages, and table status.
4. `tably-05-qr.png`. Alt: Printable QR table cards in the owner admin, and the guest welcome screen a scan opens.

## Github Url
https://github.com/ChestPiece/tably

## Demo Url
https://qr-restauratn-app.vercel.app

## Role
Solo full-stack designer and developer

## Timeline
Nov 2026

## Status Label
Live beta

## Outcomes
- 3 apps in one codebase: guest, kitchen board, owner admin
- 0 apps to install: guests order in the browser
- 2 languages: English and Arabic, full right-to-left
- 6 database test suites covering orders, bills, roles, invites and costs

## Case Study

### Overview
Tably is a QR ordering system for sit-down restaurants. Every table has its own QR code. A guest scans it, types a name if they want, and orders from the menu on their phone. The order shows up on the kitchen board straight away. Staff move it from received to served, answer waiter calls and settle the bill. The owner runs the menu, tables, team and profit from one admin. I designed and built all three sides alone, on Next.js 16 and Supabase.

### Problem
In a busy restaurant, a lot of time goes into taking orders by hand, walking them to the kitchen and typing them into the till. Guests wait for a waiter to notice them, then wait again for the bill. Most QR menus only fix half of this. They show a PDF of the menu, and someone still has to take the order. The ones that do take orders often need an app, ignore Arabic, or leave the owner with no idea what each dish actually earns.

### Solution
I built three connected apps on one database. Guests sign in invisibly as anonymous users and can only read their own visit. Every write goes through a Postgres function, and the server recomputes each price, so a guest can't edit what an order costs. Supabase Realtime pushes new orders to a kitchen board that lists the oldest tickets first, totals what to cook, and lets staff undo a step within two minutes. Owners set a cost per dish, and each order line keeps the cost it sold at, so the profit report stays accurate after prices change. Money is stored in whole minor units, and times follow the restaurant's timezone. Arabic is a real right-to-left layout with its own fonts, not a translated overlay.

### Result
Tably is live as a beta. A restaurant can sign up, create its venue, add dishes and tables, print QR cards and invite staff with a join link in one sitting. Guests order without installing anything, in English or Arabic. Orders reach the kitchen live, waiter calls and bill requests appear on the same board, and the owner sees orders, sales and profit after food and wages on one page. Row Level Security covers every table, and each restaurant's data stays separate.

### Learnings
Putting the rules in the database paid off. Prices, order steps and permissions live in Postgres functions with their own SQL tests, so the UI stays thin and I can change screens without worrying about money. Right-to-left support has to be planned from day one. Logical CSS, per-language fonts and lang attributes saved me from a rewrite. Small details mattered more than I expected: storing money as integers, using the restaurant's clock instead of the browser's, and random QR links instead of table numbers.

## Is Featured
Yes. It shows full-stack depth (database rules, realtime, auth, multi-tenant) and a finished visual design.
