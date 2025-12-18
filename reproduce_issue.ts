import { fetchPokemon, fetchEncounterLocations } from "./services/pokeApi";

async function test() {
  try {
    const pokemonName = "lechonk";
    console.log(`Fetching data for ${pokemonName}...`);
    const pokemon = await fetchPokemon(pokemonName);
    console.log(`Pokemon found: ${pokemon.name}`);
    console.log(`Location URL: ${pokemon.location_area_encounters}`);

    const locations = await fetchEncounterLocations(
      pokemon.location_area_encounters
    );
    console.log("Locations found:", locations);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
