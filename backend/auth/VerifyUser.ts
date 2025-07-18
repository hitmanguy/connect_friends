import nodemailer from "nodemailer";
import  redis  from "../../redis/redis";
import crypto from "crypto";
import { cookies } from "next/headers";

async function generateOTP(): Promise<string> {
    const otp = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(otp, byte => (byte%10).toString()).join('');  
}

async function setOTP(email: string, otp:string): Promise<void> {
    await redis.set(`email:${email}`, otp, { EX: 600 });
}

export async function sendVerificationEmail(email:string): Promise<void> {
    const otp = await generateOTP();
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    const mailOptions = {
    from: `"Connect Friends" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Verify Your Connect Friends Account',
    html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #EBF4FF 0%, #FFFFFF 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Connect Friends</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Bringing friends together</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px; text-align: center;">
                <div style="background: white; border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <h2 style="color: #1F2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Verify Your Account</h2>
                    <p style="color: #6B7280; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                        Welcome to Connect Friends! Please use the verification code below to complete your account setup.
                    </p>
                    
                    <!-- OTP Code -->
                    <div style="background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%); border-radius: 12px; padding: 25px; margin: 20px 0; border: 2px solid #E5E7EB;">
                        <p style="color: #374151; margin: 0 0 10px 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                        <div style="font-size: 36px; font-weight: 700; color: #1D4ED8; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</div>
                    </div>
                    
                    <p style="color: #9CA3AF; margin: 25px 0 0 0; font-size: 14px;">
                        This code will expire in 10 minutes for security reasons.
                    </p>
                </div>
                
                <!-- Security Notice -->
                <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 20px; text-align: left;">
                    <h3 style="color: #92400E; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">🔒 Security Notice</h3>
                    <p style="color: #78350F; margin: 0; font-size: 14px; line-height: 1.5;">
                        Never share this code with anyone. Connect Friends will never ask for your verification code via phone or email.
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                <p style="color: #6B7280; margin: 0 0 10px 0; font-size: 14px;">
                    Need help? Contact me at hitmanguy1238@gmail.com (Unofficial email)
                </p>
                <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
                    © 2025 Connect Friends. All rights reserved.
                </p>
            </div>
        </div>
    `,
    text: `
🔐 CONNECT FRIENDS - ACCOUNT VERIFICATION

Hello!

Welcome to Connect Friends! Please use the verification code below to complete your account setup:

VERIFICATION CODE: ${otp}

This code will expire in 10 minutes for security reasons.

SECURITY NOTICE:
Never share this code with anyone. Connect Friends will never ask for your verification code via phone or email.

Need help? Contact me at hitmanguy1238@gmail.com (unofficial email)

© 2025 Connect Friends. All rights reserved.
    `
};
    await transporter.sendMail(mailOptions);
    await setOTP(email, otp);
}

async function getOTP(email: string): Promise<string | null> {
    const otp = await redis.get(`email:${email}`);
    if (typeof otp === "string" || typeof otp === "number") {
        return otp.toString();
    }
    return null;
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
    const storedOtp = await getOTP(email);
    console.log(`Verifying OTP for ${email}: ${storedOtp} === ${otp}`);
    if (storedOtp && storedOtp === otp) {
        await redis.del(`email:${email}`);
        return true;
    }
    return false;
}

export async function generateToken(email: string): Promise<string> {
    return new Promise((resolve, reject) => {
        crypto.scrypt(email,process.env.SECRET!, 64, async (err, derivedKey) => {
            if (err) {
                return reject(err);
            }
            await redis.set(`token:${email}`, derivedKey.toString('hex').normalize(), { EX: 3600 });
            await setCookie(email);
            return resolve(derivedKey.toString('hex').normalize());
        });
    });
}

export async function verifyToken(email: string, token: string): Promise<boolean> {
    const storedToken = await redis.get(`token:${email}`);
    if (storedToken && storedToken === token) {
        return true;
    }
    return false;
}

export async function deleteToken(email: string): Promise<void> {
    await redis.del(`token:${email}`);
}

async function setCookie(email: string): Promise<void> {
    (await cookies()).set(
  'connect_friends_email',
  email.toLowerCase(),
  {
    httpOnly: true,
    secure: true, 
    sameSite: 'strict',                          
    maxAge: 300,                             
    path: '/',                        
  }
);
}

