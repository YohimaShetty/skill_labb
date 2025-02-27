const express = require("express");
const bodyParser = require("body-parser");
const cron = require("node-cron");

// Initialize app and middleware
const app = express();
app.use(bodyParser.json());

// In-memory data storage
const menu = [];
const orders = [];
let orderIdCounter = 1;

// Predefined categories
const CATEGORIES = ["Pizza", "Drinks", "Dessert"];

// Utility function for validation
function validateMenuItem(item) {
  if (!item.name || typeof item.name !== "string") return "Invalid name";
  if (!item.price || typeof item.price !== "number" || item.price <= 0) return "Invalid price";
  if (!CATEGORIES.includes(item.category)) {
    return 'Invalid category. Valid categories are: ${CATEGORIES.join(", ")}';
  }
  return null;
}

// API Endpoints

// Add Menu Item
app.post("/menu", (req, res) => {
  const { name, price, category } = req.body;

  // Validate menu item
  const validationError = validateMenuItem({ name, price, category });
  if (validationError) {
    return res.status(400).send({ error: validationError });
  }

  // Check if item already exists
  const existingItem = menu.find((item) => item.name === name);
  if (existingItem) {
    existingItem.price = price;
    existingItem.category = category;
    return res.status(200).send({ message: "Menu item updated", item: existingItem });
  }

  // Add new item
  const newItem = { id: menu.length + 1, name, price, category };
  menu.push(newItem);
  res.status(201).send({ message: "Menu item added", item: newItem });
});

// Get Menu
app.get("/menu", (req, res) => {
  res.status(200).send(menu);
});

// Place Order
app.post("/orders", (req, res) => {
  const { items, customerName } = req.body;

  // Validate order items
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).send({ error: "Items must be a non-empty array" });
  }

  const invalidItem = items.find((id) => !menu.find((m) => m.id === id));
  if (invalidItem) {
    return res.status(400).send({ error: 'Invalid item ID: ${invalidItem}' });
  }

  // Create new order
  const newOrder = {
    orderId: orderIdCounter++,
    items,
    customerName,
    status: "Preparing",
    createdAt: new Date(),
  };
  orders.push(newOrder);
  res.status(201).send({ message: "Order placed", orderId: newOrder.orderId, status: newOrder.status });
});

// Get Order
app.get("/orders/:id", (req, res) => {
  const order = orders.find((o) => o.orderId === parseInt(req.params.id, 10));
  if (!order) {
    return res.status(404).send({ error: "Order not found" });
  }

  const orderDetails = {
    ...order,
    items: order.items.map((id) => menu.find((m) => m.id === id)),
  };
  res.status(200).send(orderDetails);
});

// CRON Job: Update Order Status
cron.schedule("*/1 * * * *", () => {
  orders.forEach((order) => {
    if (order.status === "Preparing") {
      order.status = "Out for Delivery";
    } else if (order.status === "Out for Delivery") {
      order.status = "Delivered";
    }
  });
  console.log("Order statuses updated");
});

// Start server
const PORT = 3300;

app.listen(PORT, () => {
  console.log('Server running on http://localhost:${PORT}');
});