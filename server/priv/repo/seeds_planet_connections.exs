# Script for seeding planet connections based on the Pandemic board game

alias InfestationServer.Repo
alias InfestationServer.Games.{Planet, PlanetConnection}

# Define all planet connections based on the official Pandemic board game
# Each connection is bidirectional
planet_connections = [
  # Blue planets (North America and Europe)
  {"Kepler Prime", ["Sakura Station", "Archipelago Prime", "Star Harbor", "Zenith Station"]},
  {"Zenith Station", ["Kepler Prime", "Star Harbor", "Azteca Prime", "Nova Haven", "Cryos"]},
  {"Cryos", ["Zenith Station", "Command Central", "Titan City"]},
  {"Titan City", ["Cryos", "Command Central", "Avalon", "Solara"]},
  {"Command Central", ["Cryos", "Titan City", "Nova Haven", "Coral Station"]},
  {"Nova Haven", ["Zenith Station", "Command Central", "Coral Station"]},
  {"Avalon", ["Titan City", "Solara", "Lumina", "Forge World"]},
  {"Solara", ["Titan City", "Avalon", "Lumina", "Amazon Station", "Atlas Base"]},
  {"Lumina", ["Avalon", "Solara", "Forge World", "Crystallis", "Atlas Base"]},
  {"Forge World", ["Avalon", "Lumina", "Crystallis", "Polaris"]},
  {"Crystallis", ["Lumina", "Forge World", "Crossroads Prime"]},
  {"Polaris", ["Forge World", "Crossroads Prime", "Crimson Reach"]},

  # Yellow planets (South America and Africa)
  {"Star Harbor", ["Kepler Prime", "Zenith Station", "Azteca Prime", "Southern Cross"]},
  {"Azteca Prime", ["Star Harbor", "Zenith Station", "Coral Station", "Emerald Ridge", "Condor Peak"]},
  {"Coral Station", ["Command Central", "Nova Haven", "Azteca Prime", "Emerald Ridge"]},
  {"Emerald Ridge", ["Azteca Prime", "Coral Station", "Condor Peak", "Pampas Prime", "Amazon Station"]},
  {"Condor Peak", ["Azteca Prime", "Emerald Ridge", "Sierra Nova"]},
  {"Sierra Nova", ["Condor Peak"]},
  {"Pampas Prime", ["Emerald Ridge", "Amazon Station"]},
  {"Amazon Station", ["Solara", "Emerald Ridge", "Pampas Prime", "Savanna Prime"]},
  {"Savanna Prime", ["Amazon Station", "Oasis Station", "Congo Nexus"]},
  {"Oasis Station", ["Savanna Prime", "Congo Nexus", "Diamond World", "Pyramid Station"]},
  {"Congo Nexus", ["Savanna Prime", "Oasis Station", "Diamond World"]},
  {"Diamond World", ["Congo Nexus", "Oasis Station"]},

  # Black planets (Asia and Middle East)
  {"Atlas Base", ["Solara", "Lumina", "Crossroads Prime", "Pyramid Station"]},
  {"Pyramid Station", ["Atlas Base", "Crossroads Prime", "Babylon Station", "Dune World", "Oasis Station"]},
  {"Crossroads Prime", ["Crystallis", "Polaris", "Atlas Base", "Pyramid Station", "Babylon Station", "Crimson Reach"]},
  {"Crimson Reach", ["Polaris", "Crossroads Prime", "Persia Nova"]},
  {"Persia Nova", ["Crimson Reach", "Babylon Station", "Indus Prime", "Ganges Nexus"]},
  {"Babylon Station", ["Crossroads Prime", "Pyramid Station", "Persia Nova", "Indus Prime", "Dune World"]},
  {"Dune World", ["Pyramid Station", "Babylon Station", "Indus Prime"]},
  {"Indus Prime", ["Persia Nova", "Babylon Station", "Dune World", "Monsoon Station", "Ganges Nexus"]},
  {"Monsoon Station", ["Indus Prime", "Ganges Nexus", "Spice World"]},
  {"Ganges Nexus", ["Persia Nova", "Indus Prime", "Monsoon Station", "Spice World", "Bengal Station"]},
  {"Spice World", ["Monsoon Station", "Ganges Nexus", "Bengal Station", "Temple Station", "Equator Station"]},
  {"Bengal Station", ["Ganges Nexus", "Spice World", "Temple Station", "Harbor Prime"]},

  # Red planets (East Asia and Oceania)
  {"Dragon's Reach", ["Techno Prime", "Pearl Harbor"]},
  {"Techno Prime", ["Dragon's Reach", "Pearl Harbor", "Sakura Station"]},
  {"Pearl Harbor", ["Dragon's Reach", "Techno Prime", "Sakura Station", "Jade World", "Harbor Prime"]},
  {"Sakura Station", ["Kepler Prime", "Techno Prime", "Pearl Harbor", "Neon City"]},
  {"Neon City", ["Sakura Station", "Jade World"]},
  {"Jade World", ["Pearl Harbor", "Neon City", "Harbor Prime", "Archipelago Prime"]},
  {"Harbor Prime", ["Pearl Harbor", "Bengal Station", "Jade World", "Archipelago Prime", "Mekong Nexus", "Temple Station"]},
  {"Temple Station", ["Spice World", "Bengal Station", "Harbor Prime", "Mekong Nexus", "Equator Station"]},
  {"Mekong Nexus", ["Harbor Prime", "Temple Station", "Archipelago Prime", "Equator Station"]},
  {"Archipelago Prime", ["Kepler Prime", "Jade World", "Harbor Prime", "Mekong Nexus", "Southern Cross"]},
  {"Equator Station", ["Spice World", "Temple Station", "Mekong Nexus", "Southern Cross"]},
  {"Southern Cross", ["Star Harbor", "Archipelago Prime", "Equator Station"]}
]

IO.puts("Seeding #{length(planet_connections)} planet connections...")

Enum.each(planet_connections, fn {planet_name, connected_planet_names} ->
  planet = Repo.get_by(Planet, name: planet_name)

  if planet do
    Enum.each(connected_planet_names, fn connected_planet_name ->
      connected_planet = Repo.get_by(Planet, name: connected_planet_name)

      if connected_planet do
        # Check if connection already exists
        existing =
          Repo.get_by(PlanetConnection,
            planet_id: planet.id,
            connected_planet_id: connected_planet.id
          )

        if !existing do
          Repo.insert!(%PlanetConnection{
            planet_id: planet.id,
            connected_planet_id: connected_planet.id
          })

          IO.puts("  Connected #{planet_name} -> #{connected_planet_name}")
        end
      else
        IO.puts("  Warning: Planet '#{connected_planet_name}' not found")
      end
    end)
  else
    IO.puts("  Warning: Planet '#{planet_name}' not found")
  end
end)

IO.puts("Planet connections seeded successfully!")
