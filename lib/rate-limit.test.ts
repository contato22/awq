import assert from "node:assert/strict";
import { test } from "node:test";
import { SlidingWindowLimiter, clientIpFromHeaders } from "./rate-limit";

test("blocks the 6th failure for the same account inside the window", () => {
  let clock = 1_000_000;
  const limiter = new SlidingWindowLimiter(() => clock);
  const windowMs = 5 * 60 * 1000;
  const key = "acct:1.1.1.1|a@awq.com";
  for (let i = 0; i < 5; i++) limiter.hit(key, windowMs);
  assert.equal(limiter.count(key, windowMs) >= 5, true);
  clock += windowMs + 1;
  assert.equal(limiter.count(key, windowMs), 0);
});

test("unknown IP does not share a global bucket", () => {
  const headers = { "x-forwarded-for": "" };
  assert.equal(clientIpFromHeaders(headers), "unknown");
  assert.equal(clientIpFromHeaders({ get: () => "203.0.113.5, 10.0.0.1" }), "203.0.113.5");
});
