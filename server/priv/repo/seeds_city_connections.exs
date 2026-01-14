# Script for seeding city connections based on the Pandemic board game

alias PandemicVibeServer.Repo
alias PandemicVibeServer.Games.{City, CityConnection}

# Define city connections based on the official Pandemic board game
# Each city is bidirectionally connected to its neighbors
city_connections = [
  # Atlanta connections
  {"Atlanta", ["Chicago", "Washington", "Miami"]},
  # Chicago connections
  {"Chicago", ["Atlanta", "San Francisco", "Los Angeles", "Mexico City", "Montreal"]},
  # Montreal connections
  {"Montreal", ["Chicago", "Washington", "New York"]},
  # New York connections
  {"New York", ["Montreal", "Washington", "London", "Madrid"]},
  # Washington connections
  {"Washington", ["Atlanta", "Montreal", "New York", "Miami"]},
  # San Francisco connections
  {"San Francisco", ["Chicago", "Los Angeles", "Tokyo", "Manila"]},
  # London connections
  {"London", ["New York", "Madrid", "Paris", "Essen"]},
  # Madrid connections
  {"Madrid", ["New York", "London", "Paris", "Sao Paulo", "Algiers"]},
  # Paris connections
  {"Paris", ["London", "Madrid", "Essen", "Milan", "Algiers"]},
  # Essen connections
  {"Essen", ["London", "Paris", "Milan", "St. Petersburg"]},
  # Milan connections
  {"Milan", ["Paris", "Essen", "Istanbul"]},
  # St. Petersburg connections
  {"St. Petersburg", ["Essen", "Istanbul", "Moscow"]}
]

IO.puts("Seeding city connections...")

Enum.each(city_connections, fn {city_name, connected_city_names} ->
  city = Repo.get_by(City, name: city_name)

  if city do
    Enum.each(connected_city_names, fn connected_city_name ->
      connected_city = Repo.get_by(City, name: connected_city_name)

      if connected_city do
        # Check if connection already exists
        existing =
          Repo.get_by(CityConnection,
            city_id: city.id,
            connected_city_id: connected_city.id
          )

        if !existing do
          Repo.insert!(%CityConnection{
            city_id: city.id,
            connected_city_id: connected_city.id
          })

          IO.puts("  Connected #{city_name} -> #{connected_city_name}")
        end
      else
        IO.puts("  Warning: City '#{connected_city_name}' not found")
      end
    end)
  else
    IO.puts("  Warning: City '#{city_name}' not found")
  end
end)

IO.puts("City connections seeded successfully!")
