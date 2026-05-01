import crypto from "crypto";

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicUrl) {
    return null;
  }

  return {
    accessKeyId,
    bucket,
    endpoint: endpoint.replace(/\/$/, ""),
    publicUrl: publicUrl.replace(/\/$/, ""),
    secretAccessKey,
  };
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function hash(value, encoding = "hex") {
  return crypto.createHash("sha256").update(value).digest(encoding);
}

function getSigningKey(secretAccessKey, dateStamp) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, "auto");
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

function encodeKey(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function hasR2Config() {
  return Boolean(getR2Config());
}

export function getR2PublicUrl() {
  const cfg = getR2Config();
  return cfg?.publicUrl || null;
}

export async function uploadToR2({ bytes, contentType, key }) {
  const config = getR2Config();

  if (!config) {
    throw new Error("Faltan variables de entorno de Cloudflare R2.");
  }

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const encodedKey = encodeKey(key);
  const host = `${new URL(config.endpoint).host}`;
  const payloadHash = hash(bytes);
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    `/${config.bucket}/${encodedKey}`,
    "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");
  const signature = hmac(getSigningKey(config.secretAccessKey, dateStamp), stringToSign, "hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`${config.endpoint}/${config.bucket}/${encodedKey}`, {
    method: "PUT",
    body: bytes,
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
    },
  });

  if (!response.ok) {
    throw new Error(`Cloudflare R2 rechazo la subida: ${response.status} ${await response.text()}`);
  }

  return `${config.publicUrl}/${encodedKey}`;
}
