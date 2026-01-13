defmodule PandemicVibeServerWeb.GameJSON do
  alias PandemicVibeServer.Games.Game

  @doc """
  Renders a list of games.
  """
  def index(%{games: games}) do
    %{data: for(game <- games, do: data(game))}
  end

  @doc """
  Renders a single game.
  """
  def show(%{game: game}) do
    %{data: data(game)}
  end

  defp data(%Game{} = game) do
    %{
      id: game.id,
      difficulty: game.difficulty,
      status: game.status,
      outbreak_count: game.outbreak_count,
      infection_rate_index: game.infection_rate_index,
      research_stations_remaining: game.research_stations_remaining,
      created_by_id: game.created_by_id,
      players: render_players(game),
      inserted_at: game.inserted_at,
      updated_at: game.updated_at
    }
  end

  defp render_players(%{players: players}) when is_list(players) do
    Enum.map(players, fn player ->
      %{
        id: player.id,
        user_id: player.user_id,
        role: player.role,
        turn_order: player.turn_order,
        actions_remaining: player.actions_remaining,
        current_city_id: player.current_city_id
      }
    end)
  end

  defp render_players(_), do: []
end
