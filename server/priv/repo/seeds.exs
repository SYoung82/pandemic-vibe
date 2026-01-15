# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:
#
#     InfestationServer.Repo.insert!(%InfestationServer.SomeSchema{})
#
# We recommend using the bang functions (`insert!`, `update!`
# and so on) as they will fail if something goes wrong.

alias InfestationServer.Repo
alias InfestationServer.Games.Planet

# All 48 planets from the Infestation game
# Blue (Orion Sector) = Former North America and Europe region
# Yellow (Hydra Sector) = Former South America and Africa region
# Black (Nebula Sector) = Former Asia and Middle East region
# Red (Phoenix Sector) = Former East Asia and Oceania region

planets = [
  # Orion Sector (Blue) - 12 planets
  %{name: "Kepler Prime", color: "blue", population: 5_864_000},
  %{name: "Zenith Station", color: "blue", population: 9_121_000},
  %{name: "Cryos", color: "blue", population: 3_429_000},
  %{name: "Titan City", color: "blue", population: 20_464_000},
  %{name: "Command Central", color: "blue", population: 4_679_000},
  %{name: "Nova Haven", color: "blue", population: 4_715_000}, # Starting planet (was Atlanta)
  %{name: "Avalon", color: "blue", population: 8_586_000},
  %{name: "Solara", color: "blue", population: 5_427_000},
  %{name: "Lumina", color: "blue", population: 10_755_000},
  %{name: "Forge World", color: "blue", population: 575_000},
  %{name: "Crystallis", color: "blue", population: 5_232_000},
  %{name: "Polaris", color: "blue", population: 4_879_000},

  # Hydra Sector (Yellow) - 12 planets
  %{name: "Star Harbor", color: "yellow", population: 14_900_000},
  %{name: "Azteca Prime", color: "yellow", population: 19_463_000},
  %{name: "Coral Station", color: "yellow", population: 5_582_000},
  %{name: "Emerald Ridge", color: "yellow", population: 8_702_000},
  %{name: "Condor Peak", color: "yellow", population: 9_121_000},
  %{name: "Sierra Nova", color: "yellow", population: 6_015_000},
  %{name: "Pampas Prime", color: "yellow", population: 13_639_000},
  %{name: "Amazon Station", color: "yellow", population: 20_186_000},
  %{name: "Savanna Prime", color: "yellow", population: 11_547_000},
  %{name: "Oasis Station", color: "yellow", population: 4_887_000},
  %{name: "Congo Nexus", color: "yellow", population: 9_046_000},
  %{name: "Diamond World", color: "yellow", population: 3_888_000},

  # Nebula Sector (Black) - 12 planets
  %{name: "Atlas Base", color: "black", population: 2_946_000},
  %{name: "Pyramid Station", color: "black", population: 14_718_000},
  %{name: "Crossroads Prime", color: "black", population: 13_576_000},
  %{name: "Crimson Reach", color: "black", population: 15_512_000},
  %{name: "Persia Nova", color: "black", population: 7_419_000},
  %{name: "Babylon Station", color: "black", population: 6_204_000},
  %{name: "Dune World", color: "black", population: 5_037_000},
  %{name: "Indus Prime", color: "black", population: 20_711_000},
  %{name: "Monsoon Station", color: "black", population: 16_910_000},
  %{name: "Ganges Nexus", color: "black", population: 22_242_000},
  %{name: "Spice World", color: "black", population: 8_865_000},
  %{name: "Bengal Station", color: "black", population: 14_374_000},

  # Phoenix Sector (Red) - 12 planets
  %{name: "Dragon's Reach", color: "red", population: 17_311_000},
  %{name: "Techno Prime", color: "red", population: 22_547_000},
  %{name: "Pearl Harbor", color: "red", population: 13_482_000},
  %{name: "Sakura Station", color: "red", population: 13_189_000},
  %{name: "Neon City", color: "red", population: 2_871_000},
  %{name: "Jade World", color: "red", population: 8_338_000},
  %{name: "Harbor Prime", color: "red", population: 7_106_000},
  %{name: "Temple Station", color: "red", population: 7_151_000},
  %{name: "Mekong Nexus", color: "red", population: 8_314_000},
  %{name: "Archipelago Prime", color: "red", population: 20_767_000},
  %{name: "Equator Station", color: "red", population: 26_063_000},
  %{name: "Southern Cross", color: "red", population: 3_785_000}
]

Enum.each(planets, fn planet_attrs ->
  case Repo.get_by(Planet, name: planet_attrs.name) do
    nil ->
      Repo.insert!(%Planet{
        name: planet_attrs.name,
        color: planet_attrs.color,
        population: planet_attrs.population
      })

    _ ->
      :ok
  end
end)

IO.puts("Seeded #{length(planets)} planets across 4 galactic sectors")
