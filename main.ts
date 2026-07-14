import "./load_env.ts";

type status = "online" | "idle" | "invisible";

let botStatus: status = "online";

import { REST, Routes } from "discord.js";
// import * as fs from "node:fs";
import * as path from "node:path";

const commandsPath = path.join(Deno.cwd(), "commands");

const deployCommands = async () => {
  try {
    const commands = [];

    const commandFiles = Deno.readDirSync(commandsPath).filter(
      (file) => file.isFile && file.name.endsWith(".ts"),
    );

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file.name);
      const command = (await import(filePath))?.default;

      if (`data` in command && `execute` in command) {
        commands.push(command.data.toJSON());
      } else {
        console.log(`The Command ${filePath} fail.`);
      }
    }
    const rest = new REST().setToken(Deno.env.get("HIRAZYN_TOKEN") as string);
    console.log(`Starting`);

    const data = await rest.put(
      Routes.applicationCommands(Deno.env.get("DISCORD_CLIENT_ID") as string),
      {
        body: commands,
      },
    );
  } catch (e) {
    console.error(`Error Deploying`, e);
  }
};

import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
  PresenceUpdateStatus,
  Events,
  ChatInputCommandInteraction,
} from "discord.js";

import { buildWelcomeImage } from "./welcome.ts";

type Command = {
  data: { name: string; toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<unknown>;
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
  ],
}) as Client & { commands: Collection<string, Command> };

const addObj = {
  commands: new Collection(),
};

Object.assign(client, addObj);

const commandFiles = Deno.readDirSync(commandsPath).filter(
  (file) => file.isFile && file.name.endsWith(".ts"),
);

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file.name);
  const command = (await import(filePath))?.default;

  if (`data` in command && `execute` in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`The Command ${filePath} fail.`);
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`Ready! Logged in as ${client.user?.tag}`);

  await deployCommands();

  console.log(`Commands deployed globally.`);

  const statusType = botStatus;

  const activityType = Deno.env.get("ACTIVITY_TYPE") || "PLAYING";

  const activityName = Deno.env.get("ACTIVITY_NAME") || "Discord";

  const activityTypeMap = {
    PLAYING: ActivityType.Playing,
    WATCHING: ActivityType.Watching,
    LISTENING: ActivityType.Listening,
    STREAMING: ActivityType.Streaming,
    COMPETING: ActivityType.Competing,
  };

  const statusMap = {
    online: PresenceUpdateStatus.Online,
    idle: PresenceUpdateStatus.Idle,
    dnd: PresenceUpdateStatus.DoNotDisturb,
    invisible: PresenceUpdateStatus.Invisible,
    offline: PresenceUpdateStatus.Offline,
  };

  client.user?.setPresence({
    status: statusMap[statusType],
    activities: [
      {
        name: activityName,
        type: activityTypeMap[activityType],
      },
    ],
  });

  console.log(`Bot status set to: ${statusType}`);
  console.log(`Activity set to ${activityType} ${activityName}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction?.commandName);

  if (!command) {
    return;
  }

  try {
    await command.execute(interaction);
  } catch (e: Error) {
    console.error(e);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error 1",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error 2",
        ephemeral: true,
      });
    }
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const channelId = Deno.env.get("WELCOME_CHANNEL_ID");
    if (!channelId) {
      console.log("WELCOME_CHANNEL_ID is not set, skipping welcome banner.");
      return;
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel?.isSendable()) {
      console.log(`Channel ${channelId} is not a text channel.`);
      return;
    }

    const image = await buildWelcomeImage(member);

    await channel.send({
      files: [{ attachment: image, name: "welcome.png" }],
    });
  } catch (e) {
    console.error("Error sending welcome banner", e);
  }
});

client.login(Deno.env.get("HIRAZYN_TOKEN"));
