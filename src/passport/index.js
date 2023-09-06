import passport from "passport";
import prisma from "../configs/prisma-client.js";
import googleStrategyConfig from "./google-strategy.js";
import kakaoStrategyConfig from "./kakao-strategy.js";
import localStrategyConfig from "./local-strategy.js";

export default () => {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // client => session => request
  passport.deserializeUser(async (userId, done) => {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    done(null, {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
    });
  });

  passport.use("local", localStrategyConfig);
  passport.use("google", googleStrategyConfig);
  passport.use("kakao", kakaoStrategyConfig);
};
