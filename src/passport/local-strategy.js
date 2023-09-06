import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from "passport-local";
import CONFIGS from "../configs/contant.js";
import prisma from "../configs/prisma-client.js";

const localStrategyConfig = new LocalStrategy(
  { usernameField: "email", passwordField: "password" },
  async (email, password, done) => {
    try {
      const exUser = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!exUser) return done(null, false, `Email ${email} not found`);

      if (!exUser.password) {
        const salt = await bcrypt.genSalt(CONFIGS.SALT_ROUNDS);
        await prisma.user.update({
          where: {
            email,
          },
          data: {
            password: await bcrypt.hash(password, salt),
          },
        });
        return done(null, exUser);
      }
      const isMatch = await bcrypt.compare(password, exUser.password);

      if (isMatch) return done(null, exUser);

      return done(null, false, "Invalid email or password.");
    } catch (err) {
      done(err);
    }
  }
);

export default localStrategyConfig;
