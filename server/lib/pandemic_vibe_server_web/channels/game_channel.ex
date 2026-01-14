defmodule PandemicVibeServerWeb.GameChannel do
  use PandemicVibeServerWeb, :channel

  alias PandemicVibeServer.Games
  alias PandemicVibeServer.GameEngine.{GameEngine, ActionHandler}

  @doc """
  Joins a game channel. Requires authentication.
  """
  def join("game:" <> game_id, _payload, socket) do
    case verify_game_access(game_id, socket) do
      {:ok, game} ->
        send(self(), :after_join)
        {:ok, %{game: format_game(game)}, assign(socket, :game_id, game_id)}

      {:error, reason} ->
        {:error, %{reason: reason}}
    end
  end

  def handle_in("player_action", %{"action" => action, "params" => params}, socket) do
    game_id = socket.assigns.game_id
    player = get_current_player(socket)

    case validate_player_turn(game_id, player.id) do
      :ok ->
        result = perform_action(action, params, player.id, game_id)
        broadcast_game_state(socket, game_id)
        {:reply, result, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("end_turn", _payload, socket) do
    game_id = socket.assigns.game_id
    player = get_current_player(socket)

    case validate_player_turn(game_id, player.id) do
      :ok ->
        case GameEngine.next_turn(game_id) do
          {:ok, _game} ->
            broadcast_game_state(socket, game_id)
            {:reply, {:ok, %{message: "Turn ended"}}, socket}

          {:error, reason} ->
            {:reply, {:error, %{reason: reason}}, socket}
        end

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("get_state", _payload, socket) do
    game_id = socket.assigns.game_id

    case GameEngine.get_current_state(game_id) do
      {:ok, state} ->
        {:reply, {:ok, state}, socket}

      error ->
        {:reply, error, socket}
    end
  end

  def handle_in("get_valid_moves", _payload, socket) do
    player = get_current_player(socket) |> PandemicVibeServer.Repo.preload(:current_city)

    case get_valid_move_destinations(player) do
      {:ok, cities} ->
        {:reply, {:ok, %{cities: cities}}, socket}

      error ->
        {:reply, error, socket}
    end
  end

  def handle_in("chat_message", %{"message" => message}, socket) do
    player = get_current_player(socket)

    broadcast(socket, "chat_message", %{
      player_id: player.id,
      player_name: player.user.name,
      message: message,
      timestamp: DateTime.utc_now()
    })

    {:reply, {:ok, %{message: "Message sent"}}, socket}
  end

  @doc """
  Sends initial game state after joining (if game has started).
  """
  def handle_info(:after_join, socket) do
    game_id = socket.assigns.game_id
    game = Games.get_game!(game_id)

    # Only send game state if game has been started
    if game.status == "in_progress" do
      case GameEngine.get_current_state(game_id) do
        {:ok, state} ->
          push(socket, "game_state", state)

        _ ->
          :ok
      end
    end

    {:noreply, socket}
  end

  # Private helpers

  defp verify_game_access(game_id, socket) do
    user = socket.assigns.current_user

    case Games.get_game_with_players!(game_id) do
      nil ->
        {:error, :game_not_found}

      game ->
        if Enum.any?(game.players, &(&1.user_id == user.id)) do
          {:ok, game}
        else
          {:error, :not_a_player}
        end
    end
  rescue
    Ecto.NoResultsError -> {:error, :game_not_found}
  end

  defp get_current_player(socket) do
    user = socket.assigns.current_user
    game_id = socket.assigns.game_id

    Games.list_game_players(game_id)
    |> Enum.find(&(&1.user_id == user.id))
    |> PandemicVibeServer.Repo.preload(:user)
  end

  defp validate_player_turn(game_id, player_id) do
    state = Games.get_latest_game_state(game_id)

    if state.current_player_id == player_id do
      :ok
    else
      {:error, :not_your_turn}
    end
  end

  defp perform_action("move", %{"target" => city_name}, player_id, _game_id) do
    case ActionHandler.move_player(player_id, city_name) do
      {:ok, _player} -> {:ok, %{message: "Moved to #{city_name}"}}
      error -> error
    end
  end

  # Fallback for old city parameter format
  defp perform_action("move", %{"city" => city_name}, player_id, _game_id) do
    case ActionHandler.move_player(player_id, city_name) do
      {:ok, _player} -> {:ok, %{message: "Moved to #{city_name}"}}
      error -> error
    end
  end

  defp perform_action("treat_disease", %{"color" => color}, player_id, _game_id) do
    case ActionHandler.treat_disease(player_id, color) do
      {:ok, _} -> {:ok, %{message: "Treated #{color} disease"}}
      error -> error
    end
  end

  defp perform_action("build_station", _params, player_id, _game_id) do
    case ActionHandler.build_research_station(player_id) do
      {:ok, _} -> {:ok, %{message: "Built research station"}}
      error -> error
    end
  end

  defp perform_action(
         "discover_cure",
         %{"color" => color, "card_ids" => card_ids},
         player_id,
         _game_id
       ) do
    case ActionHandler.discover_cure(player_id, color, card_ids) do
      {:ok, _} -> {:ok, %{message: "Discovered cure for #{color}"}}
      error -> error
    end
  end

  defp perform_action(
         "share_knowledge",
         %{"receiver_id" => receiver_id, "card_id" => card_id},
         player_id,
         _game_id
       ) do
    case ActionHandler.share_knowledge(player_id, receiver_id, card_id) do
      {:ok, _} -> {:ok, %{message: "Shared knowledge"}}
      error -> error
    end
  end

  defp perform_action(action, _params, _player_id, _game_id) do
    {:error, %{reason: "Unknown action: #{action}"}}
  end

  defp broadcast_game_state(socket, game_id) do
    case GameEngine.get_current_state(game_id) do
      {:ok, state} ->
        broadcast(socket, "game_state", state)

      _ ->
        :ok
    end
  end

  defp format_game(game) do
    %{
      id: game.id,
      status: game.status,
      difficulty: game.difficulty,
      players:
        Enum.map(game.players, fn player ->
          %{
            id: player.id,
            user_id: player.user_id,
            role: player.role,
            turn_order: player.turn_order
          }
        end)
    }
  end

  defp get_valid_move_destinations(player) do
    if !player.current_city do
      {:error, %{reason: "Player has no current city"}}
    else
      # Get adjacent cities
      connected_cities = Games.get_connected_cities(player.current_city.id)

      # Format city data for frontend
      cities =
        Enum.map(connected_cities, fn city ->
          %{name: city.name, color: city.color}
        end)

      {:ok, cities}
    end
  end
end
