import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/prompts/generate-scenarios";
import { readFile } from "fs/promises";
import { SignJWT, importPKCS8 } from "jose";
import path from "path";

async function getAccessTokenFromServiceAccount(): Promise<string> {
  const saPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), "service_account.json");

  const saRaw = await readFile(saPath, "utf-8");
  const sa = JSON.parse(saRaw);

  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(sa.private_key, "RS256");

  const jwt = await new SignJWT({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/cloud-platform",
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

async function getAccessToken(): Promise<string> {
  // 1. Try GCE/Cloud Run metadata server
  try {
    const tokenRes = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } }
    );
    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      return tokenData.access_token;
    }
  } catch {}

  // 2. Try service account JSON file
  try {
    return await getAccessTokenFromServiceAccount();
  } catch {}

  // 3. Fall back to gcloud CLI
  const { execSync } = await import("child_process");
  return execSync("gcloud auth print-access-token", {
    encoding: "utf-8",
  }).trim();
}

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();
    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    const projectId = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_LOCATION || "us-central1";
    const model = process.env.VERTEX_MODEL || "gemini-2.0-flash";

    if (!projectId) {
      return NextResponse.json(
        { error: "GCP_PROJECT_ID not configured. Set it in .env.local" },
        { status: 500 }
      );
    }

    const accessToken = await getAccessToken();

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildUserPrompt(description) }],
          },
        ],
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Vertex AI error:", errText);
      return NextResponse.json(
        { error: `Vertex AI returned ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    const text =
      result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("Generate error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
