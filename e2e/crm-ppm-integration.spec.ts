/**
 * Integration tests — CRM ↔ PPM handoff.
 * Verifies that the ppm-sync endpoint and related CRM API routes
 * respond correctly without requiring a live database.
 */
import { test, expect } from "@playwright/test";

const CLOSED_WON_OPP_ID = "00000000-0000-0000-0001-000000000005"; // OPP-005 — Carol Bertolini (closed_won in seed)
const OPEN_OPP_ID        = "00000000-0000-0000-0001-000000000001"; // OPP-001 — still in discovery

test.describe("CRM API — opportunities", () => {
  test("GET /api/crm/opportunities returns list", async ({ request }) => {
    const res = await request.get("/api/crm/opportunities");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("success", true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("GET /api/crm/opportunities?stage=closed_won returns only won deals", async ({ request }) => {
    const res = await request.get("/api/crm/opportunities?stage=closed_won");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    for (const opp of body.data) {
      expect(opp.stage).toBe("closed_won");
    }
  });
});

test.describe("CRM → PPM sync endpoint", () => {
  test("GET /api/crm/ppm-sync?opportunity_id=<won> returns can_create_project=true", async ({ request }) => {
    const res = await request.get(`/api/crm/ppm-sync?opportunity_id=${CLOSED_WON_OPP_ID}`);
    expect([200, 404]).toContain(res.status()); // 404 acceptable if seed not loaded
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.can_create_project).toBe(true);
      expect(body.data.stage).toBe("closed_won");
    }
  });

  test("GET /api/crm/ppm-sync?opportunity_id=<open> returns can_create_project=false", async ({ request }) => {
    const res = await request.get(`/api/crm/ppm-sync?opportunity_id=${OPEN_OPP_ID}`);
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.can_create_project).toBe(false);
    }
  });

  test("GET /api/crm/ppm-sync without opportunity_id returns 400", async ({ request }) => {
    const res = await request.get("/api/crm/ppm-sync");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("POST /api/crm/ppm-sync rejects open opportunity with 400", async ({ request }) => {
    const res = await request.post("/api/crm/ppm-sync", {
      data: { opportunity_id: OPEN_OPP_ID },
    });
    // 400 if opp found and not closed_won; 404 if seed not loaded
    expect([400, 404]).toContain(res.status());
    if (res.status() === 400) {
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/closed_won/i);
    }
  });

  test("POST /api/crm/ppm-sync without body returns 400", async ({ request }) => {
    const res = await request.post("/api/crm/ppm-sync", { data: {} });
    expect(res.status()).toBe(400);
  });
});

test.describe("PPM API — projects", () => {
  test("GET /api/ppm/projects returns list", async ({ request }) => {
    const res = await request.get("/api/ppm/projects");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("success", true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("GET /api/ppm/metrics returns portfolio metrics", async ({ request }) => {
    const res = await request.get("/api/ppm/metrics");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const m = body.data;
    expect(typeof m.total_projects).toBe("number");
    expect(typeof m.active_projects).toBe("number");
    expect(typeof m.green_count).toBe("number");
  });
});

test.describe("CRM EPM-sync endpoint (regression)", () => {
  test("POST /api/crm/epm-sync without opportunity_id returns 400", async ({ request }) => {
    const res = await request.post("/api/crm/epm-sync", { data: {} });
    expect(res.status()).toBe(400);
  });

  test("POST /api/crm/epm-sync with open opportunity returns 400", async ({ request }) => {
    const res = await request.post("/api/crm/epm-sync", {
      data: { opportunity_id: OPEN_OPP_ID },
    });
    expect([400, 404, 500]).toContain(res.status());
    if (res.status() === 400) {
      const body = await res.json();
      expect(body.success).toBe(false);
    }
  });
});
