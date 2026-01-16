defmodule InfestationServer.GameEngine.GameEngine do
  @moduledoc """
  Core game engine for initializing and managing Pandemic game state.
  """

  alias InfestationServer.Games
  alias InfestationServer.Games.Game
  alias InfestationServer.GameEngine.{DeckManager, InfectionEngine}

  @starting_planet "Nova Haven"
  @infestation_rates [2, 2, 2, 3, 3, 4, 4]

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
      "combat_medic",
      "xenobiologist",
      "field_researcher",
      "operations_commander",
      "fleet_commander",
      "tactical_officer",
      "containment_specialist"
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
    nova_haven = Games.get_planet_by_name(@starting_planet)

    players
    |> Enum.each(fn player ->
      Games.update_player(player, %{current_planet_id: nova_haven.id})
    end)

    {:ok, game_id}
  end

  defp create_initial_state(%Game{players: players, id: game_id} = _game) do
    first_player = Enum.min_by(players, & &1.turn_order)

    state_data = %{
      infestation_rate_index: 0,
      infestation_rate: Enum.at(@infestation_rates, 0),
      outbreak_count: 0,
      research_stations: [@starting_planet],
      containment_markers: %{
        "blue" => "not_discovered",
        "yellow" => "not_discovered",
        "black" => "not_discovered",
        "red" => "not_discovered"
      },
      infestation_markers: %{
        "blue" => 24,
        "yellow" => 24,
        "black" => 24,
        "red" => 24
      },
      planet_infestations: %{}
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
         infestation_rate: get_in(game_state.state_data, [:infestation_rate]) || 2
       },
       players:
         Enum.map(game.players, fn player ->
           # Get planet name if player has a current_planet_id
           current_planet_name =
             if player.current_planet_id do
               planet = Games.get_planet!(player.current_planet_id)
               planet.name
             else
               nil
             end

           # Get player's cards
           cards = get_player_cards(player.id)

           %{
             id: player.id,
             user_id: player.user_id,
             role: player.role,
             turn_order: player.turn_order,
             actions_remaining: player.actions_remaining,
             current_planet_id: current_planet_name,
             cards: cards
           }
         end),
       state: game_state.state_data,
       current_player_id: game_state.current_player_id,
       turn_number: game_state.turn_number
     }}
  rescue
    Ecto.NoResultsError -> {:error, :not_found}
  end

  defp get_player_cards(player_id) do
    Games.list_player_cards(player_id)
    |> InfestationServer.Repo.preload(:planet)
    |> Enum.map(fn card ->
      %{
        id: card.id,
        card_type: card.card_type,
        planet_name: if(card.planet, do: card.planet.name, else: nil),
        planet_color: if(card.planet, do: card.planet.color, else: nil)
      }
    end)
  end

  @doc """
  Ends the current turn with full game flow:
  1. Draw 2 player cards (check for epidemics)
  2. Check hand limit (7 cards max)
  3. Draw infection cards (based on infection rate)
  4. Check win/lose conditions
  5. Advance to next player
  """
  def end_turn(game_id) do
    current_state = Games.get_latest_game_state(game_id)
    current_player_id = current_state.current_player_id

    with {:ok, epidemic_occurred} <- draw_player_cards(game_id, current_player_id, 2),
         {:ok, _hand_size} <- check_hand_limit(game_id, current_player_id),
         :ok <- draw_infection_phase(game_id, epidemic_occurred),
         {:ok, win_status} <- check_win_condition(game_id),
         {:ok, lose_status} <- check_lose_condition(game_id),
         :ok <- check_game_continues(win_status, lose_status),
         {:ok, _game_state} <- advance_to_next_player(game_id) do
      {:ok, Games.get_game_with_players!(game_id)}
    else
      {:must_discard, hand_size} ->
        {:error, {:must_discard, hand_size}}

      error ->
        error
    end
  end

  @doc """
  Advances to the next player's turn (legacy function, use end_turn/1 instead).
  """
  def next_turn(game_id) do
    advance_to_next_player(game_id)
  end

  defp draw_player_cards(game_id, player_id, count) do
    cards = DeckManager.draw_cards(game_id, "player_deck", count)

    epidemic_occurred =
      Enum.any?(cards, fn card -> card.card_type == "epidemic" end)

    # Move cards to player's hand and handle epidemics
    Enum.each(cards, fn card ->
      if card.card_type == "epidemic" do
        InfectionEngine.handle_epidemic(game_id)
        DeckManager.discard_card(card, "player_discard")
      else
        card
        |> Ecto.Changeset.change(location: "player_hand", player_id: player_id)
        |> InfestationServer.Repo.update!()
      end
    end)

    {:ok, epidemic_occurred}
  end

  defp draw_infection_phase(game_id, _epidemic_occurred) do
    current_state = Games.get_latest_game_state(game_id)
    infestation_rate = get_in(current_state.state_data, ["infestation_rate"]) || 2

    case InfectionEngine.draw_infection_cards(game_id, infestation_rate) do
      {:ok, _count} -> :ok
    end
  end

  defp check_hand_limit(_game_id, player_id) do
    hand_size =
      Games.list_player_cards(player_id)
      |> length()

    if hand_size > 7 do
      {:must_discard, hand_size}
    else
      {:ok, hand_size}
    end
  end

  @doc """
  Handles player discarding cards when over the 7-card limit.
  """
  def discard_cards(player_id, card_ids) do
    # Verify cards belong to player
    player_cards = Games.list_player_cards(player_id)
    player_card_ids = Enum.map(player_cards, & &1.id)

    invalid_cards = Enum.reject(card_ids, &(&1 in player_card_ids))

    if length(invalid_cards) > 0 do
      {:error, :invalid_cards}
    else
      # Discard the specified cards
      Enum.each(card_ids, fn card_id ->
        card = Enum.find(player_cards, &(&1.id == card_id))
        DeckManager.discard_card(card, "player_discard")
      end)

      # Check if hand is now valid (7 or fewer)
      remaining_hand_size = length(player_cards) - length(card_ids)

      if remaining_hand_size <= 7 do
        {:ok, remaining_hand_size}
      else
        {:error, {:still_over_limit, remaining_hand_size}}
      end
    end
  end

  defp check_game_continues(:win, _), do: {:ok, :game_won}
  defp check_game_continues(_, {:lose, _reason}), do: {:ok, :game_lost}
  defp check_game_continues(:continue, :continue), do: :ok

  defp advance_to_next_player(game_id) do
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
    containment_markers = state.state_data["containment_markers"]

    all_cured =
      if containment_markers && map_size(containment_markers) == 4 do
        Enum.all?(containment_markers, fn {_color, status} ->
          status == "discovered" or status == "eradicated"
        end)
      else
        false
      end

    if all_cured do
      game = Games.get_game!(game_id)
      Games.update_game(game, %{status: "won"})
      {:ok, :win}
    else
      {:ok, :continue}
    end
  end

  @doc """
  Checks lose conditions and returns the specific reason.
  """
  def check_lose_condition(game_id) do
    game = Games.get_game!(game_id)
    state = Games.get_latest_game_state(game_id)

    cond do
      game.outbreak_count >= 8 ->
        Games.update_game(game, %{status: "lost"})
        {:ok, {:lose, :too_many_outbreaks}}

      any_infestation_markers_depleted?(state.state_data["infestation_markers"]) ->
        Games.update_game(game, %{status: "lost"})
        {:ok, {:lose, :disease_spread}}

      player_deck_empty?(game_id) ->
        Games.update_game(game, %{status: "lost"})
        {:ok, {:lose, :time_ran_out}}

      true ->
        {:ok, :continue}
    end
  end

  defp any_infestation_markers_depleted?(infestation_markers) do
    Enum.any?(infestation_markers, fn {_color, count} -> count < 0 end)
  end

  defp player_deck_empty?(game_id) do
    DeckManager.get_deck(game_id, "player_deck") == []
  end
end
