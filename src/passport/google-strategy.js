import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../app.js";

const googleStrategyConfig = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SECRET_KEY,
    callbackURL: "/api/auth/google/callback",
    scope: ["email", "profile"],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await prisma.user.upsert({
        where: {
          email: profile.emails[0].value,
        },
        update: {
          googleId: profile.id,
        },
        create: {
          email: profile.emails[0].value,
          username: profile.displayName,
          googleId: profile.id,
        },
      });
      done(null, user);
    } catch (err) {
      done(err);
    }
  }
);

export default googleStrategyConfig;
