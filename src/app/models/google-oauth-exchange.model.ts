import { Schema, model, Types, Document } from 'mongoose';

export const GOOGLE_OAUTH_EXCHANGE_PURPOSE = 'browser-google-oauth';
export const GOOGLE_OAUTH_EXCHANGE_TTL_SECONDS = 120;

export interface GoogleOAuthExchangeDocument extends Document {
  codeHash: string;
  userId: Types.ObjectId;
  purpose: string;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<GoogleOAuthExchangeDocument>(
  {
    codeHash: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purpose: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: 'google_oauth_exchanges' }
);

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ codeHash: 1, purpose: 1, consumedAt: 1, expiresAt: 1 });

export const GoogleOAuthExchange = model<GoogleOAuthExchangeDocument>(
  'GoogleOAuthExchange',
  schema
);
