import { Invite } from "../model/invite";
import crypto from "crypto";

async function generateCode() {
  return crypto.randomBytes(16).toString("hex").normalize();
}

export async function createInvite(
  createdBy: string,
  expiresAt: Date | null = null
) {
  const code = await generateCode();
  const invite = new Invite({
    code,
    expiresAt,
    createdBy,
    userJId: [],
  });
  await invite.save();
  return invite;
}

export async function findInviteByCode(code: string) {
  return Invite.findOne({ code });
}
