defmodule InfestationServer.Games.PlanetConnection do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "city_connections" do
    belongs_to :planet, InfestationServer.Games.Planet
    belongs_to :connected_planet, InfestationServer.Games.Planet

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(planet_connection, attrs) do
    planet_connection
    |> cast(attrs, [:planet_id, :connected_planet_id])
    |> validate_required([:planet_id, :connected_planet_id])
    |> unique_constraint([:planet_id, :connected_planet_id])
  end
end
