import * as Schema from "effect/Schema";

export const ProfileSummarySchema = Schema.Struct({
  id: Schema.String,
  displayName: Schema.String,
  createdAt: Schema.String,
}).annotations({ identifier: "ProfileSummary" });

export const ProfileListResponseSchema = Schema.Struct({
  profiles: Schema.Array(ProfileSummarySchema),
}).annotations({ identifier: "ProfileListResponse" });

export const ProfileCreateRequestSchema = Schema.Struct({
  displayName: Schema.String,
}).annotations({ identifier: "ProfileCreateRequest" });

export const ProfileSignInRequestSchema = Schema.Struct({
  displayName: Schema.String,
}).annotations({ identifier: "ProfileSignInRequest" });

export const ProfileResponseSchema = Schema.Struct({
  profileId: Schema.String,
  displayName: Schema.String,
}).annotations({ identifier: "ProfileResponse" });

export type ProfileSummary = typeof ProfileSummarySchema.Type;
export type ProfileListResponse = typeof ProfileListResponseSchema.Type;
export type ProfileCreateRequest = typeof ProfileCreateRequestSchema.Type;
export type ProfileSignInRequest = typeof ProfileSignInRequestSchema.Type;
export type ProfileResponse = typeof ProfileResponseSchema.Type;
