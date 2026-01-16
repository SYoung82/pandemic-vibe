defmodule InfestationServer.GamesFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities related to the Games context.
  """

  alias InfestationServer.{Repo, Games, Accounts}
  alias InfestationServer.Games.Planet
  alias InfestationServer.GameEngine.GameEngine

  @doc """
  Ensures planets are seeded in the test database.
  Call this at the beginning of tests that need planets.
  """
  def ensure_cities_seeded do
    # Seed a subset of planets needed for testing (including Nova Haven which is the starting planet)
    planets = [
      %{name: "Kepler Prime", color: "blue", population: 5_864_000},
      %{name: "Zenith Station", color: "blue", population: 9_121_000},
      %{name: "Cryos", color: "blue", population: 3_429_000},
      %{name: "Titan City", color: "blue", population: 20_464_000},
      %{name: "Command Central", color: "blue", population: 4_679_000},
      %{name: "Nova Haven", color: "blue", population: 4_715_000},  # Starting planet
      %{name: "Avalon", color: "blue", population: 8_586_000},
      %{name: "Solara", color: "blue", population: 5_427_000},
      %{name: "Star Harbor", color: "yellow", population: 14_900_000},
      %{name: "Azteca Prime", color: "yellow", population: 19_463_000},
      %{name: "Atlas Base", color: "black", population: 2_946_000},
      %{name: "Dragon's Reach", color: "red", population: 17_311_000}
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

    :ok
  end

  @doc """
  Generate a unique user for testing.
  """
  def user_fixture(attrs \\ %{}) do
    email = "user#{System.unique_integer([:positive])}@example.com"

    {:ok, user} =
      attrs
      |> Enum.into(%{
        email: email,
        password: "password123",
        name: attrs[:name] || "Test User"
      })
      |> Accounts.register_user()

    user
  end

  @doc """
  Generate a game.
  """
  def game_fixture(attrs \\ %{}) do
    user = attrs[:created_by] || user_fixture()

    {:ok, game} =
      attrs
      |> Enum.into(%{
        difficulty: "normal",
        status: "lobby",
        created_by_id: user.id
      })
      |> Games.create_game()

    game
  end

  @doc """
  Generate a game with a specified number of players.
  """
  def game_fixture_with_players(count, attrs \\ %{}) when count in 1..4 do
    game = game_fixture(attrs)

    # Add players to the game
    for i <- 1..count do
      user = user_fixture(%{name: "Player #{i}"})
      {:ok, _player} = Games.add_player_to_game(game.id, user.id)
    end

    Games.get_game_with_players!(game.id)
  end

  @doc """
  Generate a player for a game.
  """
  def player_fixture(game_id, attrs \\ %{}) do
    user = attrs[:user] || user_fixture()

    {:ok, player} =
      attrs
      |> Map.drop([:user])
      |> Games.add_player_to_game(game_id, user.id)

    player |> Repo.preload(:user)
  end

  @doc """
  Generate a planet.
  """
  def city_fixture(attrs \\ %{}) do
    name = "Planet#{System.unique_integer([:positive])}"

    {:ok, planet} =
      attrs
      |> Enum.into(%{
        name: name,
        color: "blue",
        population: 1_000_000,
        x_coord: 0,
        y_coord: 0
      })
      |> Games.create_planet()

    planet
  end

  @doc """
  Sets up an initialized game ready for testing gameplay.
  Returns the game with all initial state set up.
  """
  def setup_initialized_game(player_count \\ 2, difficulty \\ "normal") do
    ensure_cities_seeded()
    game = game_fixture_with_players(player_count, %{difficulty: difficulty})
    {:ok, _initialized_game} = GameEngine.initialize_game(game.id)
    Games.get_game_with_players!(game.id)
  end

  @doc """
  Sets up a game in progress with custom state for testing specific scenarios.
  """
  def setup_game_in_progress(player_count \\ 2, state_attrs \\ %{}) do
    game = setup_initialized_game(player_count)
    state = Games.get_latest_game_state(game.id)

    # Update state with custom attributes if provided
    if map_size(state_attrs) > 0 do
      updated_state_data = Map.merge(state.state_data, state_attrs)

      {:ok, _} =
        Games.save_game_state(game.id, %{
          turn_number: state.turn_number,
          current_player_id: state.current_player_id,
          state_data: updated_state_data
        })
    end

    Games.get_game_with_players!(game.id)
  end
end
