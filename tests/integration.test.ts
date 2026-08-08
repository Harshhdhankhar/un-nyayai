import { describe, it, expect, afterAll } from "vitest";
import { signupUser, createDemoUser } from "@/lib/auth/service";
import { createMatter, getMatterDetail, listMatters } from "@/lib/matters/service";
import { createDocumentRecord, analyzeDocument, chunkText } from "@/lib/documents/service";
import { retrieveDocumentChunks, chunksToSources } from "@/lib/retrieval/documents";
import {
  getOrCreateThread,
  saveMessage,
  getThreadMessages,
  listThreads,
  getThread,
  deleteThread,
  renameThread,
} from "@/lib/matters/chat";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Integration tests against the local Postgres instance.
 * Requires a seeded database (npm run db:seed) and DATABASE_URL set.
 */

describe("auth + matters integration", () => {
  const emails: string[] = [];
  const userIds: string[] = [];

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, emails[0]));
  });

  it("signs up a user", async () => {
    const email = `it-${Date.now()}@nyayi.test`;
    emails.push(email);
    const res = await signupUser({
      email,
      password: "Test@12345",
      fullName: "Integration Tester",
      role: "citizen",
    });
    expect(res.ok).toBe(true);
    if (res.ok) userIds.push(res.user.id);
  });

  it("rejects duplicate signup", async () => {
    const res = await signupUser({
      email: emails[0],
      password: "Test@12345",
      role: "citizen",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("already exists");
  });

  it("creates and lists a matter for the user", async () => {
    if (userIds.length === 0) return;
    const matter = await createMatter(userIds[0], {
      title: "Deposit not returned",
      description: "Landlord kept the security deposit.",
      matterType: "property",
      language: "en",
      facts: [{ fact: "Vacated flat on 15 Jan" }],
      parties: [],
      events: [],
    });
    const all = await listMatters(userIds[0]);
    expect(all.some((m) => m.id === matter.id)).toBe(true);
    const detail = await getMatterDetail(userIds[0], matter.id);
    expect(detail?.facts).toHaveLength(1);
    expect(detail?.facts[0].fact).toBe("Vacated flat on 15 Jan");
  });

  it("blocks cross-user access", async () => {
    if (userIds.length === 0) return;
    const other = await createDemoUser();
    const matter = await createMatter(userIds[0], {
      title: "Private matter",
      matterType: "other",
      language: "en",
      facts: [],
      parties: [],
      events: [],
    });
    const detail = await getMatterDetail(other.id, matter.id);
    expect(detail).toBeNull();
  });
});

describe("matter document RAG", () => {
  let userId = "";
  let matterId = "";
  let docId = "";
  const emails: string[] = [];

  afterAll(async () => {
    if (emails[0]) await db.delete(users).where(eq(users.email, emails[0]));
  });

  it("seeds a user, matter and embedded document", async () => {
    const email = `rag-${Date.now()}@nyayi.test`;
    emails.push(email);
    const res = await signupUser({
      email,
      password: "Test@12345",
      fullName: "RAG Tester",
      role: "citizen",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    userId = res.user.id;

    const matter = await createMatter(userId, {
      title: "Service agreement dispute",
      description: "Software vendor kept advance after termination.",
      matterType: "commercial",
      language: "en",
      facts: [{ fact: "Paid advance of INR 2,50,000." }],
      parties: [],
      events: [],
    });
    matterId = matter.id;

    const text = `Termination and refund of advance. This service agreement between the parties
provides that upon termination for any reason, the vendor shall refund the advance amount of
INR 2,50,000 within thirty days. Clause 14 sets out that interest accrues at 12% per annum on
delayed refunds after the notice period of fifteen days. The client may recover costs under
Section 34 of the Civil Procedure Code.`;
    const doc = await createDocumentRecord({
      userId,
      matterId,
      name: "service-agreement.txt",
      mimeType: "text/plain",
      sizeBytes: Buffer.byteLength(text),
      extractedText: text,
    });
    docId = doc.id;
    const { chunks } = await analyzeDocument(docId, text);
    expect(chunks).toBeGreaterThan(0);
    expect(chunkText(text).join(" ")).toContain("Clause 14");
  });

  it("retrieves the matching chunk scoped to the matter", async () => {
    if (!userId || !matterId) return;
    const hits = await retrieveDocumentChunks("refund of advance money", {
      userId,
      matterId,
      k: 3,
    });
    expect(hits.length).toBeGreaterThan(0);
    const top = hits[0];
    expect(top.documentId).toBe(docId);
    expect(top.documentName).toContain("service-agreement");
    expect(top.content.toLowerCase()).toContain("refund");
    const sources = chunksToSources(hits);
    expect(sources[0].type).toBe("document");
    expect(sources[0].excerpt).toContain("refund");
  });

  it("does not leak another user's documents", async () => {
    if (!userId) return;
    const other = await createDemoUser();
    const hits = await retrieveDocumentChunks("refund of advance money", {
      userId: other.id,
    });
    expect(hits.length).toBe(0);
  });
});

describe("chat sessions", () => {
  let userId = "";
  let threadId = "";
  const emails: string[] = [];

  afterAll(async () => {
    if (emails[0]) await db.delete(users).where(eq(users.email, emails[0]));
  });

  it("creates a thread and persists a conversation", async () => {
    const email = `chat-${Date.now()}@nyayi.test`;
    emails.push(email);
    const res = await signupUser({
      email,
      password: "Test@12345",
      fullName: "Chat Tester",
      role: "citizen",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    userId = res.user.id;

    const thread = await getOrCreateThread({
      userId,
      title: "Deposit dispute",
      language: "en",
    });
    threadId = thread.id;

    await saveMessage({ threadId, role: "user", content: "My landlord kept my deposit." });
    await saveMessage({ threadId, role: "assistant", content: "You may claim it under the rental law." });
    await saveMessage({ threadId, role: "user", content: "What is the limitation period?" });

    const messages = await getThreadMessages(threadId);
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe("user");
    expect(messages[2].content).toContain("limitation");
  });

  it("lists and scopes threads to the owner", async () => {
    if (!userId) return;
    const all = await listThreads(userId);
    expect(all.some((t) => t.id === threadId)).toBe(true);

    const other = await createDemoUser();
    const foreign = await getThread(other.id, threadId);
    expect(foreign).toBeNull();
  });

  it("renames and deletes a thread", async () => {
    if (!userId) return;
    const renamed = await renameThread(userId, threadId, "Deposit dispute — follow up");
    expect(renamed).toBe(true);
    const [thread] = await listThreads(userId);
    expect(thread.title).toContain("follow up");

    const deleted = await deleteThread(userId, threadId);
    expect(deleted).toBe(true);
    expect(await getThread(userId, threadId)).toBeNull();
  });
});
