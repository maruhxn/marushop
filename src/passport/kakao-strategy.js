import { Strategy as KakaoStrategy } from "passport-kakao";
import { prisma } from "../app.js";

const kakaoStrategyConfig = new KakaoStrategy(
  {
    clientID: process.env.KAKAO_CLIENT_ID,
    callbackURL: "/api/auth/kakao/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    console.log(profile);
    try {
      const user = await prisma.user.upsert({
        where: {
          email: profile._json.kakao_account.email,
        },
        update: {
          kakaoId: profile.id + "",
        },
        create: {
          email: profile._json.kakao_account.email,
          username: profile.displayName,
          kakaoId: profile.id + "",
        },
      });

      done(null, user);
    } catch (err) {
      done(err);
    }
  }
);

export default kakaoStrategyConfig;
