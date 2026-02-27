"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ChannelsInput } from "@/lib/api-client";
import { MessageCircle, Hash, Slack } from "lucide-react";

const CHANNELS = [
  {
    id: "telegram" as const,
    label: "Telegram",
    icon: MessageCircle,
    iconColor: "text-sky-400",
    description: "Bot API token from @BotFather",
  },
  {
    id: "discord" as const,
    label: "Discord",
    icon: Hash,
    iconColor: "text-indigo-400",
    description: "Bot token from Discord Developer Portal",
  },
  {
    id: "slack" as const,
    label: "Slack",
    icon: Slack,
    iconColor: "text-yellow-400",
    description: "Bot OAuth token (xoxb-...)",
  },
];

interface Props {
  value: ChannelsInput;
  onChange: (v: ChannelsInput) => void;
}

export function ChannelsForm({ value, onChange }: Props) {
  function setTelegram(patch: Partial<NonNullable<ChannelsInput["telegram"]>> | null) {
    if (patch === null) {
      const { telegram: _, ...rest } = value;
      onChange(rest);
    } else {
      onChange({ ...value, telegram: { botToken: "", ...value.telegram, ...patch } });
    }
  }

  function setDiscord(patch: Partial<NonNullable<ChannelsInput["discord"]>> | null) {
    if (patch === null) {
      const { discord: _, ...rest } = value;
      onChange(rest);
    } else {
      onChange({ ...value, discord: { botToken: "", ...value.discord, ...patch } });
    }
  }

  function setSlack(patch: Partial<NonNullable<ChannelsInput["slack"]>> | null) {
    if (patch === null) {
      const { slack: _, ...rest } = value;
      onChange(rest);
    } else {
      onChange({ ...value, slack: { botToken: "", ...value.slack, ...patch } });
    }
  }

  const enabled = {
    telegram: !!value.telegram,
    discord: !!value.discord,
    slack: !!value.slack,
  };

  function toggle(id: "telegram" | "discord" | "slack") {
    if (id === "telegram") setTelegram(enabled.telegram ? null : { botToken: "" });
    if (id === "discord") setDiscord(enabled.discord ? null : { botToken: "" });
    if (id === "slack") setSlack(enabled.slack ? null : { botToken: "" });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground -mt-2">
        Connect your agent to messaging platforms. The webhook channel is always enabled.
      </p>

      {CHANNELS.map((ch) => (
        <div
          key={ch.id}
          className={cn(
            "rounded-xl border transition-all overflow-hidden",
            enabled[ch.id] ? "border-primary/40 bg-primary/5" : "border-white/10 bg-white/4"
          )}
        >
          {/* Header row */}
          <button
            type="button"
            onClick={() => toggle(ch.id)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <ch.icon className={cn("h-4 w-4", ch.iconColor)} />
              <span className="text-sm font-medium">{ch.label}</span>
              <span className="text-xs text-muted-foreground">{ch.description}</span>
            </div>
            <div
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors flex-shrink-0",
                enabled[ch.id] ? "bg-primary" : "bg-white/20"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  enabled[ch.id] ? "translate-x-[18px]" : "translate-x-0"
                )}
              />
            </div>
          </button>

          {/* Config fields */}
          {enabled[ch.id] && (
            <div className="border-t border-white/8 px-4 pb-4 pt-3 space-y-3">
              {ch.id === "telegram" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bot Token</Label>
                    <Input
                      type="password"
                      placeholder="123456:ABC-DEF..."
                      value={value.telegram?.botToken ?? ""}
                      onChange={(e) => setTelegram({ botToken: e.target.value })}
                      className="bg-white/4 border-white/10 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Allowed users{" "}
                      <span className="text-muted-foreground font-normal">(usernames or IDs, comma-separated)</span>
                    </Label>
                    <Input
                      placeholder="@alice, 123456789"
                      value={(value.telegram?.allowedUsers ?? []).join(", ")}
                      onChange={(e) =>
                        setTelegram({
                          allowedUsers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className="bg-white/4 border-white/10 text-xs"
                    />
                  </div>
                </>
              )}

              {ch.id === "discord" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bot Token</Label>
                    <Input
                      type="password"
                      placeholder="MTk4NjIy..."
                      value={value.discord?.botToken ?? ""}
                      onChange={(e) => setDiscord({ botToken: e.target.value })}
                      className="bg-white/4 border-white/10 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Guild ID{" "}
                      <span className="text-muted-foreground font-normal">(optional — restrict to one server)</span>
                    </Label>
                    <Input
                      placeholder="123456789012345678"
                      value={value.discord?.guildId ?? ""}
                      onChange={(e) => setDiscord({ guildId: e.target.value || undefined })}
                      className="bg-white/4 border-white/10 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Allowed users{" "}
                      <span className="text-muted-foreground font-normal">(user IDs, comma-separated)</span>
                    </Label>
                    <Input
                      placeholder="123456789, 987654321"
                      value={(value.discord?.allowedUsers ?? []).join(", ")}
                      onChange={(e) =>
                        setDiscord({
                          allowedUsers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className="bg-white/4 border-white/10 text-xs"
                    />
                  </div>
                </>
              )}

              {ch.id === "slack" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bot Token (xoxb-...)</Label>
                    <Input
                      type="password"
                      placeholder="xoxb-..."
                      value={value.slack?.botToken ?? ""}
                      onChange={(e) => setSlack({ botToken: e.target.value })}
                      className="bg-white/4 border-white/10 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      App-Level Token{" "}
                      <span className="text-muted-foreground font-normal">(xapp-... for Socket Mode)</span>
                    </Label>
                    <Input
                      type="password"
                      placeholder="xapp-..."
                      value={value.slack?.appToken ?? ""}
                      onChange={(e) => setSlack({ appToken: e.target.value || undefined })}
                      className="bg-white/4 border-white/10 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Channel ID{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      placeholder="C1234567890"
                      value={value.slack?.channelId ?? ""}
                      onChange={(e) => setSlack({ channelId: e.target.value || undefined })}
                      className="bg-white/4 border-white/10 font-mono text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Webhook — always on */}
      <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-muted-foreground">Webhook</span>
          <span className="text-xs text-muted-foreground">HTTP endpoint — always enabled</span>
        </div>
        <span className="text-xs text-green-400 font-medium">Always on</span>
      </div>
    </div>
  );
}
