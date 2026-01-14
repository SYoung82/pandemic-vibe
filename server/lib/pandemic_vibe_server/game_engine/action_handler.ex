defmodule PandemicVibeServer.GameEngine.ActionHandler do
  @moduledoc """
  Validates and processes player actions.
  """

  alias PandemicVibeServer.{Repo, Games}
  alias PandemicVibeServer.Games.Player
  alias PandemicVibeServer.GameEngine.DeckManager

  @doc """
  Moves a player to an adjacent city.
  """
  def move_player(player_id, destination_city_name) do
    player = Games.get_player!(player_id) |> Repo.preload(:current_city)

    with :ok <- validate_has_actions(player),
         {:ok, destination} <- get_city(destination_city_name),
         :ok <- validate_adjacent_or_direct_flight(player, destination) do
      Games.update_player(player, %{
        current_city_id: destination.id,
        actions_remaining: player.actions_remaining - 1
      })
    end
  end

  @doc """
  Treats disease in current city (removes 1 cube, or all if Medic).
  """
  def treat_disease(player_id, color) do
    player = Games.get_player!(player_id) |> Repo.preload(:current_city)
    game_state = Games.get_latest_game_state(player.game_id)

    with :ok <- validate_has_actions(player),
         :ok <- validate_disease_present(game_state, player.current_city.name, color) do
      cubes_to_remove = if player.role == "medic", do: :all, else: 1
      remove_disease_cubes(player.game_id, player.current_city, color, cubes_to_remove)

      Games.update_player(player, %{actions_remaining: player.actions_remaining - 1})
    end
  end

  @doc """
  Builds a research station in current city.
  """
  def build_research_station(player_id) do
    player = Games.get_player!(player_id) |> Repo.preload(:current_city)
    game_state = Games.get_latest_game_state(player.game_id)
    game = Games.get_game!(player.game_id)

    with :ok <- validate_has_actions(player),
         :ok <- validate_research_stations_available(game),
         :ok <- validate_no_station_exists(game_state, player.current_city.name) do
      research_stations = game_state.state_data["research_stations"] ++ [player.current_city.name]

      updated_state_data = Map.put(game_state.state_data, "research_stations", research_stations)

      Games.save_game_state(player.game_id, %{
        turn_number: game_state.turn_number,
        current_player_id: game_state.current_player_id,
        state_data: updated_state_data
      })

      Games.update_game(game, %{
        research_stations_remaining: game.research_stations_remaining - 1
      })

      Games.update_player(player, %{actions_remaining: player.actions_remaining - 1})
    end
  end

  @doc """
  Discovers a cure (requires 5 cards of same color at research station).
  """
  def discover_cure(player_id, color, card_ids) do
    require Logger

    Logger.info(
      "ActionHandler.discover_cure called - player: #{player_id}, color: #{color}, cards: #{inspect(card_ids)}"
    )

    player = Games.get_player!(player_id) |> Repo.preload(:current_city)
    game_state = Games.get_latest_game_state(player.game_id)

    Logger.info("Player city: #{inspect(player.current_city.name)}, Role: #{player.role}")

    cards_needed = if player.role == "scientist", do: 4, else: 5

    with :ok <- validate_has_actions(player),
         :ok <- validate_at_research_station(game_state, player.current_city.name),
         :ok <- validate_cure_not_discovered(game_state, color),
         :ok <- validate_cure_cards(player_id, card_ids, color, cards_needed) do
      Logger.info("All validations passed, discarding cards and marking cure as discovered")

      # Discard the cards
      Enum.each(card_ids, fn card_id ->
        card = Repo.get!(PandemicVibeServer.Games.Card, card_id)
        DeckManager.discard_card(card, "player_discard")
      end)

      # Mark cure as discovered
      cure_markers = Map.put(game_state.state_data["cure_markers"], color, "discovered")
      updated_state_data = Map.put(game_state.state_data, "cure_markers", cure_markers)

      Games.save_game_state(player.game_id, %{
        turn_number: game_state.turn_number,
        current_player_id: game_state.current_player_id,
        state_data: updated_state_data
      })

      Games.update_player(player, %{actions_remaining: player.actions_remaining - 1})
    end
  end

  @doc """
  Shares knowledge: gives a city card to another player in same city.
  """
  def share_knowledge(giver_id, receiver_id, card_id) do
    giver = Games.get_player!(giver_id) |> Repo.preload(:current_city)
    receiver = Games.get_player!(receiver_id) |> Repo.preload(:current_city)
    card = Repo.get!(PandemicVibeServer.Games.Card, card_id) |> Repo.preload(:city)

    with :ok <- validate_has_actions(giver),
         :ok <- validate_same_city(giver, receiver),
         :ok <- validate_card_matches_city(card, giver.current_city) do
      card
      |> Ecto.Changeset.change(player_id: receiver.id)
      |> Repo.update!()

      Games.update_player(giver, %{actions_remaining: giver.actions_remaining - 1})
    end
  end

  # Validation helpers

  defp validate_has_actions(%Player{actions_remaining: actions}) when actions > 0, do: :ok
  defp validate_has_actions(_), do: {:error, :no_actions_remaining}

  defp validate_adjacent_or_direct_flight(player, destination) do
    current_city = player.current_city

    if !current_city do
      {:error, :no_current_city}
    else
      # Check if destination is adjacent to current city
      connected_cities = Games.get_connected_cities(current_city.id)
      is_adjacent = Enum.any?(connected_cities, &(&1.id == destination.id))

      if is_adjacent do
        :ok
      else
        # TODO: Check for direct flight (player has destination city card)
        # TODO: Check for charter flight (player has current city card)
        # TODO: Check for shuttle flight (both cities have research stations)
        {:error, :not_adjacent}
      end
    end
  end

  defp validate_disease_present(game_state, city_name, color) do
    city_infections = game_state.state_data["city_infections"] || %{}
    cube_count = get_in(city_infections, [city_name, color]) || 0

    if cube_count > 0 do
      :ok
    else
      {:error, :no_disease_present}
    end
  end

  defp validate_research_stations_available(game) do
    if game.research_stations_remaining > 0 do
      :ok
    else
      {:error, :no_research_stations_available}
    end
  end

  defp validate_no_station_exists(game_state, city_name) do
    stations = game_state.state_data["research_stations"] || []

    if city_name in stations do
      {:error, :station_already_exists}
    else
      :ok
    end
  end

  defp validate_at_research_station(game_state, city_name) do
    stations = game_state.state_data["research_stations"] || []

    if city_name in stations do
      :ok
    else
      {:error, :not_at_research_station}
    end
  end

  defp validate_cure_not_discovered(game_state, color) do
    cure_status = game_state.state_data["cure_markers"][color]

    if cure_status == "not_discovered" do
      :ok
    else
      {:error, :cure_already_discovered}
    end
  end

  defp validate_cure_cards(player_id, card_ids, color, needed_count) do
    require Logger
    cards = Games.list_player_cards(player_id)
    selected_cards = Enum.filter(cards, &(&1.id in card_ids))

    Logger.info(
      "Validating cure cards - needed: #{needed_count}, provided IDs: #{length(card_ids)}, found: #{length(selected_cards)}"
    )

    Logger.info("Player has #{length(cards)} total cards")
    Logger.info("Selected card IDs: #{inspect(card_ids)}")
    Logger.info("Found cards: #{inspect(Enum.map(selected_cards, & &1.id))}")

    cond do
      length(selected_cards) != needed_count ->
        Logger.error(
          "Card count mismatch - needed: #{needed_count}, got: #{length(selected_cards)}"
        )

        {:error, :incorrect_card_count}

      Enum.all?(selected_cards, fn card -> card.city.color == color end) ->
        Logger.info("All cards match color #{color}")
        :ok

      true ->
        Logger.error("Cards have wrong colors")
        {:error, :cards_wrong_color}
    end
  end

  defp validate_same_city(%Player{current_city_id: city_id}, %Player{current_city_id: city_id}),
    do: :ok

  defp validate_same_city(_, _), do: {:error, :players_not_in_same_city}

  defp validate_card_matches_city(card, city) do
    if card.city_id == city.id do
      :ok
    else
      {:error, :card_does_not_match_city}
    end
  end

  defp get_city(name) do
    case Games.get_city_by_name(name) do
      nil -> {:error, :city_not_found}
      city -> {:ok, city}
    end
  end

  defp remove_disease_cubes(game_id, city, color, count) do
    state = Games.get_latest_game_state(game_id)
    city_infections = state.state_data["city_infections"] || %{}
    disease_cubes = state.state_data["disease_cubes"]

    current_count = get_in(city_infections, [city.name, color]) || 0

    cubes_removed = if count == :all, do: current_count, else: min(count, current_count)
    new_count = current_count - cubes_removed

    updated_city_infections =
      if new_count == 0 do
        city_infections
        |> Map.get(city.name, %{})
        |> Map.delete(color)
        |> then(&Map.put(city_infections, city.name, &1))
      else
        put_in(city_infections, [Access.key(city.name, %{}), color], new_count)
      end

    updated_disease_cubes = Map.update!(disease_cubes, color, &(&1 + cubes_removed))

    updated_state_data =
      state.state_data
      |> Map.put("city_infections", updated_city_infections)
      |> Map.put("disease_cubes", updated_disease_cubes)

    Games.save_game_state(game_id, %{
      turn_number: state.turn_number,
      current_player_id: state.current_player_id,
      state_data: updated_state_data
    })
  end
end
