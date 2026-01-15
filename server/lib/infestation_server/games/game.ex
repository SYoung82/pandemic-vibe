defmodule InfestationServer.Games.Game do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "games" do
    field :name, :string
    field :status, :string, default: "lobby"
    field :difficulty, :string, default: "normal"
    field :outbreak_count, :integer, default: 0
    field :infection_rate_index, :integer, default: 0
    field :research_stations_remaining, :integer, default: 6

    belongs_to :created_by, InfestationServer.Accounts.User
    has_many :players, InfestationServer.Games.Player
    has_many :game_states, InfestationServer.Games.GameState
    has_many :cards, InfestationServer.Games.Card

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(game, attrs) do
    game
    |> cast(attrs, [
      :name,
      :status,
      :difficulty,
      :outbreak_count,
      :infection_rate_index,
      :research_stations_remaining,
      :created_by_id
    ])
    |> validate_required([:status, :difficulty])
    |> validate_inclusion(:status, ["lobby", "in_progress", "won", "lost"])
    |> validate_inclusion(:difficulty, ["easy", "normal", "hard"])
    |> validate_number(:outbreak_count, greater_than_or_equal_to: 0)
    |> validate_number(:infection_rate_index, greater_than_or_equal_to: 0)
  end
end
