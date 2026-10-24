import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_BACKUP_TENANTS,
  DYNAMODB_ALWAYS_FREE_STORAGE_GB,
  DYNAMODB_PITR_MONTHLY_RATE_USD_PER_GB,
  TenantBackupCard,
  buildSyntheticPartitionItems,
  computeSha256Checksum,
  estimateDynamoDbStorageCostSavings,
  formatBackupFileSize,
  generateTenantBackupSnapshot,
  validateBackupSnapshot,
} from "../src/admin/superadmin/TenantBackupCard.js";

describe("Step 462 (Phase 19.12): One-Click Full Tenant JSON Backup & Restore Utility (TenantBackupCard.tsx)", () => {
  describe("1. Pure SHA-256 Checksum Engine Invariants", () => {
    it("computes deterministic standard SHA-256 hash for empty input", () => {
      const hash = computeSha256Checksum("");
      assert.strictEqual(hash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    it("computes exact SHA-256 hash for known ASCII strings", () => {
      // sha256("hello")
      const hash = computeSha256Checksum("hello");
      assert.strictEqual(hash, "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    });

    it("handles multi-byte UTF-8 Sri Lankan Unicode characters (Sinhala/Tamil/EMVCo)", () => {
      const payload = "ශ්රී ලංකා හෝටල් පද්ධතිය • இலங்கை விடுதி • Galle Fort Heritage LK";
      const hash1 = computeSha256Checksum(payload);
      const hash2 = computeSha256Checksum(payload);
      assert.strictEqual(hash1.length, 64);
      assert.strictEqual(hash1, hash2);
    });

    it("produces completely distinct checksums for 1-bit input modifications (avalanche effect)", () => {
      const original = JSON.stringify({ room: "101", amountLkr: 25000 });
      const modified = JSON.stringify({ room: "101", amountLkr: 25001 });
      const hashA = computeSha256Checksum(original);
      const hashB = computeSha256Checksum(modified);
      assert.notStrictEqual(hashA, hashB);
    });
  });

  describe("2. DynamoDB Storage & Zero-Cost PITR Calculation Invariants", () => {
    it("defines standard AWS Free-Tier constants", () => {
      assert.strictEqual(DYNAMODB_PITR_MONTHLY_RATE_USD_PER_GB, 0.2);
      assert.strictEqual(DYNAMODB_ALWAYS_FREE_STORAGE_GB, 25.0);
      assert.strictEqual(CURRENT_SCHEMA_VERSION, "2026.1-single-table");
    });

    it("formats backup file sizes correctly across units", () => {
      assert.strictEqual(formatBackupFileSize(512), "512 B");
      assert.strictEqual(formatBackupFileSize(245760), "240.0 KB");
      assert.strictEqual(formatBackupFileSize(5242880), "5.00 MB");
    });

    it("computes PITR cost savings avoiding $0.20/GB-month minimum", () => {
      const savingsSmall = estimateDynamoDbStorageCostSavings(100 * 1024); // 100 KB
      assert.strictEqual(savingsSmall.pitrMonthlySavingsUsd, 0.2); // minimum floor
      assert.ok(savingsSmall.alwaysFreeStoragePct < 0.01);

      const savingsLarge = estimateDynamoDbStorageCostSavings(2 * 1024 * 1024 * 1024); // 2 GB
      assert.strictEqual(savingsLarge.pitrMonthlySavingsUsd, 0.4);
      assert.strictEqual(savingsLarge.alwaysFreeStoragePct, 8.0); // 2GB / 25GB = 8%
    });
  });

  describe("3. Partition Query & Synthetic Snapshot Generation", () => {
    it("synthesizes multi-tenant partition records matching PK = TENANT#<tid>", () => {
      const items = buildSyntheticPartitionItems(
        "tenant-galle-boutique",
        "Galle Fort Boutique",
        15,
      );
      assert.ok(items.length > 5);

      for (const item of items) {
        assert.strictEqual(item.PK, "TENANT#tenant-galle-boutique");
        assert.ok(item.SK.length > 0);
        assert.ok(item.entityType.length > 0);
        assert.ok(item.updatedAt.length > 0);
      }
    });

    it("includes core 42-entity types (ROOM, GUEST, FOLIO, ORDER_TICKET, TAX_RECORD, AUDIT_LOG)", () => {
      const items = buildSyntheticPartitionItems("tenant-ella-cloud", "Ella Cloud Mist", 10);
      const entityTypes = new Set(items.map((i) => i.entityType));

      assert.ok(entityTypes.has("TENANT_CONFIG"));
      assert.ok(entityTypes.has("ROOM"));
      assert.ok(entityTypes.has("GUEST"));
      assert.ok(entityTypes.has("FOLIO"));
      assert.ok(entityTypes.has("ORDER_TICKET"));
      assert.ok(entityTypes.has("INVENTORY_ITEM"));
      assert.ok(entityTypes.has("TAX_RECORD"));
      assert.ok(entityTypes.has("AUDIT_LOG_SHA256"));
    });

    it("generates a full verified snapshot with SHA-256 metadata checksum", () => {
      const snapshot = generateTenantBackupSnapshot("tenant-colombo-grand", "Colombo Grand");
      assert.strictEqual(snapshot.metadata.tenantId, "tenant-colombo-grand");
      assert.strictEqual(snapshot.metadata.schemaVersion, CURRENT_SCHEMA_VERSION);
      assert.strictEqual(snapshot.metadata.partitionPrefix, "PK = TENANT#tenant-colombo-grand");
      assert.strictEqual(snapshot.metadata.totalItemCount, snapshot.items.length);
      assert.strictEqual(snapshot.metadata.sha256Checksum.length, 64);

      // Verify the checksum matches items
      const expectedChecksum = computeSha256Checksum(JSON.stringify(snapshot.items));
      assert.strictEqual(snapshot.metadata.sha256Checksum, expectedChecksum);
    });
  });

  describe("4. Dry-Run Restore Validation Engine", () => {
    it("validates an untampered snapshot successfully", () => {
      const snapshot = generateTenantBackupSnapshot("tenant-galle-boutique", "Galle Fort Boutique");
      const json = JSON.stringify(snapshot);
      const result = validateBackupSnapshot(json, "tenant-galle-boutique");

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.tenantMatch, true);
      assert.strictEqual(result.schemaMatch, true);
      assert.strictEqual(result.checksumValid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.strictEqual(result.itemCount, snapshot.items.length);
      assert.ok((result.entityBreakdown.ROOM ?? 0) > 0);
    });

    it("rejects corrupt or non-JSON input gracefully", () => {
      const result = validateBackupSnapshot("not-a-json-payload", "tenant-galle-boutique");
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.errors.length, 1);
      assert.match(result.errors[0] ?? "", /could not parse/i);
    });

    it("rejects snapshots missing metadata or items array", () => {
      const invalidSnapshot = JSON.stringify({ metadata: { tenantId: "tenant-1" } });
      const result = validateBackupSnapshot(invalidSnapshot, "tenant-1");
      assert.strictEqual(result.valid, false);
      assert.match(result.errors[0] ?? "", /missing required 'metadata' or 'items'/i);
    });

    it("detects tenant ID mismatch when restoring into wrong hotel tenant", () => {
      const snapshot = generateTenantBackupSnapshot("tenant-colombo-grand", "Colombo Grand");
      const json = JSON.stringify(snapshot);
      const result = validateBackupSnapshot(json, "tenant-galle-boutique");

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.tenantMatch, false);
      assert.match(result.errors[0] ?? "", /Tenant ID mismatch/i);
    });

    it("detects payload tampering and checksum corruption", () => {
      const snapshot = generateTenantBackupSnapshot("tenant-galle-boutique", "Galle Fort Boutique");
      // Tamper with one item's attributes
      const tamperedSnapshot = {
        ...snapshot,
        metadata: {
          ...snapshot.metadata,
        },
        items: [
          ...snapshot.items,
          {
            PK: "TENANT#tenant-galle-boutique",
            SK: "INJECTED#01",
            entityType: "INJECTED",
            attributes: { malicious: true },
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const json = JSON.stringify(tamperedSnapshot);
      const result = validateBackupSnapshot(json, "tenant-galle-boutique");

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.checksumValid, false);
      assert.ok(result.errors.some((e) => /SHA-256 Checksum mismatch/i.test(e)));
    });

    it("identifies foreign partition items belonging to other tenants", () => {
      const snapshot = generateTenantBackupSnapshot("tenant-galle-boutique", "Galle Fort Boutique");
      const snapshotWithForeign = {
        metadata: {
          ...snapshot.metadata,
          sha256Checksum: "", // will be calculated
        },
        items: [
          ...snapshot.items,
          {
            PK: "TENANT#tenant-hacker-property",
            SK: "ROOM#999",
            entityType: "ROOM",
            attributes: {},
            updatedAt: new Date().toISOString(),
          },
        ],
      };
      snapshotWithForeign.metadata.sha256Checksum = computeSha256Checksum(
        JSON.stringify(snapshotWithForeign.items),
      );

      const json = JSON.stringify(snapshotWithForeign);
      const result = validateBackupSnapshot(json, "tenant-galle-boutique");

      assert.strictEqual(result.valid, true); // No error, but warning
      assert.ok(result.warnings.some((w) => /Foreign partition item detected/i.test(w)));
    });

    it("warns when snapshot uses legacy schema version", () => {
      const snapshot = generateTenantBackupSnapshot("tenant-galle-boutique", "Galle Fort Boutique");
      const legacySnapshot = {
        ...snapshot,
        metadata: {
          ...snapshot.metadata,
          schemaVersion: "2025.4-beta",
        },
      };

      const json = JSON.stringify(legacySnapshot);
      const result = validateBackupSnapshot(json, "tenant-galle-boutique");
      assert.strictEqual(result.schemaMatch, false);
      assert.ok(result.warnings.some((w) => /differs from current/i.test(w)));
    });
  });

  describe("5. React Component Static Rendering & HIG Standards", () => {
    it("renders TenantBackupCard without runtime exceptions", () => {
      const markup = renderToStaticMarkup(
        React.createElement(TenantBackupCard, {
          initialTenantId: "tenant-galle-boutique",
          availableTenants: DEFAULT_BACKUP_TENANTS,
        }),
      );

      assert.ok(markup.includes("Zero-Cost Single-Table Tenant Backup &amp; Restore Utility"));
      assert.ok(markup.includes("PK = TENANT#tenant-galle-boutique"));
      assert.ok(markup.includes("PITR Fee: $0.00"));
      assert.ok(markup.includes("Free Tier: 25 GB Storage"));
      assert.ok(markup.includes("1-Click Snapshot Backup"));
      assert.ok(markup.includes("Dry-Run Validate Snapshot"));
    });

    it("renders default mock tenants in selector", () => {
      const markup = renderToStaticMarkup(
        React.createElement(TenantBackupCard, {
          availableTenants: DEFAULT_BACKUP_TENANTS,
        }),
      );

      for (const tenant of DEFAULT_BACKUP_TENANTS) {
        assert.ok(markup.includes(tenant.hotelName.replace("&", "&amp;")));
        assert.ok(markup.includes(tenant.tenantId));
      }
    });

    it("includes Apple HIG continuous squircles and tabular typography classes", () => {
      const markup = renderToStaticMarkup(React.createElement(TenantBackupCard));
      assert.ok(markup.includes("tabular-nums-lkr"));
      assert.ok(markup.includes("min-h-[44px]"));
      assert.ok(markup.includes("rounded-xl"));
    });
  });
});
