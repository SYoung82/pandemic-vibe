# Test game setup script - creates a game almost won or almost lost
#
# Usage:
#   mix run priv/repo/test_game_setup.exs win    # 3/4 cures discovered
#   mix run priv/repo/test_game_setup.exs lose_outbreak  # 7 outbreaks
#   mix run priv/repo/test_game_setup.exs lose_cubes     # Low disease cubes

alias PandemicVibeServer.{Repo, Games, Accounts}
alias PandemicVibeServer.Games.{Game, Player}
alias PandemicVibeServer.GameEngine.{GameEngine, DeckManager}

# Get scenario from command line args
scenario = System.argv() |> List.first() || "win"

IO.puts("Setting up test game scenario: #{scenario}")

# Create test users if they don't exist
{:ok, user1} =
  case Accounts.get_user_by_email("test1@example.com") do
    nil ->
      Accounts.register_user(%{
        email: "test1@example.com",
        name: "TestPlayer1",
        password: "password123"
      })

    user ->
      {:ok, user}
  end

{:ok, user2} =
  case Accounts.get_user_by_email("test2@example.com") do
    nil ->
      Accounts.register_user(%{
        email: "test2@example.com",
        name: "TestPlayer2",
        password: "password123"
      })

    user ->
      {:ok, user}
  end

# Create game
{:ok, game} =
  Games.create_game(%{
    name: "Test Game - #{String.upcase(scenario)}",
    difficulty: "normal",
    max_players: 2,
    status: "lobby",
    created_by_id: user1.id,
    outbreak_count: 0
  })

# Add players
{:ok, _player1} = Games.add_player_to_game(game.id, user1.id)
{:ok, _player2} = Games.add_player_to_game(game.id, user2.id)

# Initialize the game
{:ok, initialized_game} = GameEngine.initialize_game(game.id)

# Modify game state based on scenario
state = Games.get_latest_game_state(game.id)

case scenario do
  "win" ->
    # 3 out of 4 cures discovered - one more to win!
    updated_state_data =
      put_in(state.state_data, ["cure_markers"], %{
        "blue" => "discovered",
        "yellow" => "discovered",
        "black" => "discovered",
        "red" => "not_discovered"  # Just need this one!
      })

    Games.save_game_state(game.id, %{
      turn_number: state.turn_number,
      current_player_id: state.current_player_id,
      state_data: updated_state_data
    })

    IO.puts("✓ Game created with 3/4 cures discovered")
    IO.puts("  One more cure to win!")

  "lose_outbreak" ->
    # 7 outbreaks - one more outbreak loses the game!
    Games.update_game(initialized_game, %{outbreak_count: 7})
    IO.puts("✓ Game created with 7 outbreaks")
    IO.puts("  One more outbreak loses the game!")

  "lose_cubes" ->
    # Very low disease cubes - almost depleted
    updated_state_data =
      put_in(state.state_data, ["disease_cubes"], %{
        "blue" => 2,
        "yellow" => 2,
        "black" => 2,
        "red" => 2
      })

    # Also add heavy infections to cities to make it dangerous
    updated_state_data =
      put_in(updated_state_data, ["city_infections"], %{
        "Atlanta" => %{"blue" => 3},
        "Chicago" => %{"blue" => 3},
        "San Francisco" => %{"blue" => 3},
        "Montreal" => %{"blue" => 3}
      })

    Games.save_game_state(game.id, %{
      turn_number: state.turn_number,
      current_player_id: state.current_player_id,
      state_data: updated_state_data
    })

    IO.puts("✓ Game created with low disease cubes")
    IO.puts("  A few more infections could deplete cubes!")

  "lose_deck" ->
    # Nearly empty player deck - just a few cards left
    player_deck = DeckManager.get_deck(game.id, "player_deck")

    # Discard all but 3 cards
    player_deck
    |> Enum.drop(3)
    |> Enum.each(fn card ->
      DeckManager.discard_card(card, "player_discard")
    end)

    IO.puts("✓ Game created with nearly empty player deck")
    IO.puts("  Just 3 cards left - 2 turns until deck runs out!")

  _ ->
    IO.puts("Unknown scenario: #{scenario}")
    IO.puts("Valid scenarios: win, lose_outbreak, lose_cubes, lose_deck")
end

# Print game info
IO.puts("\n" <> String.duplicate("=", 50))
IO.puts("Game ID: #{game.id}")
IO.puts("Login as: test1@example.com / password123")
IO.puts("Or:       test2@example.com / password123")
IO.puts(String.duplicate("=", 50))
