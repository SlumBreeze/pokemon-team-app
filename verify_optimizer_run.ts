import { generateBestTeam } from "./utils/teamOptimizer.js"; // Note .js extension for node execution if needed, or ts-node
// We need to mock fetchPokemon or ensure the environment can run the real one.
// For this verification, we'll rely on the real file but we need to ensure dependencies are resolved.
// Actually, running TS directly might be tricky without ts-node.
// Let's make a pure JS version that mimics the logic to "dry run" the algorithm
// OR simpler: just create a small unit test file similar to reproduce_issue.ts which seemed to work.

// Let's assume reproduce_issue.ts mechanism works.
// We will create 'verify_optimizer_run.ts'
// But wait, the previous reproduce_issue.ts execution failed? No, I didn't see it fail.
// Ah, I ran a command previously: "echo ... | node -e ..." which worked for server/index.js.
// 'reproduce_issue.ts' uses ESM imports. The project has "type": "module".

import { generateBestTeam } from "./utils/teamOptimizer";

async function testOptimizer() {
  console.log("Starting Optimizer Test...");

  // Mock Caught Pokemon List
  // Gyarados: Water/Flying. BST ~540.
  // Pawmo: Electric/Fighting. BST ~405.
  // Boss: Water.
  // Logic:
  // Gyarados: 540 + 0 (No Bonus) + 0 (No Type) = 540. (Maybe 100 penalty if I kept it? No, 0.5x is -100).
  // Wait, Gyarados vs Water. Water/Flying. Water moves vs Water = 0.5. Flying vs Water = 1.0. Max = 1.0. Score = 0.
  // Pawmo: 405 + 100 (Potential < 500) + 500 (Hard Counter Electric) = 1005.

  // Scenario 2: Boss Ground.
  // Gyarados: 540 + 500 (Water > Ground) = 1040.
  // Pawmo: 405 + 100 = 505.

  const caught = ["gyarados", "pawmo", "charmander"];

  console.log("\nScenario: Boss is WATER type");
  const team = await generateBestTeam(caught, [], "water");

  console.log("Generated Team:", team);

  if (team[0] === "pawmo") {
    console.log("PASS: Pawmo beat Gyarados against Water boss.");
  } else {
    console.error("FAIL: Gyarados beat Pawmo.");
  }
}

testOptimizer();
