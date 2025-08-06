import mongoose from "mongoose";
import Actor from "../models/actor.model.ts";
import Post from "../models/post.model.ts";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/instamastadongram";

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create test actors
    const actor1 = await Actor.create({
      userId: "user1",
      uri: "https://example.com/users/testuser1",
      inboxUri: "https://example.com/users/testuser1/inbox",
      handle: "testuser1",
    });

    const actor2 = await Actor.create({
      userId: "user2",
      uri: "https://example.com/users/testuser2",
      inboxUri: "https://example.com/users/testuser2/inbox",
      handle: "testuser2",
    });

    const actor3 = await Actor.create({
      userId: "user3",
      uri: "https://example.com/users/testuser3",
      inboxUri: "https://example.com/users/testuser3/inbox",
      handle: "testuser3",
    });

    // Create test posts
    await Post.create([
      {
        actor: actor1._id,
        content:
          "Just discovered this amazing new coffee shop downtown! The atmosphere is perfect for getting work done. ☕✨",
        created: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        imageUrl:
          "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop",
      },
      {
        actor: actor2._id,
        content:
          "Beautiful sunset at the beach today. Sometimes the best moments are the quiet ones where you can just breathe and appreciate the beauty around us. 🌅🌊",
        created: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        imageUrl:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop",
      },
      {
        actor: actor3._id,
        content:
          "Coffee tastes better when you're watching the sunrise from a mountain peak. Early mornings are tough but the views are always worth it! ☕🏔️",
        created: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        imageUrl:
          "https://images.unsplash.com/photo-1464822759844-d150baecbf4b?w=800&h=600&fit=crop",
      },
      {
        actor: actor1._id,
        content:
          "Working on some exciting new features for our app. Can't wait to share them with everyone! 💻🚀",
        created: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        imageUrl:
          "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop",
      },
      {
        actor: actor2._id,
        content:
          "Just finished reading an amazing book about productivity. Highly recommend 'Atomic Habits' by James Clear! 📚",
        created: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        imageUrl:
          "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop",
      },
      {
        actor: actor3._id,
        content:
          "Exploring the city streets today. Every corner has a story to tell! 🏙️✨",
        created: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        imageUrl:
          "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop",
      },
      {
        actor: actor1._id,
        content:
          "Nothing beats a peaceful morning walk in nature. The fresh air and bird songs are therapy for the soul! 🌿🐦",
        created: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        imageUrl:
          "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
      },
      {
        actor: actor2._id,
        content:
          "Art is everywhere if you know where to look. This street art caught my eye today! 🎨",
        created: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        imageUrl:
          "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop",
      },
      {
        actor: actor1._id,
        content:
          "Check out this amazing drone footage of the city skyline! The perspective is incredible 🚁🌆",
        created: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        videoUrl:
          "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      },
      {
        actor: actor2._id,
        content: "Waves crashing against the rocks - nature's symphony! 🌊💙",
        created: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        videoUrl:
          "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
      },
      {
        actor: actor3._id,
        content:
          "Morning yoga session with the sunrise. Perfect way to start the day! 🧘‍♀️☀️",
        created: new Date(Date.now() - 90 * 60 * 1000), // 1.5 hours ago
        videoUrl:
          "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4",
      },
      {
        actor: actor1._id,
        content:
          "Street musicians bringing life to the city! Music is the universal language 🎵🎸",
        created: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
        videoUrl:
          "https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4",
      },
      {
        actor: actor2._id,
        content:
          "Check out this amazing article about productivity: https://www.example.com/productivity-tips. Really helped me organize my workflow! 📚✨",
        created: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      },
      {
        actor: actor3._id,
        content:
          "Just discovered this incredible photography tutorial: https://www.example.com/photography-guide. The techniques are mind-blowing! 📸🌟",
        created: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
      },
      {
        actor: actor1._id,
        content:
          "Found this great resource for learning React: https://react.dev and also this TypeScript guide: https://www.typescriptlang.org/docs/. Both are excellent! 💻🚀",
        created: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
      },
    ]);

    console.log("Seed data created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
}

seed();
