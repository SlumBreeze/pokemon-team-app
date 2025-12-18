async function run() {
  try {
    const pokemonName = "lechonk";
    console.log(`Fetching data for ${pokemonName}...`);

    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonName}`
    );
    if (!response.ok) throw new Error("Pokemon not found");

    const pokemon = await response.json();
    console.log(`Pokemon found: ${pokemon.name}`);
    console.log(`Location URL: ${pokemon.location_area_encounters}`);

    const locResponse = await fetch(pokemon.location_area_encounters);
    if (!locResponse.ok) throw new Error("Location fetch failed");

    const encounters = await locResponse.json();

    if (encounters.length === 0) {
      console.log("No encounters found in API for this pokemon.");
      return;
    }

    console.log(
      `Found ${encounters.length} total encounter areas. Checking for Scarlet/Violet...`
    );

    // Debug: Print all version names found in the first few encounters
    encounters.slice(0, 3).forEach((enc, i) => {
      console.log(
        `Encounter ${i} versions:`,
        enc.version_details.map((d) => d.version.name).join(", ")
      );
    });

    const locations = new Set();
    encounters.forEach((encounter) => {
      const hasSV = encounter.version_details.some(
        (detail) =>
          detail.version.name === "scarlet" || detail.version.name === "violet"
      );
      if (hasSV) {
        console.log(`Found SV match in: ${encounter.location_area.name}`);
        locations.add(encounter.location_area.name);
      }
    });

    console.log("Final SV Locations:", Array.from(locations));
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
