// require("dotenv").config();
// const app = require("./src/app");

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`PocketHRMS server running on http://localhost:${PORT}`);
// });


require("dotenv").config();
const app = require("./src/app");
const prisma = require("./src/config/prisma");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 PocketHRMS server running on http://localhost:${PORT}`);
});

// Graceful Shutdown Logic
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️ Received ${signal}. Closing PocketHRMS server...`);
  
  server.close(async () => {
    console.log("🔒 HTTP server closed.");
    try {
      await prisma.$disconnect();
      console.log("🔌 Database connection closed cleanly.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Error closing DB connection:", err);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));