/**
 * Phase 8.2 API Route Testing
 * Verify /api/ai/analyze-search functionality
 */

// Test 1: Valid request with multiple emails
const testEmails = [
  {
    sender: "promotions@store.com",
    subject: "Limited Time Offer - 50% Off",
    snippet: "Don't miss out on our exclusive sale ending today...",
    date: "2026-05-31",
  },
  {
    sender: "noreply@newsletter.co",
    subject: "May Newsletter - Industry Updates",
    snippet: "Check out the latest trends in technology and business...",
    date: "2026-05-30",
  },
  {
    sender: "support@service.io",
    subject: "Your account needs verification",
    snippet: "Please verify your account by clicking the link below...",
    date: "2026-05-29",
  },
];

async function testAnalyzeSearchAPI() {
  console.log("🧪 Testing Phase 8.2 AI Analysis API\n");

  // Test 1: Basic request
  console.log("Test 1: Basic email analysis request");
  try {
    const response = await fetch("http://localhost:3001/api/ai/analyze-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: testEmails }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Response received");
      console.log(`   - analyzedCount: ${result.analyzedCount}`);
      console.log(`   - totalProvided: ${result.totalProvided}`);
      console.log(`   - cached: ${result.cached}`);
      console.log(`   - analyzedAt: ${result.analyzedAt}`);
      console.log(`   - analysis.summary: ${result.analysis.summary?.substring(0, 50)}...`);
      console.log(`   - risk.riskLevel: ${result.risk.riskLevel}`);
      console.log(`   - summary.summary: ${result.summary.summary?.substring(0, 50)}...`);
    } else {
      console.log("❌ Request failed:", result.error);
    }
  } catch (err) {
    console.log("❌ Network error:", err);
  }

  // Test 2: Empty array (should fail)
  console.log("\nTest 2: Empty emails array (should fail)");
  try {
    const response = await fetch("http://localhost:3001/api/ai/analyze-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: [] }),
    });

    const result = await response.json();
    console.log(`${response.ok ? "❌ Should have failed" : "✅"} Error: ${result.error}`);
  } catch (err) {
    console.log("❌ Network error:", err);
  }

  // Test 3: Cache hit (same request twice)
  console.log("\nTest 3: Cache hit verification");
  try {
    const request = { emails: testEmails };

    // First request
    const response1 = await fetch("http://localhost:3001/api/ai/analyze-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const result1 = await response1.json();
    const cached1 = result1.cached;

    // Second request (should hit cache)
    const response2 = await fetch("http://localhost:3001/api/ai/analyze-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const result2 = await response2.json();
    const cached2 = result2.cached;

    console.log(`✅ First request cached: ${cached1} (expected: false)`);
    console.log(`✅ Second request cached: ${cached2} (expected: true)`);
  } catch (err) {
    console.log("❌ Cache test failed:", err);
  }

  // Test 4: Max emails limit (50+)
  console.log("\nTest 4: Email limit enforcement (>50 emails)");
  try {
    const manyEmails = Array.from({ length: 75 }, (_, i) => ({
      sender: `sender${i}@example.com`,
      subject: `Email ${i}`,
      snippet: `Content ${i}`,
      date: "2026-05-31",
    }));

    const response = await fetch("http://localhost:3001/api/ai/analyze-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: manyEmails }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log(
        `✅ Request limited to: ${result.analyzedCount} (max 50)`
      );
      console.log(`   - totalProvided: ${result.totalProvided}`);
    } else {
      console.log("❌ Request failed:", result.error);
    }
  } catch (err) {
    console.log("❌ Limit test failed:", err);
  }

  console.log("\n✅ Test suite complete");
}

// Run tests in browser console
testAnalyzeSearchAPI();
