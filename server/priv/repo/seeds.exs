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

# Seed cities - starting with just Atlanta and a few others for now
cities = [
  %{name: "Atlanta", color: "blue", population: 500_000},
  %{name: "Chicago", color: "blue", population: 600_000},
  %{name: "Montreal", color: "blue", population: 400_000},
  %{name: "New York", color: "blue", population: 800_000},
  %{name: "Washington", color: "blue", population: 500_000},
  %{name: "London", color: "blue", population: 700_000},
  %{name: "Paris", color: "blue", population: 600_000},
  %{name: "Essen", color: "blue", population: 500_000},
  %{name: "Milan", color: "blue", population: 500_000},
  %{name: "St. Petersburg", color: "blue", population: 500_000},
  %{name: "Madrid", color: "blue", population: 600_000},
  %{name: "San Francisco", color: "blue", population: 700_000}
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
