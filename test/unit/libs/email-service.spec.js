import {
  ListIdentitiesCommand,
  SESClient,
  SendEmailCommand,
  VerifyEmailIdentityCommand,
} from "@aws-sdk/client-ses";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import EMAIL_TYPE from "../../../src/configs/email-type";
import {
  checkEmailVerified,
  sendEmail,
  sendVerificationEmail,
} from "../../../src/libs/email-service"; // email.js 파일의 경로로 수정하세요
import HttpException from "../../../src/libs/http-exception";

const email = "test@test.com";
const sesMock = mockClient(SESClient);
console.error = jest.fn();

beforeEach(() => {
  sesMock.reset();
});

describe("sendVerificationEmail", () => {
  it("should send a verification email", async () => {

    await sendVerificationEmail(email);

    expect(sesMock).toHaveReceivedCommandWith(VerifyEmailIdentityCommand, {
      EmailAddress: email,
    });
  });

  it("should throw an error when sending a verification email fails", async () => {
    const errorMessage = "이메일을 수신 중 에러가 발생했습니다.";
    sesMock.on(VerifyEmailIdentityCommand).callsFake(() => {
      throw new Error(errorMessage);
    });

    try {
      await sendVerificationEmail(email);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.message).toBe(errorMessage);
    }
  });
});

describe("checkEmailVerified", () => {
  it("should return true for a verified email", async () => {
    const listIdentitiesResponse = {
      Identities: ["verified@example.com", "test@test.com"],
    };

    sesMock.on(ListIdentitiesCommand).resolves(listIdentitiesResponse);

    const result = await checkEmailVerified(email);

    expect(sesMock).toHaveReceivedCommandWith(ListIdentitiesCommand, {});
    expect(result).toBeTruthy();
  });

  it("should return false for a unverified email", async () => {
    const listIdentitiesResponse = {
      Identities: ["verified@example.com", "another@example.com"],
    };

    sesMock.on(ListIdentitiesCommand).resolves(listIdentitiesResponse);

    const result = await checkEmailVerified(email);

    expect(sesMock).toHaveReceivedCommandWith(ListIdentitiesCommand, {});
    expect(result).toBeFalsy();
  });

  it("should throw an error when checking a verification email lists", async () => {
    const errorMessage = "이메일 인증 정보 확인 중 에러가 발생했습니다.";
    sesMock.on(ListIdentitiesCommand).callsFake(() => {
      throw new Error(errorMessage);
    });

    try {
      await checkEmailVerified(email);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.message).toBe(errorMessage);
    }
  });
});

describe("sendEmail", () => {
  it("should send an email", async () => {
    const type = "JOIN";
    const sendEmailCommand = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: EMAIL_TYPE[type].body,
          },
          Text: {
            Charset: "UTF-8",
            Data: EMAIL_TYPE[type].text,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: EMAIL_TYPE[type].subject,
        },
      },
      ReplyToAddresses: [],
      Source: process.env.AWS_SES_SENDER,
    };

    await sendEmail(type, email);

    expect(sesMock).toHaveReceivedCommandWith(
      SendEmailCommand,
      sendEmailCommand
    );
  });

  it("should throw an error when sending an email", async () => {
    const type = "JOIN";
    const errorMessage = "이메일 발신 중 에러가 발생했습니다.";
    sesMock.on(SendEmailCommand).callsFake(() => {
      throw new Error(errorMessage);
    });

    try {
      await sendEmail(type, email);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.message).toBe(errorMessage);
    }
  });
});
