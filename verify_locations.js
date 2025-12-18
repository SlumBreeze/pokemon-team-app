try {
  const { LOCAL_ENCOUNTER_LOCATIONS } = require("./services/localLocations.ts");

  const count = Object.keys(LOCAL_ENCOUNTER_LOCATIONS).length;
  console.log(`Successfully loaded ${count} locations from localLocations.ts`);

  const lechonk = LOCAL_ENCOUNTER_LOCATIONS["Lechonk"];
  console.log("Lechonk locations:", lechonk);

  if (lechonk && lechonk.length > 0) {
    console.log("Verification PASSED: Data exists.");
  } else {
    console.error("Verification FAILED: Lechonk data missing.");
  }
} catch (e) {
  console.error("Verification Error:", e);
}
