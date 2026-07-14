import { createCanvas, loadImage } from "@napi-rs/canvas";
import * as path from "node:path";
import type { GuildMember } from "discord.js";

const assetsPath = path.join(Deno.cwd(), "assets");

const bannerFiles = Array.from(Deno.readDirSync(assetsPath))
  .filter((file) => file.isFile && file.name.endsWith(".png"))
  .map((file) => path.join(assetsPath, file.name));

const pickBanner = () =>
  bannerFiles.find((file) => path.basename(file).toLowerCase().includes("ice")) ??
  bannerFiles[0];

type Palette = { text: string; ring: string };

const palettes: Record<string, Palette> = {
  dark: { text: "#F5E9DA", ring: "#D9A066" },
  fire: { text: "#FFF3E9", ring: "#F3B391" },
  ice: { text: "#EAF6FF", ring: "#8FD3F4" },
  light: { text: "#3B2A20", ring: "#8C5A3C" },
};

const defaultPalette: Palette = { text: "#ffffff", ring: "#ffffff" };

const paletteFor = (bannerFile: string): Palette => {
  const name = path.basename(bannerFile).toLowerCase();
  const key = Object.keys(palettes).find((variant) => name.includes(variant));
  return key ? palettes[key] : defaultPalette;
};

export const buildWelcomeImage = async (member: GuildMember) => {
  const bannerFile = pickBanner();
  const palette = paletteFor(bannerFile);
  const background = await loadImage(bannerFile);
  const canvas = createCanvas(background.width, background.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  // Server icon lives on the right half of the banner, so the avatar sits on the left.
  const avatarSize = Math.round(canvas.height * 0.38);
  const centerX = canvas.width * 0.28;
  const centerY = canvas.height * 0.42;
  const avatarX = centerX - avatarSize / 2;
  const avatarY = centerY - avatarSize / 2;

  const avatarUrl = member.displayAvatarURL({ extension: "png", size: 256 });
  const avatarBuffer = new Uint8Array(
    await (await fetch(avatarUrl)).arrayBuffer(),
  );
  const avatar = await loadImage(avatarBuffer);

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  ctx.lineWidth = Math.max(4, avatarSize * 0.03);
  ctx.strokeStyle = palette.ring;
  ctx.beginPath();
  ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = palette.text;
  ctx.font = `bold ${Math.round(canvas.height * 0.08)}px sans-serif`;
  ctx.fillText(
    `Welcome, ${member.user.username}!`,
    centerX,
    centerY + avatarSize / 2 + canvas.height * 0.12,
  );

  return canvas.toBuffer("image/png");
};
