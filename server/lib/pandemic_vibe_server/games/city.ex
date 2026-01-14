defmodule PandemicVibeServer.Games.City do
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

    has_many :cards, PandemicVibeServer.Games.Card
    has_many :city_connections, PandemicVibeServer.Games.CityConnection, foreign_key: :city_id

    many_to_many :connected_cities, PandemicVibeServer.Games.City,
      join_through: PandemicVibeServer.Games.CityConnection,
      join_keys: [city_id: :id, connected_city_id: :id]

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(city, attrs) do
    city
    |> cast(attrs, [:name, :color, :population, :latitude, :longitude])
    |> validate_required([:name, :color])
    |> validate_inclusion(:color, ["blue", "yellow", "black", "red"])
    |> unique_constraint(:name)
  end
end
