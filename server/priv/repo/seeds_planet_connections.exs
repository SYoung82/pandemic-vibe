# Script for seeding city connections based on the Pandemic board game

alias InfestationServer.Repo
alias InfestationServer.Games.{City, CityConnection}

# Define all city connections based on the official Pandemic board game
# Each connection is bidirectional
city_connections = [
  # Blue cities (North America and Europe)
  {"San Francisco", ["Tokyo", "Manila", "Los Angeles", "Chicago"]},
  {"Chicago", ["San Francisco", "Los Angeles", "Mexico City", "Atlanta", "Montreal"]},
  {"Montreal", ["Chicago", "Washington", "New York"]},
  {"New York", ["Montreal", "Washington", "London", "Madrid"]},
  {"Washington", ["Montreal", "New York", "Atlanta", "Miami"]},
  {"Atlanta", ["Chicago", "Washington", "Miami"]},
  {"London", ["New York", "Madrid", "Paris", "Essen"]},
  {"Madrid", ["New York", "London", "Paris", "Sao Paulo", "Algiers"]},
  {"Paris", ["London", "Madrid", "Essen", "Milan", "Algiers"]},
  {"Essen", ["London", "Paris", "Milan", "St. Petersburg"]},
  {"Milan", ["Paris", "Essen", "Istanbul"]},
  {"St. Petersburg", ["Essen", "Istanbul", "Moscow"]},

  # Yellow cities (South America and Africa)
  {"Los Angeles", ["San Francisco", "Chicago", "Mexico City", "Sydney"]},
  {"Mexico City", ["Los Angeles", "Chicago", "Miami", "Bogota", "Lima"]},
  {"Miami", ["Washington", "Atlanta", "Mexico City", "Bogota"]},
  {"Bogota", ["Mexico City", "Miami", "Lima", "Buenos Aires", "Sao Paulo"]},
  {"Lima", ["Mexico City", "Bogota", "Santiago"]},
  {"Santiago", ["Lima"]},
  {"Buenos Aires", ["Bogota", "Sao Paulo"]},
  {"Sao Paulo", ["Madrid", "Bogota", "Buenos Aires", "Lagos"]},
  {"Lagos", ["Sao Paulo", "Khartoum", "Kinshasa"]},
  {"Khartoum", ["Lagos", "Kinshasa", "Johannesburg", "Cairo"]},
  {"Kinshasa", ["Lagos", "Khartoum", "Johannesburg"]},
  {"Johannesburg", ["Kinshasa", "Khartoum"]},

  # Black cities (Asia and Middle East)
  {"Algiers", ["Madrid", "Paris", "Istanbul", "Cairo"]},
  {"Cairo", ["Algiers", "Istanbul", "Baghdad", "Riyadh", "Khartoum"]},
  {"Istanbul", ["Milan", "St. Petersburg", "Algiers", "Cairo", "Baghdad", "Moscow"]},
  {"Moscow", ["St. Petersburg", "Istanbul", "Tehran"]},
  {"Tehran", ["Moscow", "Baghdad", "Karachi", "Delhi"]},
  {"Baghdad", ["Istanbul", "Cairo", "Tehran", "Karachi", "Riyadh"]},
  {"Riyadh", ["Cairo", "Baghdad", "Karachi"]},
  {"Karachi", ["Tehran", "Baghdad", "Riyadh", "Mumbai", "Delhi"]},
  {"Mumbai", ["Karachi", "Delhi", "Chennai"]},
  {"Delhi", ["Tehran", "Karachi", "Mumbai", "Chennai", "Kolkata"]},
  {"Chennai", ["Mumbai", "Delhi", "Kolkata", "Bangkok", "Jakarta"]},
  {"Kolkata", ["Delhi", "Chennai", "Bangkok", "Hong Kong"]},

  # Red cities (East Asia and Oceania)
  {"Beijing", ["Seoul", "Shanghai"]},
  {"Seoul", ["Beijing", "Shanghai", "Tokyo"]},
  {"Shanghai", ["Beijing", "Seoul", "Tokyo", "Taipei", "Hong Kong"]},
  {"Tokyo", ["San Francisco", "Seoul", "Shanghai", "Osaka"]},
  {"Osaka", ["Tokyo", "Taipei"]},
  {"Taipei", ["Shanghai", "Osaka", "Hong Kong", "Manila"]},
  {"Hong Kong", ["Shanghai", "Kolkata", "Taipei", "Manila", "Ho Chi Minh City", "Bangkok"]},
  {"Bangkok", ["Chennai", "Kolkata", "Hong Kong", "Ho Chi Minh City", "Jakarta"]},
  {"Ho Chi Minh City", ["Hong Kong", "Bangkok", "Manila", "Jakarta"]},
  {"Manila", ["San Francisco", "Taipei", "Hong Kong", "Ho Chi Minh City", "Sydney"]},
  {"Jakarta", ["Chennai", "Bangkok", "Ho Chi Minh City", "Sydney"]},
  {"Sydney", ["Los Angeles", "Manila", "Jakarta"]}
]

IO.puts("Seeding #{length(city_connections)} city connections...")

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
