export type AppId = "aligner" | "annotator" | "studio";

export type HelloMessage = {
  app: AppId;
  version: string;
};

export const WS_PATH = "/ws" as const;
