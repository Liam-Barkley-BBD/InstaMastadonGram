import mongoose from "mongoose";
import app from "./app.ts";
import "./utils/loggers.ts";

const PORT = 8000;

mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/instaMastadonGram",
  )
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error", err));
