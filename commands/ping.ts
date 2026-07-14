import { SlashCommandBuilder } from "discord.js";

const execute = async (interaction) => {
  const { resource } = await interaction.reply({
    content: "Pinging...",
    withResponse: true,
  });
  const pingTime = resource.message.createdTimestamp - interaction.createdTimestamp;

  await interaction.editReply(
    `Pong! \nBot Latency: ${pingTime}ms \nAPI Latency: ${Math.round(interaction.client.ws.ping)}ms`,
  );
};

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong and latency info."),
  execute,
};
