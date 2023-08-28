import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from "passport-local";
import { prisma } from "../app.js";

const localStrategyConfig = new LocalStrategy(
  { usernameField: "email", passwordField: "password" },
  async (email, password, done) => {
    try {
      const exUser = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!exUser)
        return done(null, false, { msg: `Email ${email} not found` });

      const isMatch = await bcrypt.compare(password, exUser.password);

      if (isMatch) return done(null, exUser);

      return done(null, false, { msg: "Invalid email or password." });
    } catch (err) {
      done(err);
    }
  }
);

export default localStrategyConfig;
