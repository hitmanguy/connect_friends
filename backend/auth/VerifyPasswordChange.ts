import nodemailer from "nodemailer";
import redis from "../../redis/redis";
import crypto from "crypto";

export async function sendVerificationEmailChangepassword(
  email: string,
  link: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Connect Friends" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Change Password Verification",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Change Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding: 20px 0; text-align: center; background-color: #3b82f6;">
        <h1 style="margin: 0; color: white; font-size: 24px;">Connect Friends</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1e40af; margin-top: 0;">Password Change Request</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                We received a request to change your password for Connect Friends. If you didn't make this request, you can safely ignore this email.
              </p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                To complete your password change, please click the button below:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <a href="${link}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: bold; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">Change Password</a>
                  </td>
                </tr>
              </table>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <strong>Security Tip:</strong> This link will expire in 60 minutes. If you need a new link, please request another password change.
              </p>
            </td>
          </tr>
        </table>
        <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
          &copy; ${new Date().getFullYear()} Connect Friends. Contact to this mail for any queries.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`,
  };

  await transporter.sendMail(mailOptions);
}

export async function generatePassToken(email: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(email, process.env.SECRET!, 64, async (err, derivedKey) => {
      if (err) {
        return reject(err);
      }
      await redis.set(
        `passtoken:${email}`,
        derivedKey.toString("hex").normalize(),
        { EX: 3600 }
      );
      return resolve(derivedKey.toString("hex").normalize());
    });
  });
}

export async function verifyPassToken(
  email: string,
  token: string
): Promise<boolean> {
  const storedToken = await redis.get(`passtoken:${email}`);
  if (storedToken && storedToken === token) {
    return true;
  }
  return false;
}

export async function deletePassToken(email: string): Promise<void> {
  await redis.del(`passtoken:${email}`);
}
