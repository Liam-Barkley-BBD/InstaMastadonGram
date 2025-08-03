db = db.getSiblingDB("instaMastadonGram");

db.createCollection("users");
db.createCollection("posts");
db.createCollection("sessions");
db.createCollection("follows");
db.createCollection("activities");
db.createCollection("actors");

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { unique: true });
db.posts.createIndex({ author: 1 });
db.posts.createIndex({ createdAt: -1 });
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
db.follows.createIndex({ follower: 1, following: 1 }, { unique: true });
db.activities.createIndex({ actor: 1 });
db.actors.createIndex({ preferredUsername: 1 }, { unique: true });

print("MongoDB initialization completed");
