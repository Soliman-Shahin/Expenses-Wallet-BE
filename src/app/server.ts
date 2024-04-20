import { config } from "dotenv";
import { connectToDB } from "./db";
import { configureExpressApp } from "./app";

const DEFAULT_PORT = 3000;

async function startServer() {
  try {
    config();

    await connectToDB();

    const app = configureExpressApp();

    const port = process.env.PORT ?? DEFAULT_PORT;
    app.listen(port, () => {
      console.log(`[server]: Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
