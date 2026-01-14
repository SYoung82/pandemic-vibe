defmodule PandemicVibeServer.GameEngine.GameEngine do
  @moduledoc """
  Core game engine for initializing and managing Pandemic game state.
  """

  alias PandemicVibeServer.Games
  alias PandemicVibeServer.Games.Game
  alias PandemicVibeServer.GameEngine.{DeckManager, InfectionEngine}

  @starting_city "Atlanta"
  @infection_rates [2, 2, 2, 3, 3, 4, 4]

  @doc """
  Initializes a new game with all starting conditions.
  """
  def initialize_game(game_id) do
    game = Games.get_game_with_players!(game_id)

    with :ok <- validate_player_count(game),
         {:ok, _} <- assign_roles(game),
         {:ok, _} <- set_starting_positions(game),
         :ok <- create_initial_state(game),
         {:ok, _} <- DeckManager.initialize_decks(game_id, game.difficulty),
         :ok <- DeckManager.deal_initial_hands(game_id),
         {:ok, _} <- InfectionEngine.initial_infection(game_id),
         {:ok, _updated_game} <- Games.update_game(game, %{status: "in_progress"}) do
      # Reload game with all associations
      {:ok, Games.get_game_with_players!(game_id)}
    end
  end

  defp validate_player_count(%Game{players: players}) do
    player_count = length(players)

    if player_count >= 2 and player_count <= 4 do
      :ok
    else
      {:error, :invalid_player_count}
    end
  end

  defp assign_roles(%Game{players: players} = game) do
    available_roles = [
      "medic",
      "scientist",
      "researcher",
      "operations_expert",
      "dispatcher",
      "contingency_planner",
      "quarantine_specialist"
    ]

    roles = Enum.take_random(available_roles, length(players))

    players
    |> Enum.zip(roles)
    |> Enum.each(fn {player, role} ->
      Games.update_player(player, %{role: role})
    end)

    {:ok, game}
  end

  defp set_starting_positions(%Game{players: players, id: game_id}) do
    atlanta = Games.get_city_by_name(@starting_city)

    players
    |> Enum.each(fn player ->
      Games.update_player(player, %{current_city_id: atlanta.id})
    end)

    {:ok, game_id}
  end

  defp create_initial_state(%Game{players: players, id: game_id} = _game) do
    first_player = Enum.min_by(players, & &1.turn_order)

    state_data = %{
      infection_rate_index: 0,
      infection_rate: Enum.at(@infection_rates, 0),
      outbreak_count: 0,
      research_stations: [@starting_city],
      cure_markers: %{
        "blue" => "not_discovered",
        "yellow" => "not_discovered",
        "black" => "not_discovered",
        "red" => "not_discovered"
      },
      disease_cubes: %{
        "blue" => 24,
        "yellow" => 24,
        "black" => 24,
        "red" => 24
      },
      city_infections: %{}
    }

    case Games.save_game_state(game_id, %{
           turn_number: 0,
           current_player_id: first_player.id,
           state_data: state_data
         }) do
      {:ok, _game_state} -> :ok
      error -> error
    end
  end

  @doc """
  Gets the current game state with all relevant data.
  """
  def get_current_state(game_id) do
    game = Games.get_game_with_players!(game_id)
    game_state = Games.get_latest_game_state(game_id)

    {:ok,
     %{
       game: %{
         id: game.id,
         status: game.status,
         difficulty: game.difficulty,
         outbreak_count: get_in(game_state.state_data, [:outbreak_count]) || 0,
         infection_rate: get_in(game_state.state_data, [:infection_rate]) || 2
       },
       players:
         Enum.map(game.players, fn player ->
           # Get city name if player has a current_city_id
           current_city_name =
             if player.current_city_id do
               city = Games.get_city!(player.current_city_id)
               city.name
             else
               nil
             end

           %{
             id: player.id,
             user_id: player.user_id,
             role: player.role,
             turn_order: player.turn_order,
             actions_remaining: player.actions_remaining,
             current_city_id: current_city_name
           }
         end),
       state: game_state.state_data,
       current_player_id: game_state.current_player_id,
       turn_number: game_state.turn_number
     }}
  rescue
    Ecto.NoResultsError -> {:error, :not_found}
  end

  @doc """
  Advances to the next player's turn.
  """
  def next_turn(game_id) do
    current_state = Games.get_latest_game_state(game_id)
    players = Games.list_game_players(game_id)

    current_player = Enum.find(players, &(&1.id == current_state.current_player_id))
    next_player_order = rem(current_player.turn_order + 1, length(players))
    next_player = Enum.find(players, &(&1.turn_order == next_player_order))

    # Reset actions for new turn
    Games.update_player(next_player, %{actions_remaining: 4})

    # Create new game state for the turn
    Games.save_game_state(game_id, %{
      turn_number: current_state.turn_number + 1,
      current_player_id: next_player.id,
      state_data: current_state.state_data
    })
  end

  @doc """
  Checks win condition (all 4 cures discovered).
  """
  def check_win_condition(game_id) do
    state = Games.get_latest_game_state(game_id)
    cure_markers = state.state_data["cure_markers"]

    all_cured =
      Enum.all?(cure_markers, fn {_color, status} ->
        status == "discovered" or status == "eradicated"
      end)

    if all_cured do
      game = Games.get_game!(game_id)
      Games.update_game(game, %{status: "won"})
      {:ok, :win}
    else
      {:ok, :continue}
    end
  end

  @doc """
  Checks lose conditions.
  """
  def check_lose_condition(game_id) do
    game = Games.get_game!(game_id)
    state = Games.get_latest_game_state(game_id)

    cond do
      game.outbreak_count >= 8 ->
        Games.update_game(game, %{status: "lost"})
        {:ok, :lose}

      any_disease_cubes_depleted?(state.state_data["disease_cubes"]) ->
        Games.update_game(game, %{status: "lost"})
        {:ok, :lose}

      player_deck_empty?(game_id) ->
        Games.update_game(game, %{status: "lost"})
        {:ok, :lose}

      true ->
        {:ok, :continue}
    end
  end

  defp any_disease_cubes_depleted?(disease_cubes) do
    Enum.any?(disease_cubes, fn {_color, count} -> count < 0 end)
  end

  defp player_deck_empty?(game_id) do
    DeckManager.get_deck(game_id, "player_deck") == []
  end
end
