import mongoose from "mongoose";
import app from "./app.ts";
import "./utils/loggers.ts";

const PORT = process.env.PORT || 8000;

app.get("/health", (req, res) => {
  res
    .status(200)
    .json({ status: "healthy", timestamp: new Date().toISOString() });
});

mongoose
  .connect(process.env.MONGO_URI || "mongodb://mongodb:27017/instaMastadonGram")
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error", err));
