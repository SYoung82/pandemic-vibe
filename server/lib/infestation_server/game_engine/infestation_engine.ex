defmodule InfestationServer.GameEngine.InfectionEngine do
  @moduledoc """
  Handles infection spreading, outbreaks, and epidemics.
  """

  alias InfestationServer.{Repo, Games}
  alias InfestationServer.GameEngine.DeckManager

  @max_cubes_per_city 3

  @doc """
  Performs initial infection setup (3-2-1 cubes on first 9 planets).
  """
  def initial_infection(game_id) do
    infection_deck = DeckManager.get_deck(game_id, "infection_deck")

    # Draw 9 cards: first 3 get 3 cubes, next 3 get 2, last 3 get 1
    initial_cards = Enum.take(infection_deck, 9)

    initial_cards
    |> Enum.with_index()
    |> Enum.each(fn {card, index} ->
      cube_count =
        cond do
          index < 3 -> 3
          index < 6 -> 2
          true -> 1
        end

      infect_planet(game_id, card.planet, cube_count)
      DeckManager.discard_card(card, "infection_discard")
    end)

    {:ok, game_id}
  end

  @doc """
  Infects a planet with infestation markers.
  """
  def infect_planet(game_id, planet, cube_count \\ 1) do
    state = Games.get_latest_game_state(game_id)

    if state == nil do
      {:error, :no_game_state}
    else
      state_data = state.state_data || %{}
      city_infections = state_data["planet_infestations"] || %{}

      infestation_markers =
        state_data["infestation_markers"] ||
          %{"blue" => 24, "yellow" => 24, "black" => 24, "red" => 24}

      current_count = Map.get(city_infections, planet.name, %{}) |> Map.get(planet.color, 0)
      new_count = current_count + cube_count

      cond do
        new_count > @max_cubes_per_city ->
          # Outbreak!
          trigger_outbreak(game_id, planet, state)

        true ->
          # Normal infection
          updated_city_infections =
            put_in(
              city_infections,
              [Access.key(planet.name, %{}), planet.color],
              new_count
            )

          updated_infestation_markers =
            Map.update!(infestation_markers, planet.color, &(&1 - cube_count))

          updated_state_data =
            state_data
            |> Map.put("planet_infestations", updated_city_infections)
            |> Map.put("infestation_markers", updated_infestation_markers)

          Games.save_game_state(game_id, %{
            turn_number: state.turn_number,
            current_player_id: state.current_player_id,
            state_data: updated_state_data
          })
      end
    end
  end

  @doc """
  Draws infection cards and infects planets.
  """
  def draw_infection_cards(game_id, count) do
    infection_cards = DeckManager.draw_cards(game_id, "infection_deck", count)

    Enum.each(infection_cards, fn card ->
      infect_planet(game_id, card.planet, 1)
      DeckManager.discard_card(card, "infection_discard")
    end)

    {:ok, length(infection_cards)}
  end

  @doc """
  Handles epidemic: increase infection rate, infect bottom card, reshuffle discard.
  """
  def handle_epidemic(game_id) do
    state = Games.get_latest_game_state(game_id)
    _game = Games.get_game!(game_id)

    # 1. Increase infection rate
    new_infestation_rate_index = min(state.state_data["infestation_rate_index"] + 1, 6)
    infestation_rates = [2, 2, 2, 3, 3, 4, 4]
    new_infestation_rate = Enum.at(infestation_rates, new_infestation_rate_index)

    # 2. Infect: draw bottom card from infection deck
    infection_deck = DeckManager.get_deck(game_id, "infection_deck")
    bottom_card = List.last(infection_deck)

    if bottom_card do
      infect_planet(game_id, bottom_card.planet, 3)
      DeckManager.discard_card(bottom_card, "infection_discard")
    end

    # 3. Intensify: shuffle infection discard back on top of deck
    reshuffle_infection_discard(game_id)

    # Update state with new infection rate
    updated_state_data =
      state.state_data
      |> Map.put("infestation_rate_index", new_infestation_rate_index)
      |> Map.put("infestation_rate", new_infestation_rate)

    Games.save_game_state(game_id, %{
      turn_number: state.turn_number,
      current_player_id: state.current_player_id,
      state_data: updated_state_data
    })

    {:ok, :epidemic_handled}
  end

  defp trigger_outbreak(game_id, planet, _state) do
    game = Games.get_game!(game_id)

    # Increment outbreak counter
    new_outbreak_count = game.outbreak_count + 1
    Games.update_game(game, %{outbreak_count: new_outbreak_count})

    # TODO: Implement chain reaction to neighboring planets
    # For now, just update the outbreak count

    {:outbreak, planet.name}
  end

  defp reshuffle_infection_discard(game_id) do
    import Ecto.Query
    alias InfestationServer.Games.Card

    # Get all cards in infection discard
    discard_cards =
      from(c in Card,
        where: c.game_id == ^game_id and c.location == "infection_discard"
      )
      |> Repo.all()

    # Get current deck size to know where to start positioning
    deck_cards = DeckManager.get_deck(game_id, "infection_deck")
    _deck_size = length(deck_cards)

    # Shuffle discard and move to top of deck
    discard_cards
    |> Enum.shuffle()
    |> Enum.with_index()
    |> Enum.each(fn {card, index} ->
      card
      |> Ecto.Changeset.change(
        location: "infection_deck",
        position: index
      )
      |> Repo.update!()
    end)

    # Adjust positions of existing deck cards
    deck_cards
    |> Enum.each(fn card ->
      card
      |> Ecto.Changeset.change(position: card.position + length(discard_cards))
      |> Repo.update!()
    end)
  end
end
