import app from "./app.ts";
import "./utils/loggers.ts";
import { client } from "./utils/mongo.ts";

const PORT = 8000;

client.connect()
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error", err));