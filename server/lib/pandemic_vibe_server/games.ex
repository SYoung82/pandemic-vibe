defmodule PandemicVibeServer.Games do
  @moduledoc """
  The Games context.
  """

  import Ecto.Query, warn: false
  alias PandemicVibeServer.Repo

  alias PandemicVibeServer.Games.{Game, Player, City, GameState, Card}

  ## Games

  @doc """
  Creates a new game.
  """
  def create_game(attrs \\ %{}) do
    %Game{}
    |> Game.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Gets a single game.
  """
  def get_game!(id), do: Repo.get!(Game, id)

  @doc """
  Gets a game with preloaded associations.
  """
  def get_game_with_players!(id) do
    Game
    |> Repo.get!(id)
    |> Repo.preload([:players, :created_by])
  end

  @doc """
  Updates a game.
  """
  def update_game(%Game{} = game, attrs) do
    game
    |> Game.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Lists all games for a user (either created by them or they're a player).
  """
  def list_user_games(user_id) do
    from(g in Game,
      left_join: p in Player,
      on: p.game_id == g.id,
      where: g.created_by_id == ^user_id or p.user_id == ^user_id,
      distinct: g.id,
      order_by: [desc: g.inserted_at]
    )
    |> Repo.all()
  end

  @doc """
  Lists all games (for lobby discovery).
  """
  def list_all_games do
    from(g in Game,
      order_by: [desc: g.inserted_at]
    )
    |> Repo.all()
    |> Repo.preload([:players, :created_by])
  end

  ## Players

  @doc """
  Adds a player to a game.
  """
  def add_player_to_game(game_id, user_id, attrs \\ %{}) do
    # Get current player count to determine turn order
    turn_order = Repo.aggregate(from(p in Player, where: p.game_id == ^game_id), :count)

    attrs = Map.merge(attrs, %{game_id: game_id, user_id: user_id, turn_order: turn_order})

    %Player{}
    |> Player.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Gets a player.
  """
  def get_player!(id), do: Repo.get!(Player, id)

  @doc """
  Updates a player.
  """
  def update_player(%Player{} = player, attrs) do
    player
    |> Player.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Lists players for a game.
  """
  def list_game_players(game_id) do
    from(p in Player,
      where: p.game_id == ^game_id,
      order_by: p.turn_order,
      preload: [:user]
    )
    |> Repo.all()
  end

  ## Cities

  @doc """
  Gets a city by ID.
  """
  def get_city!(id), do: Repo.get!(City, id)

  @doc """
  Gets a city by name.
  """
  def get_city_by_name(name) do
    Repo.get_by(City, name: name)
  end

  @doc """
  Lists all cities.
  """
  def list_cities do
    Repo.all(City)
  end

  @doc """
  Creates a city (typically for seeding).
  """
  def create_city(attrs) do
    %City{}
    |> City.changeset(attrs)
    |> Repo.insert()
  end

  ## Game States

  @doc """
  Creates or updates the current game state.
  """
  def save_game_state(game_id, attrs) do
    %GameState{}
    |> GameState.changeset(Map.put(attrs, :game_id, game_id))
    |> Repo.insert()
  end

  @doc """
  Gets the latest game state for a game.
  """
  def get_latest_game_state(game_id) do
    from(gs in GameState,
      where: gs.game_id == ^game_id,
      order_by: [desc: gs.turn_number, desc: gs.inserted_at],
      limit: 1
    )
    |> Repo.one()
  end

  ## Cards

  @doc """
  Creates a card.
  """
  def create_card(attrs) do
    %Card{}
    |> Card.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Gets cards for a game.
  """
  def list_game_cards(game_id) do
    from(c in Card,
      where: c.game_id == ^game_id,
      order_by: [c.location, c.position]
    )
    |> Repo.all()
  end

  @doc """
  Gets cards in a player's hand.
  """
  def list_player_cards(player_id) do
    from(c in Card,
      where: c.player_id == ^player_id and c.location == "player_hand",
      order_by: c.position
    )
    |> Repo.all()
  end

  @doc """
  Moves a card to a new location.
  """
  def move_card(%Card{} = card, location, position \\ nil) do
    attrs = %{location: location}
    attrs = if position, do: Map.put(attrs, :position, position), else: attrs

    card
    |> Card.changeset(attrs)
    |> Repo.update()
  end
end
