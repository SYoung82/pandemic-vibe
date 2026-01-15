defmodule InfestationServer.Games.Player do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "players" do
    field :role, :string
    field :turn_order, :integer
    field :actions_remaining, :integer, default: 4

    belongs_to :game, InfestationServer.Games.Game
    belongs_to :user, InfestationServer.Accounts.User
    belongs_to :current_planet, InfestationServer.Games.Planet

    timestamps(type: :utc_datetime)
  end

  @roles ~w(medic scientist researcher operations_expert dispatcher contingency_planner quarantine_specialist)

  @doc false
  def changeset(player, attrs) do
    player
    |> cast(attrs, [:role, :turn_order, :actions_remaining, :game_id, :user_id, :current_planet_id])
    |> validate_required([:turn_order, :game_id, :user_id])
    |> validate_inclusion(:role, @roles, message: "is not a valid role")
    |> validate_number(:turn_order, greater_than_or_equal_to: 0)
    |> validate_number(:actions_remaining, greater_than_or_equal_to: 0, less_than_or_equal_to: 4)
    |> unique_constraint([:game_id, :user_id])
    |> unique_constraint([:game_id, :turn_order])
  end
end
