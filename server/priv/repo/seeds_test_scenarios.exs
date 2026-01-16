# Test scenario seeds for end-game testing
# Run with: mix run priv/repo/seeds_test_scenarios.exs

import Ecto.Query

alias InfestationServer.Repo
alias InfestationServer.Accounts.User
alias InfestationServer.Games
alias InfestationServer.Games.{Game, Player, GameState, Card, Planet}

# Clean up existing test games
Repo.delete_all(from g in Game, where: g.status in ["lobby", "in_progress"])

# Ensure planets exist
planets = Repo.all(Planet)
if Enum.empty?(planets) do
  IO.puts("No planets found. Please run seeds.exs first.")
  System.halt(1)
end

# Get or create test users
test_user_1 = Repo.get_by(User, email: "test1@example.com") ||
  %User{}
  |> User.changeset(%{
    email: "test1@example.com",
    name: "Test Player 1",
    password: "password123"
  })
  |> Repo.insert!()

test_user_2 = Repo.get_by(User, email: "test2@example.com") ||
  %User{}
  |> User.changeset(%{
    email: "test2@example.com",
    name: "Test Player 2",
    password: "password123"
  })
  |> Repo.insert!()

test_user_3 = Repo.get_by(User, email: "test3@example.com") ||
  %User{}
  |> User.changeset(%{
    email: "test3@example.com",
    name: "Test Player 3",
    password: "password123"
  })
  |> Repo.insert!()

IO.puts("\n=== Creating Test Scenarios ===\n")

# Get some planets for testing
nova_haven = Repo.get_by!(Planet, name: "Nova Haven")
kepler = Repo.get_by!(Planet, name: "Kepler Prime")
star_harbor = Repo.get_by!(Planet, name: "Star Harbor")

## SCENARIO 1: Almost Won (3 of 4 cures discovered)
IO.puts("Creating 'Almost Won' scenario...")

{:ok, almost_won_game} = Repo.insert(%Game{
  status: "in_progress",
  difficulty: "normal",
  outbreak_count: 3,
  infestation_rate_index: 3,
  research_stations_remaining: 4,
  created_by_id: test_user_1.id
})

# Create players
{:ok, player1_almost_won} = Repo.insert(%Player{
  game_id: almost_won_game.id,
  user_id: test_user_1.id,
  role: "xenobiologist",
  turn_order: 0,
  actions_remaining: 4,
  current_planet_id: nova_haven.id
})

{:ok, player2_almost_won} = Repo.insert(%Player{
  game_id: almost_won_game.id,
  user_id: test_user_2.id,
  role: "field_researcher",
  turn_order: 1,
  actions_remaining: 4,
  current_planet_id: kepler.id
})

# Create game state with 3 cures
{:ok, _state_almost_won} = Repo.insert(%GameState{
  game_id: almost_won_game.id,
  turn_number: 15,
  current_player_id: player1_almost_won.id,
  state_data: %{
    "containment_markers" => %{
      "blue" => "discovered",
      "yellow" => "discovered",
      "red" => "discovered",
      "black" => "not_discovered"  # Last one needed
    },
    "infestation_markers" => %{
      "blue" => 24,
      "yellow" => 24,
      "red" => 24,
      "black" => 24
    },
    "infestation_rate_index" => 3,
    "infestation_rate" => 3,
    "outbreak_count" => 0,
    "research_stations" => ["Nova Haven", "Kepler Prime", "Star Harbor"],
    "planet_infestations" => %{
      "Star Harbor" => %{"blue" => 2, "yellow" => 1},
      "Azteca Prime" => %{"yellow" => 3},
      "Atlas Base" => %{"black" => 2},
      "Dragon's Reach" => %{"red" => 1}
    }
  }
})

# Give player 1 cards needed for black cure (the last one)
black_planets = Repo.all(from p in Planet, where: p.color == "black", limit: 5)
for {planet, idx} <- Enum.with_index(black_planets) do
  Repo.insert!(%Card{
    game_id: almost_won_game.id,
    card_type: "planet",
    planet_id: planet.id,
    location: "player_hand",
    player_id: player1_almost_won.id,
    position: idx
  })
end

IO.puts("✓ Created 'Almost Won' game (ID: #{almost_won_game.id})")
IO.puts("  - 3/4 cures discovered (blue, yellow, red)")
IO.puts("  - Player 1 has 5 black planet cards to discover the final cure")
IO.puts("  - Player 1 is Xenobiologist (needs 4 cards, but has 5 for safety)")

## SCENARIO 2: Almost Lost - High Outbreaks (7 of 8)
IO.puts("\nCreating 'Almost Lost - Outbreaks' scenario...")

{:ok, almost_lost_outbreaks} = Repo.insert(%Game{
  status: "in_progress",
  difficulty: "normal",
  outbreak_count: 7,  # One away from losing
  infestation_rate_index: 5,
  research_stations_remaining: 3,
  created_by_id: test_user_2.id
})

{:ok, player1_outbreaks} = Repo.insert(%Player{
  game_id: almost_lost_outbreaks.id,
  user_id: test_user_1.id,
  role: "combat_medic",
  turn_order: 0,
  actions_remaining: 4,
  current_planet_id: star_harbor.id
})

{:ok, player2_outbreaks} = Repo.insert(%Player{
  game_id: almost_lost_outbreaks.id,
  user_id: test_user_2.id,
  role: "operations_commander",
  turn_order: 1,
  actions_remaining: 4,
  current_planet_id: nova_haven.id
})

# Create dangerous game state - many planets at 3 cubes
{:ok, _state_outbreaks} = Repo.insert(%GameState{
  game_id: almost_lost_outbreaks.id,
  turn_number: 22,
  current_player_id: player1_outbreaks.id,
  state_data: %{
    "containment_markers" => %{
      "blue" => "discovered",
      "yellow" => "not_discovered",
      "black" => "not_discovered",
      "red" => "not_discovered"
    },
    "infestation_markers" => %{
      "blue" => 24,
      "yellow" => 12,  # Many yellow cubes on board
      "black" => 20,
      "red" => 24
    },
    "infestation_rate_index" => 5,
    "infestation_rate" => 4,
    "outbreak_count" => 0,
    "research_stations" => ["Nova Haven", "Kepler Prime"],
    "planet_infestations" => %{
      "Star Harbor" => %{"yellow" => 3},      # Critical - will outbreak
      "Azteca Prime" => %{"yellow" => 3},     # Critical
      "Coral Station" => %{"yellow" => 3},    # Critical
      "Emerald Ridge" => %{"yellow" => 2},
      "Atlas Base" => %{"black" => 2},
      "Pyramid Station" => %{"black" => 2}
    }
  }
})

# Add some infection cards to player deck (near bottom)
infection_planets = Repo.all(from p in Planet, where: p.color == "yellow", limit: 3)
for {planet, idx} <- Enum.with_index(infection_planets) do
  Repo.insert!(%Card{
    game_id: almost_lost_outbreaks.id,
    card_type: "infection",
    planet_id: planet.id,
    location: "infection_deck",
    position: idx
  })
end

IO.puts("✓ Created 'Almost Lost - Outbreaks' game (ID: #{almost_lost_outbreaks.id})")
IO.puts("  - 7/8 outbreaks (one more = lose)")
IO.puts("  - Multiple planets at 3 cubes (critical)")
IO.puts("  - High infestation rate")

## SCENARIO 3: Almost Lost - Cube Shortage
IO.puts("\nCreating 'Almost Lost - Cube Shortage' scenario...")

{:ok, almost_lost_cubes} = Repo.insert(%Game{
  status: "in_progress",
  difficulty: "normal",
  outbreak_count: 4,
  infestation_rate_index: 4,
  research_stations_remaining: 4,
  created_by_id: test_user_3.id
})

{:ok, player1_cubes} = Repo.insert(%Player{
  game_id: almost_lost_cubes.id,
  user_id: test_user_1.id,
  role: "combat_medic",
  turn_order: 0,
  actions_remaining: 4,
  current_planet_id: nova_haven.id
})

{:ok, player2_cubes} = Repo.insert(%Player{
  game_id: almost_lost_cubes.id,
  user_id: test_user_3.id,
  role: "containment_specialist",
  turn_order: 1,
  actions_remaining: 4,
  current_planet_id: kepler.id
})

# Create state with many cubes on board (simulating near-exhaustion)
# In real game, we'd track cube counts, but we'll use heavy infestations
{:ok, _state_cubes} = Repo.insert(%GameState{
  game_id: almost_lost_cubes.id,
  turn_number: 18,
  current_player_id: player1_cubes.id,
  state_data: %{
    "containment_markers" => %{
      "blue" => "not_discovered",
      "yellow" => "not_discovered",
      "black" => "not_discovered",
      "red" => "not_discovered"
    },
    "infestation_markers" => %{
      "blue" => 10,   # Only 10 blue cubes left (14 on board)
      "yellow" => 13,  # Only 13 yellow cubes left (11 on board)
      "black" => 20,
      "red" => 24
    },
    "infestation_rate_index" => 3,
    "infestation_rate" => 3,
    "outbreak_count" => 0,
    "research_stations" => ["Nova Haven", "Kepler Prime"],
    "planet_infestations" => %{
      # Spread cubes across many planets (simulate near-exhaustion)
      "Kepler Prime" => %{"blue" => 3},
      "Zenith Station" => %{"blue" => 3},
      "Cryos" => %{"blue" => 3},
      "Titan City" => %{"blue" => 3},
      "Command Central" => %{"blue" => 2},
      "Star Harbor" => %{"yellow" => 3},
      "Azteca Prime" => %{"yellow" => 3},
      "Coral Station" => %{"yellow" => 3},
      "Emerald Ridge" => %{"yellow" => 2},
      "Atlas Base" => %{"black" => 2},
      "Pyramid Station" => %{"black" => 2}
    }
  }
})

IO.puts("✓ Created 'Almost Lost - Cube Shortage' game (ID: #{almost_lost_cubes.id})")
IO.puts("  - Many planets heavily infested")
IO.puts("  - Simulates near cube exhaustion")
IO.puts("  - No cures discovered yet")

## SCENARIO 4: Almost Lost - Player Deck Empty
IO.puts("\nCreating 'Almost Lost - Deck Empty' scenario...")

{:ok, almost_lost_deck} = Repo.insert(%Game{
  status: "in_progress",
  difficulty: "normal",
  outbreak_count: 3,
  infestation_rate_index: 3,
  research_stations_remaining: 5,
  created_by_id: test_user_1.id
})

{:ok, player1_deck} = Repo.insert(%Player{
  game_id: almost_lost_deck.id,
  user_id: test_user_1.id,
  role: "fleet_commander",
  turn_order: 0,
  actions_remaining: 4,
  current_planet_id: nova_haven.id
})

{:ok, player2_deck} = Repo.insert(%Player{
  game_id: almost_lost_deck.id,
  user_id: test_user_2.id,
  role: "tactical_officer",
  turn_order: 1,
  actions_remaining: 4,
  current_planet_id: kepler.id
})

{:ok, _state_deck} = Repo.insert(%GameState{
  game_id: almost_lost_deck.id,
  turn_number: 25,
  current_player_id: player1_deck.id,
  state_data: %{
    "containment_markers" => %{
      "blue" => "discovered",
      "yellow" => "discovered",
      "black" => "not_discovered",
      "red" => "not_discovered"
    },
    "infestation_markers" => %{
      "blue" => 24,
      "yellow" => 24,
      "black" => 22,
      "red" => 23
    },
    "infestation_rate_index" => 3,
    "infestation_rate" => 3,
    "outbreak_count" => 0,
    "research_stations" => ["Nova Haven", "Kepler Prime", "Star Harbor"],
    "planet_infestations" => %{
      "Star Harbor" => %{"yellow" => 1},
      "Atlas Base" => %{"black" => 2},
      "Dragon's Reach" => %{"red" => 1}
    }
  }
})

# Add only 3 cards to player deck (almost empty)
planet_cards = Repo.all(from p in Planet, limit: 3)
for {planet, idx} <- Enum.with_index(planet_cards) do
  Repo.insert!(%Card{
    game_id: almost_lost_deck.id,
    card_type: "planet",
    planet_id: planet.id,
    location: "player_deck",
    position: idx
  })
end

# Add 1 epidemic card
Repo.insert!(%Card{
  game_id: almost_lost_deck.id,
  card_type: "epidemic",
  location: "player_deck",
  position: 3
})

IO.puts("✓ Created 'Almost Lost - Deck Empty' game (ID: #{almost_lost_deck.id})")
IO.puts("  - Only 4 cards left in player deck")
IO.puts("  - 2/4 cures discovered")
IO.puts("  - Will lose soon if cards run out")

IO.puts("\n=== Test Scenarios Created Successfully ===")
IO.puts("\nTo test these scenarios:")
IO.puts("1. Log in as test1@example.com (password: password123)")
IO.puts("2. Look for games in lobby or navigate directly:")
IO.puts("   - Almost Won: /game/#{almost_won_game.id}")
IO.puts("   - Almost Lost (Outbreaks): /game/#{almost_lost_outbreaks.id}")
IO.puts("   - Almost Lost (Cubes): /game/#{almost_lost_cubes.id}")
IO.puts("   - Almost Lost (Deck): /game/#{almost_lost_deck.id}")
IO.puts("\nNote: You may need to join these games from the lobby first.")
