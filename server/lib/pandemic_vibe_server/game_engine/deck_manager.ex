defmodule PandemicVibeServer.GameEngine.DeckManager do
  @moduledoc """
  Manages card decks: shuffling, dealing, and epidemic insertion.
  """

  alias PandemicVibeServer.{Repo, Games}
  alias PandemicVibeServer.Games.Card

  @epidemic_count %{
    "easy" => 4,
    "normal" => 5,
    "hard" => 6
  }

  @doc """
  Initializes player and infection decks for a new game.
  """
  def initialize_decks(game_id, difficulty) do
    cities = Games.list_cities()

    # Create player deck with city cards
    player_cards = create_player_deck(game_id, cities)

    # Insert epidemics into player deck
    player_deck_with_epidemics = insert_epidemics(player_cards, game_id, difficulty)

    # Create infection deck
    create_infection_deck(game_id, cities)

    {:ok, player_deck_with_epidemics}
  end

  defp create_player_deck(game_id, cities) do
    cities
    |> Enum.with_index()
    |> Enum.map(fn {city, index} ->
      %{
        game_id: game_id,
        card_type: "city",
        city_id: city.id,
        location: "player_deck",
        position: index,
        inserted_at: DateTime.utc_now() |> DateTime.truncate(:second),
        updated_at: DateTime.utc_now() |> DateTime.truncate(:second)
      }
    end)
    |> then(fn cards -> Repo.insert_all(Card, cards, returning: true) end)
    |> elem(1)
  end

  defp insert_epidemics(player_cards, game_id, difficulty) do
    epidemic_count = Map.get(@epidemic_count, difficulty, 5)

    # Shuffle player deck
    shuffled = Enum.shuffle(player_cards)

    # Split into piles
    pile_size = div(length(shuffled), epidemic_count)
    piles = Enum.chunk_every(shuffled, pile_size)

    # Insert one epidemic into each pile and shuffle each pile
    piles
    |> Enum.with_index()
    |> Enum.flat_map(fn {pile, _pile_index} ->
      epidemic = %{
        game_id: game_id,
        card_type: "epidemic",
        city_id: nil,
        location: "player_deck",
        position: 0,
        inserted_at: DateTime.utc_now() |> DateTime.truncate(:second),
        updated_at: DateTime.utc_now() |> DateTime.truncate(:second)
      }

      [epidemic | pile]
      |> Enum.shuffle()
    end)
    |> Enum.with_index()
    |> Enum.each(fn {card, new_position} ->
      if is_struct(card, Card) do
        card
        |> Ecto.Changeset.change(position: new_position)
        |> Repo.update!()
      else
        Repo.insert!(Card.changeset(%Card{}, Map.put(card, :position, new_position)))
      end
    end)
  end

  defp create_infection_deck(game_id, cities) do
    cities
    |> Enum.with_index()
    |> Enum.map(fn {city, index} ->
      %{
        game_id: game_id,
        card_type: "city",
        city_id: city.id,
        location: "infection_deck",
        position: index,
        inserted_at: DateTime.utc_now() |> DateTime.truncate(:second),
        updated_at: DateTime.utc_now() |> DateTime.truncate(:second)
      }
    end)
    |> then(fn cards ->
      Repo.insert_all(Card, Enum.shuffle(cards))
    end)
  end

  @doc """
  Deals initial cards to players.
  """
  def deal_initial_hands(game_id) do
    players = Games.list_game_players(game_id)

    cards_per_player =
      case length(players) do
        2 -> 4
        3 -> 3
        4 -> 2
        _ -> 2
      end

    player_deck = get_deck(game_id, "player_deck")

    players
    |> Enum.with_index()
    |> Enum.each(fn {player, player_index} ->
      start_pos = player_index * cards_per_player

      player_deck
      |> Enum.slice(start_pos, cards_per_player)
      |> Enum.each(fn card ->
        card
        |> Ecto.Changeset.change(location: "player_hand", player_id: player.id)
        |> Repo.update!()
      end)
    end)

    :ok
  end

  @doc """
  Draws cards from a deck.
  """
  def draw_cards(game_id, location, count) do
    get_deck(game_id, location)
    |> Enum.take(count)
  end

  @doc """
  Gets all cards in a specific location, ordered by position.
  """
  def get_deck(game_id, location) do
    import Ecto.Query

    from(c in Card,
      where: c.game_id == ^game_id and c.location == ^location,
      order_by: [asc: c.position],
      preload: [:city]
    )
    |> Repo.all()
  end

  @doc """
  Moves a card to discard pile.
  """
  def discard_card(card, discard_location) do
    discard_count = count_cards(card.game_id, discard_location)

    card
    |> Ecto.Changeset.change(
      location: discard_location,
      player_id: nil,
      position: discard_count
    )
    |> Repo.update()
  end

  defp count_cards(game_id, location) do
    import Ecto.Query

    from(c in Card,
      where: c.game_id == ^game_id and c.location == ^location,
      select: count(c.id)
    )
    |> Repo.one()
  end
end
