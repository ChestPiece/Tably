import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDishes } from "./parse-dishes.ts";

test("price after a dash, colon, space or currency", () => {
  assert.deepEqual(parseDishes("Masala dosa - 220\nChai: 80\nSamosa 60\nLassi PKR 150\nTea Rs. 50"), [
    { name: "Masala dosa", price: "220", cost: "", category: "" },
    { name: "Chai", price: "80", cost: "", category: "" },
    { name: "Samosa", price: "60", cost: "", category: "" },
    { name: "Lassi", price: "150", cost: "", category: "" },
    { name: "Tea", price: "50", cost: "", category: "" },
  ]);
});

test("a line with no price is the category for the lines under it", () => {
  const rows = parseDishes("Drinks\nChai - 80\n\nMains:\nBiryani 450");
  assert.deepEqual(rows.map((r) => [r.name, r.category]), [["Chai", "Drinks"], ["Biryani", "Mains"]]);
});

test("spreadsheet rows split on tabs: name, price, cost", () => {
  assert.deepEqual(parseDishes("Burger\t35\t12\nFries\t12.5"), [
    { name: "Burger", price: "35", cost: "12", category: "" },
    { name: "Fries", price: "12.5", cost: "", category: "" },
  ]);
});

test("bullets, numbering and thousands separators", () => {
  assert.deepEqual(parseDishes("• Platter - 1,200\n2. Kebab — 12.50\n- Naan 40").map((r) => [r.name, r.price]), [
    ["Platter", "1200"],
    ["Kebab", "12.50"],
    ["Naan", "40"],
  ]);
});

test("numbers inside the name stay in the name", () => {
  assert.deepEqual(parseDishes("7 Up 330ml - 60").map((r) => [r.name, r.price]), [["7 Up 330ml", "60"]]);
});

test("Arabic digits", () => assert.equal(parseDishes("شاي - ٨٠")[0].price, "٨٠"));
