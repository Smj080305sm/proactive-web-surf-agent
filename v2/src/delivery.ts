import { writeFile } from "node:fs/promises";
import { fetchJson } from "./http.js";
import type { AppConfig, Candidate, DeliveryChannel } from "./types.js";

class ConsoleDelivery implements DeliveryChannel {
  async send(candidate: Candidate, message: string): Promise<void> {
    console.log(`\n${message}\n\n${candidate.title}\n${candidate.url}\n`);

    const mood = Math.floor(Math.random() * 21) + 70;

const moodTexts = [
  "刚逛完网，有点兴奋",
  "今天看到不少有意思的东西",
  "状态不错，想继续乱逛",
  "脑子里还在回味刚才那个项目",
  "有点困，但还挺开心"
];

const latest = {
  message,
  title: candidate.title,
  url: candidate.url,
  updatedAt: new Date().toISOString(),
  mood,
  moodText: moodTexts[Math.floor(Math.random() * moodTexts.length)]
};

    await writeFile(
      "latest.json",
      JSON.stringify(latest, null, 2),
      "utf8"
    );

    console.log("Saved recommendation to latest.json");
  }
}

class TelegramDelivery implements DeliveryChannel {
  constructor(private readonly config: AppConfig) {}

  async send(candidate: Candidate, message: string): Promise<void> {
    const text = `${message}\n\n${candidate.title}\n${candidate.url}`;

    await fetchJson(
      `https://api.telegram.org/bot${this.config.telegram.token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: this.config.telegram.chatId,
          text,
          disable_web_page_preview: false
        })
      },
      this.config.timeoutMs
    );
  }
}

export function createDelivery(config: AppConfig): DeliveryChannel {
  return config.deliveryChannel === "telegram"
    ? new TelegramDelivery(config)
    : new ConsoleDelivery();
}
