defmodule PandemicVibeServerWeb.GameController do
  use PandemicVibeServerWeb, :controller

  alias PandemicVibeServer.Games
  alias PandemicVibeServer.GameEngine.GameEngine

  action_fallback PandemicVibeServerWeb.FallbackController

  @doc """
  Creates a new game.
  """
  def create(conn, %{"game" => game_params} = _params) do
    user = Guardian.Plug.current_resource(conn)

    with {:ok, game} <-
           Games.create_game(%{
             difficulty: game_params["difficulty"] || "normal",
             created_by_id: user.id,
             status: "lobby"
           }),
         {:ok, _player} <- Games.add_player_to_game(game.id, user.id) do
      game = Games.get_game_with_players!(game.id)

      conn
      |> put_status(:created)
      |> render(:show, game: game)
    end
  end

  @doc """
  Joins an existing game.
  """
  def join(conn, %{"game_id" => game_id}) do
    user = Guardian.Plug.current_resource(conn)
    game = Games.get_game_with_players!(game_id)

    with :ok <- validate_can_join(game, user.id),
         {:ok, _player} <- Games.add_player_to_game(game_id, user.id) do
      game = Games.get_game_with_players!(game_id)

      conn
      |> put_status(:ok)
      |> render(:show, game: game)
    end
  end

  @doc """
  Gets a game by ID.
  """
  def show(conn, %{"id" => id}) do
    game = Games.get_game_with_players!(id)
    render(conn, :show, game: game)
  end

  @doc """
  Lists all games for the current user.
  """
  def index(conn, _params) do
    user = Guardian.Plug.current_resource(conn)
    games = Games.list_user_games(user.id)
    render(conn, :index, games: games)
  end

  @doc """
  Starts the game (transitions from lobby to in_progress).
  """
  def start(conn, %{"game_id" => game_id}) do
    user = Guardian.Plug.current_resource(conn)
    game = Games.get_game_with_players!(game_id)

    with :ok <- validate_is_creator(game, user.id),
         :ok <- validate_can_start(game),
         {:ok, initialized_game} <- GameEngine.initialize_game(game.id) do
      conn
      |> put_status(:ok)
      |> render(:show, game: initialized_game)
    end
  end

  @doc """
  Gets the current game state.
  """
  def state(conn, %{"game_id" => game_id}) do
    with {:ok, state} <- GameEngine.get_current_state(game_id) do
      conn
      |> put_status(:ok)
      |> json(state)
    end
  end

  # Validation helpers

  defp validate_can_join(game, user_id) do
    cond do
      game.status != "lobby" ->
        {:error, :game_already_started}

      length(game.players) >= 4 ->
        {:error, :game_full}

      Enum.any?(game.players, fn p -> p.user_id == user_id end) ->
        {:error, :already_joined}

      true ->
        :ok
    end
  end

  defp validate_is_creator(game, user_id) do
    if game.created_by_id == user_id do
      :ok
    else
      {:error, :not_game_creator}
    end
  end

  defp validate_can_start(game) do
    player_count = length(game.players)

    cond do
      game.status != "lobby" ->
        {:error, :game_already_started}

      player_count < 2 ->
        {:error, :not_enough_players}

      player_count > 4 ->
        {:error, :too_many_players}

      true ->
        :ok
    end
  end
end
