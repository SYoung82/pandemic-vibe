defmodule InfestationServer.Games.Planet do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "cities" do
    field :name, :string
    field :color, :string
    field :population, :integer
    field :latitude, :float
    field :longitude, :float

    has_many :cards, InfestationServer.Games.Card
    has_many :planet_connections, InfestationServer.Games.PlanetConnection, foreign_key: :planet_id

    many_to_many :connected_planets, InfestationServer.Games.Planet,
      join_through: InfestationServer.Games.PlanetConnection,
      join_keys: [planet_id: :id, connected_planet_id: :id]

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(planet, attrs) do
    planet
    |> cast(attrs, [:name, :color, :population, :latitude, :longitude])
    |> validate_required([:name, :color])
    |> validate_inclusion(:color, ["blue", "yellow", "black", "red"])
    |> unique_constraint(:name)
  end
end
