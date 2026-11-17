import test from "node:test";
import assert from "node:assert/strict";
import { addJevModel, applyCodexTier } from "../src/codex-proxy.mjs";

const priority = { id: "priority", name: "Fast" };
const ultrafast = { id: "ultrafast", name: "Ultrafast" };

test("Jev Router advertises the account catalog's combined service tiers", () => {
  const catalog = addJevModel({ models: [{
    slug: "gpt-5.6-terra",
    service_tiers: [priority],
    additional_speed_tiers: ["fast"],
  }, {
    slug: "gpt-6.2-sol",
    service_tiers: [priority, ultrafast],
    additional_speed_tiers: ["fast", "ultrafast"],
  }] });

  assert.equal(catalog.models[0].slug, "jev-router");
  assert.deepEqual(catalog.models[0].service_tiers, [priority, ultrafast]);
  assert.deepEqual(catalog.models[0].additional_speed_tiers, ["fast", "ultrafast"]);
});

test("the routed model keeps only service tiers it actually supports", () => {
  const models = new Map([
    ["gpt-6.2-sol", { service_tiers: [priority, ultrafast] }],
    ["gpt-5.6-terra", { service_tiers: [priority] }],
  ]);
  const supported = { model: "jev-router", service_tier: "ultrafast" };
  applyCodexTier(supported, "opus", models, "gpt-6.2-sol");
  assert.equal(supported.service_tier, "ultrafast");

  const unsupported = { model: "jev-router", service_tier: "ultrafast" };
  applyCodexTier(unsupported, "sonnet", models, "gpt-5.6-terra");
  assert.equal(Object.hasOwn(unsupported, "service_tier"), false);

  const defaultTier = { model: "jev-router", service_tier: "default" };
  applyCodexTier(defaultTier, "sonnet", models, "gpt-5.6-terra");
  assert.equal(defaultTier.service_tier, "default");
});
