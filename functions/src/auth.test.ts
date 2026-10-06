import type { CallableRequest } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";
import { requireAdmin } from "./auth";

function requestWith(auth: unknown): CallableRequest {
  return { auth } as unknown as CallableRequest;
}

function verifiedRequest(email: unknown): CallableRequest {
  return requestWith({ uid: "uid-1", token: { email, email_verified: true } });
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(HttpsError);
    expect((error as HttpsError).code).toBe(code);
    return;
  }
  expect.unreachable(`expected an ${code} HttpsError`);
}

describe("requireAdmin", () => {
  it("throws unauthenticated without auth and never looks up a doc", async () => {
    let lookedUp = false;
    await expectCode(
      requireAdmin(requestWith(undefined), async () => {
        lookedUp = true;
        return true;
      }),
      "unauthenticated",
    );
    expect(lookedUp).toBe(false);
  });

  it("throws permission-denied for an unverified email", async () => {
    await expectCode(
      requireAdmin(
        requestWith({ uid: "uid-1", token: { email: "admin@example.com", email_verified: false } }),
        async () => true,
      ),
      "permission-denied",
    );
  });

  it("throws permission-denied when verification or email is missing", async () => {
    await expectCode(
      requireAdmin(requestWith({ uid: "uid-1", token: { email: "admin@example.com" } }), async () => true),
      "permission-denied",
    );
    await expectCode(
      requireAdmin(requestWith({ uid: "uid-1", token: { email_verified: true } }), async () => true),
      "permission-denied",
    );
  });

  it("normalizes a mixed-case email before the lookup", async () => {
    const seen: string[] = [];
    const email = await requireAdmin(verifiedRequest("Admin@Example.COM"), async (normalized) => {
      seen.push(normalized);
      return true;
    });
    expect(email).toBe("admin@example.com");
    expect(seen).toEqual(["admin@example.com"]);
  });

  it("trims surrounding whitespace from the email", async () => {
    const email = await requireAdmin(
      verifiedRequest("  admin@example.com\t"),
      async () => true,
    );
    expect(email).toBe("admin@example.com");
  });

  it("throws permission-denied when the admin doc is missing", async () => {
    await expectCode(
      requireAdmin(verifiedRequest("admin@example.com"), async () => false),
      "permission-denied",
    );
  });

  it("returns the normalized email on success", async () => {
    await expect(
      requireAdmin(verifiedRequest("admin@example.com"), async () => true),
    ).resolves.toBe("admin@example.com");
  });
});
