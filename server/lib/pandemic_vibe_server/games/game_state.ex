defmodule PandemicVibeServer.Games.GameState do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "game_states" do
    field :state_data, :map
    field :turn_number, :integer, default: 0

    belongs_to :game, PandemicVibeServer.Games.Game
    belongs_to :current_player, PandemicVibeServer.Games.Player

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(game_state, attrs) do
    game_state
    |> cast(attrs, [:state_data, :turn_number, :game_id, :current_player_id])
    |> validate_required([:game_id])
    |> validate_number(:turn_number, greater_than_or_equal_to: 0)
  end
end
