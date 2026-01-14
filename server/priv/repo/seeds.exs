# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:
#
#     PandemicVibeServer.Repo.insert!(%PandemicVibeServer.SomeSchema{})
#
# We recommend using the bang functions (`insert!`, `update!`
# and so on) as they will fail if something goes wrong.

alias PandemicVibeServer.Repo
alias PandemicVibeServer.Games.City

# All 48 cities from the Pandemic board game
# Blue = North America and Europe
# Yellow = South America and Africa
# Black = Asia and Middle East
# Red = East Asia and Oceania

cities = [
  # Blue cities (North America and Europe) - 12 cities
  %{name: "San Francisco", color: "blue", population: 5_864_000},
  %{name: "Chicago", color: "blue", population: 9_121_000},
  %{name: "Montreal", color: "blue", population: 3_429_000},
  %{name: "New York", color: "blue", population: 20_464_000},
  %{name: "Washington", color: "blue", population: 4_679_000},
  %{name: "Atlanta", color: "blue", population: 4_715_000},
  %{name: "London", color: "blue", population: 8_586_000},
  %{name: "Madrid", color: "blue", population: 5_427_000},
  %{name: "Paris", color: "blue", population: 10_755_000},
  %{name: "Essen", color: "blue", population: 575_000},
  %{name: "Milan", color: "blue", population: 5_232_000},
  %{name: "St. Petersburg", color: "blue", population: 4_879_000},

  # Yellow cities (South America and Africa) - 12 cities
  %{name: "Los Angeles", color: "yellow", population: 14_900_000},
  %{name: "Mexico City", color: "yellow", population: 19_463_000},
  %{name: "Miami", color: "yellow", population: 5_582_000},
  %{name: "Bogota", color: "yellow", population: 8_702_000},
  %{name: "Lima", color: "yellow", population: 9_121_000},
  %{name: "Santiago", color: "yellow", population: 6_015_000},
  %{name: "Buenos Aires", color: "yellow", population: 13_639_000},
  %{name: "Sao Paulo", color: "yellow", population: 20_186_000},
  %{name: "Lagos", color: "yellow", population: 11_547_000},
  %{name: "Khartoum", color: "yellow", population: 4_887_000},
  %{name: "Kinshasa", color: "yellow", population: 9_046_000},
  %{name: "Johannesburg", color: "yellow", population: 3_888_000},

  # Black cities (Asia and Middle East) - 12 cities
  %{name: "Algiers", color: "black", population: 2_946_000},
  %{name: "Cairo", color: "black", population: 14_718_000},
  %{name: "Istanbul", color: "black", population: 13_576_000},
  %{name: "Moscow", color: "black", population: 15_512_000},
  %{name: "Tehran", color: "black", population: 7_419_000},
  %{name: "Baghdad", color: "black", population: 6_204_000},
  %{name: "Riyadh", color: "black", population: 5_037_000},
  %{name: "Karachi", color: "black", population: 20_711_000},
  %{name: "Mumbai", color: "black", population: 16_910_000},
  %{name: "Delhi", color: "black", population: 22_242_000},
  %{name: "Chennai", color: "black", population: 8_865_000},
  %{name: "Kolkata", color: "black", population: 14_374_000},

  # Red cities (East Asia and Oceania) - 12 cities
  %{name: "Beijing", color: "red", population: 17_311_000},
  %{name: "Seoul", color: "red", population: 22_547_000},
  %{name: "Shanghai", color: "red", population: 13_482_000},
  %{name: "Tokyo", color: "red", population: 13_189_000},
  %{name: "Osaka", color: "red", population: 2_871_000},
  %{name: "Taipei", color: "red", population: 8_338_000},
  %{name: "Hong Kong", color: "red", population: 7_106_000},
  %{name: "Bangkok", color: "red", population: 7_151_000},
  %{name: "Ho Chi Minh City", color: "red", population: 8_314_000},
  %{name: "Manila", color: "red", population: 20_767_000},
  %{name: "Jakarta", color: "red", population: 26_063_000},
  %{name: "Sydney", color: "red", population: 3_785_000}
]

Enum.each(cities, fn city_attrs ->
  case Repo.get_by(City, name: city_attrs.name) do
    nil ->
      Repo.insert!(%City{
        name: city_attrs.name,
        color: city_attrs.color,
        population: city_attrs.population
      })

    _ ->
      :ok
  end
end)

IO.puts("Seeded #{length(cities)} cities")
